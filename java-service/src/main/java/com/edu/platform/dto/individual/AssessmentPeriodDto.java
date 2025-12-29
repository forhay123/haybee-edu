package com.edu.platform.dto.individual;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * ✅ SPRINT 8: DTO for individual assessment period information
 * Represents one period in a multi-period lesson topic
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentPeriodDto {

    /**
     * Period identification
     */
    private Long scheduleId;
    private Long progressId;
    private Integer periodSequence; // 1, 2, 3, etc.
    private Integer totalPeriodsInSequence;

    /**
     * Schedule information
     */
    private LocalDate scheduledDate;
    private String dayOfWeek; // "Monday", "Tuesday", etc.
    private LocalTime startTime;
    private LocalTime endTime;
    private String timeSlot; // "4:00 PM - 6:00 PM"
    private Integer periodNumber;

    /**
     * Assessment window
     */
    private LocalDateTime windowStart; // When assessment becomes available
    private LocalDateTime windowEnd;   // Assessment deadline
    private LocalDateTime graceDeadline; // Grace period end
    private Boolean isWindowOpen; // Currently within assessment window
    private Boolean isGracePeriodActive;
    private Integer minutesUntilDeadline; // Time remaining (negative if past)

    /**
     * Completion status
     */
    private String status; // "PENDING", "AVAILABLE", "IN_PROGRESS", "COMPLETED", "MISSED", "GRACE_EXPIRED"
    private Boolean completed;
    private LocalDateTime completedAt;
    private LocalDateTime submittedAt;

    /**
     * Assessment details
     */
    private Long assessmentInstanceId;
    private String assessmentTitle;
    private Integer totalQuestions;
    private Integer attemptedQuestions;

    /**
     * Scoring
     */
    private Double score; // Percentage or points
    private Double maxScore;
    private String grade; // Letter grade if applicable

    /**
     * Incomplete tracking
     */
    private Boolean isMissed;
    private String incompleteReason; // "MISSED_GRACE_PERIOD", "NOT_SUBMITTED", etc.
    private LocalDateTime markedIncompleteAt;

    /**
     * Dependencies (for multi-period topics)
     */
    private Boolean hasPreviousPeriod;
    private Boolean previousPeriodCompleted;
    private String previousPeriodStatus;

    /**
     * Actions
     */
    private Boolean canStart; // Can student start this assessment now?
    private String actionUrl; // URL to start/continue assessment
    private String actionLabel; // "Start Assessment", "Continue", "View Results", etc.

    /**
     * Visual indicators
     */
    private String statusIcon; // "✅", "⏳", "❌", "🕒", etc.
    private String statusColor; // "success", "warning", "danger", "info"
    private String progressLabel; // "Completed (85%)", "Available Now", "Missed", etc.
}