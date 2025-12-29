package com.edu.platform.dto.individual;

import lombok.*;
import java.util.List;


/**
 * Processing statistics for an INDIVIDUAL student
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProcessingStatsDto {
    // Timetable stats
    private Integer totalTimetables;
    private Integer completedTimetables;
    private Integer processingTimetables;
    private Integer failedTimetables;
    
    // Scheme stats
    private Integer totalSchemes;
    private Integer completedSchemes;
    private Integer processingSchemes;
    private Integer failedSchemes;
}