# ============================================================
# FILE 2: app/domains/video_processing/router.py
# ============================================================
"""
Video Processing API Router
FastAPI endpoints for video processing
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.domains.video_processing.service import VideoProcessingService
from app.domains.video_processing.schemas import (
    ProcessVideoRequest,
    ProcessRecordingRequest,
    StartProcessingResponse,
    ProcessingStatusResponse,
    TranscriptResponse,
    ChapterDto
)
from app.core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/video-processing", tags=["Video Processing"])


@router.post("/process", response_model=StartProcessingResponse, status_code=202)
def start_video_processing(
    request: ProcessVideoRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Start processing a video (transcription, chapters, thumbnail, etc.)
    
    - **videoId**: ID of VideoLesson record
    - **videoUrl**: URL to video file (YouTube, Zoom, or direct)
    - **subjectId**: Subject ID for context
    
    Returns 202 Accepted with jobId for status tracking
    """
    try:
        result = VideoProcessingService.start_processing(
            video_id=request.videoId,
            video_url=request.videoUrl,
            subject_id=request.subjectId,
            db=db
        )
        
        return StartProcessingResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Failed to start processing: {e}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.get("/status/{job_id}", response_model=ProcessingStatusResponse)
def get_processing_status(job_id: str):
    """
    Get processing status for a job
    
    - **job_id**: Celery task ID returned from /process endpoint
    
    Returns current status, progress (0-100), and current step
    """
    try:
        status = VideoProcessingService.get_processing_status(job_id)
        return ProcessingStatusResponse(**status)
        
    except Exception as e:
        logger.error(f"❌ Failed to get status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recording", response_model=StartProcessingResponse, status_code=202)
def process_zoom_recording(
    request: ProcessRecordingRequest,
    db: Session = Depends(get_db)
):
    """
    Process a Zoom recording
    
    - **recordingId**: SessionRecording ID
    - **zoomDownloadUrl**: Zoom download URL
    - **sessionId**: LiveSession ID
    - **accessToken**: Optional Zoom OAuth token
    
    Downloads recording, uploads to YouTube, and processes
    """
    from app.domains.video_processing.tasks import process_zoom_recording
    
    try:
        task = process_zoom_recording.delay(
            session_id=request.sessionId,
            recording_url=request.zoomDownloadUrl,
            access_token=request.accessToken
        )
        
        return StartProcessingResponse(
            jobId=task.id,
            status="started"
        )
        
    except Exception as e:
        logger.error(f"❌ Failed to process Zoom recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{video_id}/transcript", response_model=TranscriptResponse)
def get_video_transcript(video_id: int, db: Session = Depends(get_db)):
    """
    Get transcript for a video
    
    - **video_id**: VideoLesson ID
    
    Returns full transcript with timestamped segments
    """
    try:
        transcript = VideoProcessingService.get_transcript(video_id, db)
        
        if not transcript:
            raise HTTPException(status_code=404, detail="Transcript not found")
        
        return TranscriptResponse(**transcript)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get transcript: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{video_id}/chapters", response_model=List[ChapterDto])
def get_video_chapters(video_id: int, db: Session = Depends(get_db)):
    """
    Get chapters for a video
    
    - **video_id**: VideoLesson ID
    
    Returns list of AI-detected chapters with timestamps
    """
    try:
        chapters = VideoProcessingService.get_chapters(video_id, db)
        return [ChapterDto(**ch) for ch in chapters]
        
    except Exception as e:
        logger.error(f"❌ Failed to get chapters: {e}")
        raise HTTPException(status_code=500, detail=str(e))
