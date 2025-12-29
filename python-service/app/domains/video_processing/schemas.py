# ============================================================
# FILE 2: app/domains/video_processing/schemas.py
# ============================================================
"""
Pydantic Schemas for Video Processing API
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime


class ProcessVideoRequest(BaseModel):
    videoId: int = Field(..., description="VideoLesson ID")
    videoUrl: str = Field(..., description="URL to video file or YouTube URL")
    subjectId: int = Field(..., description="Subject ID for context")


class ProcessRecordingRequest(BaseModel):
    recordingId: int = Field(..., description="SessionRecording ID")
    zoomDownloadUrl: str = Field(..., description="Zoom recording download URL")
    sessionId: int = Field(..., description="LiveSession ID")
    accessToken: Optional[str] = Field(None, description="Zoom OAuth token")


class ProcessingStatusResponse(BaseModel):
    jobId: str
    status: str = Field(..., description="PENDING, STARTED, PROGRESS, SUCCESS, FAILURE")
    progress: int = Field(0, description="0-100")
    currentStep: Optional[str] = None
    error: Optional[str] = None


class StartProcessingResponse(BaseModel):
    jobId: str
    status: str = "started"


class TranscriptSegment(BaseModel):
    start: float
    end: float
    text: str


class TranscriptResponse(BaseModel):
    transcript: str
    segments: List[TranscriptSegment]
    language: str
    generatedAt: datetime


class ChapterDto(BaseModel):
    chapterNumber: int
    title: str
    startTimeSeconds: int
    endTimeSeconds: int
    keyConcepts: Optional[List[str]] = None
    summary: Optional[str] = None