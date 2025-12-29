package com.edu.platform.dto.individual;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

/**
 * ✅ SPRINT 7: DTO for schedule conflicts
 * Used in conflict resolution interface
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConflictDto {

    /**
     * Conflict identification
     */
    private Long conflictId;
    private String conflictType; // "TIME_OVERLAP", "DUPLICATE_SUBJECT", etc.

    /**
     * Student information
     */
    private Long studentProfileId;
    private String studentName;
    private String className;
    private Long timetableId;

    /**
     * Conflict timing
     */
    private DayOfWeek dayOfWeek;
    private LocalDate conflictDate;

    /**
     * First conflicting period
     */
    private ConflictingPeriod period1;

    /**
     * Second conflicting period
     */
    private ConflictingPeriod period2;

    /**
     * Conflict description
     */
    private String description;
    private String severity; // "HIGH", "MEDIUM", "LOW"

    /**
     * Resolution status
     */
    private Boolean isResolved;
    private String resolutionAction; // "KEEP_PERIOD_1", "KEEP_PERIOD_2", "EDIT_TIME", etc.
    private String resolvedBy; // User ID or username
    private LocalDate resolvedAt;

    /**
     * Impact analysis
     */
    private Integer affectedWeeksCount;
    private List<Integer> affectedWeekNumbers;

    /**
     * Suggested resolutions
     */
    private List<String> suggestedResolutions;

    /**
     * Nested DTO for conflicting period details
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConflictingPeriod {
        private Long scheduleId;
        private Long subjectId;
        private String subjectName;
        private String subjectCode;
        private Integer periodNumber;
        private String startTime;
        private String endTime;
        private String room;
        private String teacher;
    }
}