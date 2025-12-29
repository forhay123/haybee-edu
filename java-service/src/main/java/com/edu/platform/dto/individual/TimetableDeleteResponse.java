package com.edu.platform.dto.individual;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * SPRINT 4: Response DTO after deleting a timetable
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimetableDeleteResponse {
    
    /**
     * Whether deletion was successful
     */
    private Boolean success;
    
    /**
     * Message describing the result
     */
    private String message;
    
    /**
     * ID of deleted timetable
     */
    private Long deletedTimetableId;
    
    /**
     * Number of schedules deleted
     */
    private Integer schedulesDeleted;
    
    /**
     * Number of incomplete progress records deleted
     */
    private Integer incompleteProgressDeleted;
    
    /**
     * Number of completed assessments preserved
     */
    private Integer completedAssessmentsPreserved;
    
    /**
     * When deletion occurred
     */
    private Instant deletedAt;
    
    /**
     * Whether user can now upload a new timetable
     */
    private Boolean canUploadNew;
}