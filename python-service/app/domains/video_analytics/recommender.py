# ============================================================
# FILE 4: app/domains/video_analytics/recommender.py
# ============================================================
"""
Video Recommendation Engine
Suggests videos based on watch history and performance
"""
from typing import List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import and_, not_
from app.core.logger import get_logger
from app.models.video_lesson import VideoLesson
from app.models.video_watch_history import VideoWatchHistory
from app.models.video_transcript import VideoTranscript

logger = get_logger(__name__)


class VideoRecommender:
    """
    Recommends videos based on student behavior and content similarity
    """
    
    @staticmethod
    def recommend_next_videos(
        student_id: int,
        current_video_id: int = None,
        limit: int = 5,
        db: Session = None
    ) -> List[Dict]:
        """
        Recommend next videos to watch
        
        Args:
            student_id: Student user ID
            current_video_id: Optional current video ID for context
            limit: Number of recommendations
            db: Database session
        
        Returns:
            List of recommended videos with scores
        """
        logger.info(f"🎯 Generating recommendations for student {student_id}")
        
        try:
            # Get student's watch history
            watched_ids = db.query(VideoWatchHistory.video_lesson_id).filter_by(
                student_id=student_id,
                completed=True
            ).all()
            watched_ids = [w[0] for w in watched_ids]
            
            # Get current video details if provided
            current_video = None
            if current_video_id:
                current_video = db.query(VideoLesson).filter_by(id=current_video_id).first()
            
            # Find candidate videos (not completed yet)
            candidates = db.query(VideoLesson).filter(
                and_(
                    VideoLesson.status == 'PUBLISHED',
                    not_(VideoLesson.id.in_(watched_ids)) if watched_ids else True
                )
            ).all()
            
            # Score each candidate
            scored_videos = []
            for video in candidates:
                score = 0
                reason = []
                
                # +10 points: Same subject as current video
                if current_video and video.subject_id == current_video.subject_id:
                    score += 10
                    reason.append("Same subject")
                
                # +5 points: Same teacher
                if current_video and video.teacher_id == current_video.teacher_id:
                    score += 5
                    reason.append("Same teacher")
                
                # +3 points: Has transcript (better quality)
                if video.has_transcript:
                    score += 3
                
                # +3 points: Has chapters (better structured)
                if video.has_chapters:
                    score += 3
                
                # -2 points: Already started but not completed
                partial_watch = db.query(VideoWatchHistory).filter_by(
                    video_lesson_id=video.id,
                    student_id=student_id,
                    completed=False
                ).first()
                
                if partial_watch:
                    score -= 2
                    reason.append("In progress")
                
                scored_videos.append({
                    'videoId': video.id,
                    'title': video.title,
                    'subjectName': video.subject.name if video.subject else 'Unknown',
                    'teacherName': video.teacher.full_name if video.teacher else 'Unknown',
                    'durationSeconds': video.duration_seconds or 0,
                    'thumbnailUrl': video.thumbnail_custom_url or video.thumbnail_url,
                    'score': score,
                    'reason': ', '.join(reason) if reason else 'New content'
                })
            
            # Sort by score and return top N
            scored_videos.sort(key=lambda x: x['score'], reverse=True)
            recommendations = scored_videos[:limit]
            
            logger.info(f"  ✅ Generated {len(recommendations)} recommendations")
            return recommendations
            
        except Exception as e:
            logger.error(f"❌ Failed to generate recommendations: {e}")
            return []
