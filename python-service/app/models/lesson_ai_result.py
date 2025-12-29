# app/models/lesson_ai_result.py
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class LessonAIResult(Base):
    """
    Stores AI processing results for a specific lesson file (PDF, image, etc.),
    including summary, questions, and background processing status.
    """
    __tablename__ = "lesson_ai_results"
    __table_args__ = {"schema": "ai"}

    id = Column(Integer, primary_key=True, index=True)

    # Foreign key to academic.lesson_topics
    lesson_topic_id = Column(Integer, ForeignKey("academic.lesson_topics.id", ondelete="CASCADE"), nullable=False)
    lesson_topic = relationship("LessonTopic", back_populates="lesson_ai_results")

    subject_id = Column(Integer, nullable=False, index=True)
    week_number = Column(Integer, nullable=False, index=True)
    file_url = Column(String(1024), nullable=False)
    extracted_text = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)

    # Track background processing
    status = Column(String(50), default="pending")  # pending, processing, done, failed
    progress = Column(Float, default=0.0)           # 0–100%

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    questions = relationship(
        "LessonQuestion",
        back_populates="lesson",
        cascade="all, delete-orphan",
        lazy="joined",
    )
