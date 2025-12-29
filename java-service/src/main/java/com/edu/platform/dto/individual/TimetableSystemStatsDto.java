package com.edu.platform.dto.individual;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

// ============================================================
// ADMIN DTOS
// ============================================================

/**
 * System-wide statistics for timetable uploads
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimetableSystemStatsDto {
    private Integer totalTimetables;
    private Integer pendingTimetables;
    private Integer processingTimetables;
    private Integer completedTimetables;
    private Integer failedTimetables;
    private Integer averageProcessingTimeSeconds;
    private BigDecimal successRatePercentage;
    private Integer uniqueStudentsCount;
}