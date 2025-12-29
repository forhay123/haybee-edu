"""
Video Analytics Service
Handles video watch history, engagement metrics, and recommendations
"""
from typing import Optional, Dict, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.logger import get_logger
from app.core.redis_client import redis_client
from app.core.database import SessionLocal
from app.models.video_watch_history import VideoWatchHistory
from app.models.video_lesson import VideoLesson

logger = get_logger(__name__)


class VideoAnalyticsService:
    """
    Service for video analytics, tracking, and recommendations
    Handles watch events, engagement metrics, and personalized recommendations
    """
    
    @staticmethod
    def log_watch_event(
        video_id: int,
        student_id: int,
        event_data: Dict,
        db: Session
    ) -> bool:
        """
        Log a video watch event from player
        
        Args:
            video_id: VideoLesson ID
            student_id: Student user ID
            event_data: Dict with position, duration, completed
            db: Database session
        
        Returns:
            True if successful
        """
        try:
            position = event_data.get('position', 0)
            duration = event_data.get('duration', 0)
            completed = event_data.get('completed', False)
            
            # Calculate watch percentage
            watch_percentage = (position / duration * 100) if duration > 0 else 0
            
            logger.info(f"📹 Recording watch event: student={student_id}, video={video_id}, position={position}s, {watch_percentage:.1f}%")
            
            # Check if watch record exists
            watch_history = db.query(VideoWatchHistory).filter_by(
                student_id=student_id,
                video_lesson_id=video_id
            ).first()
            
            if watch_history:
                # Update existing record
                watch_history.watch_time_seconds = max(
                    watch_history.watch_time_seconds or 0,
                    position
                )
                watch_history.watch_percentage = watch_percentage
                watch_history.last_watched_at = datetime.utcnow()
                watch_history.watch_count = (watch_history.watch_count or 0) + 1
                if completed:
                    watch_history.completed_at = datetime.utcnow()
            else:
                # Create new record
                watch_history = VideoWatchHistory(
                    student_id=student_id,
                    video_lesson_id=video_id,
                    watch_time_seconds=position,
                    watch_percentage=watch_percentage,
                    watch_count=1,
                    first_watched_at=datetime.utcnow(),
                    last_watched_at=datetime.utcnow(),
                    completed_at=datetime.utcnow() if completed else None
                )
                db.add(watch_history)
            
            db.commit()
            
            logger.info(f"✅ Watch event recorded: {watch_percentage:.1f}% watched")
            
            # Cache in Redis for quick access
            cache_key = f"watch:{student_id}:{video_id}"
            redis_client.set_with_ttl(cache_key, {
                'watchTime': position,
                'percentage': watch_percentage,
                'completed': completed,
                'timestamp': str(datetime.utcnow())
            }, 3600)  # 1 hour cache
            
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Failed to log watch event: {e}")
            return False
    
    @staticmethod
    def record_watch_event(
        student_id: int,
        video_id: int,
        watch_time_seconds: int,
        total_duration_seconds: int,
        db: Session
    ) -> Dict:
        """
        Record a video watch event (alternative method signature)
        
        Args:
            student_id: Student user ID
            video_id: VideoLesson ID
            watch_time_seconds: How far student watched
            total_duration_seconds: Total video duration
            db: Database session
        
        Returns:
            Dict with event status
        """
        logger.info(f"📹 Recording watch event: student={student_id}, video={video_id}, time={watch_time_seconds}s")
        
        try:
            # Calculate watch percentage
            watch_percentage = (watch_time_seconds / total_duration_seconds * 100) if total_duration_seconds > 0 else 0
            
            # Check if watch record exists
            watch_history = db.query(VideoWatchHistory).filter_by(
                student_id=student_id,
                video_lesson_id=video_id
            ).first()
            
            if watch_history:
                # Update existing record
                watch_history.watch_time_seconds = max(
                    watch_history.watch_time_seconds or 0,
                    watch_time_seconds
                )
                watch_history.watch_percentage = watch_percentage
                watch_history.last_watched_at = datetime.utcnow()
                watch_history.watch_count = (watch_history.watch_count or 0) + 1
            else:
                # Create new record
                watch_history = VideoWatchHistory(
                    student_id=student_id,
                    video_lesson_id=video_id,
                    watch_time_seconds=watch_time_seconds,
                    watch_percentage=watch_percentage,
                    watch_count=1,
                    first_watched_at=datetime.utcnow(),
                    last_watched_at=datetime.utcnow()
                )
                db.add(watch_history)
            
            db.commit()
            
            logger.info(f"✅ Watch event recorded: {watch_percentage:.1f}% watched")
            
            # Cache in Redis for quick access
            cache_key = f"watch:{student_id}:{video_id}"
            redis_client.set_with_ttl(cache_key, {
                'watchTime': watch_time_seconds,
                'percentage': watch_percentage,
                'timestamp': str(datetime.utcnow())
            }, 86400)
            
            return {
                'status': 'recorded',
                'watchPercentage': watch_percentage,
                'watchTimeSeconds': watch_time_seconds
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Failed to record watch event: {e}")
            raise
    
    @staticmethod
    def calculate_engagement_metrics(video_id: int, db: Session) -> Dict:
        """
        Calculate engagement metrics for a video
        
        Args:
            video_id: VideoLesson ID
            db: Database session
        
        Returns:
            Dict with engagement stats
        """
        logger.info(f"📊 Calculating engagement metrics for video {video_id}")
        
        try:
            watch_records = db.query(VideoWatchHistory).filter_by(
                video_lesson_id=video_id
            ).all()
            
            if not watch_records:
                return {
                    'videoId': video_id,
                    'totalViews': 0,
                    'completionRate': 0,
                    'averageWatchPercentage': 0,
                    'totalWatchTimeSeconds': 0,
                    'uniqueStudents': 0
                }
            
            completed = len([w for w in watch_records if (w.watch_percentage or 0) >= 80])
            avg_percentage = sum([w.watch_percentage or 0 for w in watch_records]) / len(watch_records)
            total_time = sum([w.watch_time_seconds or 0 for w in watch_records])
            unique_students = len(set([w.student_id for w in watch_records]))
            
            return {
                'videoId': video_id,
                'totalViews': len(watch_records),
                'completionRate': (completed / len(watch_records) * 100) if watch_records else 0,
                'averageWatchPercentage': avg_percentage,
                'totalWatchTimeSeconds': total_time,
                'uniqueStudents': unique_students
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to calculate engagement metrics: {e}")
            return {}
    
    @staticmethod
    def get_student_watch_history(student_id: int, db: Session) -> Dict:
        """
        Get student's complete watch history
        
        Args:
            student_id: Student user ID
            db: Database session
        
        Returns:
            Dict with watch history and stats
        """
        logger.info(f"📄 Fetching watch history for student {student_id}")
        
        try:
            watch_records = db.query(VideoWatchHistory).filter_by(
                student_id=student_id
            ).order_by(
                VideoWatchHistory.last_watched_at.desc()
            ).all()
            
            history = [
                {
                    'videoId': w.video_lesson_id,
                    'watchPercentage': w.watch_percentage,
                    'watchTimeSeconds': w.watch_time_seconds,
                    'watchCount': w.watch_count,
                    'lastWatchedAt': w.last_watched_at.isoformat() if w.last_watched_at else None,
                    'firstWatchedAt': w.first_watched_at.isoformat() if w.first_watched_at else None,
                    'completed': (w.watch_percentage or 0) >= 80
                }
                for w in watch_records
            ]
            
            total_watched = len(watch_records)
            completed = len([w for w in watch_records if (w.watch_percentage or 0) >= 80])
            avg_percentage = (
                sum([w.watch_percentage or 0 for w in watch_records]) / len(watch_records)
            ) if watch_records else 0
            
            return {
                'studentId': student_id,
                'watchHistory': history,
                'totalWatched': total_watched,
                'videosCompleted': completed,
                'averageWatchPercentage': avg_percentage
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get watch history: {e}")
            return {
                'studentId': student_id,
                'watchHistory': [],
                'totalWatched': 0,
                'videosCompleted': 0,
                'averageWatchPercentage': 0
            }
    
    @staticmethod
    def get_watch_history(
        student_id: int,
        limit: int = 20,
        db: Session = None
    ) -> List[Dict]:
        """
        Get student's watch history (alternative method)
        
        Args:
            student_id: Student user ID
            limit: Max records to return
            db: Database session
        
        Returns:
            List of watch history dicts
        """
        logger.info(f"📊 Fetching watch history for student {student_id}")
        
        if db is None:
            db = SessionLocal()
        
        try:
            history = db.query(VideoWatchHistory).filter_by(
                student_id=student_id
            ).order_by(
                VideoWatchHistory.last_watched_at.desc()
            ).limit(limit).all()
            
            return [
                {
                    'videoId': h.video_lesson_id,
                    'watchPercentage': h.watch_percentage,
                    'watchTimeSeconds': h.watch_time_seconds,
                    'watchCount': h.watch_count,
                    'lastWatchedAt': h.last_watched_at,
                    'firstWatchedAt': h.first_watched_at
                }
                for h in history
            ]
            
        finally:
            if db:
                db.close()
    
    @staticmethod
    def get_recommendations(
        student_id: int,
        limit: int = 10,
        db: Session = None
    ) -> List[Dict]:
        """
        Get personalized video recommendations for student
        
        Based on:
        - Videos they haven't watched
        - Popular videos in their subjects
        
        Args:
            student_id: Student user ID
            limit: Max recommendations
            db: Database session
        
        Returns:
            List of recommended video dicts
        """
        logger.info(f"🎯 Generating recommendations for student {student_id}")
        
        if db is None:
            db = SessionLocal()
        
        try:
            # Get videos student has watched
            watched_videos = db.query(VideoWatchHistory.video_lesson_id).filter_by(
                student_id=student_id
            ).all()
            watched_ids = [v[0] for v in watched_videos]
            
            # Get videos student hasn't watched, ordered by popularity
            recommendations = db.query(VideoLesson).filter(
                VideoLesson.id.notin_(watched_ids) if watched_ids else True,
                VideoLesson.status == 'PUBLISHED'
            ).order_by(
                VideoLesson.view_count.desc()
            ).limit(limit).all()
            
            return [
                {
                    'videoId': v.id,
                    'title': v.title,
                    'subject': v.subject_id,
                    'durationSeconds': v.duration_seconds,
                    'viewCount': v.view_count,
                    'hasTranscript': v.has_transcript,
                    'hasChapters': v.has_chapters,
                    'thumbnailUrl': v.thumbnail_custom_url or v.thumbnail_youtube_url
                }
                for v in recommendations
            ]
            
        finally:
            if db:
                db.close()
    
    @staticmethod
    def get_popular_videos(
        subject_id: Optional[int] = None,
        limit: int = 10,
        days: int = 30,
        db: Session = None
    ) -> List[Dict]:
        """
        Get popular videos (most watched in last N days)
        
        Args:
            subject_id: Optional filter by subject
            limit: Max videos to return
            days: Look back period (default 30 days)
            db: Database session
        
        Returns:
            List of popular video dicts
        """
        logger.info(f"🔥 Fetching popular videos: subject={subject_id}, days={days}")
        
        if db is None:
            db = SessionLocal()
        
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            query = db.query(
                VideoLesson,
                func.count(VideoWatchHistory.id).label('watch_count')
            ).outerjoin(
                VideoWatchHistory,
                VideoLesson.id == VideoWatchHistory.video_lesson_id
            ).filter(
                VideoLesson.status == 'PUBLISHED'
            )
            
            if subject_id:
                query = query.filter(VideoLesson.subject_id == subject_id)
            
            results = query.group_by(VideoLesson.id).order_by(
                func.count(VideoWatchHistory.id).desc()
            ).limit(limit).all()
            
            return [
                {
                    'videoId': v[0].id,
                    'title': v[0].title,
                    'subject': v[0].subject_id,
                    'durationSeconds': v[0].duration_seconds,
                    'watchCount': v[1],
                    'hasTranscript': v[0].has_transcript,
                    'hasChapters': v[0].has_chapters,
                    'thumbnailUrl': v[0].thumbnail_custom_url or v[0].thumbnail_youtube_url
                }
                for v in results
            ]
            
        finally:
            if db:
                db.close()
    
    @staticmethod
    def get_completion_rate(
        student_id: int,
        subject_id: Optional[int] = None,
        db: Session = None
    ) -> Dict:
        """
        Get student's video completion statistics
        
        Args:
            student_id: Student user ID
            subject_id: Optional filter by subject
            db: Database session
        
        Returns:
            Dict with completion stats
        """
        logger.info(f"📈 Calculating completion rate for student {student_id}")
        
        if db is None:
            db = SessionLocal()
        
        try:
            query = db.query(VideoWatchHistory).filter_by(student_id=student_id)
            
            if subject_id:
                query = query.join(VideoLesson).filter(
                    VideoLesson.subject_id == subject_id
                )
            
            all_watches = query.all()
            completed = [w for w in all_watches if (w.watch_percentage or 0) >= 80]
            
            return {
                'totalVideosWatched': len(all_watches),
                'videosCompleted': len(completed),
                'completionRate': (len(completed) / len(all_watches) * 100) if all_watches else 0,
                'totalWatchTimeSeconds': sum([w.watch_time_seconds or 0 for w in all_watches]),
                'averageWatchPercentage': (
                    sum([w.watch_percentage or 0 for w in all_watches]) / len(all_watches)
                ) if all_watches else 0
            }
            
        finally:
            if db:
                db.close()