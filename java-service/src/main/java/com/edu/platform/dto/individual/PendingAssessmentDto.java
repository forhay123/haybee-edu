package com.edu.platform.dto.individual;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO for pending custom assessment information.
 * Shows periods waiting for teacher to create custom assessment.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PendingAssessmentDto {

    /**
     * Progress record ID
     */
    private Long progressId;

    /**
     * Student information
     */
    private Long studentId;
    private String studentName;

    /**
     * Subject information
     */
    private Long subjectId;
    private String subjectName;

    /**
     * Topic information (if applicable)
     */
    private Long topicId;
    private String topicName;

    /**
     * Period number awaiting assessment (2 or 3)
     */
    private Integer periodNumber;

    /**
     * Total periods in sequence
     */
    private Integer totalPeriods;

    /**
     * When this period is scheduled
     */
    private LocalDate scheduledDate;

    /**
     * Previous period information
     */
    private Long previousPeriodProgressId;
    private Long previousSubmissionId;
    private Double previousScore;
    private LocalDateTime previousCompletedAt;

    /**
     * Can teacher create assessment now?
     */
    private Boolean canCreateNow;

    /**
     * Why can't it be created? (if canCreateNow is false)
     */
    private String blockingReason;

    /**
     * How urgent is this? (based on scheduled date)
     */
    private UrgencyLevel urgencyLevel;

    /**
     * Days until scheduled date
     */
    private Integer daysUntilScheduled;

    /**
     * Suggested focus areas based on previous performance
     */
    private SuggestedTopicDto suggestedFocusAreas;

    /**
     * Urgency levels for pending assessments
     */
    public enum UrgencyLevel {
        CRITICAL,  // Scheduled today or in past
        HIGH,      // Scheduled within 3 days
        MEDIUM,    // Scheduled within 7 days
        LOW        // Scheduled more than 7 days away
    }

    /**
     * Suggested topics/areas to focus on
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SuggestedTopicDto {
        private String topicName;
        private Double previousScore;
        private Integer questionsWrong;
        private String recommendedFocus;
    }
}
