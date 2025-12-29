from fastapi import APIRouter, UploadFile, Form, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from pathlib import Path
from sqlalchemy import text
import shutil, uuid, os
import logging
import requests
from app.core.database import get_db
from app.domains.lesson_processing.service import LessonAIService
from app.domains.lesson_processing.schemas import LessonAIResultCreate, LessonAIResultResponse
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Lesson Processing"])

# ==========================================================
# Directory setup for uploaded lessons
# ==========================================================

UPLOAD_DIR = Path(settings.PDF_FOLDER or "/app/uploads/lessons")
UPLOAD_DIR.mkdir(exist_ok=True, parents=True)

# ==========================================================
# Utility: Save uploaded file
# ==========================================================

def save_upload_file(file: UploadFile) -> str:
    """Save an uploaded file and return its local file path."""
    ext = Path(file.filename).suffix.lower()
    if ext not in [".pdf", ".txt"]:
        raise HTTPException(status_code=400, detail="Only PDF or TXT files are supported")

    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / filename

    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return str(file_path)

# ==========================================================
# Background Task: Delegate lesson processing to service
# ==========================================================


def process_lesson_in_background(db: Session, lesson_id: int, local_file_path: str):
    """
    Background task that processes lesson and triggers Java assessment creation.
    """
    service = LessonAIService(db)
    try:
        # Process the lesson
        result = service.process_lesson(lesson_id=lesson_id, local_file_path=local_file_path)
        
        # ✅ AUTOMATED: Trigger Java assessment creation after successful processing
        if result and result.get("status") == "done":
            try:
                lesson_topic_id = result.get("lesson_topic_id")
                
                # ✅ Use settings from config
                java_backend_url = settings.JAVA_SERVICE_URL or "http://java-backend:8080"
                java_webhook_url = f"{java_backend_url}/api/v1/admin/assessments/create-for-lesson/{lesson_topic_id}"
                
                logger.info(f"🎯 Triggering assessment creation for lesson {lesson_topic_id}")
                logger.info(f"   Calling: {java_webhook_url}")
                
                # Build headers with system token
                headers = {
                    "Content-Type": "application/json"
                }
                
                # ✅ Use SYSTEM_TOKEN from settings
                if settings.SYSTEM_TOKEN:
                    headers["Authorization"] = f"Bearer {settings.SYSTEM_TOKEN}"
                    logger.info("   Using system token for authentication")
                else:
                    logger.warning("   No SYSTEM_TOKEN configured - request may fail")
                
                # Call Java to create assessment
                webhook_response = requests.post(
                    java_webhook_url,
                    headers=headers,
                    json={"lessonTopicId": lesson_topic_id},
                    timeout=30
                )
                
                if webhook_response.status_code == 200:
                    webhook_data = webhook_response.json()
                    if webhook_data.get("success"):
                        assessment_info = webhook_data.get("assessment", {})
                        logger.info(f"✅ Assessment created successfully for lesson {lesson_topic_id}")
                        logger.info(f"   Assessment ID: {assessment_info.get('assessmentId')}")
                        logger.info(f"   Questions: {assessment_info.get('questionsAdded')}")
                        logger.info(f"   Total Marks: {assessment_info.get('totalMarks')}")
                    else:
                        message = webhook_data.get("message", "Unknown error")
                        logger.warning(f"⚠️ Assessment creation returned success=false: {message}")
                        
                        # Check if assessment already exists - this is OK
                        if "already exists" in message.lower():
                            logger.info("   Assessment already exists - this is fine")
                        
                elif webhook_response.status_code == 400:
                    logger.warning(f"⚠️ Assessment creation failed: {webhook_response.text}")
                else:
                    logger.warning(f"⚠️ Assessment creation webhook returned status {webhook_response.status_code}")
                    logger.warning(f"   Response: {webhook_response.text}")
                    
            except requests.exceptions.Timeout:
                logger.warning(f"⚠️ Assessment creation webhook timed out (may still succeed in background)")
            except requests.exceptions.ConnectionError as e:
                logger.warning(f"⚠️ Cannot connect to Java backend for assessment creation: {e}")
                logger.warning(f"   Tried URL: {java_webhook_url}")
                logger.warning("   Tip: Check JAVA_SERVICE_URL in your .env file")
            except Exception as webhook_error:
                logger.warning(f"⚠️ Failed to trigger assessment creation: {webhook_error}")
                # Don't fail the entire process if webhook fails
        
        logger.info(f"✅ Lesson processing completed for lesson {lesson_id}")
        
    except Exception as e:
        logger.error(f"[BackgroundTaskError] Failed to process lesson {lesson_id}: {e}")
        print(f"[BackgroundTaskError] Failed to process lesson {lesson_id}: {e}")

# ==========================================================
# API Endpoint: Sync Lesson from Java
# ==========================================================

@router.post("/lessons/sync")
async def sync_lesson_from_java(
    lesson_topic_id: int = Form(...),
    subject_id: int = Form(...),
    week_number: int = Form(...),
    db: Session = Depends(get_db),
):
    """
    ✅ Called by the Java service before /ai/process-lesson.
    Ensures the lesson_topic_id exists in academic.lesson_topics.
    Prevents FK errors and verifies readiness for AI processing.
    """
    query = text("SELECT id FROM academic.lesson_topics WHERE id = :id")
    result = db.execute(query, {"id": lesson_topic_id}).fetchone()

    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Lesson topic {lesson_topic_id} not found in academic.lesson_topics"
        )

    # Optionally: ensure no duplicate AI record exists yet
    existing_check = text("""
        SELECT id FROM ai.lesson_ai_results WHERE lesson_topic_id = :lesson_topic_id
    """)
    existing = db.execute(existing_check, {"lesson_topic_id": lesson_topic_id}).fetchone()

    if existing:
        return {"status": "exists", "lesson_topic_id": lesson_topic_id}

    return {"status": "ok", "lesson_topic_id": lesson_topic_id}

# ==========================================================
# API Endpoint: Upload & Trigger Lesson Processing
# ==========================================================

@router.post("/process-lesson", response_model=LessonAIResultResponse)
async def process_lesson_endpoint(
    background_tasks: BackgroundTasks,
    lesson_topic_id: int = Form(...),
    subject_id: int = Form(...),
    week_number: int = Form(...),
    file: UploadFile = None,
    db: Session = Depends(get_db),
):
    """
    Upload a lesson file and trigger background AI processing.
    ✅ Java guarantees the lesson exists, so no retry needed here.
    """
    if not file:
        raise HTTPException(status_code=400, detail="File is required.")

    # Step 1: Verify lesson exists (single check - Java guarantees it)
    query = text("SELECT id FROM academic.lesson_topics WHERE id = :id")
    result = db.execute(query, {"id": lesson_topic_id}).fetchone()
    
    if not result:
        logger.error(f"❌ Lesson {lesson_topic_id} not found in academic.lesson_topics")
        raise HTTPException(
            status_code=404,
            detail=f"Lesson topic {lesson_topic_id} not found in academic.lesson_topics"
        )

    logger.info(f"✅ Lesson {lesson_topic_id} verified in academic.lesson_topics")

    # Step 2: Check for existing AI result
    existing_check = text("""
        SELECT id FROM ai.lesson_ai_results WHERE lesson_topic_id = :lesson_topic_id
    """)
    existing = db.execute(existing_check, {"lesson_topic_id": lesson_topic_id}).fetchone()
    
    if existing:
        logger.info(f"⚠️ AI result already exists for lesson {lesson_topic_id}, will regenerate")
        # Delete existing questions
        delete_query = text("DELETE FROM ai.lesson_questions WHERE lesson_id = :lesson_id")
        db.execute(delete_query, {"lesson_id": existing.id})
        db.commit()

    # Step 3: Save file locally
    local_path = save_upload_file(file)

    # Step 4: Build accessible URL for frontend
    BASE_URL = settings.SERVER_URL or "http://localhost:8000"
    file_url = f"{BASE_URL}/static/{Path(local_path).name}"

    # Step 5: Create or update DB record
    service = LessonAIService(db)
    lesson_create = LessonAIResultCreate(
        lesson_topic_id=lesson_topic_id,
        subject_id=subject_id,
        week_number=week_number,
        file_url=file_url,
    )
    lesson = service.create_lesson_record(lesson_create)

    # Step 6: Trigger background AI task
    background_tasks.add_task(process_lesson_in_background, db, lesson.id, local_path)

    logger.info(f"🚀 Lesson {lesson_topic_id} queued for AI processing")
    return lesson

# ==========================================================
# API Endpoint: Get Lesson Status (Called by Java)
# ==========================================================

@router.get("/lessons/{lesson_topic_id}/status")
async def get_lesson_status(
    lesson_topic_id: int,
    db: Session = Depends(get_db),
):
    """
    Get AI processing status for a lesson.
    Called by Java service to check progress.
    
    Args:
        lesson_topic_id: The academic.lesson_topics.id
    
    Returns:
        {
            "status": "pending" | "processing" | "done" | "failed",
            "progress": 0-100,
            "questionCount": number of questions generated
        }
    """
    try:
        # Query the lesson_ai_results table
        query = text("""
            SELECT 
                lar.status, 
                lar.progress,
                (SELECT COUNT(*) 
                 FROM ai.lesson_questions 
                 WHERE lesson_id = lar.id) as question_count
            FROM ai.lesson_ai_results lar
            WHERE lar.lesson_topic_id = :lesson_topic_id
            ORDER BY lar.created_at DESC
            LIMIT 1
        """)
        
        result = db.execute(query, {"lesson_topic_id": lesson_topic_id}).fetchone()
        
        if not result:
            return {
                "status": "pending",
                "progress": 0,
                "questionCount": 0
            }
        
        return {
            "status": result.status if result.status else "pending",
            "progress": int(result.progress) if result.progress else 0,
            "questionCount": int(result.question_count) if result.question_count else 0
        }
        
    except Exception as e:
        logger.error(f"Error fetching status for lesson {lesson_topic_id}: {e}")
        return {
            "status": "pending",
            "progress": 0,
            "questionCount": 0
        }

# ==========================================================
# API Endpoint: Get AI Result by Lesson Topic ID
# ==========================================================

@router.get("/api/ai-results/{lesson_topic_id}")
async def get_ai_result_by_topic(
    lesson_topic_id: int,
    db: Session = Depends(get_db),
):
    """
    Fetch the complete AI result for a lesson topic.
    Called by Java service to retrieve questions and summary.
    """
    try:
        query = text("""
            SELECT 
                lar.id,
                lar.lesson_topic_id,
                lar.subject_id,
                lar.week_number,
                lar.file_url,
                lar.summary,
                lar.extracted_text,
                lar.status,
                lar.progress,
                lar.created_at,
                lar.updated_at
            FROM ai.lesson_ai_results lar
            WHERE lar.lesson_topic_id = :lesson_topic_id
            ORDER BY lar.created_at DESC
            LIMIT 1
        """)
        
        result = db.execute(query, {"lesson_topic_id": lesson_topic_id}).fetchone()
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"No AI result found for lesson topic {lesson_topic_id}"
            )
        
        # Fetch questions
        questions_query = text("""
            SELECT 
                id, question_text, answer_text, difficulty, max_score,
                option_a, option_b, option_c, option_d, correct_option
            FROM ai.lesson_questions
            WHERE lesson_id = :lesson_id
        """)
        
        questions = db.execute(questions_query, {"lesson_id": result.id}).fetchall()
        
        return {
            "id": result.id,
            "lessonTopicId": result.lesson_topic_id,
            "subjectId": result.subject_id,
            "weekNumber": result.week_number,
            "fileUrl": result.file_url,
            "summary": result.summary,
            "extractedText": result.extracted_text,
            "status": result.status,
            "progress": result.progress,
            "createdAt": str(result.created_at) if result.created_at else None,
            "updatedAt": str(result.updated_at) if result.updated_at else None,
            "questions": [
                {
                    "id": q.id,
                    "questionText": q.question_text,
                    "answerText": q.answer_text,
                    "difficulty": q.difficulty,
                    "maxScore": q.max_score,
                    "optionA": q.option_a,
                    "optionB": q.option_b,
                    "optionC": q.option_c,
                    "optionD": q.option_d,
                    "correctOption": q.correct_option
                }
                for q in questions
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching AI result for topic {lesson_topic_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch AI result: {str(e)}"
        )

# ==========================================================
# API Endpoint: Regenerate AI for Lesson
# ==========================================================

@router.post("/regenerate/{lesson_topic_id}")
async def regenerate_lesson_ai(
    lesson_topic_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Regenerate AI processing for an existing lesson.
    Deletes old questions and re-runs the pipeline.
    """
    try:
        # Find existing lesson AI result
        query = text("""
            SELECT id, file_url, subject_id, week_number
            FROM ai.lesson_ai_results
            WHERE lesson_topic_id = :lesson_topic_id
            ORDER BY created_at DESC
            LIMIT 1
        """)
        
        result = db.execute(query, {"lesson_topic_id": lesson_topic_id}).fetchone()
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"No AI result found for lesson topic {lesson_topic_id}"
            )
        
        # Delete existing questions
        delete_query = text("""
            DELETE FROM ai.lesson_questions
            WHERE lesson_id = :lesson_id
        """)
        db.execute(delete_query, {"lesson_id": result.id})
        db.commit()
        
        # Reset status
        update_query = text("""
            UPDATE ai.lesson_ai_results
            SET status = 'pending', progress = 0, error_message = NULL
            WHERE id = :id
        """)
        db.execute(update_query, {"id": result.id})
        db.commit()
        
        # Extract file path from URL
        file_url = result.file_url
        if file_url:
            filename = file_url.split("/")[-1]
            local_path = str(UPLOAD_DIR / filename)
            
            # Trigger background processing
            background_tasks.add_task(process_lesson_in_background, db, result.id, local_path)
        
        return {
            "status": "success",
            "message": f"Regeneration started for lesson topic {lesson_topic_id}",
            "lessonTopicId": lesson_topic_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error regenerating AI for lesson {lesson_topic_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to regenerate AI: {str(e)}"
        )