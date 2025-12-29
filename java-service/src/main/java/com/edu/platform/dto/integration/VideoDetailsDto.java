package com.edu.platform.dto.integration;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VideoDetailsDto {
    private Long id;
    private String title;
    private String description;
    private String status;
    private Boolean published;
    
    // YouTube details
    private String youtubeVideoId;
    private String youtubeUrl;
    private String embedUrl;
    private String thumbnailUrl;
    private Integer durationSeconds;
    
    // Relationships
    private Long teacherId;
    private String teacherName;
    private String teacherEmail;
    private Long subjectId;
    private String subjectName;
    private Long lessonTopicId;
    private String lessonTopicTitle;
    private Long sessionRecordingId;
    
    // AI-generated content
    private Boolean hasTranscript;
    private Boolean hasChapters;  // ← ADD THIS LINE
    private String transcript;
    private List<VideoChapterDto> chapters;
    private Boolean hasQuiz;
    private Boolean hasSummary;
    
    // Access control
    private Boolean isAspirantMaterial;
    private Boolean isPublic;
    private Boolean isPremium;
    
    // Analytics (for teachers)
    private Integer totalViews;
    private Double averageCompletionRate;
    private List<VideoWatchHistoryDto> recentViews;
    
    // Watch progress (for students)
    private Integer lastPositionSeconds;
    private Double completionPercentage;
    private Boolean completed;
    private Instant lastWatchedAt;
    
    // Metadata
    private Instant uploadDate;
    private Instant processingCompletedAt;
    private Instant createdAt;
    private Instant updatedAt;
}