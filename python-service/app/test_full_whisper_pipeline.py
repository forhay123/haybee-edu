#!/usr/bin/env python
"""
Full end-to-end test: Download + Whisper transcription
"""
import os
import sys
import tempfile
import shutil

sys.path.insert(0, '/app/app')

def test_full_pipeline():
    print("\n" + "="*60)
    print("🎬 FULL PIPELINE TEST: DOWNLOAD + WHISPER")
    print("="*60 + "\n")
    
    from domains.video_processing.generation_service import (
        download_youtube_audio,
        transcribe_audio_with_whisper
    )
    
    temp_dir = tempfile.mkdtemp()
    
    try:
        youtube_video_id = "EHJcM17IHow"  # sample1 - 11 seconds
        
        print(f"📺 Video: {youtube_video_id}")
        print(f"📁 Temp: {temp_dir}\n")
        
        # Step 1: Download
        print("📥 Step 1: Downloading audio...")
        audio_path = download_youtube_audio(youtube_video_id, temp_dir)
        print(f"✅ Download complete: {audio_path}\n")
        
        # Step 2: Transcribe
        print("🎙️  Step 2: Transcribing with Whisper...")
        print("   This will take 30-60 seconds...\n")
        
        result = transcribe_audio_with_whisper(audio_path)
        
        transcript = result['full_text']
        segments = result['segments']
        
        print("✅ Transcription complete!\n")
        print("="*60)
        print("📊 RESULTS")
        print("="*60)
        print(f"Characters: {len(transcript)}")
        print(f"Segments: {len(segments)}")
        print(f"\n📝 Full Transcript:")
        print("-"*60)
        print(transcript)
        print("-"*60)
        
        if segments:
            print(f"\n🔢 Segments with timestamps:")
            print("-"*60)
            for i, seg in enumerate(segments[:5], 1):
                print(f"{i}. [{seg['start']:.1f}s - {seg['end']:.1f}s]: {seg['text']}")
            if len(segments) > 5:
                print(f"   ... and {len(segments)-5} more segments")
            print("-"*60)
        
        print("\n" + "="*60)
        print("🎉 FULL PIPELINE SUCCESS!")
        print("="*60)
        print("\n✅ YouTube download: WORKING")
        print("✅ Whisper transcription: WORKING")
        print("✅ System ready for production!")
        print("\nYou can now generate transcripts from the UI!")
        print("="*60 + "\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ FAILED!")
        print(f"   Error: {type(e).__name__}")
        print(f"   Message: {str(e)[:300]}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
            print(f"🧹 Cleaned up temp directory\n")


if __name__ == "__main__":
    success = test_full_pipeline()
    sys.exit(0 if success else 1)