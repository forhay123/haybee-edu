#!/usr/bin/env python
"""
Test if the fixed YouTube download works
"""
import os
import sys
import tempfile
import shutil

sys.path.insert(0, '/app/app')

def test_fixed_download():
    print("\n" + "="*60)
    print("🧪 TESTING FIXED YOUTUBE DOWNLOAD")
    print("="*60 + "\n")
    
    # Import the fixed function
    from domains.video_processing.generation_service import download_youtube_audio
    
    temp_dir = tempfile.mkdtemp()
    
    try:
        # Test with your shortest video
        youtube_video_id = "EHJcM17IHow"  # sample1 - 11 seconds
        
        print(f"📺 Testing video: {youtube_video_id}")
        print(f"📁 Temp directory: {temp_dir}\n")
        
        print("🚀 Starting download with FIXED configuration...")
        print("   Using: player_client=['android', 'web']")
        print("   This should bypass YouTube's 403 errors\n")
        
        audio_path = download_youtube_audio(youtube_video_id, temp_dir)
        
        if os.path.exists(audio_path):
            file_size = os.path.getsize(audio_path) / (1024 * 1024)
            print(f"\n✅ SUCCESS!")
            print(f"   Audio file: {audio_path}")
            print(f"   File size: {file_size:.2f} MB")
            print(f"\n" + "="*60)
            print("🎉 YOUTUBE DOWNLOAD FIX WORKS!")
            print("="*60)
            return True
        else:
            print(f"\n❌ FAILED: File not found at {audio_path}")
            return False
            
    except Exception as e:
        print(f"\n❌ FAILED!")
        print(f"   Error: {type(e).__name__}")
        print(f"   Message: {str(e)[:200]}")
        
        if "403" in str(e) or "Forbidden" in str(e):
            print("\n⚠️  Still getting 403 errors!")
            print("   This means YouTube is still blocking the download.")
            print("   We may need to upgrade yt-dlp to the latest version.")
        
        return False
        
    finally:
        # Cleanup
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
            print(f"\n🧹 Cleaned up temp directory")


if __name__ == "__main__":
    success = test_fixed_download()
    sys.exit(0 if success else 1)