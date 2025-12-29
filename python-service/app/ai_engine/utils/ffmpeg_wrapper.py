# ============================================================
# FILE 1: app/ai_engine/utils/ffmpeg_wrapper.py
# ============================================================
"""
FFmpeg Wrapper for Video Processing
Handles video metadata extraction, audio extraction, frame extraction, and format conversion
"""
import subprocess
import json
from pathlib import Path
from typing import Dict, Optional
from app.core.logger import get_logger

logger = get_logger(__name__)


def get_video_info(file_path: str) -> Dict:
    """
    Extract video metadata using ffprobe
    
    Args:
        file_path: Path to video file
    
    Returns:
        Dict with duration, width, height, codec, bitrate
    """
    logger.info(f"📊 Getting video info for: {file_path}")
    
    cmd = [
        'ffprobe',
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        file_path
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(result.stdout)
        
        # Extract video stream info
        video_stream = next((s for s in data['streams'] if s['codec_type'] == 'video'), None)
        
        if not video_stream:
            raise ValueError("No video stream found")
        
        info = {
            'duration': float(data['format'].get('duration', 0)),
            'width': video_stream.get('width'),
            'height': video_stream.get('height'),
            'codec': video_stream.get('codec_name'),
            'bitrate': int(data['format'].get('bit_rate', 0)),
            'fps': eval(video_stream.get('r_frame_rate', '0/1'))  # Convert fraction to float
        }
        
        logger.info(f"✅ Video info: {info['width']}x{info['height']}, {info['duration']:.1f}s")
        return info
        
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ FFprobe failed: {e.stderr}")
        raise RuntimeError(f"FFprobe failed: {e.stderr}") from e
    except Exception as e:
        logger.error(f"❌ Error parsing video info: {e}")
        raise


def extract_audio(video_path: str, output_path: str, format: str = 'wav') -> str:
    """
    Extract audio from video
    
    Args:
        video_path: Input video file
        output_path: Output audio file
        format: Audio format (default: wav)
    
    Returns:
        Path to extracted audio file
    """
    logger.info(f"🎵 Extracting audio: {video_path} -> {output_path}")
    
    cmd = [
        'ffmpeg',
        '-i', video_path,
        '-vn',  # No video
        '-acodec', 'pcm_s16le',  # PCM 16-bit for Whisper
        '-ar', '16000',  # 16kHz sample rate
        '-ac', '1',  # Mono
        '-y',  # Overwrite output
        output_path
    ]
    
    try:
        subprocess.run(cmd, capture_output=True, check=True)
        logger.info(f"✅ Audio extracted: {output_path}")
        return output_path
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Audio extraction failed: {e.stderr.decode()}")
        raise RuntimeError(f"Audio extraction failed: {e.stderr.decode()}") from e


def extract_frame(video_path: str, timestamp_seconds: float, output_path: str) -> str:
    """
    Extract a single frame from video at specific timestamp
    
    Args:
        video_path: Input video file
        timestamp_seconds: Time in seconds
        output_path: Output image file
    
    Returns:
        Path to extracted frame
    """
    logger.info(f"🖼️ Extracting frame at {timestamp_seconds}s: {video_path}")
    
    cmd = [
        'ffmpeg',
        '-ss', str(timestamp_seconds),
        '-i', video_path,
        '-frames:v', '1',
        '-q:v', '2',  # High quality
        '-y',
        output_path
    ]
    
    try:
        subprocess.run(cmd, capture_output=True, check=True)
        logger.info(f"✅ Frame extracted: {output_path}")
        return output_path
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Frame extraction failed: {e.stderr.decode()}")
        raise RuntimeError(f"Frame extraction failed") from e


def compress_video(input_path: str, output_path: str, quality: str = 'medium') -> str:
    """
    Compress video using H.264
    
    Args:
        input_path: Input video file
        output_path: Output video file
        quality: 'low', 'medium', or 'high'
    
    Returns:
        Path to compressed video
    """
    crf_map = {'low': 30, 'medium': 23, 'high': 18}
    crf = crf_map.get(quality, 23)
    
    logger.info(f"🗜️ Compressing video (CRF {crf}): {input_path}")
    
    cmd = [
        'ffmpeg',
        '-i', input_path,
        '-c:v', 'libx264',
        '-crf', str(crf),
        '-preset', 'medium',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-y',
        output_path
    ]
    
    try:
        subprocess.run(cmd, capture_output=True, check=True)
        logger.info(f"✅ Video compressed: {output_path}")
        return output_path
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Video compression failed: {e.stderr.decode()}")
        raise RuntimeError(f"Video compression failed") from e


def convert_format(input_path: str, output_path: str, format: str = 'mp4') -> str:
    """
    Convert video to different format
    
    Args:
        input_path: Input video file
        output_path: Output video file
        format: Target format (default: mp4)
    
    Returns:
        Path to converted video
    """
    logger.info(f"🔄 Converting video to {format}: {input_path}")
    
    cmd = [
        'ffmpeg',
        '-i', input_path,
        '-c', 'copy',  # Copy streams without re-encoding
        '-y',
        output_path
    ]
    
    try:
        subprocess.run(cmd, capture_output=True, check=True)
        logger.info(f"✅ Video converted: {output_path}")
        return output_path
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Video conversion failed: {e.stderr.decode()}")
        raise RuntimeError(f"Video conversion failed") from e
