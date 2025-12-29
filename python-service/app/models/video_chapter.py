# ============================================================
# FILE 5: app/models/video_chapter.py
# ============================================================
"""
VideoChapter Model - AI-detected video chapters
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ARRAY  # ✅ Changed from JSONB
from app.core.database import Base


class VideoChapter(Base):
    __tablename__ = "video_chapters"
    __table_args__ = (
        UniqueConstraint('video_lesson_id', 'chapter_number', name='uq_video_chapter'),
        {'schema': 'academic'}
    )

    id = Column(Integer, primary_key=True, index=True)

    # ==================== Relationship ====================
    video_lesson_id = Column(Integer, ForeignKey('academic.video_lessons.id'), nullable=False)
    
    video_lesson = relationship("VideoLesson", back_populates="chapters")

    # ==================== Chapter Details ====================
    chapter_number = Column(Integer, nullable=False)
    title = Column(String(200), nullable=False)
    start_time_seconds = Column(Integer, nullable=False)
    end_time_seconds = Column(Integer, nullable=False)

    # ==================== AI Analysis ====================
    key_concepts = Column(ARRAY(String))  # ✅ PostgreSQL text[] array type
    summary = Column(Text)