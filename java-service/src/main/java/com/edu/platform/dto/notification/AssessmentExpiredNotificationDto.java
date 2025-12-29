package com.edu.platform.dto.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * ✅ SPRINT 6: DTO for assessment expired notifications.
 * Sent when grace period expires and student hasn't submitted.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentExpiredNotificationDto {

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
     * Expiration information
     */
    private LocalDateTime windowEnd;
    private LocalDateTime graceDeadline;
    private LocalDateTime expiredAt; // When it was marked as incomplete
    private String incompleteReason; // "MISSED_GRACE_PERIOD"

    /**
     * Period information
     */
    private String dayOfWeek; // "Monday", "Wednesday", etc.
    private String periodTimeSlot; // "4:00 PM - 6:00 PM"

    /**
     * Multi-period tracking
     */
    private Integer periodSequence; // Which period was missed
    private Integer totalPeriodsInSequence;
    private Boolean hasMultiplePeriods;
    
    /**
     * Completion status (for multi-period topics)
     */
    private Integer completedPeriodsCount; // How many periods were completed
    private Integer remainingPeriodsCount; // How many periods remain
    private Double topicCompletionPercentage; // 0.0 to 100.0

    /**
     * Action URLs
     */
    private String viewProgressUrl;
    private String contactTeacherUrl;

    /**
     * Additional context
     */
    private Boolean canRequestMakeup; // Teacher discretion
    private String teacherContactEmail;
    private String teacherName;
}