"""
Fixed YouTube audio downloader with proper headers and options
Includes Zoom recording and direct URL download support
"""
import os
import yt_dlp
import requests
from pathlib import Path
from app.core.logger import get_logger

logger = get_logger(__name__)


def download_youtube_video(youtube_video_id: str, output_dir: str) -> str:
    """
    Download audio from YouTube video with improved anti-bot measures
    
    Args:
        youtube_video_id: YouTube video ID
        output_dir: Directory to save the audio file
        
    Returns:
        Path to downloaded audio file
    """
    logger.info(f"📥 Downloading audio from YouTube: {youtube_video_id}")
    
    output_path = os.path.join(output_dir, f"{youtube_video_id}.mp3")
    
    # ✅ Enhanced yt-dlp options to bypass YouTube restrictions
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'outtmpl': os.path.join(output_dir, f"{youtube_video_id}.%(ext)s"),
        
        # ✅ Anti-bot measures
        'quiet': False,  # Changed to False for debugging
        'no_warnings': False,
        'extract_flat': False,
        'nocheckcertificate': True,
        
        # ✅ Critical: Add headers to mimic a real browser
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-us,en;q=0.5',
            'Accept-Encoding': 'gzip,deflate',
            'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.7',
            'Connection': 'keep-alive',
        },
        
        # ✅ Use cookies if available (helps with age-restricted videos)
        'cookiefile': None,
        
        # ✅ Retry settings
        'retries': 3,
        'fragment_retries': 3,
        'socket_timeout': 30,
        
        # ✅ Download options
        'ignoreerrors': False,
        'no_color': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            logger.info(f"🔍 Extracting info for video: {youtube_video_id}")
            
            # First, extract video info to check if it's accessible
            info = ydl.extract_info(
                f'https://www.youtube.com/watch?v={youtube_video_id}',
                download=False
            )
            
            if info is None:
                raise Exception(f"Failed to extract video info for {youtube_video_id}")
            
            logger.info(f"✅ Video info extracted: {info.get('title', 'Unknown')}")
            logger.info(f"📊 Duration: {info.get('duration', 0)} seconds")
            
            # Now download
            logger.info(f"⬇️ Starting download...")
            ydl.download([f'https://www.youtube.com/watch?v={youtube_video_id}'])
        
        # yt_dlp saves as .mp3 after post-processing
        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            logger.info(f"✅ Audio downloaded: {output_path} ({file_size / 1024 / 1024:.2f} MB)")
            return output_path
        else:
            raise Exception(f"Audio file not found at {output_path} after download")
            
    except yt_dlp.utils.DownloadError as e:
        error_msg = str(e)
        
        # Check for specific errors and provide helpful messages
        if '403' in error_msg or 'Forbidden' in error_msg:
            logger.error("❌ YouTube blocked the download (403 Forbidden)")
            logger.error("💡 This usually means:")
            logger.error("   1. The video is private or restricted")
            logger.error("   2. YouTube is detecting automated downloads")
            logger.error("   3. The video requires age verification")
            raise Exception(
                "YouTube blocked the download. The video might be private, age-restricted, "
                "or YouTube is detecting automated access. Try again later or use a different video."
            )
        elif 'Video unavailable' in error_msg:
            raise Exception(f"Video {youtube_video_id} is not available or has been deleted")
        else:
            logger.error(f"❌ Download failed: {error_msg}")
            raise
            
    except Exception as e:
        logger.error(f"❌ Failed to download audio: {e}")
        raise


def download_zoom_recording(zoom_url: str, output_path: str, access_token: str = None) -> None:
    """
    Download Zoom recording from provided URL
    
    Args:
        zoom_url: Zoom recording download URL
        output_path: Path to save the recording
        access_token: Optional Zoom OAuth token for authenticated access
        
    Raises:
        Exception: If download fails
    """
    logger.info(f"📥 Downloading Zoom recording from: {zoom_url}")
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        if access_token:
            headers['Authorization'] = f'Bearer {access_token}'
        
        response = requests.get(zoom_url, headers=headers, stream=True, timeout=300)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        
        # Ensure output directory exists
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    
                    if total_size > 0:
                        progress = (downloaded / total_size) * 100
                        logger.info(f"⬇️ Zoom download progress: {progress:.1f}%")
        
        file_size = os.path.getsize(output_path)
        logger.info(f"✅ Zoom recording downloaded: {output_path} ({file_size / 1024 / 1024:.2f} MB)")
        
    except requests.RequestException as e:
        logger.error(f"❌ Failed to download Zoom recording: {e}")
        raise Exception(f"Zoom download failed: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Zoom recording download error: {e}")
        raise


def download_direct_url(url: str, output_path: str) -> None:
    """
    Download video from direct URL
    
    Args:
        url: Direct video URL
        output_path: Path to save the video
        
    Raises:
        Exception: If download fails
    """
    logger.info(f"📥 Downloading video from direct URL: {url}")
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, stream=True, timeout=300)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        
        # Ensure output directory exists
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    
                    if total_size > 0:
                        progress = (downloaded / total_size) * 100
                        logger.info(f"⬇️ Direct download progress: {progress:.1f}%")
        
        file_size = os.path.getsize(output_path)
        logger.info(f"✅ Video downloaded: {output_path} ({file_size / 1024 / 1024:.2f} MB)")
        
    except requests.RequestException as e:
        logger.error(f"❌ Failed to download video: {e}")
        raise Exception(f"Direct URL download failed: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Video download error: {e}")
        raise


def get_youtube_captions(youtube_video_id: str) -> str:
    """
    Fallback: Get auto-generated captions from YouTube Data API
    This requires YOUTUBE_API_KEY in environment
    
    Args:
        youtube_video_id: YouTube video ID
        
    Returns:
        Full transcript text
        
    Raises:
        Exception: If captions cannot be fetched
    """
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        
        logger.info(f"📄 Attempting to fetch captions for: {youtube_video_id}")
        
        # Get transcript
        transcript_list = YouTubeTranscriptApi.get_transcript(youtube_video_id)
        
        # Combine all text
        full_text = ' '.join([item['text'] for item in transcript_list])
        
        logger.info(f"✅ Successfully fetched captions ({len(full_text)} characters)")
        
        return full_text
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch captions: {e}")
        raise Exception("Could not download audio or fetch captions from YouTube")