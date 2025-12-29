package com.edu.platform.repository;

import com.edu.platform.model.VideoTranscript;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VideoTranscriptRepository extends JpaRepository<VideoTranscript, Long> {
    
    // Find transcript by video lesson ID
    Optional<VideoTranscript> findByVideoLessonId(Long videoLessonId);
    
    // Check if transcript exists for video
    boolean existsByVideoLessonId(Long videoLessonId);
    
    // Find transcripts by language
    List<VideoTranscript> findByLanguage(String language);
    
    // Find transcripts by model used
    List<VideoTranscript> findByModelUsed(String modelUsed);
    
    // Search transcripts by content
    @Query("SELECT vt FROM VideoTranscript vt WHERE " +
           "LOWER(vt.fullTranscript) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<VideoTranscript> searchByContent(@Param("query") String query);
    
    // Find transcripts by teacher (through video)
    @Query("SELECT vt FROM VideoTranscript vt WHERE vt.videoLesson.teacher.id = :teacherId " +
           "ORDER BY vt.generatedAt DESC")
    List<VideoTranscript> findByTeacherId(@Param("teacherId") Long teacherId);
    
    // Count transcripts
    @Query("SELECT COUNT(vt) FROM VideoTranscript vt")
    long countAllTranscripts();
    
    // Find recent transcripts
    @Query("SELECT vt FROM VideoTranscript vt ORDER BY vt.generatedAt DESC")
    List<VideoTranscript> findRecentTranscripts();
}