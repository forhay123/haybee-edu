"""
Unified YouTube downloader with CLI subprocess approach (bypasses all SSL issues)
"""
import os
import subprocess
import shutil
import ssl
from pathlib import Path
from app.core.logger import get_logger

# ⚠️ CRITICAL: Disable SSL verification at module load time
try:
    ssl._create_default_https_context = ssl._create_unverified_context
    logger = get_logger(__name__)
    logger.info("🔓 SSL verification disabled at module level")
except Exception as e:
    logger = get_logger(__name__)
    logger.warning(f"⚠️ Could not disable SSL at module level: {e}")


def download_youtube_audio(youtube_video_id: str, output_dir: str) -> str:
    """
    Download audio from YouTube using yt-dlp CLI directly.
    This bypasses ALL Python SSL issues by running yt-dlp as a subprocess.
    
    Args:
        youtube_video_id: YouTube video ID
        output_dir: Directory to save the audio file
        
    Returns:
        Path to downloaded audio file
        
    Raises:
        Exception: If download fails
    """
    logger.info(f"📥 Downloading audio from YouTube: {youtube_video_id}")
    
    # Ensure output directory exists
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    output_path = os.path.join(output_dir, f"{youtube_video_id}.mp3")
    
    # Check if yt-dlp CLI is available
    if not shutil.which('yt-dlp'):
        raise Exception("yt-dlp command not found. Install with: pip install yt-dlp")
    
    # Build yt-dlp command with ALL anti-bot and SSL bypass flags
    cmd = [
        'yt-dlp',
        
        # ✅ CRITICAL: Disable SSL verification
        '--no-check-certificate',
        
        # Format and extraction
        '--format', 'bestaudio/best',
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '192K',
        
        # Output template
        '--output', os.path.join(output_dir, f'{youtube_video_id}.%(ext)s'),
        
        # ✅ Use Android client (bypasses most restrictions)
        '--extractor-args', 'youtube:player_client=android,web;player_skip=webpage,configs',
        
        # Browser headers
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '--add-header', 'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        '--add-header', 'Accept-Language:en-us,en;q=0.5',
        
        # Retry settings
        '--retries', '5',
        '--fragment-retries', '5',
        '--socket-timeout', '30',
        
        # Don't use quiet mode so we can see what's happening
        '--no-quiet',
        '--no-warnings',
        
        # The video URL
        f'https://www.youtube.com/watch?v={youtube_video_id}'
    ]
    
    try:
        # ✅ Set environment variables to disable SSL verification
        env = os.environ.copy()
        env['PYTHONHTTPSVERIFY'] = '0'
        env['CURL_CA_BUNDLE'] = ''
        env['REQUESTS_CA_BUNDLE'] = ''
        env['SSL_CERT_FILE'] = ''
        env['REQUESTS_CA_BUNDLE'] = '/dev/null'
        env['SSL_CERT_DIR'] = '/dev/null'
        
        logger.info(f"🔧 Running yt-dlp command: {' '.join(cmd[:5])}...")
        logger.info(f"🔓 SSL verification disabled via environment variables")
        
        # Run yt-dlp CLI as subprocess
        result = subprocess.run(
            cmd,
            env=env,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        # Log output for debugging
        if result.stdout:
            logger.info(f"yt-dlp output: {result.stdout[:500]}")
        
        if result.returncode != 0:
            error_msg = result.stderr or result.stdout or "Unknown error"
            logger.error(f"❌ yt-dlp failed with code {result.returncode}: {error_msg[:500]}")
            
            # Provide helpful error messages
            if '403' in error_msg or 'Forbidden' in error_msg:
                raise Exception(
                    "YouTube blocked the download (403 Forbidden). "
                    "The video might be private, age-restricted, or region-locked. "
                    "Try using captions fallback instead."
                )
            elif 'SSL' in error_msg or 'certificate' in error_msg.lower():
                raise Exception(
                    f"SSL certificate error persists even with CLI approach. "
                    f"This might be a system-level SSL issue. Error: {error_msg[:200]}"
                )
            else:
                raise Exception(f"yt-dlp download failed: {error_msg[:200]}")
        
        # Verify file was created
        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path) / (1024 * 1024)
            logger.info(f"✅ Audio downloaded successfully: {output_path} ({file_size:.2f} MB)")
            return output_path
        else:
            raise Exception(f"Audio file not found at {output_path} after successful yt-dlp run")
            
    except subprocess.TimeoutExpired:
        logger.error(f"❌ Download timed out after 5 minutes")
        raise Exception("Download timed out. The video might be too long or network is slow.")
        
    except Exception as e:
        logger.error(f"❌ Failed to download audio: {type(e).__name__}: {str(e)}")
        raise


def get_youtube_captions(youtube_video_id: str) -> str:
    """
    Fallback: Get auto-generated captions from YouTube
    
    Args:
        youtube_video_id: YouTube video ID
        
    Returns:
        Full transcript text
        
    Raises:
        Exception: If captions cannot be fetched
    """
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        
        logger.info(f"📄 Fetching captions for: {youtube_video_id}")
        
        # Get transcript (try English first, then any available language)
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(
                youtube_video_id,
                languages=['en', 'en-US', 'en-GB']
            )
        except:
            # If English not available, get whatever is available
            transcript_list = YouTubeTranscriptApi.get_transcript(youtube_video_id)
        
        # Combine all text
        full_text = ' '.join([item['text'] for item in transcript_list])
        
        logger.info(f"✅ Captions fetched successfully ({len(full_text)} characters)")
        
        return full_text
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch captions: {type(e).__name__}: {str(e)}")
        raise