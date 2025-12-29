"""
Diagnostic script to identify why transcript generation is failing
Run this in your Python service container to troubleshoot
"""
import sys
import subprocess
from pathlib import Path

def check_import(module_name: str, package_name: str = None):
    """Check if a module can be imported"""
    package = package_name or module_name
    try:
        __import__(module_name)
        print(f"✅ {package} - OK")
        return True
    except ImportError as e:
        print(f"❌ {package} - FAILED: {e}")
        return False

def check_ffmpeg():
    """Check if FFmpeg is installed"""
    try:
        result = subprocess.run(['ffmpeg', '-version'], 
                              capture_output=True, 
                              timeout=5,
                              text=True)
        if result.returncode == 0:
            # Extract version
            first_line = result.stdout.split('\n')[0]
            print(f"✅ FFmpeg - OK ({first_line})")
            return True
    except Exception as e:
        print(f"❌ FFmpeg - FAILED: {e}")
        return False

def check_youtube_video(video_id: str):
    """Test YouTube transcript API with a real video"""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        
        print(f"\n🔍 Testing YouTube Transcript API with video: {video_id}")
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        
        if transcript:
            text = ' '.join([item['text'] for item in transcript])
            print(f"✅ YouTube captions fetched - {len(text)} characters")
            print(f"   Sample: {text[:100]}...")
            return True
        else:
            print(f"❌ YouTube captions - Empty response")
            return False
            
    except Exception as e:
        print(f"❌ YouTube captions - FAILED: {type(e).__name__}: {e}")
        return False

def check_whisper():
    """Test Whisper installation and model loading"""
    try:
        import whisper
        print(f"\n🔍 Testing Whisper AI")
        print(f"   Loading base model (this may take a moment)...")
        
        model = whisper.load_model("base", device="cpu")
        print(f"✅ Whisper model loaded successfully")
        return True
        
    except Exception as e:
        print(f"❌ Whisper - FAILED: {type(e).__name__}: {e}")
        return False

def check_youtube_download():
    """Test yt-dlp download capability"""
    try:
        import yt_dlp
        print(f"\n🔍 Testing yt-dlp (YouTube download)")
        
        # Just check if it can initialize
        ydl = yt_dlp.YoutubeDL({'quiet': True})
        print(f"✅ yt-dlp initialized successfully")
        return True
        
    except Exception as e:
        print(f"❌ yt-dlp - FAILED: {type(e).__name__}: {e}")
        return False

def main():
    print("=" * 60)
    print("🔧 TRANSCRIPT GENERATION DIAGNOSTIC")
    print("=" * 60)
    
    print("\n1️⃣  CHECKING CORE DEPENDENCIES")
    print("-" * 60)
    
    deps_ok = True
    deps_ok &= check_import("fastapi")
    deps_ok &= check_import("sqlalchemy")
    deps_ok &= check_import("requests")
    
    print("\n2️⃣  CHECKING VIDEO PROCESSING LIBRARIES")
    print("-" * 60)
    
    video_ok = True
    video_ok &= check_import("yt_dlp", "yt-dlp")
    video_ok &= check_import("youtube_transcript_api", "youtube-transcript-api")
    video_ok &= check_import("whisper", "openai-whisper")
    video_ok &= check_import("cv2", "opencv-python")
    
    print("\n3️⃣  CHECKING SYSTEM TOOLS")
    print("-" * 60)
    
    tools_ok = check_ffmpeg()
    
    print("\n4️⃣  CHECKING CELERY & REDIS")
    print("-" * 60)
    
    celery_ok = True
    celery_ok &= check_import("celery")
    celery_ok &= check_import("redis")
    
    print("\n5️⃣  TESTING REAL-WORLD SCENARIOS")
    print("-" * 60)
    
    # Test with a short, public video
    test_video_id = "dQw4w9WgXcQ"  # Famous rickroll - guaranteed to have captions
    yt_test_ok = check_youtube_video(test_video_id)
    
    # Test Whisper
    print()
    whisper_ok = check_whisper()
    
    # Test yt-dlp
    print()
    ytdlp_ok = check_youtube_download()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    
    print(f"Core Dependencies:     {'✅ PASS' if deps_ok else '❌ FAIL'}")
    print(f"Video Libraries:       {'✅ PASS' if video_ok else '❌ FAIL'}")
    print(f"System Tools:          {'✅ PASS' if tools_ok else '❌ FAIL'}")
    print(f"Celery/Redis:          {'✅ PASS' if celery_ok else '❌ FAIL'}")
    print(f"YouTube Captions:      {'✅ PASS' if yt_test_ok else '❌ FAIL'}")
    print(f"Whisper AI:            {'✅ PASS' if whisper_ok else '❌ FAIL'}")
    print(f"yt-dlp:                {'✅ PASS' if ytdlp_ok else '❌ FAIL'}")
    
    all_ok = deps_ok and video_ok and tools_ok and celery_ok
    
    print("\n" + "=" * 60)
    if all_ok:
        print("✅ All systems operational!")
        print("   Transcript generation should work.")
        if not yt_test_ok or not whisper_ok:
            print("\n⚠️  WARNING: Some optional features may be limited")
            print("   - YouTube captions not working (try different video)")
            print("   - Whisper AI not available (video must have captions)")
    else:
        print("❌ ISSUES DETECTED")
        print("\nFix the failing components and try again.")
        print("\nCommon fixes:")
        print("1. FFmpeg not installed:")
        print("   Ubuntu/Debian: sudo apt-get install ffmpeg")
        print("   macOS: brew install ffmpeg")
        print("   Windows: Download from https://ffmpeg.org/download.html")
        print("\n2. Missing Python packages:")
        print("   pip install -r requirements.txt")
        print("\n3. Whisper model download failing:")
        print("   Check internet connection and disk space")
        print("   Whisper models are ~3GB total")
    
    print("\n" + "=" * 60)
    return 0 if all_ok else 1

if __name__ == "__main__":
    sys.exit(main())