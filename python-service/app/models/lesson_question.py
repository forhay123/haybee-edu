# app/models/lesson_question.py
"""
Enhanced LessonQuestion model with workings support for calculation-based questions
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class LessonQuestion(Base):
    """
    Stores individual questions generated from a lesson's processed text.
    Supports both theory and multiple-choice questions.
    
    ✅ NEW: Added 'workings' field for step-by-step solutions
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

    # ✅ NEW: Step-by-step workings for calculation-based questions
    workings = Column(
        Text, 
        nullable=True,
        comment="Step-by-step solution showing how to arrive at the answer"
    )

    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "lesson_id": self.lesson_id,
            "question_text": self.question_text,
            "difficulty": self.difficulty,
            "max_score": self.max_score,
            "answer_text": self.answer_text,
            "option_a": self.option_a,
            "option_b": self.option_b,
            "option_c": self.option_c,
            "option_d": self.option_d,
            "correct_option": self.correct_option,
            "workings": self.workings,  # ✅ Include in API responses
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
    
    @property
    def is_mcq(self) -> bool:
        """Check if this is an MCQ question"""
        return any([self.option_a, self.option_b, self.option_c, self.option_d])
    
    @property
    def is_theory(self) -> bool:
        """Check if this is a theory question"""
        return not self.is_mcq
    
    @property
    def has_workings(self) -> bool:
        """Check if this question has workings"""
        return self.workings is not None and self.workings.strip() != ""