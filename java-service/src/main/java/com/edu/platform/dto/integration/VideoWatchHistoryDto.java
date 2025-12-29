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
public class VideoWatchHistoryDto {
    private Long id;
    private Long videoLessonId;
    private Long studentId;
    private String studentName;
    private Instant watchStartedAt;
    private Instant watchEndedAt;
    private Integer lastPositionSeconds;
    private Integer totalWatchTimeSeconds;
    private Boolean completed;
    private Double completionPercentage;
}