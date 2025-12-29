from sqlalchemy import Column, Integer, DateTime, Boolean, ForeignKey, Numeric, String
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base
from datetime import datetime
import uuid


class VideoWatchHistory(Base):
    """VideoWatchHistory model - matches Java VideoWatchHistory entity"""
    __tablename__ = "video_watch_history"
    __table_args__ = {'schema': 'academic'}

    id = Column(Integer, primary_key=True, index=True)

    # Foreign Keys
    video_lesson_id = Column(Integer, ForeignKey('academic.video_lessons.id'), nullable=False)
    student_id = Column(Integer, ForeignKey('academic.users.id'), nullable=False)

    # Relationships
    video_lesson = relationship("VideoLesson", back_populates="watch_histories")
    # DON'T add student relationship unless you have User model

    # Watch Data
    watch_started_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    watch_ended_at = Column(DateTime(timezone=True))
    last_position_seconds = Column(Integer, default=0)
    total_watch_time_seconds = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    completion_percentage = Column(Numeric(5, 2))

    # Session Info
    session_id = Column(UUID(as_uuid=True), default=uuid.uuid4)
    device_type = Column(String(20))