#!/usr/bin/env python
"""
Test Whisper transcription with your actual video
This will attempt to download and transcribe ONE video to verify Whisper works
"""
import os
import sys
import tempfile
import shutil

# Add app to path
sys.path.insert(0, '/app')

def test_full_whisper_pipeline(youtube_video_id: str):
    """Test complete Whisper pipeline with a real video"""
    print(f"\n{'='*60}")
    print(f"🎯 TESTING FULL WHISPER PIPELINE")
    print(f"   Video: https://www.youtube.com/watch?v={youtube_video_id}")
    print(f"{'='*60}\n")
    
    temp_dir = None
    
    try:
        # Step 1: Import dependencies
        print("📦 Step 1: Loading dependencies...")
        import yt_dlp
        import whisper
        print("   ✅ Dependencies loaded\n")
        
        # Step 2: Create temp directory
        temp_dir = tempfile.mkdtemp()
        print(f"📁 Step 2: Created temp directory: {temp_dir}\n")
        
        # Step 3: Download audio
        print("📥 Step 3: Downloading audio from YouTube...")
        output_path = os.path.join(temp_dir, f"{youtube_video_id}.mp3")
        
        ydl_opts = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'outtmpl': os.path.join(temp_dir, f"{youtube_video_id}.%(ext)s"),
            'quiet': False,
            'no_warnings': False,
            'socket_timeout': 30,
            'retries': 3,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([f'https://www.youtube.com/watch?v={youtube_video_id}'])
        
        if not os.path.exists(output_path):
            print(f"   ❌ Audio file not found at: {output_path}")
            return False
        
        file_size = os.path.getsize(output_path) / (1024 * 1024)
        print(f"   ✅ Audio downloaded: {file_size:.2f} MB\n")
        
        # Step 4: Load Whisper model
        print("🤖 Step 4: Loading Whisper model...")
        model = whisper.load_model("base", device="cpu")
        print("   ✅ Model loaded\n")
        
        # Step 5: Transcribe
        print("🎙️ Step 5: Transcribing (this may take 30-60 seconds)...")
        result = model.transcribe(
            output_path, 
            language='en', 
            task='transcribe',
            verbose=False
        )
        
        transcript_text = result['text'].strip()
        segments = result.get('segments', [])
        
        print(f"   ✅ Transcription complete!\n")
        
        # Step 6: Display results
        print(f"{'='*60}")
        print("📊 RESULTS")
        print(f"{'='*60}")
        print(f"Characters: {len(transcript_text)}")
        print(f"Segments: {len(segments)}")
        print(f"\n📝 First 500 characters of transcript:")
        print(f"{'-'*60}")
        print(transcript_text[:500])
        print(f"{'-'*60}\n")
        
        if segments:
            print(f"🔢 First 3 segments with timestamps:")
            print(f"{'-'*60}")
            for seg in segments[:3]:
                print(f"[{seg['start']:.1f}s - {seg['end']:.1f}s]: {seg['text'].strip()}")
            print(f"{'-'*60}\n")
        
        print(f"{'='*60}")
        print("✅ WHISPER TEST SUCCESSFUL!")
        print(f"{'='*60}\n")
        
        return True
        
    except Exception as e:
        print(f"\n{'='*60}")
        print(f"❌ TEST FAILED")
        print(f"{'='*60}")
        print(f"Error: {type(e).__name__}: {str(e)}\n")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # Cleanup
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
                print(f"🧹 Cleaned up temp directory\n")
            except Exception as e:
                print(f"⚠️ Failed to cleanup: {e}\n")


def main():
    print("\n" + "="*60)
    print("🎬 WHISPER TRANSCRIPTION TEST")
    print("   Testing with your actual video")
    print("="*60)
    
    # Test with your shortest video first (11 seconds - sample1)
    test_video_id = "EHJcM17IHow"  # sample1 - 11 seconds
    
    print(f"\n📺 Testing with video ID: {test_video_id}")
    print(f"   This is your 'sample1' video (11 seconds)\n")
    
    success = test_full_whisper_pipeline(test_video_id)
    
    if success:
        print("\n" + "="*60)
        print("✅ SUCCESS!")
        print("="*60)
        print("\nWhisper AI is working correctly!")
        print("The transcription system should work for all your videos.")
        print("\nNext steps:")
        print("1. Use the UI to trigger transcript generation")
        print("2. Monitor the Celery worker logs")
        print("3. Transcript should generate successfully")
        print("\nIf the UI still shows placeholder text, the issue is")
        print("in the Celery task execution, not Whisper itself.")
        print("="*60 + "\n")
    else:
        print("\n" + "="*60)
        print("❌ FAILED")
        print("="*60)
        print("\nWhisper transcription failed.")
        print("Check the error messages above for details.")
        print("="*60 + "\n")


if __name__ == "__main__":
    main()