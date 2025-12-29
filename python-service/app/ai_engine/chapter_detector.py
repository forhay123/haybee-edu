# ============================================================
# FILE 3: app/ai_engine/chapter_detector.py
# ============================================================
"""
Chapter Detector - Combines visual scene detection with content analysis
"""
import cv2
import numpy as np
from typing import List, Dict
from app.core.logger import get_logger

logger = get_logger(__name__)


def detect_scene_changes(video_path: str, threshold: int = 30) -> List[float]:
    """
    Detect scene changes in video using frame histogram comparison
    
    Args:
        video_path: Path to video file
        threshold: Histogram difference threshold (0-100)
    
    Returns:
        List of timestamps (seconds) where scene changes occur
    """
    logger.info(f"🎬 Detecting scene changes in: {video_path}")
    
    try:
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        logger.info(f"  Video: {fps:.1f} FPS, {frame_count} frames")
        
        scene_changes = []
        prev_hist = None
        frame_idx = 0
        
        # Sample every 30 frames for efficiency
        sample_rate = 30
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            if frame_idx % sample_rate == 0:
                # Convert to grayscale and calculate histogram
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
                hist = cv2.normalize(hist, hist).flatten()
                
                # Compare with previous frame
                if prev_hist is not None:
                    # Calculate histogram difference
                    diff = cv2.compareHist(prev_hist, hist, cv2.HISTCMP_CHISQR)
                    
                    if diff > threshold:
                        timestamp = frame_idx / fps
                        scene_changes.append(timestamp)
                        logger.debug(f"  Scene change at {timestamp:.1f}s (diff: {diff:.1f})")
                
                prev_hist = hist
            
            frame_idx += 1
        
        cap.release()
        
        logger.info(f"✅ Detected {len(scene_changes)} scene changes")
        return scene_changes
        
    except Exception as e:
        logger.error(f"❌ Scene detection failed: {e}")
        return []


def combine_with_transcript_analysis(
    scene_changes: List[float],
    transcript_chapters: List[Dict],
    min_distance: int = 30
) -> List[Dict]:
    """
    Merge visual scene changes with AI-detected chapters
    
    Args:
        scene_changes: List of scene change timestamps
        transcript_chapters: Chapters from content analyzer
        min_distance: Minimum seconds between chapters
    
    Returns:
        Optimized list of chapter markers
    """
    logger.info(f"🔀 Merging {len(scene_changes)} scene changes with {len(transcript_chapters)} AI chapters...")
    
    # Prioritize transcript-based chapters (more semantically meaningful)
    final_chapters = transcript_chapters.copy()
    
    # Add scene changes that don't conflict with existing chapters
    for scene_time in scene_changes:
        # Check if this scene change is far enough from existing chapters
        too_close = False
        for chapter in final_chapters:
            if abs(scene_time - chapter['start_time']) < min_distance:
                too_close = True
                break
        
        if not too_close:
            # Add as a new chapter
            chapter_num = len(final_chapters) + 1
            final_chapters.append({
                'chapter_number': chapter_num,
                'title': f'Section {chapter_num}',
                'start_time': int(scene_time),
                'end_time': int(scene_time) + 300,  # Default 5 min duration
                'summary': 'Visual scene change',
                'key_concepts': []
            })
    
    # Sort by start time
    final_chapters.sort(key=lambda x: x['start_time'])
    
    # Renumber chapters
    for idx, chapter in enumerate(final_chapters):
        chapter['chapter_number'] = idx + 1
    
    logger.info(f"✅ Final chapter count: {len(final_chapters)}")
    return final_chapters