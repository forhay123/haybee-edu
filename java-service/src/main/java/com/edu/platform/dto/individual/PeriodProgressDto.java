package com.edu.platform.dto.individual;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO for individual period progress in a multi-period sequence.
 * Shows status, access control, and assessment details for one period.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PeriodProgressDto {

    /**
     * Progress record ID
     */
    private Long progressId;

    /**
     * Period number (1, 2, or 3)
     */
    private Integer periodNumber;

    /**
     * Total periods in sequence
     */
    private Integer totalPeriodsInSequence;

    /**
     * Status of this period
     */
    private PeriodStatus status;

    /**
     * Detailed status message for display
     */
    private String statusMessage;

    /**
     * Assessment information
     */
    private Long assessmentId;
    private String assessmentTitle;
    private Boolean isCustomAssessment;

    /**
     * Submission information (if completed)
     */
    private Long submissionId;
    private Double score;
    private LocalDateTime completedAt;

    /**
     * Scheduled date for this period
     */
    private LocalDate scheduledDate;

    /**
     * Assessment window timing
     */
    private LocalDateTime assessmentWindowStart;
    private LocalDateTime assessmentWindowEnd;
    private LocalDateTime gracePeriodEnd;

    /**
     * Access control
     */
    private Boolean canAccess;
    private String blockingReason;
    private AccessBlockType blockType;

    /**
     * Previous period information (for dependency)
     */
    private Long previousPeriodProgressId;
    private Boolean previousPeriodCompleted;

    /**
     * Custom assessment status
     */
    private Boolean requiresCustomAssessment;
    private Boolean customAssessmentCreated;
    private LocalDateTime customAssessmentCreatedAt;
    private String customAssessmentCreatedBy;

    /**
     * Is this period currently accessible for the student?
     */
    private Boolean isAccessible;

    /**
     * Is assessment window currently open?
     */
    private Boolean isWindowOpen;

    /**
     * Time information
     */
    private Long minutesUntilWindowOpens;
    private Long minutesUntilWindowCloses;

    /**
     * Period status enum
     */
    public enum PeriodStatus {
        COMPLETED,           // Period finished, assessment submitted
        AVAILABLE,           // Can be started now
        WAITING_ASSESSMENT,  // Waiting for teacher to create custom assessment
        LOCKED,              // Blocked by previous period
        SCHEDULED,           // Not yet available (future date)
        WINDOW_CLOSED        // Assessment window has passed
    }

    /**
     * Type of access block
     */
    public enum AccessBlockType {
        NONE,                    // No block
        PREVIOUS_INCOMPLETE,     // Previous period not completed
        WAITING_TEACHER,         // Teacher needs to create assessment
        WINDOW_NOT_OPEN,         // Assessment window hasn't started
        WINDOW_CLOSED,           // Assessment window has ended
        NO_ASSESSMENT           // No assessment assigned
    }

    /**
     * Helper method to determine if period is locked
     */
    public boolean isLocked() {
        return status == PeriodStatus.LOCKED || 
               status == PeriodStatus.WAITING_ASSESSMENT;
    }

    /**
     * Helper method to determine if period is completed
     */
    public boolean isCompleted() {
        return status == PeriodStatus.COMPLETED;
    }

    /**
     * Helper method to get user-friendly status text
     */
    public String getFriendlyStatus() {
        if (statusMessage != null && !statusMessage.isEmpty()) {
            return statusMessage;
        }

        return switch (status) {
            case COMPLETED -> "Completed";
            case AVAILABLE -> "Ready to start";
            case WAITING_ASSESSMENT -> "Teacher is preparing your assessment";
            case LOCKED -> "Complete previous period first";
            case SCHEDULED -> "Not yet available";
            case WINDOW_CLOSED -> "Assessment window closed";
            default -> "Unknown";
        };
    }
}
