package com.edu.platform.repository;

import com.edu.platform.model.VideoChapter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VideoChapterRepository extends JpaRepository<VideoChapter, Long> {
    
    // Find chapters by video lesson (ordered by chapter number)
    List<VideoChapter> findByVideoLessonIdOrderByChapterNumberAsc(Long videoLessonId);
    
    // Find specific chapter by video and chapter number
    Optional<VideoChapter> findByVideoLessonIdAndChapterNumber(Long videoLessonId, Integer chapterNumber);
    
    // Check if chapters exist for video
    boolean existsByVideoLessonId(Long videoLessonId);
    
    // Count chapters for video
    long countByVideoLessonId(Long videoLessonId);
    
    // Find chapters by teacher (through video)
    @Query("SELECT vc FROM VideoChapter vc WHERE vc.videoLesson.teacher.id = :teacherId " +
           "ORDER BY vc.videoLesson.id, vc.chapterNumber")
    List<VideoChapter> findByTeacherId(@Param("teacherId") Long teacherId);
    
    // Find chapters by time range
    @Query("SELECT vc FROM VideoChapter vc WHERE vc.videoLesson.id = :videoId " +
           "AND vc.startTimeSeconds <= :timeSeconds AND vc.endTimeSeconds >= :timeSeconds")
    Optional<VideoChapter> findByVideoIdAndTimeSeconds(
        @Param("videoId") Long videoId,
        @Param("timeSeconds") Integer timeSeconds
    );
    
    // Search chapters by title
    @Query("SELECT vc FROM VideoChapter vc WHERE " +
           "LOWER(vc.title) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<VideoChapter> searchByTitle(@Param("query") String query);
    
    // Delete chapters by video lesson ID
    void deleteByVideoLessonId(Long videoLessonId);
}