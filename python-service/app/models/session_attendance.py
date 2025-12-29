# ============================================================
# FILE 8: app/models/session_attendance.py
# ============================================================
"""
SessionAttendance Model - Track student attendance in live sessions
"""
from sqlalchemy import Column, Integer, DateTime, Boolean, ForeignKey, String
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime


class SessionAttendance(Base):
    __tablename__ = "session_attendance"
    __table_args__ = {'schema': 'academic'}

    id = Column(Integer, primary_key=True, index=True)

    # ==================== Relationships ====================
    live_session_id = Column(Integer, ForeignKey('academic.live_sessions.id'), nullable=False)
    student_id = Column(Integer, ForeignKey('academic.users.id'), nullable=False)

    live_session = relationship("LiveSession", back_populates="attendances")
    student = relationship("User", back_populates="session_attendances")

    # ==================== Attendance Data ====================
    joined_at = Column(DateTime(timezone=True))
    left_at = Column(DateTime(timezone=True))
    duration_minutes = Column(Integer, default=0)
    attended = Column(Boolean, default=False)
    participation_score = Column(Integer)  # Optional engagement metric

    # ==================== Zoom Data ====================
    zoom_participant_id = Column(String(50))
    device_type = Column(String(20))

    # ==================== Audit ====================
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

