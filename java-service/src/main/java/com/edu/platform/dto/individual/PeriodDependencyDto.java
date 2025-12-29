package com.edu.platform.dto.individual;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for period dependency information.
 * Shows what needs to be done before a period can be accessed.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PeriodDependencyDto {

    /**
     * Current period information
     */
    private Long progressId;
    private Integer periodNumber;
    private Integer totalPeriodsInSequence;

    /**
     * Dependency information
     */
    private Integer dependsOnPeriod;
    private Long dependsOnProgressId;
    private Boolean dependencyMet;

    /**
     * Status
     */
    private DependencyStatus status;

    /**
     * Blocking information
     */
    private String blockingReason;
    private List<String> requirements;

    /**
     * Previous period details
     */
    private PreviousPeriodDetails previousPeriod;

    /**
     * Next available action
     */
    private NextAction nextAvailableAction;

    /**
     * Scheduled information
     */
    private LocalDate scheduledDate;
    private LocalDateTime assessmentWindowStart;
    private LocalDateTime assessmentWindowEnd;

    /**
     * Assessment information
     */
    private Boolean hasAssessment;
    private Boolean requiresCustomAssessment;
    private Boolean customAssessmentCreated;

    /**
     * Full dependency chain (for multi-level dependencies)
     */
    private List<DependencyChainItem> dependencyChain;

    /**
     * Dependency status enum
     */
    public enum DependencyStatus {
        READY,                  // All dependencies met, can proceed
        WAITING_PREVIOUS,       // Waiting for previous period completion
        WAITING_ASSESSMENT,     // Waiting for teacher to create assessment
        BLOCKED,                // Blocked by system issue
        NOT_SCHEDULED          // Period not yet scheduled
    }

    /**
     * Previous period details
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PreviousPeriodDetails {
        private Long progressId;
        private Integer periodNumber;
        private Boolean completed;
        private LocalDateTime completedAt;
        private Double score;
        private Long submissionId;
        private LocalDate scheduledDate;
    }

    /**
     * Next action the student should take
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NextAction {
        private ActionType actionType;
        private String message;
        private String buttonText;
        private String navigationUrl;
        private Boolean canProceed;
    }

    /**
     * Type of next action
     */
    public enum ActionType {
        START_ASSESSMENT,       // Can start the assessment now
        COMPLETE_PREVIOUS,      // Need to complete previous period first
        WAIT_FOR_TEACHER,       // Wait for teacher to create assessment
        WAIT_FOR_SCHEDULE,      // Period not yet scheduled
        REVIEW_SUBMISSION,      // Review previous submission
        NO_ACTION              // Nothing to do
    }

    /**
     * Item in dependency chain
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DependencyChainItem {
        private Long progressId;
        private Integer periodNumber;
        private Boolean completed;
        private LocalDate scheduledDate;
        private String status;
    }

    /**
     * Helper method to check if can proceed
     */
    public boolean canProceed() {
        return status == DependencyStatus.READY && 
               dependencyMet && 
               hasAssessment;
    }

    /**
     * Helper method to get user-friendly message
     */
    public String getUserFriendlyMessage() {
        if (blockingReason != null && !blockingReason.isEmpty()) {
            return blockingReason;
        }

        return switch (status) {
            case READY -> "You can start this period now";
            case WAITING_PREVIOUS -> "Complete Period " + dependsOnPeriod + " first";
            case WAITING_ASSESSMENT -> "Your teacher is preparing a custom assessment for you";
            case BLOCKED -> "This period is currently unavailable";
            case NOT_SCHEDULED -> "This period has not been scheduled yet";
            default -> "Status unknown";
        };
    }

    /**
     * Helper method to determine if student should see a waiting message
     */
    public boolean isWaiting() {
        return status == DependencyStatus.WAITING_PREVIOUS || 
               status == DependencyStatus.WAITING_ASSESSMENT;
    }

    /**
     * Helper method to determine if this is actionable by the student
     */
    public boolean isActionable() {
        return status == DependencyStatus.READY || 
               status == DependencyStatus.WAITING_PREVIOUS;
    }
}
