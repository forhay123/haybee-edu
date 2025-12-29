from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum as SQLEnum, Numeric, func
from sqlalchemy.orm import relationship
from app.models.base import Base
import enum
from datetime import datetime


class VideoStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    PUBLISHED = "PUBLISHED"
    FAILED = "FAILED"


class VideoLesson(Base):
    """VideoLesson model - matches Java VideoLesson entity"""
    __tablename__ = "video_lessons"
    __table_args__ = {'schema': 'academic'}

    id = Column(Integer, primary_key=True, index=True)

    # Foreign Keys
    # ✅ KEEP ForeignKey for same-schema references (academic.*)
    lesson_topic_id = Column(Integer, ForeignKey('academic.lesson_topics.id', ondelete='SET NULL'))
    subject_id = Column(Integer, ForeignKey('academic.subjects.id', ondelete='CASCADE'), nullable=False)
    session_recording_id = Column(Integer, ForeignKey('academic.session_recordings.id', ondelete='SET NULL'))
    
    # ✅ NO ForeignKey for cross-schema reference (core.users) - just a plain column
    # The constraint exists at DB level but SQLAlchemy won't try to resolve it
    teacher_id = Column(Integer, nullable=False)

    # Relationships
    lesson_topic = relationship("LessonTopic", lazy="select", foreign_keys=[lesson_topic_id])
    subject = relationship("Subject", lazy="select", foreign_keys=[subject_id])
    session_recording = relationship("SessionRecording", back_populates="video_lesson", lazy="select", foreign_keys=[session_recording_id])
    transcript = relationship("VideoTranscript", back_populates="video_lesson", uselist=False, cascade="all, delete-orphan")
    chapters = relationship("VideoChapter", back_populates="video_lesson", cascade="all, delete-orphan")
    watch_histories = relationship("VideoWatchHistory", back_populates="video_lesson", cascade="all, delete-orphan")

    # YouTube Details
    youtube_video_id = Column(String(20), unique=True)
    youtube_url = Column(Text)
    embed_url = Column(Text)
    youtube_channel_id = Column(String(50))

    # Metadata
    title = Column(String(200), nullable=False)
    description = Column(Text)
    duration_seconds = Column(Integer)
    thumbnail_url = Column(Text)
    thumbnail_custom_url = Column(Text)

    # Processing Status
    status = Column(SQLEnum(VideoStatus), default=VideoStatus.PENDING)
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    processing_completed_at = Column(DateTime(timezone=True))

    # AI-Generated Content Flags
    has_transcript = Column(Boolean, default=False)
    has_chapters = Column(Boolean, default=False)
    has_quiz = Column(Boolean, default=False)
    has_summary = Column(Boolean, default=False)

    # Access Control
    is_aspirant_material = Column(Boolean, default=False)
    is_public = Column(Boolean, default=False)
    is_premium = Column(Boolean, default=False)
    published = Column(Boolean, default=False)

    # Analytics Summary
    total_views = Column(Integer, default=0)
    average_completion_rate = Column(Numeric(5, 2))

    # Audit Fields
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<VideoLesson(id={self.id}, title={self.title}, youtube_id={self.youtube_video_id})>"