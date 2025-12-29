package com.edu.platform.dto.individual;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * ✅ SPRINT 8: DTO for multi-assessment progress tracking
 * Shows student's progress across all periods of a lesson topic
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MultiAssessmentProgressDto {

    /**
     * Lesson topic information
     */
    private Long lessonTopicId;
    private String lessonTopicTitle;
    private String description;
    private Integer weekNumber;

    /**
     * Subject information
     */
    private Long subjectId;
    private String subjectName;
    private String subjectCode;

    /**
     * Overall completion status
     */
    private String completionStatus; // "NOT_STARTED", "IN_PROGRESS", "COMPLETED", "INCOMPLETE"
    private Double completionPercentage; // 0.0 to 100.0
    
    /**
     * Multi-period tracking
     */
    private Integer totalPeriods;
    private Integer completedPeriods;
    private Integer pendingPeriods;
    private Integer missedPeriods;

    /**
     * Individual period details
     */
    private List<AssessmentPeriodDto> periods;

    /**
     * Scoring information
     */
    private Double averageScore; // Average across completed periods
    private Double totalPossiblePoints;
    private Double earnedPoints;

    /**
     * Timeline
     */
    private LocalDate firstPeriodDate;
    private LocalDate lastPeriodDate;
    private LocalDate nextPeriodDate; // Next pending period

    /**
     * Alerts and warnings
     */
    private Boolean hasUpcomingDeadline; // Within 24 hours
    private Boolean hasMissedPeriods;
    private Boolean allPeriodsCompleted;
    private String statusMessage; // User-friendly message

    /**
     * Action items
     */
    private Boolean canStartNextPeriod;
    private Long nextPeriodScheduleId;
    private String nextPeriodActionUrl;
}