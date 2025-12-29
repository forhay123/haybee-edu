package com.edu.platform.dto.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * ✅ SPRINT 6: DTO for assessment available notifications.
 * Sent when a student's assessment window opens and they can start the assessment.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentAvailableNotificationDto {

    /**
     * Progress record ID
     */
    private Long progressId;

    /**
     * Student information
     */
    private Long studentId;
    private String studentName;
    private String className;

    /**
     * Subject and topic information
     */
    private Long subjectId;
    private String subjectName;
    private Long lessonTopicId;
    private String lessonTopicTitle;
    private Integer weekNumber;

    /**
     * Assessment window information
     */
    private LocalDateTime windowStart;
    private LocalDateTime windowEnd;
    private Integer durationMinutes;

    /**
     * Grace period information
     */
    private LocalDateTime graceDeadline;
    private Integer graceMinutes;

    /**
     * Period information
     */
    private String dayOfWeek; // "Monday", "Wednesday", etc.
    private String periodTimeSlot; // "4:00 PM - 6:00 PM"

    /**
     * Multi-period tracking
     */
    private Integer periodSequence; // Which period this is (1, 2, 3...)
    private Integer totalPeriodsInSequence;
    private Boolean hasMultiplePeriods;

    /**
     * Previous period completion (for multi-period topics)
     */
    private Boolean hasPreviousPeriod;
    private Boolean previousPeriodCompleted;
    private LocalDateTime previousPeriodCompletedAt;

    /**
     * Action URLs
     */
    private String startAssessmentUrl;
    private String viewTopicDetailsUrl;
    private String viewScheduleUrl;

    /**
     * Additional context
     */
    private String teacherName;
    private String teacherEmail;
    private Boolean isFirstAttempt;
    private Integer timeUntilWindowCloses; // Minutes remaining
}