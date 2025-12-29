package com.edu.platform.repository;

import com.edu.platform.model.TeacherYouTubeToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface TeacherYouTubeTokenRepository extends JpaRepository<TeacherYouTubeToken, Long> {
    
    // Find token by teacher ID
    Optional<TeacherYouTubeToken> findByTeacherId(Long teacherId);
    
    // Find token by YouTube channel ID
    Optional<TeacherYouTubeToken> findByYoutubeChannelId(String youtubeChannelId);
    
    // Check if teacher has token
    boolean existsByTeacherId(Long teacherId);
    
    // Find expired tokens (for cleanup or refresh)
    @Query("SELECT t FROM TeacherYouTubeToken t WHERE t.expiresAt < :now")
    List<TeacherYouTubeToken> findExpiredTokens(@Param("now") Instant now);
    
    // Find tokens expiring soon (for proactive refresh)
    @Query("SELECT t FROM TeacherYouTubeToken t WHERE t.expiresAt BETWEEN :now AND :threshold")
    List<TeacherYouTubeToken> findTokensExpiringSoon(
        @Param("now") Instant now,
        @Param("threshold") Instant threshold
    );
    
    // Delete token by teacher ID
    void deleteByTeacherId(Long teacherId);
    
    // Count connected teachers
    long count();
}