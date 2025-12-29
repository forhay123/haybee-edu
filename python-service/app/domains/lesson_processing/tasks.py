from sqlalchemy.orm import Session
from app.models.lesson_ai_result import LessonAIResult
from app.models.lesson_question import LessonQuestion
from app.domains.lesson_processing import ai_pipeline, schemas
import os

# Set your Python service upload directory (must match Docker volume)
UPLOAD_DIR = "/app/uploads/lessons/"

def process_lesson_in_background(db: Session, lesson_id: int):
    """
    Background task to generate summary and questions for a lesson.
    Updates progress/status in DB.
    """
    lesson = db.query(LessonAIResult).filter_by(id=lesson_id).first()
    if not lesson:
        return

    try:
        lesson.status = "processing"
        lesson.progress = 5.0
        db.commit()

        # Step 1: Convert file_url to local file path
        file_name = os.path.basename(lesson.file_url)  # extract the filename from URL
        local_file_path = os.path.join(UPLOAD_DIR, file_name)

        # Check if file exists
        if not os.path.exists(local_file_path):
            raise FileNotFoundError(f"File not found at path: {local_file_path}")

        # Step 2: Extract text from local file path
        extracted_text = ai_pipeline.download_and_extract_text(local_file_path)
        lesson.extracted_text = extracted_text
        lesson.progress = 30.0
        db.commit()

        # Step 3: Generate summary
        summary = extracted_text[:150] + "..." if len(extracted_text) > 150 else extracted_text
        lesson.summary = summary
        lesson.progress = 50.0
        db.commit()

        # Step 4: Generate AI questions
        questions_data = ai_pipeline.generate_questions_from_text(extracted_text)
        for q in questions_data:
            question = LessonQuestion(
                lesson_id=lesson.id,
                question_text=q.question_text,
                answer_text=q.answer_text,
                difficulty=q.difficulty,
            )
            db.add(question)
        lesson.progress = 90.0
        db.commit()

        # Step 5: Mark lesson as done
        lesson.status = "done"
        lesson.progress = 100.0
        db.commit()

    except Exception as e:
        lesson.status = "failed"
        lesson.progress = 100.0
        db.commit()
        raise e
