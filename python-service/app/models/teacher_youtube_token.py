# ============================================================
# FILE 7: app/models/teacher_youtube_token.py
# ============================================================
"""
TeacherYouTubeToken Model - OAuth tokens for YouTube uploads
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime


class TeacherYouTubeToken(Base):
    __tablename__ = "teacher_youtube_tokens"
    __table_args__ = {'schema': 'academic'}

    id = Column(Integer, primary_key=True, index=True)

    # ==================== Relationship ====================
    teacher_id = Column(Integer, ForeignKey('academic.users.id'), unique=True, nullable=False)
    
    teacher = relationship("User", back_populates="youtube_token")

    # ==================== OAuth Tokens ====================
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=False)
    token_type = Column(String(20), default='Bearer')

    # ==================== Token Metadata ====================
    expires_at = Column(DateTime(timezone=True), nullable=False)
    scope = Column(Text)

    # ==================== YouTube Channel Info ====================
    youtube_channel_id = Column(String(50))
    youtube_channel_name = Column(String(200))

    # ==================== Audit Fields ====================
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    last_used_at = Column(DateTime(timezone=True))

    # ==================== Helper Methods ====================
    def is_expired(self):
        return datetime.utcnow() > self.expires_at

    def needs_refresh(self):
        # Refresh if token expires in next 5 minutes
        return datetime.utcnow().timestamp() + 300 > self.expires_at.timestamp()
