package com.edu.platform.dto.individual;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO for incomplete lesson progress records
 * SPRINT 11: Incomplete Tracking
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IncompleteProgressDto {

    /**
     * Progress record ID
     */
    private Long id;

    /**
     * Student information
     */
    private Long studentId;
    private String studentName;
    private String studentEmail;

    /**
     * Subject information
     */
    private Long subjectId;
    private String subjectName;

    /**
     * Lesson information
     */
    private Long lessonTopicId;
    private String lessonTopicTitle;
    private Integer weekNumber;

    /**
     * Schedule information
     */
    private LocalDate scheduledDate;
    private Integer periodNumber;
    private String dayOfWeek;

    /**
     * Incomplete details
     */
    private String incompleteReason;
    private LocalDateTime autoMarkedIncompleteAt;
    private LocalDateTime assessmentWindowEnd;
    private Integer daysOverdue;

    /**
     * Assessment information
     */
    private Long assessmentId;
    private String assessmentTitle;
    private Boolean assessmentAccessible;
    private LocalDateTime assessmentWindowStart;

    /**
     * Progress status
     */
    private boolean completed;
    private BigDecimal assessmentScore;
    private LocalDateTime completedAt;

    /**
     * Multi-period information
     */
    private Integer periodSequence;
    private Integer totalPeriodsInSequence;
    private Boolean allPeriodsCompleted;

    /**
     * Additional metadata
     */
    private String scheduleSource;
    private Long individualTimetableId;
    private String notes;

    /**
     * Calculate days overdue
     */
    public Integer calculateDaysOverdue() {
        if (scheduledDate == null) {
            return null;
        }
        LocalDate today = LocalDate.now();
        if (today.isAfter(scheduledDate)) {
            return (int) java.time.temporal.ChronoUnit.DAYS.between(scheduledDate, today);
        }
        return 0;
    }

    /**
     * Get incomplete reason display text
     */
    public String getIncompleteReasonDisplay() {
        if (incompleteReason == null) {
            return "Unknown";
        }
        switch (incompleteReason) {
            case "MISSED_GRACE_PERIOD":
                return "Missed Assessment Deadline";
            case "NO_SUBMISSION":
                return "No Assessment Submission";
            case "HOLIDAY_RESCHEDULE_FAILED":
                return "Holiday Rescheduling Failed";
            case "TOPIC_NOT_ASSIGNED":
                return "Topic Not Assigned";
            default:
                return incompleteReason.replace("_", " ");
        }
    }

    /**
     * Check if this is a multi-period topic
     */
    public boolean isMultiPeriodTopic() {
        return totalPeriodsInSequence != null && totalPeriodsInSequence > 1;
    }

    /**
     * Get urgency level (for UI display)
     */
    public String getUrgencyLevel() {
        Integer days = calculateDaysOverdue();
        if (days == null || days == 0) {
            return "LOW";
        }
        if (days <= 3) {
            return "MEDIUM";
        }
        if (days <= 7) {
            return "HIGH";
        }
        return "CRITICAL";
    }
}