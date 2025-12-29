# ============================================================
# FILE 1: app/domains/video_processing/tasks.py
# ============================================================
"""
Celery Tasks for Video Processing
Async background processing for videos
"""
from celery import Task
from app.celery_app import celery_app
from app.domains.video_processing.pipeline import VideoProcessingPipeline
from app.core.logger import get_logger

logger = get_logger(__name__)


@celery_app.task(bind=True, name='video_processing.process_video_full')
def process_video_full(self: Task, video_id: int, video_url: str, subject_id: int) -> dict:
    """
    Process full video pipeline (transcribe + analyze + generate)
    
    Args:
        video_id: VideoLesson ID
        video_url: URL to video
        subject_id: Subject ID for context
    
    Returns:
        Dict with processing results
    """
    logger.info(f"🎬 Starting video processing task: video_id={video_id}, job_id={self.request.id}")
    
    try:
        pipeline = VideoProcessingPipeline(
            video_id=video_id,
            video_url=video_url,
            subject_id=subject_id,
            job_id=self.request.id
        )
        
        result = pipeline.run()
        
        logger.info(f"✅ Video processing task completed: {self.request.id}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Video processing task failed: {e}")
        
        # Retry up to 3 times with exponential backoff
        raise self.retry(exc=e, countdown=2 ** self.request.retries, max_retries=3)


@celery_app.task(name='video_processing.transcribe_video')
def transcribe_video_task(video_id: int, video_path: str) -> int:
    """
    Async transcription task
    
    Args:
        video_id: VideoLesson ID
        video_path: Path to video file
    
    Returns:
        Transcript ID
    """
    from app.ai_engine.video_transcriber import transcribe_video, save_transcript_to_db
    
    logger.info(f"🎙️ Starting transcription task: video_id={video_id}")
    
    try:
        transcript_data = transcribe_video(video_path)
        transcript_id = save_transcript_to_db(video_id, transcript_data)
        
        logger.info(f"✅ Transcription task completed: transcript_id={transcript_id}")
        return transcript_id
        
    except Exception as e:
        logger.error(f"❌ Transcription task failed: {e}")
        raise


@celery_app.task(name='video_processing.generate_chapters')
def generate_chapters_task(video_id: int, transcript: str, video_duration: int) -> int:
    """
    Async chapter detection task
    
    Args:
        video_id: VideoLesson ID
        transcript: Full transcript text
        video_duration: Duration in seconds
    
    Returns:
        Number of chapters created
    """
    from app.ai_engine.content_analyzer import detect_chapters
    from app.core.database import SessionLocal
    from app.models.video_chapter import VideoChapter
    
    logger.info(f"📚 Starting chapter generation task: video_id={video_id}")
    
    try:
        chapters = detect_chapters(transcript, video_duration)
        
        db = SessionLocal()
        try:
            for chapter_data in chapters:
                chapter = VideoChapter(
                    video_lesson_id=video_id,
                    chapter_number=chapter_data['chapter_number'],
                    title=chapter_data['title'],
                    start_time_seconds=chapter_data['start_time'],
                    end_time_seconds=chapter_data['end_time'],
                    key_concepts=chapter_data.get('key_concepts', []),
                    summary=chapter_data.get('summary', '')
                )
                db.add(chapter)
            
            db.commit()
            logger.info(f"✅ Chapter generation completed: {len(chapters)} chapters")
            return len(chapters)
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ Chapter generation failed: {e}")
        raise


@celery_app.task(name='video_processing.generate_thumbnail')
def generate_thumbnail_task(video_id: int, video_path: str, title: str = "") -> str:
    """
    Async thumbnail generation task
    
    Args:
        video_id: VideoLesson ID
        video_path: Path to video file
        title: Video title for overlay
    
    Returns:
        Thumbnail URL
    """
    from app.ai_engine.thumbnail_generator import generate_and_upload_thumbnail
    from app.core.database import SessionLocal
    from app.models.video_lesson import VideoLesson
    
    logger.info(f"🎨 Starting thumbnail generation task: video_id={video_id}")
    
    try:
        thumbnail_url = generate_and_upload_thumbnail(video_path, video_id, title)
        
        # Update video record
        db = SessionLocal()
        try:
            video = db.query(VideoLesson).filter_by(id=video_id).first()
            if video:
                video.thumbnail_custom_url = thumbnail_url
                db.commit()
        finally:
            db.close()
        
        logger.info(f"✅ Thumbnail generation completed: {thumbnail_url}")
        return thumbnail_url
        
    except Exception as e:
        logger.error(f"❌ Thumbnail generation failed: {e}")
        raise


@celery_app.task(name='video_processing.process_zoom_recording')
def process_zoom_recording(session_id: int, recording_url: str, access_token: str = None) -> dict:
    """
    Process Zoom recording: download + upload to YouTube + process
    
    Args:
        session_id: LiveSession ID
        recording_url: Zoom download URL
        access_token: Optional Zoom OAuth token
    
    Returns:
        Dict with videoId and youtubeVideoId
    """
    from app.ai_engine.utils.youtube_downloader import download_zoom_recording
    from app.core.database import SessionLocal
    from app.models.session_recording import SessionRecording
    from app.models.video_lesson import VideoLesson
    import tempfile
    from pathlib import Path
    
    logger.info(f"🎥 Processing Zoom recording for session {session_id}")
    
    try:
        # Download recording
        with tempfile.TemporaryDirectory() as temp_dir:
            video_path = Path(temp_dir) / "zoom_recording.mp4"
            download_zoom_recording(recording_url, str(video_path), access_token)
            
            # Create VideoLesson record
            db = SessionLocal()
            try:
                recording = db.query(SessionRecording).filter_by(live_session_id=session_id).first()
                
                if recording:
                    video = VideoLesson(
                        title=f"Session Recording - {session_id}",
                        teacher_id=recording.live_session.teacher_id,
                        subject_id=recording.live_session.subject_id,
                        session_recording_id=recording.id,
                        status='PROCESSING'
                    )
                    db.add(video)
                    db.commit()
                    db.refresh(video)
                    
                    video_id = video.id
                    
                    # TODO: Upload to YouTube (requires YouTube API integration)
                    # For now, just trigger processing
                    
                    # Trigger full processing
                    process_video_full.delay(video_id, str(video_path), video.subject_id)
                    
                    logger.info(f"✅ Zoom recording processing started: video_id={video_id}")
                    
                    return {
                        'videoId': video_id,
                        'status': 'processing'
                    }
                    
            finally:
                db.close()
                
    except Exception as e:
        logger.error(f"❌ Zoom recording processing failed: {e}")
        raise

