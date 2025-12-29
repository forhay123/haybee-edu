# ============================================================
# FILE 2: app/ai_engine/thumbnail_generator.py
# ============================================================
"""
Thumbnail Generator - Creates custom video thumbnails
Uses OpenCV for frame extraction and PIL for enhancement
"""
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
from pathlib import Path
from typing import Optional
from app.ai_engine.utils.ffmpeg_wrapper import extract_frame, get_video_info
from app.core.storage import storage_client
from app.core.logger import get_logger
import tempfile

logger = get_logger(__name__)


def generate_thumbnail(
    video_path: str,
    title: str = "",
    timestamp: Optional[float] = None,
    output_path: Optional[str] = None
) -> str:
    """
    Generate custom thumbnail from video frame
    
    Args:
        video_path: Path to video file
        title: Video title to overlay
        timestamp: Specific timestamp to capture (None = middle of video)
        output_path: Output path (None = creates temp file)
    
    Returns:
        Path to generated thumbnail
    """
    logger.info(f"🎨 Generating thumbnail for: {video_path}")
    
    try:
        # Get video info to find middle frame if timestamp not specified
        if timestamp is None:
            video_info = get_video_info(video_path)
            timestamp = video_info['duration'] / 2
            logger.info(f"  Using middle frame at {timestamp:.1f}s")
        
        # Create temp files
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_frame:
            frame_path = temp_frame.name
        
        # Extract frame using FFmpeg
        extract_frame(video_path, timestamp, frame_path)
        
        # Open with PIL for enhancement
        img = Image.open(frame_path)
        
        # Resize to YouTube standard: 1280x720
        img = img.resize((1280, 720), Image.Resampling.LANCZOS)
        
        # Enhance image
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(1.1)  # Slight brightness boost
        
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.15)  # Slight contrast boost
        
        enhancer = ImageEnhance.Sharpness(img)
        img = enhancer.enhance(1.2)  # Sharpen
        
        # Add text overlay if title provided
        if title:
            draw = ImageDraw.Draw(img)
            
            # Try to use a nice font, fall back to default if not available
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
            except:
                font = ImageFont.load_default()
            
            # Add semi-transparent overlay at bottom
            overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
            overlay_draw = ImageDraw.Draw(overlay)
            overlay_draw.rectangle([(0, 620), (1280, 720)], fill=(0, 0, 0, 180))
            img = img.convert('RGBA')
            img = Image.alpha_composite(img, overlay)
            img = img.convert('RGB')
            
            # Draw text
            draw = ImageDraw.Draw(img)
            
            # Truncate title if too long
            if len(title) > 60:
                title = title[:57] + "..."
            
            # Draw text with shadow for better readability
            shadow_offset = 2
            draw.text((22, 652), title, font=font, fill=(0, 0, 0))  # Shadow
            draw.text((20, 650), title, font=font, fill=(255, 255, 255))  # Text
        
        # Save thumbnail
        if output_path is None:
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_thumb:
                output_path = temp_thumb.name
        
        img.save(output_path, 'JPEG', quality=95)
        logger.info(f"✅ Thumbnail generated: {output_path}")
        
        # Clean up temp frame
        Path(frame_path).unlink(missing_ok=True)
        
        return output_path
        
    except Exception as e:
        logger.error(f"❌ Thumbnail generation failed: {e}")
        raise RuntimeError(f"Thumbnail generation failed: {e}") from e


def upload_thumbnail_to_storage(thumbnail_path: str, video_id: int) -> str:
    """
    Upload thumbnail to MinIO storage
    
    Args:
        thumbnail_path: Local path to thumbnail
        video_id: VideoLesson ID
    
    Returns:
        Public URL to thumbnail
    """
    logger.info(f"☁️ Uploading thumbnail for video {video_id}...")
    
    try:
        object_name = f"video_{video_id}_thumb.jpg"
        url = storage_client.upload_file(
            bucket_name='edu-thumbnails',
            object_name=object_name,
            file_path=thumbnail_path,
            content_type='image/jpeg'
        )
        
        if url:
            logger.info(f"✅ Thumbnail uploaded: {url}")
            return url
        else:
            raise RuntimeError("Upload returned None")
            
    except Exception as e:
        logger.error(f"❌ Thumbnail upload failed: {e}")
        raise


def generate_and_upload_thumbnail(video_path: str, video_id: int, title: str = "") -> str:
    """
    Generate thumbnail and upload to storage (convenience method)
    
    Args:
        video_path: Path to video file
        video_id: VideoLesson ID
        title: Video title for overlay
    
    Returns:
        Public URL to uploaded thumbnail
    """
    try:
        # Generate thumbnail
        thumbnail_path = generate_thumbnail(video_path, title=title)
        
        # Upload to storage
        url = upload_thumbnail_to_storage(thumbnail_path, video_id)
        
        # Clean up local file
        Path(thumbnail_path).unlink(missing_ok=True)
        
        return url
        
    except Exception as e:
        logger.error(f"❌ Generate and upload failed: {e}")
        raise


