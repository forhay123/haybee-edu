from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base


class LessonTopic(Base):
    """Lesson Topic model - matches Java LessonTopic entity"""
    __tablename__ = "lesson_topics"
    __table_args__ = {"schema": "academic"}

    id = Column(Integer, primary_key=True, index=True)
    topic_title = Column(String(255), nullable=False)
    description = Column(String(500))
    file_url = Column(String(500))
    file_name = Column(String(255))
    week_number = Column(Integer)
    question_count = Column(Integer, default=0)
    is_aspirant_material = Column(Boolean, default=False, nullable=False)
    
    # Foreign Keys
    subject_id = Column(Integer, ForeignKey("academic.subjects.id"), nullable=False)
    term_id = Column(Integer, ForeignKey("academic.terms.id"))
    
    # Relationships - ONLY the ones Java has
    subject = relationship("Subject", lazy="select", foreign_keys=[subject_id])
    term = relationship("Term", lazy="select", foreign_keys=[term_id])
    lesson_ai_results = relationship(
        "LessonAIResult",
        back_populates="lesson_topic",
        cascade="all, delete-orphan",
        lazy="select"
    )
    # DON'T add live_sessions - Java doesn't have @OneToMany for it