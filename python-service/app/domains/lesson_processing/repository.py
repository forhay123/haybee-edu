from sqlalchemy.orm import Session
from app.models.lesson_ai_result import LessonAIResult
from app.models.lesson_question import LessonQuestion
from app.domains.lesson_processing import schemas


class LessonAIRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_lesson_ai_result(self, data: schemas.LessonAIResultCreate):
        lesson = LessonAIResult(
            lesson_topic_id=data.lesson_topic_id,
            subject_id=data.subject_id,
            week_number=data.week_number,
            file_url=str(data.file_url),
            extracted_text=data.extracted_text,
            summary=data.summary,
        )
        self.db.add(lesson)
        self.db.flush()  # Get lesson.id before adding questions

        # Add related questions
        if data.questions:
            for q in data.questions:
                question = LessonQuestion(
                    lesson_id=lesson.id,
                    question_text=q.question_text,
                    answer_text=q.answer_text,
                    difficulty=q.difficulty,
                    max_score=q.max_score or 1,
                    option_a=q.option_a,
                    option_b=q.option_b,
                    option_c=q.option_c,
                    option_d=q.option_d,
                    correct_option=q.correct_option,
                )
                self.db.add(question)

        self.db.commit()
        self.db.refresh(lesson)
        return lesson

    def get_lesson_ai_result(self, lesson_id: int):
        return self.db.query(LessonAIResult).filter_by(id=lesson_id).first()
