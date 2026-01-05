package com.edu.platform.dto.individual;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for creating a manual timetable from selected subjects
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManualTimetableCreationRequest {
    
    @NotNull(message = "Student profile ID is required")
    private Long studentProfileId;
    
    @NotNull(message = "Subject IDs are required")
    @Size(min = 4, max = 10, message = "Must select between 4 and 10 subjects")
    private List<Long> subjectIds;
    
    private String academicYear;
    
    private Long termId;
}