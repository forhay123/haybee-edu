# ============================================================
# FILE 2: app/ai_engine/video_transcriber.py
# ============================================================
"""
Video Transcription Module using OpenAI Whisper
Extracts audio and generates accurate transcriptions with timestamps
"""
import os
import tempfile
from pathlib import Path
from typing import Dict, List, Optional
from openai import OpenAI
from app.ai_engine.utils.ffmpeg_wrapper import extract_audio
from app.core.config import settings
from app.core.logger import get_logger
from app.core.database import SessionLocal
from app.models.video_transcript import VideoTranscript
import json

logger = get_logger(__name__)
client = OpenAI(api_key=settings.OPENAI_API_KEY)


def transcribe_video(video_path: str, language: str = 'en') -> Dict:
    """
    Transcribe video using OpenAI Whisper API
    
    Args:
        video_path: Path to video file
        language: Language code (default: 'en')
    
    Returns:
        Dict with transcript, segments, and language
    """
    logger.info(f"🎙️ Starting transcription for: {video_path}")
    
    # Step 1: Extract audio from video
    with tempfile.TemporaryDirectory() as temp_dir:
        audio_path = Path(temp_dir) / "audio.wav"
        
        try:
            logger.info("📤 Extracting audio from video...")
            extract_audio(video_path, str(audio_path))
            logger.info(f"✅ Audio extracted: {audio_path}")
            
            # Step 2: Transcribe using Whisper API
            logger.info("🔊 Sending to Whisper API...")
            with open(audio_path, 'rb') as audio_file:
                response = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="verbose_json",
                    language=language,
                    timestamp_granularities=["segment"]
                )
            
            # Step 3: Parse response
            full_transcript = response.text
            segments = []
            
            if hasattr(response, 'segments') and response.segments:
                for seg in response.segments:
                    segments.append({
                        'start': seg['start'],
                        'end': seg['end'],
                        'text': seg['text'].strip()
                    })
            
            logger.info(f"✅ Transcription complete: {len(full_transcript.split())} words, {len(segments)} segments")
            
            return {
                'transcript': full_transcript,
                'segments': segments,
                'language': language
            }
            
        except Exception as e:
            logger.error(f"❌ Transcription failed: {e}")
            raise RuntimeError(f"Transcription failed: {e}") from e


def save_transcript_to_db(video_id: int, transcript_data: Dict) -> int:
    """
    Save transcript to database
    
    Args:
        video_id: VideoLesson ID
        transcript_data: Dict from transcribe_video()
    
    Returns:
        Transcript ID
    """
    db = SessionLocal()
    try:
        logger.info(f"💾 Saving transcript for video {video_id}...")
        
        # Check if transcript already exists
        existing = db.query(VideoTranscript).filter_by(video_lesson_id=video_id).first()
        
        if existing:
            logger.info(f"🔄 Updating existing transcript {existing.id}")
            existing.full_transcript = transcript_data['transcript']
            existing.segments = json.dumps(transcript_data['segments'])
            existing.language = transcript_data['language']
            existing.model_used = "whisper-1"
            transcript = existing
        else:
            # Create new transcript
            transcript = VideoTranscript(
                video_lesson_id=video_id,
                full_transcript=transcript_data['transcript'],
                segments=json.dumps(transcript_data['segments']),
                language=transcript_data['language'],
                model_used="whisper-1",
                confidence_score=0.95  # Whisper generally high confidence
            )
            db.add(transcript)
        
        db.commit()
        db.refresh(transcript)
        
        logger.info(f"✅ Transcript saved with ID: {transcript.id}")
        return transcript.id
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Failed to save transcript: {e}")
        raise
    finally:
        db.close()


def get_transcript_text(video_id: int) -> Optional[str]:
    """
    Retrieve transcript text for a video
    
    Args:
        video_id: VideoLesson ID
    
    Returns:
        Transcript text or None
    """
    db = SessionLocal()
    try:
        transcript = db.query(VideoTranscript).filter_by(video_lesson_id=video_id).first()
        return transcript.full_transcript if transcript else None
    finally:
        db.close()