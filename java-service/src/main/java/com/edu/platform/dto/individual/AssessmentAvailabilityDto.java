package com.edu.platform.dto.individual;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * ✅ SPRINT 8: DTO for assessment availability status
 * Used for countdown timers and availability indicators
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentAvailabilityDto {

    /**
     * Assessment identification
     */
    private Long scheduleId;
    private Long progressId;
    private Long assessmentInstanceId;
    private String assessmentTitle;

    /**
     * Subject and topic
     */
    private String subjectName;
    private String lessonTopicTitle;
    private Integer weekNumber;

    /**
     * Window timing
     */
    private LocalDateTime windowStart;
    private LocalDateTime windowEnd;
    private LocalDateTime graceDeadline;
    private LocalDateTime currentTime;

    /**
     * Availability status
     */
    private String availabilityStatus; // "NOT_YET_AVAILABLE", "AVAILABLE", "DEADLINE_APPROACHING", "GRACE_PERIOD", "EXPIRED"
    private Boolean isAvailable;
    private Boolean isExpired;
    private Boolean isInGracePeriod;

    /**
     * Time calculations
     */
    private Long minutesUntilAvailable; // If not yet available
    private Long minutesUntilDeadline;  // If available
    private Long minutesUntilGraceExpiry; // If in grace period
    private String timeRemainingDisplay; // "2 hours 30 minutes"

    /**
     * Countdown information
     */
    private Boolean showCountdown;
    private String countdownLabel; // "Opens in", "Due in", "Grace ends in"
    private String urgencyLevel; // "NORMAL", "WARNING", "CRITICAL"

    /**
     * User messages
     */
    private String statusMessage; // "Assessment available now", "Opens at 3:30 PM", "Expired"
    private String actionMessage; // "Start now", "Wait until 3:30 PM", "Too late to submit"

    /**
     * Visual indicators
     */
    private String statusColor; // "green", "yellow", "orange", "red"
    private String statusIcon; // "🟢", "🟡", "🟠", "🔴"
    private Boolean pulseAnimation; // Animate for urgent deadlines
}