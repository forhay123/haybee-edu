"""
Video transcript generation service - Complete version with chapter generation
"""
from typing import Dict, Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
import tempfile
import json
import shutil
import os
import openai

from app.core.logger import get_logger
from app.core.database import SessionLocal
from app.core.config import settings
from app.celery_app import celery_app
from app.models.video_lesson import VideoLesson
from app.models.video_transcript import VideoTranscript
from app.models.video_chapter import VideoChapter

# ✅ Import from unified downloader module
from app.domains.video_processing.youtube_downloader import (
    download_youtube_audio,
    get_youtube_captions
)

logger = get_logger(__name__)


def transcribe_audio_with_whisper(audio_path: str) -> Dict:
    """Transcribe audio using Whisper AI"""
    try:
        import whisper
    except ImportError:
        raise Exception("whisper not installed. Install with: pip install openai-whisper")
    
    logger.info(f"🎙️ Transcribing audio with Whisper...")
    
    try:
        # Load model (will download if not cached)
        logger.info("📦 Loading Whisper model...")
        model = whisper.load_model("base", device="cpu")
        
        logger.info("🔄 Transcribing...")
        result = model.transcribe(audio_path, language='en', task='transcribe', verbose=False)
        
        full_transcript = result['text'].strip()
        segments = [
            {
                'start': seg['start'],
                'end': seg['end'],
                'text': seg['text'].strip()
            }
            for seg in result.get('segments', [])
        ]
        
        logger.info(f"✅ Transcription complete: {len(full_transcript)} chars, {len(segments)} segments")
        
        return {
            'full_text': full_transcript,
            'segments': segments,
            'language': result.get('language', 'en'),
        }
        
    except Exception as e:
        logger.error(f"❌ Transcription failed: {e}")
        raise


def generate_chapters_with_gpt(transcript_text: str, duration_seconds: int) -> List[Dict]:
    """
    Generate chapters from transcript using GPT-4
    
    Args:
        transcript_text: Full transcript text
        duration_seconds: Video duration in seconds
        
    Returns:
        List of chapter dictionaries
    """
    logger.info(f"🤖 Generating chapters with GPT-4 for {duration_seconds}s video")
    
    # Calculate approximate segments (one chapter per 2-3 minutes)
    estimated_chapters = max(2, min(10, duration_seconds // 150))
    
    prompt = f"""You are a video content analyzer. Analyze this video transcript and divide it into {estimated_chapters} meaningful chapters.

Video Duration: {duration_seconds} seconds ({duration_seconds // 60} minutes)
Transcript:
{transcript_text}

Create chapters that:
1. Have clear, descriptive titles (4-8 words)
2. Start at logical transition points in the content
3. Cover distinct topics or concepts
4. Are roughly equal in length
5. Include a brief summary (1-2 sentences)
6. List 3-5 key concepts covered

Return ONLY a JSON array with this structure:
[
  {{
    "chapter_number": 1,
    "title": "Introduction to Topic",
    "start_time_seconds": 0,
    "end_time_seconds": 120,
    "summary": "Brief description of what's covered",
    "key_concepts": ["concept1", "concept2", "concept3"]
  }}
]

IMPORTANT: 
- First chapter must start at 0
- Last chapter must end at {duration_seconds}
- No overlapping timestamps
- Return ONLY valid JSON, no markdown or explanations"""

    try:
        # Use OpenAI API
        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        
        response = client.chat.completions.create(
            model="gpt-4-turbo-preview",  # or "gpt-3.5-turbo" for faster/cheaper
            messages=[
                {"role": "system", "content": "You are a video content analyzer that creates structured chapter breakdowns."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        # Parse response
        result_text = response.choices[0].message.content.strip()
        
        # Remove markdown code blocks if present
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.startswith("```"):
            result_text = result_text[3:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]
        
        result_text = result_text.strip()
        
        # Parse JSON
        chapters = json.loads(result_text)
        
        # Validate and fix timestamps
        if not isinstance(chapters, list) or len(chapters) == 0:
            raise ValueError("Invalid chapters format")
        
        # Ensure chapters span the full video
        chapters[0]['start_time_seconds'] = 0
        chapters[-1]['end_time_seconds'] = duration_seconds
        
        logger.info(f"✅ Generated {len(chapters)} chapters")
        return chapters
        
    except json.JSONDecodeError as e:
        logger.error(f"❌ Failed to parse GPT response as JSON: {e}")
        logger.error(f"Response was: {result_text[:500]}")
        raise Exception(f"Failed to parse chapter data: {str(e)}")
        
    except Exception as e:
        logger.error(f"❌ GPT chapter generation failed: {e}")
        raise


class VideoGenerationService:
    """Service for video transcript and chapter generation"""
    
    @staticmethod
    def get_transcript(video_id: int, db: Session) -> Optional[Dict]:
        """Get transcript for a video"""
        logger.info(f"📖 Fetching transcript for video: {video_id}")
        
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
            except Exception as e:
                logger.warning(f"⚠️ Failed to parse segments: {e}")
                segments = []
        
        return {
            'videoId': video_id,
            'transcript': transcript.full_transcript,
            'segments': segments,
            'language': transcript.language,
            'modelUsed': transcript.model_used,
            'generatedAt': transcript.generated_at.isoformat() if transcript.generated_at else None
        }


@celery_app.task(bind=True, name='generate_transcript_task', max_retries=2)
def generate_transcript_task(self, video_id: int):
    """
    Async task to generate transcript with multiple fallback strategies
    """
    logger.info(f"🚀 Task started: generate_transcript for video {video_id}")
    
    db = SessionLocal()
    temp_dir = None
    
    try:
        # Get video using ORM
        video = db.query(VideoLesson).filter_by(id=video_id).first()
        
        if not video:
            logger.error(f"❌ Video {video_id} not found")
            return {"status": "error", "message": "Video not found", "video_id": video_id}
        
        logger.info(f"📹 Found video: {video.title}")
        logger.info(f"🔗 YouTube Video ID: {video.youtube_video_id}")
        
        # Check if transcript already exists
        existing = db.query(VideoTranscript).filter_by(
            video_lesson_id=video_id
        ).first()
        
        if existing:
            logger.info(f"ℹ️ Transcript already exists for video {video_id}")
            return {
                "status": "already_exists",
                "video_id": video_id,
                "transcript_id": existing.id
            }
        
        transcript_text = None
        segments_json = None
        method_used = None
        
        youtube_video_id = video.youtube_video_id
        
        if not youtube_video_id:
            logger.error(f"❌ No YouTube video ID for video {video_id}")
            raise Exception("Video must have a YouTube video ID")
        
        # 🎯 STRATEGY 1: Try YouTube captions first (fastest)
        try:
            logger.info("📝 Strategy 1: Attempting YouTube captions...")
            transcript_text = get_youtube_captions(youtube_video_id)
            segments_json = []
            method_used = 'youtube-captions'
            logger.info(f"✅ Strategy 1 SUCCESS: YouTube captions retrieved!")
            
        except Exception as e:
            logger.warning(f"⚠️ Strategy 1 failed: {type(e).__name__}: {str(e)[:100]}")
            
            # 🎯 STRATEGY 2: Try Whisper AI (more reliable than captions)
            try:
                logger.info("🎙️ Strategy 2: Attempting Whisper AI transcription...")
                temp_dir = tempfile.mkdtemp()
                
                # ✅ Use unified downloader
                audio_path = download_youtube_audio(youtube_video_id, temp_dir)
                transcript_data = transcribe_audio_with_whisper(audio_path)
                
                transcript_text = transcript_data['full_text']
                segments_json = transcript_data['segments']
                method_used = 'whisper-ai'
                
                logger.info(f"✅ Strategy 2 SUCCESS: Whisper AI transcription!")
                
            except Exception as e2:
                logger.error(f"❌ Strategy 2 failed: {type(e2).__name__}: {str(e2)[:200]}")
                
                # 🎯 STRATEGY 3: Use placeholder (last resort)
                logger.info("⚠️ Strategy 3: Using placeholder transcript...")
                transcript_text = (
                    f"[AI Generated Transcript for: {video.title}]\n\n"
                    f"Automatic transcription failed. This could be due to:\n\n"
                    f"• YouTube download restrictions (403 Forbidden)\n"
                    f"• Video privacy settings\n"
                    f"• Network connectivity issues\n"
                    f"• SSL certificate verification errors\n\n"
                    f"Error details:\n"
                    f"Strategy 1 (YouTube Captions): {str(e)[:150]}\n"
                    f"Strategy 2 (Whisper AI): {str(e2)[:150]}\n\n"
                    f"Manual transcription may be required."
                )
                segments_json = []
                method_used = 'placeholder-error'
                logger.warning(f"⚠️ Strategy 3: Using placeholder due to errors")
        
        # Save transcript to database using ORM
        transcript = VideoTranscript(
            video_lesson_id=video_id,
            full_transcript=transcript_text,
            language='en',
            segments=json.dumps(segments_json) if segments_json else None,
            model_used=method_used,
            generated_at=datetime.utcnow()
        )
        
        db.add(transcript)
        
        # Update video flags
        video.has_transcript = True
        video.updated_at = datetime.utcnow()
        
        # Flush to validate
        db.flush()
        
        # Commit
        db.commit()
        db.refresh(transcript)
        
        logger.info(f"✅ Transcript saved (ID: {transcript.id}, method: {method_used}, chars: {len(transcript_text)})")
        
        return {
            "status": "success",
            "video_id": video_id,
            "transcript_id": transcript.id,
            "method": method_used,
            "character_count": len(transcript_text),
            "segment_count": len(segments_json) if segments_json else 0,
            "message": f"Transcript generated using {method_used}"
        }
        
    except Exception as e:
        logger.error(f"❌ Transcript generation failed: {str(e)}", exc_info=True)
        try:
            db.rollback()
        except:
            pass
        
        # Retry logic for transient errors
        try:
            raise self.retry(exc=e, countdown=5, max_retries=self.max_retries)
        except self.MaxRetriesExceededError:
            return {
                "status": "error",
                "message": f"Transcript generation failed after retries: {str(e)}",
                "video_id": video_id,
                "error": str(e)
            }
        
    finally:
        # Cleanup
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
                logger.info(f"🧹 Cleaned up temp directory: {temp_dir}")
            except Exception as e:
                logger.warning(f"⚠️ Failed to cleanup temp dir: {e}")
        
        try:
            db.close()
        except:
            pass


@celery_app.task(bind=True, name='generate_chapters_task')
def generate_chapters_task(self, video_id: int):
    """
    Async task to generate chapters from transcript using GPT-4
    """
    logger.info(f"📑 Task started: generate_chapters for video {video_id}")
    
    db = SessionLocal()
    
    try:
        # Get video
        video = db.query(VideoLesson).filter_by(id=video_id).first()
        if not video:
            logger.error(f"❌ Video {video_id} not found")
            return {"status": "error", "message": "Video not found", "video_id": video_id}
        
        # Get transcript
        transcript = db.query(VideoTranscript).filter_by(
            video_lesson_id=video_id
        ).first()
        
        if not transcript:
            logger.error(f"❌ No transcript found for video {video_id}")
            return {
                "status": "error",
                "message": "Transcript not found. Generate transcript first.",
                "video_id": video_id
            }
        
        # Check if chapters already exist
        existing_chapters = db.query(VideoChapter).filter_by(
            video_lesson_id=video_id
        ).all()
        
        if existing_chapters:
            logger.info(f"ℹ️ Chapters already exist for video {video_id}")
            return {
                "status": "already_exists",
                "message": f"Video already has {len(existing_chapters)} chapters",
                "video_id": video_id,
                "chapter_count": len(existing_chapters)
            }
        
        # Get video duration (default to 600 seconds if not set)
        duration = video.duration_seconds or 600
        
        # Generate chapters using GPT-4
        logger.info(f"🤖 Calling GPT-4 to generate chapters...")
        chapters_data = generate_chapters_with_gpt(
            transcript.full_transcript,
            duration
        )
        
        # Save chapters to database
        created_chapters = []
        for chapter_data in chapters_data:
            chapter = VideoChapter(
                video_lesson_id=video_id,
                chapter_number=chapter_data['chapter_number'],
                title=chapter_data['title'],
                start_time_seconds=chapter_data['start_time_seconds'],
                end_time_seconds=chapter_data['end_time_seconds'],
                summary=chapter_data.get('summary'),
                key_concepts=chapter_data.get('key_concepts', [])
            )
            db.add(chapter)
            created_chapters.append(chapter)
        
        # Update video flags
        video.has_chapters = True
        video.updated_at = datetime.utcnow()
        
        # Commit all changes
        db.commit()
        
        logger.info(f"✅ Created {len(created_chapters)} chapters for video {video_id}")
        
        return {
            "status": "success",
            "video_id": video_id,
            "chapter_count": len(created_chapters),
            "chapters": [
                {
                    "id": ch.id,
                    "chapter_number": ch.chapter_number,
                    "title": ch.title,
                    "start_time": ch.start_time_seconds,
                    "end_time": ch.end_time_seconds
                }
                for ch in created_chapters
            ],
            "message": f"Generated {len(created_chapters)} chapters"
        }
        
    except Exception as e:
        logger.error(f"❌ Chapter generation failed: {str(e)}", exc_info=True)
        try:
            db.rollback()
        except:
            pass
        return {
            "status": "error",
            "message": str(e),
            "video_id": video_id
        }
    finally:
        try:
            db.close()
        except:
            pass