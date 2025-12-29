package com.edu.platform.dto.individual;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * SPRINT 4: DTO for timetable replacement workflow
 * Shows existing timetable info when upload is blocked
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimetableReplacementDto {
    
    /**
     * Whether upload is currently allowed
     */
    private Boolean uploadAllowed;
    
    /**
     * Reason why upload is blocked (if blocked)
     */
    private String blockReason;
    
    /**
     * Existing timetable info (if exists)
     */
    private ExistingTimetableInfo existingTimetable;
    
    /**
     * Whether user must delete existing timetable first
     */
    private Boolean mustDeleteFirst;
    
    /**
     * Information about what will be deleted
     */
    private DeletionImpactInfo deletionImpact;
    
    /**
     * Nested class for existing timetable details
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExistingTimetableInfo {
        private Long id;
        private String filename;
        private Instant uploadedAt;
        private String processingStatus;
        private Integer totalPeriods;
        private Integer subjectsIdentified;
        private String deleteUrl;
    }
    
    /**
     * Nested class for deletion impact
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeletionImpactInfo {
        private Integer currentSchedulesCount;
        private Integer futureSchedulesCount;
        private Integer completedAssessmentsCount;
        private Integer pendingAssessmentsCount;
        private Boolean willPreserveCompletedAssessments;
        private String warningMessage;
    }
}