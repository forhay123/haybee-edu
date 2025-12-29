package com.edu.platform.repository;

import com.edu.platform.model.VideoWatchHistory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VideoWatchHistoryRepository extends JpaRepository<VideoWatchHistory, Long> {
    
    // ==================== EXISTING METHODS (Keep all of these) ====================
    
    Optional<VideoWatchHistory> findByVideoLessonIdAndStudentId(Long videoLessonId, Long studentId);
    
    Optional<VideoWatchHistory> findByVideoLessonIdAndStudentIdAndSessionId(
        Long videoLessonId,
        Long studentId,
        UUID sessionId
    );
    
    @Query("SELECT vwh FROM VideoWatchHistory vwh WHERE vwh.student.id = :studentId " +
           "ORDER BY vwh.watchStartedAt DESC")
    List<VideoWatchHistory> findByStudentId(@Param("studentId") Long studentId, Pageable pageable);
    
    List<VideoWatchHistory> findByStudentIdOrderByWatchStartedAtDesc(Long studentId);
    
    @Query("SELECT vwh FROM VideoWatchHistory vwh WHERE vwh.student.id = :studentId " +
           "AND vwh.videoLesson.subject.id = :subjectId " +
           "ORDER BY vwh.watchStartedAt DESC")
    List<VideoWatchHistory> findByStudentIdAndVideoLesson_SubjectId(
            @Param("studentId") Long studentId, 
            @Param("subjectId") Long subjectId, 
            Pageable pageable);
    
    List<VideoWatchHistory> findByVideoLessonIdOrderByWatchStartedAtDesc(Long videoLessonId);
    
    List<VideoWatchHistory> findByStudentIdAndCompletedTrue(Long studentId);
    
    @Query("SELECT vwh FROM VideoWatchHistory vwh WHERE vwh.student.id = :studentId " +
           "AND vwh.completed = false AND vwh.lastPositionSeconds > 0 " +
           "ORDER BY vwh.watchStartedAt DESC")
    List<VideoWatchHistory> findInProgressByStudentId(@Param("studentId") Long studentId);
    
    @Query("SELECT SUM(vwh.totalWatchTimeSeconds) FROM VideoWatchHistory vwh " +
           "WHERE vwh.student.id = :studentId")
    Long calculateTotalWatchTimeByStudentId(@Param("studentId") Long studentId);
    
    @Query("SELECT COUNT(DISTINCT vwh.student.id) FROM VideoWatchHistory vwh " +
           "WHERE vwh.videoLesson.id = :videoId")
    long countUniqueViewersByVideoId(@Param("videoId") Long videoId);
    
    @Query("SELECT AVG(vwh.completionPercentage) FROM VideoWatchHistory vwh " +
           "WHERE vwh.videoLesson.id = :videoId AND vwh.completionPercentage IS NOT NULL")
    Double calculateAverageCompletionRateByVideoId(@Param("videoId") Long videoId);
    
    @Query("SELECT vwh FROM VideoWatchHistory vwh WHERE vwh.student.id = :studentId " +
           "ORDER BY vwh.watchStartedAt DESC")
    List<VideoWatchHistory> findRecentByStudentId(@Param("studentId") Long studentId);
    
    long countByStudentIdAndCompletedTrue(Long studentId);
    
    List<VideoWatchHistory> findByVideoLessonIdAndCompleted(Long videoLessonId, Boolean completed);
    
    List<VideoWatchHistory> findByVideoLesson_TeacherIdAndWatchStartedAtBetween(
        Long teacherId, Instant startDate, Instant endDate
    );
    
    // ==================== 🔥 ADD THESE CRITICAL MISSING METHODS ====================
    
    /**
     * ✅ CRITICAL: Find watch history by list of video IDs
     * This is what teacher analytics needs!
     */
    @Query("SELECT vwh FROM VideoWatchHistory vwh WHERE vwh.videoLesson.id IN :videoIds")
    List<VideoWatchHistory> findByVideoLesson_IdIn(@Param("videoIds") List<Long> videoIds);
    
    /**
     * ✅ CRITICAL: Find watch history by video IDs with date range
     */
    @Query("SELECT vwh FROM VideoWatchHistory vwh " +
           "WHERE vwh.videoLesson.id IN :videoIds " +
           "AND vwh.watchStartedAt BETWEEN :startDate AND :endDate")
    List<VideoWatchHistory> findByVideoLesson_IdInAndWatchStartedAtBetween(
            @Param("videoIds") List<Long> videoIds,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate
    );
    
    /**
     * ✅ Find all watch history for a teacher (all their videos)
     */
    @Query("SELECT vwh FROM VideoWatchHistory vwh " +
           "WHERE vwh.videoLesson.teacher.id = :teacherId")
    List<VideoWatchHistory> findByVideoLesson_TeacherId(@Param("teacherId") Long teacherId);
}