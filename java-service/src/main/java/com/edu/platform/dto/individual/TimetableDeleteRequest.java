package com.edu.platform.dto.individual;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * SPRINT 4: Request DTO for deleting a timetable
 * Used when student wants to delete existing timetable before uploading new one
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimetableDeleteRequest {
    
    /**
     * ID of timetable to delete
     */
    private Long timetableId;
    
    /**
     * Student profile ID (for verification)
     */
    private Long studentProfileId;
    
    /**
     * Confirmation flag - user must explicitly confirm deletion
     */
    private Boolean confirmDeletion;
    
    /**
     * Optional reason for deletion
     */
    private String deletionReason;
    
    /**
     * Whether to preserve completed assessments
     * Default: true
     */
    @Builder.Default
    private Boolean preserveCompletedAssessments = true;
}