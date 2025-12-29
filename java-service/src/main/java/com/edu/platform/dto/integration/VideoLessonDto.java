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
public class VideoLessonDto {
    private Long id;
    private String title;
    private String description;
    private String status;
    private Boolean published; // ✅ ADD THIS LINE
    
    // YouTube details
    private String youtubeVideoId;
    private String youtubeUrl;
    private String embedUrl;
    private String thumbnailUrl;
    private Integer durationSeconds;
    
    // Relationships
    private Long teacherId;
    private String teacherName;
    private Long subjectId;
    private String subjectName;
    private Long lessonTopicId;
    private String lessonTopicTitle;
    private Long sessionRecordingId;
    
    // AI-generated content flags
    private Boolean hasTranscript;
    private Boolean hasChapters;
    private Boolean hasQuiz;
    private Boolean hasSummary;
    
    // Access control
    private Boolean isAspirantMaterial;
    private Boolean isPublic;
    private Boolean isPremium;
    
    // Analytics
    private Integer totalViews;
    private Double averageCompletionRate;
    
    // Watch progress (for students)
    private Integer lastPositionSeconds;
    private Double completionPercentage;
    private Boolean completed;
    
    // Metadata
    private Instant uploadDate;
    private Instant processingCompletedAt;
    private Instant createdAt;
    private Instant updatedAt;
}