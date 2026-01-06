from fastapi import APIRouter, UploadFile, Form, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from pathlib import Path
from sqlalchemy import text
import shutil, uuid, os
import logging
import requests
import tempfile
from app.core.database import get_db
from app.domains.lesson_processing.service import LessonAIService
from app.domains.lesson_processing.schemas import LessonAIResultCreate, LessonAIResultResponse
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Lesson Processing"])

# ==========================================================
# ✅ NEW: S3 File Downloader
# ==========================================================

def download_file_from_s3(s3_url: str) -> str:
    """
    Download a file from S3 URL to a temporary local file.
    
    Args:
        s3_url: Full S3 URL (e.g., https://bucket.s3.region.amazonaws.com/lessons/file.pdf)
    
    Returns:
        Local file path where the file was saved
    """
    try:
        logger.info(f"📥 Downloading file from S3: {s3_url}")
        
        # Download the file from S3
        response = requests.get(s3_url, timeout=60)
        response.raise_for_status()
        
        # Extract file extension from URL
        file_extension = Path(s3_url).suffix or ".pdf"
        
        # Create a temporary file
        temp_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=file_extension,
            dir="/tmp"
        )
        
        # Write content to temp file
        temp_file.write(response.content)
        temp_file.close()
        
        logger.info(f"✅ Downloaded {len(response.content)} bytes to {temp_file.name}")
        return temp_file.name
        
    except requests.exceptions.Timeout:
        logger.error(f"❌ Timeout downloading file from S3: {s3_url}")
        raise HTTPException(status_code=504, detail="S3 download timeout")
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Failed to download file from S3: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to download file from S3: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Unexpected error downloading from S3: {e}")
        raise HTTPException(status_code=500, detail=f"Error downloading file: {str(e)}")

# ==========================================================
# ✅ UPDATED: Background Task with S3 Support
# ==========================================================

def process_lesson_in_background(db: Session, lesson_id: int, file_url: str):
    """
    Background task that processes lesson and triggers Java assessment creation.
    
    ✅ UPDATED: Now downloads files from S3 instead of reading from local filesystem
    
    Args:
        db: Database session
        lesson_id: ai.lesson_ai_results.id
        file_url: S3 URL of the uploaded file
    """
    service = LessonAIService(db)
    local_file_path = None
    
    try:
        # ✅ Download file from S3 to temporary local file
        logger.info(f"🔄 Processing lesson {lesson_id} with S3 file: {file_url}")
        local_file_path = download_file_from_s3(file_url)
        
        # Process the lesson with the local file
        result = service.process_lesson(lesson_id=lesson_id, local_file_path=local_file_path)
        
        # Trigger Java assessment creation if successful
        if result and result.status == "done":
            try:
                lesson_topic_id = result.lesson_topic_id
                
                java_backend_url = settings.JAVA_SERVICE_URL or "http://java-backend:8080"
                java_webhook_url = f"{java_backend_url}/api/v1/integration/assessments/create/{lesson_topic_id}"
                
                logger.info(f"🎯 Triggering assessment creation for lesson {lesson_topic_id}")
                logger.info(f"   Calling: {java_webhook_url}")
                
                headers = {"Content-Type": "application/json"}
                if settings.SYSTEM_TOKEN:
                    headers["Authorization"] = f"Bearer {settings.SYSTEM_TOKEN}"
                    logger.info("   Using system token for authentication")
                
                webhook_response = requests.post(
                    java_webhook_url,
                    headers=headers,
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
                        if "already exists" in message.lower():
                            logger.info("   Assessment already exists - this is fine")
                elif webhook_response.status_code == 400:
                    logger.warning(f"⚠️ Assessment creation failed: {webhook_response.text}")
                else:
                    logger.warning(f"⚠️ Assessment webhook returned status {webhook_response.status_code}")
                    
            except requests.exceptions.Timeout:
                logger.warning(f"⚠️ Assessment creation webhook timed out")
            except requests.exceptions.ConnectionError as e:
                logger.warning(f"⚠️ Cannot connect to Java backend: {e}")
            except Exception as webhook_error:
                logger.warning(f"⚠️ Failed to trigger assessment creation: {webhook_error}")
        
        logger.info(f"✅ Lesson processing completed for lesson {lesson_id}")
        
    except Exception as e:
        logger.error(f"❌ Failed to process lesson {lesson_id}: {e}")
        logger.exception("Full error traceback:")
    finally:
        # ✅ Clean up temporary file
        if local_file_path and os.path.exists(local_file_path):
            try:
                os.unlink(local_file_path)
                logger.info(f"🗑️ Cleaned up temporary file: {local_file_path}")
            except Exception as e:
                logger.warning(f"⚠️ Failed to delete temp file: {e}")

# ==========================================================
# ✅ UPDATED: Process Lesson Endpoint - No File Upload
# ==========================================================

@router.post("/process-lesson", response_model=LessonAIResultResponse)
async def process_lesson_endpoint(
    background_tasks: BackgroundTasks,
    lesson_topic_id: int = Form(...),
    subject_id: int = Form(...),
    week_number: int = Form(...),
    file_url: str = Form(...),  # ✅ NEW: Receive S3 URL instead of file upload
    db: Session = Depends(get_db),
):
    """
    Trigger background AI processing for a lesson.
    
    ✅ UPDATED: Now receives S3 URL instead of file upload
    
    Args:
        lesson_topic_id: academic.lesson_topics.id
        subject_id: The subject ID
        week_number: Week number
        file_url: S3 URL of the uploaded file
    """
    if not file_url:
        raise HTTPException(status_code=400, detail="File URL is required.")

    # Step 1: Verify lesson exists
    query = text("SELECT id FROM academic.lesson_topics WHERE id = :id")
    result = db.execute(query, {"id": lesson_topic_id}).fetchone()
    
    if not result:
        logger.error(f"❌ Lesson {lesson_topic_id} not found in academic.lesson_topics")
        raise HTTPException(
            status_code=404,
            detail=f"Lesson topic {lesson_topic_id} not found"
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

    # Step 3: Create DB record (file_url is already an S3 URL)
    service = LessonAIService(db)
    lesson_create = LessonAIResultCreate(
        lesson_topic_id=lesson_topic_id,
        subject_id=subject_id,
        week_number=week_number,
        file_url=file_url,  # ✅ Store S3 URL directly
    )
    lesson = service.create_lesson_record(lesson_create)

    # Step 4: Trigger background AI task with S3 URL
    background_tasks.add_task(process_lesson_in_background, db, lesson.id, file_url)

    logger.info(f"🚀 Lesson {lesson_topic_id} queued for AI processing from S3")
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
    """
    try:
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
# ✅ UPDATED: Regenerate AI for Lesson - with S3 Support
# ==========================================================

@router.post("/regenerate/{lesson_topic_id}")
async def regenerate_lesson_ai(
    lesson_topic_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Regenerate AI processing for an existing lesson.
    
    ✅ UPDATED: Now works with S3 URLs
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
            SET status = 'pending', progress = 0
            WHERE id = :id
        """)
        db.execute(update_query, {"id": result.id})
        db.commit()
        
        # ✅ Use S3 URL directly
        file_url = result.file_url
        if file_url:
            # Trigger background processing with S3 URL
            background_tasks.add_task(process_lesson_in_background, db, result.id, file_url)
        
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
    Called by Java service before /ai/process-lesson.
    Ensures the lesson_topic_id exists in academic.lesson_topics.
    """
    query = text("SELECT id FROM academic.lesson_topics WHERE id = :id")
    result = db.execute(query, {"id": lesson_topic_id}).fetchone()

    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Lesson topic {lesson_topic_id} not found in academic.lesson_topics"
        )

    # Check if AI record already exists
    existing_check = text("""
        SELECT id FROM ai.lesson_ai_results WHERE lesson_topic_id = :lesson_topic_id
    """)
    existing = db.execute(existing_check, {"lesson_topic_id": lesson_topic_id}).fetchone()

    if existing:
        return {"status": "exists", "lesson_topic_id": lesson_topic_id}

    return {"status": "ok", "lesson_topic_id": lesson_topic_id}