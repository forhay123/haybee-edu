# ============================================================
# FILE 4: app/models/video_transcript.py
# ============================================================
"""
VideoTranscript Model - AI-generated transcriptions
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.core.database import Base
from datetime import datetime


class VideoTranscript(Base):
    __tablename__ = "video_transcripts"
    __table_args__ = {'schema': 'academic'}

    id = Column(Integer, primary_key=True, index=True)

    # ==================== Relationship ====================
    video_lesson_id = Column(Integer, ForeignKey('academic.video_lessons.id'), nullable=False)
    
    video_lesson = relationship("VideoLesson", back_populates="transcript")

    # ==================== Transcript Data ====================
    full_transcript = Column(Text, nullable=False)
    language = Column(String(10), default='en')
    segments = Column(JSONB)  # Array of {start, end, text}

    # ==================== Metadata ====================
    generated_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    model_used = Column(String(50))
    confidence_score = Column(Numeric(4, 3))
