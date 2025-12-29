"""
app/domains/video_processing/generation_router.py
Fixed version - imports task inside function to avoid circular imports
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.logger import get_logger
from app.models.video_lesson import VideoLesson
from app.models.video_chapter import VideoChapter
from app.models.video_transcript import VideoTranscript

logger = get_logger(__name__)
router = APIRouter(prefix="/videos", tags=["Video Generation"])

@router.post("/{video_id}/transcript/generate")
@router.post("/{video_id}/generate-transcript")
def generate_transcript(
    video_id: int,
    db: Session = Depends(get_db)
):
    """Trigger transcript generation for a video"""
    logger.info(f"📝 Transcript generation requested for video {video_id}")
    
    try:
        # Verify video exists
        video = db.query(VideoLesson).filter_by(id=video_id).first()
        if not video:
            logger.error(f"❌ Video {video_id} not found")
            raise HTTPException(status_code=404, detail="Video not found")
        
        # Check if video has YouTube ID
        if not video.youtube_video_id:
            raise HTTPException(
                status_code=400,
                detail="Video must have YouTube video ID to generate transcript"
            )
        
        # Check if transcript already exists
        existing = db.query(VideoTranscript).filter_by(
            video_lesson_id=video_id
        ).first()
        
        if existing:
            logger.info(f"ℹ️ Transcript already exists for video {video_id}")
            return {
                'status': 'already_exists',
                'message': 'Transcript already generated for this video',
                'transcriptId': existing.id
            }
        
        # ✅ Import task HERE, not at top of file
        logger.info(f"🔄 Importing Celery task...")
        from app.domains.video_processing.generation_service import generate_transcript_task
        
        # Queue async task
        logger.info(f"📤 Calling task.delay({video_id})")
        task = generate_transcript_task.delay(video_id)
        
        logger.info(f"✅ Task queued with ID: {task.id}")
        
        return {
            'status': 'queued',
            'message': 'Transcript generation started',
            'taskId': str(task.id),
            'videoId': video_id
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error generating transcript: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{video_id}/generate-chapters")
def generate_chapters(
    video_id: int,
    db: Session = Depends(get_db)
):
    """Trigger chapter generation for a video"""
    logger.info(f"📚 Chapter generation requested for video {video_id}")
    
    try:
        # Verify video exists
        video = db.query(VideoLesson).filter_by(id=video_id).first()
        if not video:
            logger.error(f"❌ Video {video_id} not found")
            raise HTTPException(status_code=404, detail="Video not found")
        
        # Check if chapters already exist
        existing_chapters = db.query(VideoChapter).filter_by(
            video_lesson_id=video_id
        ).all()
        
        if existing_chapters:
            logger.info(f"ℹ️ Chapters already exist for video {video_id}")
            return {
                'status': 'already_exists',
                'message': f'Video already has {len(existing_chapters)} chapters',
                'chapterCount': len(existing_chapters)
            }
        
        # ✅ Import task HERE
        from app.domains.video_processing.generation_service import generate_chapters_task
        
        logger.info(f"🔄 Queueing chapter generation task")
        task = generate_chapters_task.delay(video_id)
        
        return {
            'status': 'queued',
            'message': 'Chapter generation started',
            'taskId': str(task.id),
            'videoId': video_id
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error generating chapters: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{video_id}/transcript")
def get_transcript(
    video_id: int,
    db: Session = Depends(get_db)
):
    """Get transcript for a video"""
    logger.info(f"📄 Fetching transcript for video {video_id}")
    
    try:
        from app.domains.video_processing.generation_service import VideoGenerationService
        
        transcript = VideoGenerationService.get_transcript(video_id, db)
        
        if not transcript:
            raise HTTPException(
                status_code=404,
                detail="Transcript not found. Generate one first."
            )
        
        return transcript
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error fetching transcript: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{video_id}/chapters")
def get_chapters(
    video_id: int,
    db: Session = Depends(get_db)
):
    """Get chapters for a video"""
    logger.info(f"📚 Fetching chapters for video {video_id}")
    
    try:
        chapters = db.query(VideoChapter).filter_by(
            video_lesson_id=video_id
        ).order_by(VideoChapter.chapter_number).all()
        
        if not chapters:
            raise HTTPException(
                status_code=404,
                detail="No chapters found. Generate them first."
            )
        
        return {
            'videoId': video_id,
            'chapterCount': len(chapters),
            'chapters': [
                {
                    'id': ch.id,
                    'chapterNumber': ch.chapter_number,
                    'title': ch.title,
                    'startTimeSeconds': ch.start_time_seconds,
                    'endTimeSeconds': ch.end_time_seconds,
                    'summary': ch.summary,
                    'keyConcepts': ch.key_concepts or []
                }
                for ch in chapters
            ]
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error fetching chapters: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/task/{task_id}/status")
def get_task_status(task_id: str):
    """Get status of a generation task"""
    logger.info(f"🔍 Fetching task status for {task_id}")
    
    try:
        from app.celery_app import celery_app
        
        task = celery_app.AsyncResult(task_id)
        
        response = {
            'taskId': task_id,
            'state': task.state,
        }
        
        if task.state == 'SUCCESS':
            response['result'] = task.result
        elif task.state == 'FAILURE':
            response['error'] = str(task.info)
        elif task.state == 'PENDING':
            response['status'] = 'Task not yet started or does not exist'
        elif task.state == 'PROGRESS':
            response['info'] = task.info
        
        return response
        
    except Exception as e:
        logger.error(f"❌ Error getting task status: {e}")
        raise HTTPException(status_code=500, detail=str(e))