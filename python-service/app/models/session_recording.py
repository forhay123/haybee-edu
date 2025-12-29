from sqlalchemy import Column, Integer, String, Text, DateTime, BigInteger, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.models.base import Base
import enum
from datetime import datetime


class RecordingStatus(str, enum.Enum):
    PENDING = "PENDING"
    DOWNLOADING = "DOWNLOADING"
    DOWNLOADED = "DOWNLOADED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class SessionRecording(Base):
    """SessionRecording model - matches Java SessionRecording entity"""
    __tablename__ = "session_recordings"
    __table_args__ = {'schema': 'academic'}

    id = Column(Integer, primary_key=True, index=True)

    # Foreign Key
    live_session_id = Column(Integer, ForeignKey('academic.live_sessions.id'), nullable=False)
    
    # Relationships
    video_lesson = relationship("VideoLesson", back_populates="session_recording", uselist=False)

    # Zoom Recording Details
    zoom_recording_id = Column(String(100), unique=True)
    zoom_download_url = Column(Text)
    recording_start_time = Column(DateTime(timezone=True))
    recording_end_time = Column(DateTime(timezone=True))
    duration_seconds = Column(Integer)
    file_size_bytes = Column(BigInteger)
    file_type = Column(String(20))

    # Processing Status
    status = Column(SQLEnum(RecordingStatus), default=RecordingStatus.PENDING)
    download_completed_at = Column(DateTime(timezone=True))
    processing_started_at = Column(DateTime(timezone=True))
    processing_completed_at = Column(DateTime(timezone=True))

    # YouTube Upload
    youtube_video_id = Column(String(20), unique=True)
    youtube_url = Column(Text)

    # Local Storage
    local_file_path = Column(Text)
    temp_storage_url = Column(Text)
    has_transcript = Column(Boolean, default=False)

    # Audit Fields
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)