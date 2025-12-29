from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.models.base import Base
import enum
from datetime import datetime


class SessionStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class LiveSession(Base):
    """LiveSession model - matches Java LiveSession entity"""
    __tablename__ = "live_sessions"
    __table_args__ = {'schema': 'academic'}

    id = Column(Integer, primary_key=True, index=True)

    # Foreign Keys
    lesson_topic_id = Column(Integer, ForeignKey('academic.lesson_topics.id'))
    teacher_id = Column(Integer, ForeignKey('academic.users.id'), nullable=False)
    subject_id = Column(Integer, ForeignKey('academic.subjects.id'), nullable=False)
    class_id = Column(Integer, ForeignKey('academic.classes.id'))
    term_id = Column(Integer, ForeignKey('academic.terms.id'))
    created_by_id = Column(Integer, ForeignKey('academic.users.id'), name="created_by")

    # Relationships - ONLY @ManyToOne side (no back_populates)
    lesson_topic = relationship("LessonTopic", lazy="select", foreign_keys=[lesson_topic_id])
    subject = relationship("Subject", lazy="select", foreign_keys=[subject_id])
    term = relationship("Term", lazy="select", foreign_keys=[term_id])
    
    # Zoom Meeting Details
    zoom_meeting_id = Column(String(50), unique=True, nullable=False)
    zoom_meeting_uuid = Column(String(100))
    meeting_password = Column(String(50))
    join_url = Column(Text, nullable=False)
    start_url = Column(Text, nullable=False)

    # Scheduling
    scheduled_start_time = Column(DateTime(timezone=True), nullable=False)
    scheduled_duration_minutes = Column(Integer, nullable=False, default=60)
    actual_start_time = Column(DateTime(timezone=True))
    actual_end_time = Column(DateTime(timezone=True))

    # Status & Metadata
    status = Column(SQLEnum(SessionStatus), nullable=False, default=SessionStatus.SCHEDULED)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    max_participants = Column(Integer, default=100)

    # Recording References
    has_recording = Column(Boolean, default=False)
    recording_processed = Column(Boolean, default=False)

    # Audit Fields
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)