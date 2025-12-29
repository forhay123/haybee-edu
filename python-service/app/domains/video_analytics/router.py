"""
Video Analytics API Router
FastAPI endpoints for video analytics and recommendations
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.domains.video_analytics.service import VideoAnalyticsService
from app.domains.video_analytics.recommender import VideoRecommender
from app.domains.video_analytics.schemas import (
    WatchEventRequest,
    WatchEventResponse,
    EngagementMetrics,
    WatchHistoryResponse,
    VideoRecommendation
)
from app.core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/video-analytics", tags=["Video Analytics"])


@router.post("/watch-event", response_model=WatchEventResponse)
def log_watch_event(
    request: WatchEventRequest,
    db: Session = Depends(get_db)
):
    """
    Log a video watch event (position update)
    
    Called periodically by frontend video player to track watching progress
    
    - **videoId**: VideoLesson ID
    - **studentId**: Student user ID
    - **position**: Current watch position in seconds
    - **duration**: Total video duration in seconds
    - **completed**: Whether video was fully watched (>80%)
    """
    try:
        event_data = {
            'position': request.position,
            'duration': request.duration,
            'completed': request.completed
        }
        
        success = VideoAnalyticsService.log_watch_event(
            video_id=request.videoId,
            student_id=request.studentId,
            event_data=event_data,
            db=db
        )
        
        return WatchEventResponse(success=success)
        
    except Exception as e:
        logger.error(f"❌ Failed to log watch event: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{video_id}/engagement", response_model=EngagementMetrics)
def get_video_engagement(video_id: int, db: Session = Depends(get_db)):
    """
    Get engagement metrics for a video
    
    Returns total views, completion rate, watch time, and drop-off points
    
    - **video_id**: VideoLesson ID
    """
    try:
        metrics = VideoAnalyticsService.calculate_engagement_metrics(video_id, db)
        return EngagementMetrics(**metrics)
        
    except Exception as e:
        logger.error(f"❌ Failed to get engagement metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/student/{student_id}/history", response_model=WatchHistoryResponse)
def get_student_history(student_id: int, db: Session = Depends(get_db)):
    """
    Get watch history for a student
    
    Returns list of watched videos with progress and summary stats
    
    - **student_id**: Student user ID
    """
    try:
        history = VideoAnalyticsService.get_student_watch_history(student_id, db)
        return WatchHistoryResponse(**history)
        
    except Exception as e:
        logger.error(f"❌ Failed to get watch history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recommendations/{student_id}", response_model=List[VideoRecommendation])
def get_recommendations(
    student_id: int,
    current_video_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get video recommendations for a student
    
    Returns personalized video suggestions based on watch history and current context
    
    - **student_id**: Student user ID
    - **current_video_id**: Optional current video ID for contextual recommendations
    """
    try:
        recommendations = VideoRecommender.recommend_next_videos(
            student_id=student_id,
            current_video_id=current_video_id,
            limit=5,
            db=db
        )
        
        return [VideoRecommendation(**rec) for rec in recommendations]
        
    except Exception as e:
        logger.error(f"❌ Failed to get recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))