package com.edu.platform.repository;

import com.edu.platform.model.SessionRecording;
import com.edu.platform.model.VideoLesson;
import com.edu.platform.model.enums.VideoStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface VideoLessonRepository extends JpaRepository<VideoLesson, Long> {
    
    // Find by YouTube video ID
    Optional<VideoLesson> findByYoutubeVideoId(String youtubeVideoId);
    
    // Find videos by teacher
    List<VideoLesson> findByTeacherIdOrderByUploadDateDesc(Long teacherId);
    
    // Find videos by subject and status
    List<VideoLesson> findBySubjectIdAndStatus(Long subjectId, VideoStatus status);
    
    // Find videos by subject
    List<VideoLesson> findBySubjectIdOrderByUploadDateDesc(Long subjectId);
    
    // Find videos by lesson topic
    List<VideoLesson> findByLessonTopicId(Long lessonTopicId);
    
    // Find videos by status
    List<VideoLesson> findByStatus(VideoStatus status);
    
    // Search videos - UPDATED to match both requirements
    @Query("SELECT vl FROM VideoLesson vl WHERE " +
           "(LOWER(vl.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(vl.description) LIKE LOWER(CONCAT('%', :query, '%'))) AND " +
           "vl.status = 'PUBLISHED' " +
           "ORDER BY vl.uploadDate DESC")
    List<VideoLesson> searchPublishedVideos(@Param("query") String query);
    
    // Original search with status parameter
    @Query("SELECT vl FROM VideoLesson vl WHERE " +
           "(LOWER(vl.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(vl.description) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "AND vl.status = :status ORDER BY vl.uploadDate DESC")
    List<VideoLesson> searchByTitleOrDescription(
        @Param("query") String query,
        @Param("status") VideoStatus status
    );
    
    // Find videos for student - UPDATED to match both requirements
    @Query("SELECT vl FROM VideoLesson vl WHERE " +
           "vl.subject.id IN :subjectIds AND vl.status = :status " +
           "ORDER BY vl.uploadDate DESC")
    List<VideoLesson> findBySubjectIdsAndStatus(
        @Param("subjectIds") List<Long> subjectIds, 
        @Param("status") VideoStatus status
    );
    
    // Original version with aspirant flag
    @Query("SELECT vl FROM VideoLesson vl WHERE vl.subject.id IN :subjectIds " +
           "AND vl.status = :status AND vl.isAspirantMaterial = :isAspirant " +
           "ORDER BY vl.uploadDate DESC")
    List<VideoLesson> findBySubjectIdsAndStudentType(
        @Param("subjectIds") List<Long> subjectIds,
        @Param("status") VideoStatus status,
        @Param("isAspirant") Boolean isAspirant
    );
    
    // Find videos by teacher and status
    List<VideoLesson> findByTeacherIdAndStatus(Long teacherId, VideoStatus status);
    
    // Find videos uploaded in date range
    @Query("SELECT vl FROM VideoLesson vl WHERE vl.uploadDate BETWEEN :startDate AND :endDate " +
           "ORDER BY vl.uploadDate DESC")
    List<VideoLesson> findByUploadDateBetween(
        @Param("startDate") Instant startDate,
        @Param("endDate") Instant endDate
    );
    
    // Count videos by teacher
    Long countByTeacherId(Long teacherId);
    
    // Count videos by teacher and status
    Long countByTeacherIdAndStatus(Long teacherId, VideoStatus status);
    
    // Find processing videos (for checking status)
    @Query("SELECT vl FROM VideoLesson vl WHERE vl.status = :status " +
           "AND vl.uploadDate > :threshold")
    List<VideoLesson> findProcessingVideos(
        @Param("status") VideoStatus status,
        @Param("threshold") Instant threshold
    );
    
    // Find top viewed videos
    @Query("SELECT vl FROM VideoLesson vl WHERE vl.status = :status " +
           "ORDER BY vl.totalViews DESC")
    List<VideoLesson> findTopViewedVideos(@Param("status") VideoStatus status);
    
    // Find videos by subject and aspirant flag
    List<VideoLesson> findBySubjectIdAndIsAspirantMaterialAndStatus(
        Long subjectId, 
        Boolean isAspirantMaterial, 
        VideoStatus status
    );
    
    // ✅ Find video by session recording ID
    @Query("SELECT vl FROM VideoLesson vl WHERE vl.sessionRecording.id = :sessionRecordingId")
    Optional<VideoLesson> findBySessionRecordingId(@Param("sessionRecordingId") Long sessionRecordingId);
    
    // ✅ NEW: Find video by session recording entity
    Optional<VideoLesson> findBySessionRecording(SessionRecording sessionRecording);
    
    // ✅ NEW: Find videos with null or zero duration (for scheduled update job)
    @Query("SELECT vl FROM VideoLesson vl WHERE vl.durationSeconds IS NULL OR vl.durationSeconds = 0")
    List<VideoLesson> findVideosNeedingDurationUpdate();
    
    // Alternative method name style (Spring Data will implement automatically)
    List<VideoLesson> findByDurationSecondsIsNullOrDurationSecondsEquals(Integer duration);
    
    // ==================== Paginated Methods ====================
    
    Page<VideoLesson> findByTeacherId(Long teacherId, Pageable pageable);

    Page<VideoLesson> findByTeacherIdAndSubjectId(Long teacherId, Long subjectId, Pageable pageable);

    Page<VideoLesson> findByTeacherIdAndStatus(Long teacherId, VideoStatus status, Pageable pageable);

    Page<VideoLesson> findByTeacherIdAndSubjectIdAndStatus(Long teacherId, Long subjectId, VideoStatus status, Pageable pageable);

    Page<VideoLesson> findByIsAspirantMaterialAndStatusOrderByUploadDateDesc(Boolean isAspirantMaterial, VideoStatus status, Pageable pageable);

    Page<VideoLesson> findBySubjectIdAndIsAspirantMaterialAndStatusOrderByUploadDateDesc(Long subjectId, Boolean isAspirantMaterial, VideoStatus status, Pageable pageable);

    // Search with pagination
    @Query("SELECT vl FROM VideoLesson vl WHERE " +
           "(LOWER(vl.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(vl.description) LIKE LOWER(CONCAT('%', :query, '%'))) AND " +
           "vl.status = :status ORDER BY vl.uploadDate DESC")
    Page<VideoLesson> searchVideos(@Param("query") String query, @Param("status") VideoStatus status, Pageable pageable);

    
    Page<VideoLesson> findBySubjectIdAndStatus(Long subjectId, VideoStatus status, Pageable pageable);
    Page<VideoLesson> findBySubjectId(Long subjectId, Pageable pageable);
    Page<VideoLesson> findByStatus(VideoStatus status, Pageable pageable);
    
 // Add this method to VideoLessonRepository.java
    @Query("SELECT v FROM VideoLesson v WHERE v.subject.id IN :subjectIds " +
           "AND v.status = :status AND v.published = true " +
           "ORDER BY v.uploadDate DESC")
    Page<VideoLesson> findBySubjectIdInAndStatusAndPublishedTrueOrderByUploadDateDesc(
            @Param("subjectIds") List<Long> subjectIds, 
            @Param("status") VideoStatus status, 
            Pageable pageable);


    
    
 // Find videos by status and published flag (for aspirants - all videos)
    List<VideoLesson> findByStatusAndPublishedTrue(VideoStatus status);

    // Find by subject, status, published (for aspirants with subject filter)
    Page<VideoLesson> findBySubjectIdAndStatusAndPublishedTrueOrderByUploadDateDesc(
        Long subjectId, 
        VideoStatus status, 
        Pageable pageable
    );

    // Find by subject list, status, isAspirantMaterial=false, published (for regular students)
    Page<VideoLesson> findBySubjectIdInAndStatusAndIsAspirantMaterialAndPublishedTrueOrderByUploadDateDesc(
        List<Long> subjectIds, 
        VideoStatus status, 
        Boolean isAspirantMaterial, 
        Pageable pageable
    );

    // Find by single subject, status, isAspirantMaterial=false, published (for regular students with filter)
    Page<VideoLesson> findBySubjectIdAndStatusAndIsAspirantMaterialAndPublishedTrueOrderByUploadDateDesc(
        Long subjectId, 
        VideoStatus status, 
        Boolean isAspirantMaterial, 
        Pageable pageable
    );
}