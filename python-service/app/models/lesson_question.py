# app/models/lesson_question.py
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class LessonQuestion(Base):
    """
    Stores individual questions generated from a lesson's processed text.
    Supports both theory and multiple-choice questions.
    """
    __tablename__ = "lesson_questions"
    __table_args__ = {"schema": "ai"}

    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("ai.lesson_ai_results.id", ondelete="CASCADE"))
    lesson = relationship("LessonAIResult", back_populates="questions")

    question_text = Column(Text, nullable=False)
    difficulty = Column(String(50), nullable=True)
    max_score = Column(Integer, default=1)

    # For theory questions
    answer_text = Column(Text, nullable=True)

    # For multiple-choice questions
    option_a = Column(Text, nullable=True)
    option_b = Column(Text, nullable=True)
    option_c = Column(Text, nullable=True)
    option_d = Column(Text, nullable=True)
    correct_option = Column(String(1), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
