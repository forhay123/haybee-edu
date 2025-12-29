#!/usr/bin/env python
"""
Test transcript generation with your actual videos
"""
import os
import sys

# Add app to path
sys.path.insert(0, '/app')

os.environ.setdefault('DATABASE_URL', 'postgresql+psycopg2://edu_admin:edu_password@postgres:5432/edu_db')

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.video_lesson import VideoLesson
from youtube_transcript_api import YouTubeTranscriptApi
import tempfile

def test_youtube_captions(video_id: str):
    """Test if a YouTube video has captions"""
    print(f"\n🔍 Testing YouTube Captions for video: {video_id}")
    print("-" * 60)
    
    try:
        # Try English
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
        text = ' '.join([item['text'] for item in transcript])
        print(f"✅ English captions available!")
        print(f"   - Segments: {len(transcript)}")
        print(f"   - Characters: {len(text)}")
        print(f"   - Sample: {text[:150]}...")
        return True, text
    except Exception as e:
        print(f"❌ English captions failed: {type(e).__name__}")
        
        try:
            print(f"   Trying auto-generated...")
            transcript = YouTubeTranscriptApi.get_transcript(video_id)
            text = ' '.join([item['text'] for item in transcript])
            print(f"✅ Auto-generated captions available!")
            print(f"   - Segments: {len(transcript)}")
            print(f"   - Characters: {len(text)}")
            print(f"   - Sample: {text[:150]}...")
            return True, text
        except Exception as e2:
            print(f"❌ Auto-generated failed: {type(e2).__name__}: {str(e2)[:80]}")
            return False, None


def test_whisper_download(video_id: str):
    """Test if Whisper can download and transcribe"""
    print(f"\n🎙️ Testing Whisper Transcription for video: {video_id}")
    print("-" * 60)
    
    try:
        import yt_dlp
        import whisper
        
        # Create temp directory
        temp_dir = tempfile.mkdtemp()
        output_path = os.path.join(temp_dir, f"{video_id}.mp3")
        
        print(f"📥 Downloading audio...")
        ydl_opts = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'outtmpl': os.path.join(temp_dir, f"{video_id}.%(ext)s"),
            'quiet': True,
            'no_warnings': True,
            'socket_timeout': 30,
            'retries': 3,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([f'https://www.youtube.com/watch?v={video_id}'])
        
        if not os.path.exists(output_path):
            print(f"❌ Audio download failed")
            return False, None
        
        file_size = os.path.getsize(output_path) / (1024 * 1024)
        print(f"✅ Audio downloaded ({file_size:.1f} MB)")
        
        print(f"🎤 Transcribing (this may take 1-2 minutes)...")
        model = whisper.load_model("base", device="cpu")
        result = model.transcribe(output_path, language='en', verbose=False)
        
        text = result['text'].strip()
        print(f"✅ Whisper transcription complete!")
        print(f"   - Characters: {len(text)}")
        print(f"   - Sample: {text[:150]}...")
        
        # Cleanup
        import shutil
        shutil.rmtree(temp_dir)
        
        return True, text
        
    except Exception as e:
        print(f"❌ Whisper failed: {type(e).__name__}: {str(e)[:100]}")
        return False, None


def main():
    print("=" * 60)
    print("🎬 TESTING YOUR ACTUAL VIDEOS")
    print("=" * 60)
    
    # Get videos from database
    db = SessionLocal()
    videos = db.query(VideoLesson).all()
    
    print(f"\nFound {len(videos)} videos in database:")
    print("-" * 60)
    
    for video in videos:
        print(f"\n📺 Video ID: {video.id}")
        print(f"   Title: {video.title}")
        print(f"   YouTube ID: {video.youtube_video_id}")
        print(f"   Duration: {video.duration_seconds}s")
        print(f"   Has Transcript: {video.has_transcript}")
        
        # Test YouTube captions
        yt_ok, yt_text = test_youtube_captions(video.youtube_video_id)
        
        if yt_ok:
            print(f"\n✅ RESULT: YouTube captions will work for this video!")
        else:
            print(f"\n⚠️ YouTube captions not available")
            print(f"   Would need to use Whisper AI transcription (slower)")
            
            # Optionally test Whisper (uncomment to enable)
            # whisper_ok, whisper_text = test_whisper_download(video.youtube_video_id)
    
    db.close()
    
    print("\n" + "=" * 60)
    print("✅ TEST COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()