#!/usr/bin/env python
"""
Test with real lesson video that has actual speech
"""
import os
import sys
import tempfile
import shutil

sys.path.insert(0, '/app/app')

def test_real_lesson(youtube_video_id: str, title: str):
    print("\n" + "="*60)
    print(f"🎓 TESTING REAL LESSON: {title}")
    print(f"   YouTube ID: {youtube_video_id}")
    print("="*60 + "\n")
    
    from domains.video_processing.generation_service import (
        download_youtube_audio,
        transcribe_audio_with_whisper
    )
    
    temp_dir = tempfile.mkdtemp()
    
    try:
        # Download
        print("📥 Step 1: Downloading audio...")
        audio_path = download_youtube_audio(youtube_video_id, temp_dir)
        file_size = os.path.getsize(audio_path) / 1024
        print(f"✅ Downloaded: {file_size:.1f} KB\n")
        
        # Transcribe
        print("🎙️  Step 2: Transcribing with Whisper...")
        print("   This may take 30-90 seconds for a 1-minute video...\n")
        
        result = transcribe_audio_with_whisper(audio_path)
        
        transcript = result['full_text']
        segments = result['segments']
        
        print("\n" + "="*60)
        print("📊 TRANSCRIPTION RESULTS")
        print("="*60)
        print(f"Characters: {len(transcript)}")
        print(f"Words (approx): {len(transcript.split())}")
        print(f"Segments: {len(segments)}")
        
        if transcript.strip():
            print(f"\n📝 Full Transcript:")
            print("-"*60)
            print(transcript)
            print("-"*60)
            
            if segments:
                print(f"\n🔢 First 5 segments:")
                print("-"*60)
                for i, seg in enumerate(segments[:5], 1):
                    print(f"{i}. [{seg['start']:.1f}s-{seg['end']:.1f}s]: {seg['text']}")
                if len(segments) > 5:
                    print(f"   ... and {len(segments)-5} more segments")
                print("-"*60)
            
            print("\n" + "="*60)
            print("🎉 SUCCESS! REAL TRANSCRIPT GENERATED!")
            print("="*60)
            print("\n✅ The system is working perfectly!")
            print("✅ You can now use it with your UI!")
            print("\nNext step: Generate transcript from UI and it will work!")
            print("="*60 + "\n")
            return True
        else:
            print("\n⚠️  Empty transcript - video might not have clear speech")
            return False
        
    except Exception as e:
        print(f"\n❌ Error: {type(e).__name__}: {str(e)[:200]}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
            print(f"🧹 Cleaned up\n")


if __name__ == "__main__":
    print("\n🔍 Testing with actual lesson videos...")
    
    # Test Video 6: Chemistry(Meaning) - 61 seconds
    test_real_lesson("d5MI6C8bv-A", "Chemistry(Meaning)")
    
    # Uncomment to test the Biology video too:
    # test_real_lesson("2IMeuDXN4ug", "biology week1")