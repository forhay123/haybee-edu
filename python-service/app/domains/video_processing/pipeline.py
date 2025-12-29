# In app/domains/video_processing/pipeline.py
# Change from direct imports to lazy imports

import os
import tempfile
import requests
from pathlib import Path
from typing import Dict, Optional
from datetime import datetime
from app.core.logger import get_logger
from app.core.redis_client import redis_client
from app.core.storage import storage_client
from app.core.database import SessionLocal
from app.core.config import settings
from app.models.video_lesson import VideoLesson
from app.models.video_chapter import VideoChapter
from app.ai_engine.utils.ffmpeg_wrapper import get_video_info
from app.ai_engine.utils.youtube_downloader import (
    download_youtube_video,
    download_zoom_recording,
    download_direct_url
)
from app.ai_engine.video_transcriber import transcribe_video, save_transcript_to_db
from app.ai_engine.content_analyzer import analyze_video_content

logger = get_logger(__name__)


def _get_thumbnail_generator():
    """Lazy import to avoid cv2 import errors at startup"""
    try:
        from app.ai_engine.thumbnail_generator import generate_and_upload_thumbnail
        return generate_and_upload_thumbnail
    except ImportError as e:
        logger.error(f"⚠️ Thumbnail generator not available: {e}")
        return None


class VideoProcessingPipeline:
    """
    Main video processing orchestrator
    Similar to LessonAIService in lesson_processing
    """
    
    def __init__(self, video_id: int, video_url: str, subject_id: int, job_id: str):
        self.video_id = video_id
        self.video_url = video_url
        self.subject_id = subject_id
        self.job_id = job_id
        self.temp_dir = None
        self.video_path = None
        
        logger.info(f"🎬 Initializing VideoProcessingPipeline for video {video_id}, job {job_id}")
    
    def run(self) -> Dict:
        """
        Execute full video processing pipeline
        
        Returns:
            Dict with status and results
        """
        try:
            self._update_progress(5, "starting")
            
            # Step 1: Download video
            self.video_path = self.download_video()
            self._update_progress(15, "downloaded")
            
            # Step 2: Get video metadata
            video_info = get_video_info(self.video_path)
            self._update_progress(20, "metadata_extracted")
            
            # Step 3: Transcribe video
            transcript_data = self.transcribe()
            self._update_progress(50, "transcribed")
            
            # Step 4: Analyze content
            analysis = self.analyze_content(transcript_data, video_info['duration'])
            self._update_progress(70, "analyzed")
            
            # Step 5: Generate thumbnail
            thumbnail_url = self.generate_thumbnail()
            self._update_progress(80, "thumbnail_generated")
            
            # Step 6: Save everything to database
            self.save_results(transcript_data, analysis, thumbnail_url, video_info)
            self._update_progress(90, "saved")
            
            # Step 7: Callback to Java
            self.callback_to_java(status="completed", results=analysis)
            self._update_progress(100, "completed")
            
            # Step 8: Cleanup
            self.cleanup()
            
            logger.info(f"✅ Video processing completed for video {self.video_id}")
            
            return {
                'status': 'completed',
                'videoId': self.video_id,
                'results': analysis
            }
            
        except Exception as e:
            logger.error(f"❌ Video processing failed: {e}")
            self._update_progress(0, f"failed: {str(e)}")
            self.callback_to_java(status="failed", error=str(e))
            self.cleanup()
            raise
    
    def download_video(self) -> str:
        """Download video from URL"""
        logger.info(f"📥 Downloading video from: {self.video_url}")
        
        self.temp_dir = tempfile.mkdtemp(prefix=f"video_{self.video_id}_")
        
        # Detect URL type
        if 'youtube.com' in self.video_url or 'youtu.be' in self.video_url:
            logger.info("  Detected YouTube URL")
            video_path = download_youtube_video(self.video_url, self.temp_dir)
        elif 'zoom.us' in self.video_url:
            logger.info("  Detected Zoom recording URL")
            video_path = Path(self.temp_dir) / "recording.mp4"
            download_zoom_recording(self.video_url, str(video_path))
        else:
            logger.info("  Detected direct URL")
            video_path = Path(self.temp_dir) / "video.mp4"
            download_direct_url(self.video_url, str(video_path))
        
        logger.info(f"✅ Video downloaded: {video_path}")
        return str(video_path)
    
    def transcribe(self) -> Dict:
        """Transcribe video using Whisper"""
        logger.info(f"🎙️ Transcribing video {self.video_id}...")
        
        transcript_data = transcribe_video(self.video_path, language='en')
        
        # Save to database
        save_transcript_to_db(self.video_id, transcript_data)
        
        return transcript_data
    
    def analyze_content(self, transcript_data: Dict, video_duration: int) -> Dict:
        """Analyze content using GPT-4"""
        logger.info(f"🧠 Analyzing video content...")
        
        analysis = analyze_video_content(
            transcript=transcript_data['transcript'],
            video_duration_seconds=int(video_duration),
            segments=transcript_data.get('segments')
        )
        
        return analysis
    
    def generate_thumbnail(self) -> str:
        """Generate and upload custom thumbnail"""
        logger.info(f"🎨 Generating thumbnail...")
        
        generate_and_upload_thumbnail_fn = _get_thumbnail_generator()
        
        if not generate_and_upload_thumbnail_fn:
            logger.warning("⚠️ Skipping thumbnail generation - cv2 not available")
            return None
        
        db = SessionLocal()
        try:
            video = db.query(VideoLesson).filter_by(id=self.video_id).first()
            title = video.title if video else ""
            
            thumbnail_url = generate_and_upload_thumbnail_fn(
                video_path=self.video_path,
                video_id=self.video_id,
                title=title
            )
            
            return thumbnail_url
            
        finally:
            db.close()
    
    def save_results(self, transcript_data: Dict, analysis: Dict, thumbnail_url: str, video_info: Dict):
        """Save all results to database"""
        logger.info(f"💾 Saving results to database...")
        
        db = SessionLocal()
        try:
            # Update VideoLesson
            video = db.query(VideoLesson).filter_by(id=self.video_id).first()
            
            if video:
                video.has_transcript = True
                video.has_chapters = len(analysis.get('chapters', [])) > 0
                video.has_summary = bool(analysis.get('summary'))
                if thumbnail_url:
                    video.thumbnail_custom_url = thumbnail_url
                video.duration_seconds = int(video_info.get('duration', 0))
                
                db.commit()
                logger.info(f"  ✅ Updated VideoLesson {self.video_id}")
            
            # Save chapters
            chapters = analysis.get('chapters', [])
            for chapter_data in chapters:
                chapter = VideoChapter(
                    video_lesson_id=self.video_id,
                    chapter_number=chapter_data['chapter_number'],
                    title=chapter_data['title'],
                    start_time_seconds=chapter_data['start_time'],
                    end_time_seconds=chapter_data['end_time'],
                    key_concepts=chapter_data.get('key_concepts', []),
                    summary=chapter_data.get('summary', '')
                )
                db.add(chapter)
            
            db.commit()
            logger.info(f"  ✅ Saved {len(chapters)} chapters")
            
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Failed to save results: {e}")
            raise
        finally:
            db.close()
    
    def callback_to_java(self, status: str, results: Dict = None, error: str = None):
        """Send callback to Java service"""
        logger.info(f"📞 Sending callback to Java: status={status}")
        
        callback_url = f"{settings.JAVA_SERVICE_URL}/webhooks/python/processing-complete"
        
        payload = {
            'videoId': self.video_id,
            'status': status,
            'jobId': self.job_id
        }
        
        if results:
            payload['results'] = {
                'hasTranscript': True,
                'hasChapters': len(results.get('chapters', [])) > 0,
                'hasSummary': bool(results.get('summary')),
                'chapterCount': len(results.get('chapters', []))
            }
        
        if error:
            payload['error'] = error
        
        headers = {
            'Authorization': f'Bearer {settings.SYSTEM_TOKEN}',
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.post(callback_url, json=payload, headers=headers, timeout=10)
            response.raise_for_status()
            logger.info(f"✅ Callback successful")
        except requests.RequestException as e:
            logger.error(f"❌ Callback failed: {e}")
    
    def cleanup(self):
        """Clean up temporary files"""
        if self.temp_dir and Path(self.temp_dir).exists():
            logger.info(f"🧹 Cleaning up temp directory: {self.temp_dir}")
            import shutil
            shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def _update_progress(self, percentage: int, step_name: str):
        """Update progress in Redis"""
        key = f"processing:job:{self.job_id}"
        
        data = {
            'progress': percentage,
            'step': step_name,
            'videoId': self.video_id,
            'timestamp': str(datetime.now())
        }
        
        redis_client.set_with_ttl(key, data, 86400)  # 24 hours TTL
        
        logger.info(f"📊 Progress: {percentage}% - {step_name}")