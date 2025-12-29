# ============================================================
# FILE 2: app/domains/video_analytics/schemas.py
# ============================================================
"""
Pydantic Schemas for Video Analytics API
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class WatchEventRequest(BaseModel):
    videoId: int
    studentId: int
    position: int = Field(..., description="Current position in seconds")
    duration: int = Field(..., description="Watch duration for this event")
    completed: bool = False


class WatchEventResponse(BaseModel):
    success: bool


class EngagementMetrics(BaseModel):
    totalViews: int
    avgCompletionRate: float
    totalWatchTime: int = Field(..., description="Total watch time in seconds")
    dropOffPoints: List[int] = Field(..., description="Timestamps where students drop off")


class WatchHistoryItem(BaseModel):
    videoId: int
    videoTitle: str
    subjectName: str
    teacherName: str
    watchStartedAt: datetime
    lastPositionSeconds: int
    totalWatchTimeSeconds: int
    completed: bool
    completionPercentage: float


class WatchHistoryResponse(BaseModel):
    history: List[WatchHistoryItem]
    totalWatchTime: int
    videosCompleted: int


class VideoRecommendation(BaseModel):
    videoId: int
    title: str
    subjectName: str
    teacherName: str
    durationSeconds: int
    thumbnailUrl: Optional[str] = None
    score: int = Field(..., description="Recommendation score (higher = better match)")
    reason: str = Field(..., description="Why this video is recommended")
