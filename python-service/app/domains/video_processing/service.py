# ============================================================
# FILE 1: app/domains/video_processing/service.py
# ============================================================
"""
Video Processing Service Layer
Business logic for video processing operations
"""
from typing import Optional, Dict, List
from celery.result import AsyncResult
from sqlalchemy.orm import Session
from app.celery_app import celery_app
from app.domains.video_processing.tasks import process_video_full
from app.core.redis_client import redis_client
from app.core.logger import get_logger
from app.core.config import settings
from app.models.video_lesson import VideoLesson
from app.models.video_transcript import VideoTranscript
from app.models.video_chapter import VideoChapter
import requests
import json

logger = get_logger(__name__)


class VideoProcessingService:
    """
    Service for managing video processing operations
    Similar to LessonAIService pattern
    """
    
    @staticmethod
    def start_processing(video_id: int, video_url: str, subject_id: int, db: Session) -> Dict:
        """
        Start video processing job
        
        Args:
            video_id: VideoLesson ID
            video_url: URL to video
            subject_id: Subject ID
            db: Database session
        
        Returns:
            Dict with jobId and status
        """
        logger.info(f"🎬 Starting video processing: video_id={video_id}")
        
        # Validate video exists
        video = db.query(VideoLesson).filter_by(id=video_id).first()
        if not video:
            raise ValueError(f"VideoLesson {video_id} not found")
        
        # Trigger Celery task
        task = process_video_full.delay(video_id, video_url, subject_id)
        job_id = task.id
        
        # Store job mapping in Redis
        mapping_key = f"video:job:mapping:{video_id}"
        redis_client.set_with_ttl(mapping_key, {'jobId': job_id}, 86400)
        
        logger.info(f"✅ Processing started: job_id={job_id}")
        
        return {
            'jobId': job_id,
            'status': 'started'
        }
    
    @staticmethod
    def get_processing_status(job_id: str) -> Dict:
        """
        Get processing status for a job
        
        Args:
            job_id: Celery task ID
        
        Returns:
            Dict with status, progress, currentStep, error
        """
        logger.info(f"📊 Getting status for job: {job_id}")
        
        # Get Celery task status
        task = AsyncResult(job_id, app=celery_app)
        
        # Get progress from Redis
        progress_key = f"processing:job:{job_id}"
        progress_data = redis_client.get(progress_key)
        
        result = {
            'jobId': job_id,
            'status': task.state,  # PENDING, STARTED, SUCCESS, FAILURE
            'progress': 0,
            'currentStep': None,
            'error': None
        }
        
        if progress_data:
            result['progress'] = progress_data.get('progress', 0)
            result['currentStep'] = progress_data.get('step')
        
        if task.state == 'FAILURE':
            result['error'] = str(task.info)
        elif task.state == 'SUCCESS':
            result['progress'] = 100
            result['currentStep'] = 'completed'
        
        return result
    
    @staticmethod
    def get_transcript(video_id: int, db: Session) -> Optional[Dict]:
        """
        Get transcript for a video
        
        Args:
            video_id: VideoLesson ID
            db: Database session
        
        Returns:
            Dict with transcript data or None
        """
        logger.info(f"📄 Fetching transcript for video: {video_id}")
        
        transcript = db.query(VideoTranscript).filter_by(video_lesson_id=video_id).first()
        
        if not transcript:
            return None
        
        # Parse segments from JSONB
        segments = []
        if transcript.segments:
            try:
                if isinstance(transcript.segments, str):
                    segments = json.loads(transcript.segments)
                else:
                    segments = transcript.segments
            except:
                segments = []
        
        return {
            'transcript': transcript.full_transcript,
            'segments': segments,
            'language': transcript.language,
            'generatedAt': transcript.generated_at
        }
    
    @staticmethod
    def get_chapters(video_id: int, db: Session) -> List[Dict]:
        """
        Get chapters for a video
        
        Args:
            video_id: VideoLesson ID
            db: Database session
        
        Returns:
            List of chapter dicts
        """
        logger.info(f"📚 Fetching chapters for video: {video_id}")
        
        chapters = db.query(VideoChapter).filter_by(
            video_lesson_id=video_id
        ).order_by(VideoChapter.chapter_number).all()
        
        return [
            {
                'chapterNumber': ch.chapter_number,
                'title': ch.title,
                'startTimeSeconds': ch.start_time_seconds,
                'endTimeSeconds': ch.end_time_seconds,
                'keyConcepts': ch.key_concepts if ch.key_concepts else [],
                'summary': ch.summary
            }
            for ch in chapters
        ]
    
    @staticmethod
    def callback_to_java(video_id: int, status: str, results: Dict = None, error: str = None):
        """
        Send processing complete callback to Java service
        
        Args:
            video_id: VideoLesson ID
            status: 'completed' or 'failed'
            results: Optional results dict
            error: Optional error message
        """
        logger.info(f"📞 Sending callback to Java: video_id={video_id}, status={status}")
        
        callback_url = f"{settings.JAVA_SERVICE_URL}/webhooks/python/processing-complete"
        
        payload = {
            'videoId': video_id,
            'status': status
        }
        
        if results:
            payload['results'] = results
        
        if error:
            payload['error'] = error
        
        headers = {
            'Authorization': f'Bearer {settings.SYSTEM_TOKEN}',
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.post(
                callback_url,
                json=payload,
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            logger.info(f"✅ Callback successful: {response.status_code}")
        except requests.RequestException as e:
            logger.error(f"❌ Callback failed: {e}")
            # Retry logic
            for attempt in range(3):
                try:
                    response = requests.post(callback_url, json=payload, headers=headers, timeout=10)
                    response.raise_for_status()
                    logger.info(f"✅ Callback retry {attempt + 1} successful")
                    break
                except:
                    continue