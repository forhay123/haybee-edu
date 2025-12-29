#!/usr/bin/env python
"""
Debug: Check what's actually in the downloaded audio
"""
import os
import sys
import tempfile
import shutil

sys.path.insert(0, '/app/app')

def debug_audio():
    print("\n" + "="*60)
    print("🔍 DEBUGGING AUDIO CONTENT")
    print("="*60 + "\n")
    
    from domains.video_processing.generation_service import download_youtube_audio
    import whisper
    
    temp_dir = tempfile.mkdtemp()
    
    try:
        youtube_video_id = "EHJcM17IHow"  # sample1 - 11 seconds
        
        # Download
        print("📥 Downloading audio...")
        audio_path = download_youtube_audio(youtube_video_id, temp_dir)
        
        # Check file
        file_size = os.path.getsize(audio_path)
        print(f"✅ File downloaded: {audio_path}")
        print(f"   File size: {file_size:,} bytes ({file_size/1024:.2f} KB)")
        print(f"   File exists: {os.path.exists(audio_path)}")
        
        # Try to load with Whisper
        print(f"\n🎙️  Loading Whisper model...")
        model = whisper.load_model("base", device="cpu")
        
        print(f"🔄 Transcribing WITHOUT language constraint...")
        result = model.transcribe(
            audio_path,
            # Don't force English - let it detect
            task='transcribe',
            verbose=True,  # Show detailed output
            fp16=False
        )
        
        print(f"\n📊 Raw result keys: {result.keys()}")
        print(f"   Language detected: {result.get('language', 'unknown')}")
        print(f"   Text: '{result.get('text', '')}'")
        print(f"   Segments count: {len(result.get('segments', []))}")
        
        if result.get('segments'):
            print(f"\n📝 Segments:")
            for i, seg in enumerate(result['segments'][:5], 1):
                print(f"   {i}. [{seg['start']:.1f}s-{seg['end']:.1f}s] "
                      f"'{seg['text']}' (prob: {seg.get('no_speech_prob', 0):.2f})")
        
        # Check if it's actually silent
        text = result.get('text', '').strip()
        if not text:
            print(f"\n⚠️  WARNING: Empty transcript!")
            print(f"   Possible reasons:")
            print(f"   1. Video has no audio")
            print(f"   2. Audio is too quiet")
            print(f"   3. Audio is corrupted")
            print(f"\n💡 Let's try the video in your browser:")
            print(f"   https://www.youtube.com/watch?v={youtube_video_id}")
            print(f"   Does it have audible speech?")
        else:
            print(f"\n✅ SUCCESS! Got transcript:")
            print(f"   {text}")
        
    except Exception as e:
        print(f"\n❌ Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
            print(f"\n🧹 Cleaned up\n")


if __name__ == "__main__":
    debug_audio()