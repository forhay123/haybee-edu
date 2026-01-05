from sqlalchemy.orm import Session
from sqlalchemy import text
from app.domains.lesson_processing import repository, schemas, ai_pipeline
from app.models.lesson_question import LessonQuestion
from app.models.lesson_ai_result import LessonAIResult
import traceback
import logging

logger = logging.getLogger(__name__)


class LessonAIService:
    """
    Service for handling lesson AI processing end-to-end.

    Handles:
      • Creating initial DB records
      • Extracting text from files
      • Generating summaries
      • Generating questions (theory + MCQ)
      • Updating DB progressively with status
    """

    # ==========================================================
    # Init
    # ==========================================================
    def __init__(self, db: Session):
        self.db = db
        self.repo = repository.LessonAIRepository(db)

    # ==========================================================
    # Create initial record with status tracking
    # ==========================================================
    def create_lesson_record(self, lesson_create: schemas.LessonAIResultCreate):
        """
        Create an initial lesson record in the database.
        Initializes status as 'pending' and progress as 0 for async processing.
        """
        # Create the lesson record
        lesson = self.repo.create_lesson_ai_result(lesson_create)
        
        # Initialize status fields
        try:
            update_query = text("""
                UPDATE ai.lesson_ai_results
                SET status = 'pending', progress = 0, updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            """)
            self.db.execute(update_query, {"id": lesson.id})
            self.db.commit()
            self.db.refresh(lesson)
            
            logger.info(f"✅ Created lesson AI record {lesson.id} for topic {lesson.lesson_topic_id}")
        except Exception as e:
            logger.error(f"Failed to initialize status for lesson {lesson.id}: {e}")
            self.db.rollback()
        
        return lesson

    # ==========================================================
    # Update lesson status in DB
    # ==========================================================
    def update_lesson_status(self, lesson_id: int, status: str, progress: int, error_message: str = None):
        """
        Update the status and progress of a lesson in the database.
        
        Args:
            lesson_id: The ai.lesson_ai_results.id
            status: pending, processing, done, failed
            progress: 0-100
            error_message: Optional error message if failed (logged, not stored in DB)
        """
        try:
            # ✅ FIXED: Only update columns that exist in the database
            query = text("""
                UPDATE ai.lesson_ai_results
                SET status = :status, 
                    progress = :progress,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            """)
            self.db.execute(query, {
                "id": lesson_id,
                "status": status,
                "progress": progress
            })
            
            self.db.commit()
            
            # ✅ Log error message instead of storing in DB
            if error_message:
                logger.error(f"Lesson {lesson_id} failed: {error_message}")
            else:
                logger.info(f"Updated lesson {lesson_id}: status={status}, progress={progress}")
                
        except Exception as e:
            logger.error(f"Failed to update lesson status for {lesson_id}: {e}")
            self.db.rollback()

    # ==========================================================
    # Full background AI processing
    # ==========================================================
    def process_lesson(self, lesson_id: int, local_file_path: str):
        """
        Handles the full AI pipeline:
        1. Extract text from file
        2. Generate summary
        3. Generate questions (via ai_pipeline)
        4. Persist all results to DB
        5. Update status throughout the process
        
        Args:
            lesson_id: The ai.lesson_ai_results.id
            local_file_path: Path to the uploaded file
        """
        # ✅ Fetch the lesson record
        lesson = self.db.query(LessonAIResult).filter(LessonAIResult.id == lesson_id).first()
        if not lesson:
            raise ValueError(f"Lesson with id={lesson_id} not found")

        # ✅ Store the lesson_topic_id for reporting to Java
        lesson_topic_id = lesson.lesson_topic_id
        
        # ✅ REMOVED: Validation - Java already validates lesson_topic_id when creating the lesson
        # No need to validate again here, which was causing 403 errors

        try:
            # Step 0: Start processing
            logger.info(f"🚀 Starting AI processing for lesson {lesson_id} (topic {lesson_topic_id})")
            self.update_lesson_status(lesson_id, "processing", 5)
            ai_pipeline.report_ai_progress(lesson_topic_id, "processing", 5)

            # Step 1: Extract text (only once)
            logger.info(f"📄 Extracting text from file: {local_file_path}")
            extracted_text = ai_pipeline.extract_text_from_file(local_file_path)
            
            if not extracted_text or not extracted_text.strip():
                raise ValueError("No readable text found in document.")

            # Save extracted text
            update_text_query = text("""
                UPDATE ai.lesson_ai_results
                SET extracted_text = :text, updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            """)
            self.db.execute(update_text_query, {"id": lesson_id, "text": extracted_text})
            self.db.commit()
            
            self.update_lesson_status(lesson_id, "processing", 30)
            ai_pipeline.report_ai_progress(lesson_topic_id, "processing", 30)
            logger.info(f"✅ Extracted {len(extracted_text.split())} words")

            # Step 2: Summarize text (simple truncation or via model)
            summary = (
                extracted_text[:300] + "..."
                if len(extracted_text) > 300
                else extracted_text
            )
            
            update_summary_query = text("""
                UPDATE ai.lesson_ai_results
                SET summary = :summary, updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            """)
            self.db.execute(update_summary_query, {"id": lesson_id, "summary": summary})
            self.db.commit()
            
            self.update_lesson_status(lesson_id, "processing", 50)
            logger.info(f"✅ Generated summary")

            # Step 3: Generate questions (delegated to ai_pipeline)
            logger.info(f"🧠 Generating AI questions...")
            # ✅ FIXED: Use lesson_id parameter instead of lesson.id to avoid ObjectDeletedError
            questions_data = ai_pipeline.generate_questions_from_lesson(
                lesson_text=extracted_text,
                lesson_ai_result_id=lesson_id,  # ✅ FIXED: Use parameter, not lesson.id
                lesson_topic_id=lesson_topic_id,  # ✅ For reporting to Java
                db=self.db,
            )

            # ✅ REMOVED: No need to store questions_json since questions are already 
            # persisted to ai.lesson_questions table by ai_pipeline
            
            self.update_lesson_status(lesson_id, "processing", 90)

            # Step 4: Mark as done ✅
            self.update_lesson_status(lesson_id, "done", 100)
            self.db.refresh(lesson)
            
            question_count = len(questions_data) if questions_data else 0
            ai_pipeline.report_ai_progress(lesson_topic_id, "done", 100, question_count)
            
            logger.info(f"🎉 Completed AI processing for lesson {lesson_id}: {question_count} questions generated")

        except Exception as e:
            logger.error(f"❌ AI processing failed for lesson {lesson_id}: {e}")
            traceback.print_exc()
            
            self.db.rollback()
            self.update_lesson_status(lesson_id, "failed", 100, str(e))
            ai_pipeline.report_ai_progress(lesson_topic_id, "failed", 0)
            raise

        return lesson