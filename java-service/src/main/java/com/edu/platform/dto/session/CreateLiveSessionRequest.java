package com.edu.platform.dto.session;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

// Request to create a live session
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateLiveSessionRequest {
    
    @NotNull(message = "Subject ID is required")
    private Long subjectId;
    
    private Long lessonTopicId; // Optional
    
    @NotNull(message = "Class ID is required")
    private Long classId;
    
    @NotNull(message = "Term ID is required")
    private Long termId;
    
    @NotBlank(message = "Title is required")
    private String title;
    
    private String description;
    
    @NotNull(message = "Scheduled start time is required")
    @Future(message = "Scheduled start time must be in the future")
    private Instant scheduledStartTime;
    
    @NotNull(message = "Duration is required")
    @Positive(message = "Duration must be positive")
    private Integer scheduledDurationMinutes;
    
    private Integer maxParticipants;
    
    private String meetingPassword;
    
    private String timezone; // Default: UTC
}
