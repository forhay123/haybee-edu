package com.edu.platform.dto.individual;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Response DTO after creating a manual timetable
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManualTimetableCreationResponse {
    
    private boolean success;
    
    private Long timetableId;
    
    private int schedulesCreated;
    
    private String message;
    
    private LocalDate weekStart;
    
    private LocalDate weekEnd;
    
    private int subjectsSelected;
    
    private String academicYear;
}