package com.edu.platform.dto.individual;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ✅ SPRINT 9: DTO for conflict resolution request
 * Submitted by admin to resolve schedule conflicts
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConflictResolutionRequest {

    /**
     * Timetable with conflicts
     */
    private Long timetableId;

    /**
     * Day of conflict
     */
    private String dayOfWeek;

    /**
     * Resolution action
     */
    private String resolutionAction; // "DELETE_PERIOD_1", "DELETE_PERIOD_2", "EDIT_TIME_PERIOD_1", "EDIT_TIME_PERIOD_2", "MERGE_PERIODS", "SPLIT_PERIOD"

    /**
     * Entry index to act on (primary entry)
     */
    private Integer entryIndex;

    /**
     * ✅ ADDED: Second entry index (for MERGE_PERIODS action)
     */
    private Integer secondEntryIndex;

    /**
     * ✅ ADDED: Split time (for SPLIT_PERIOD action)
     */
    private String splitTime;

    /**
     * If editing time, new time values
     */
    private String newStartTime;
    private String newEndTime;

    /**
     * User performing resolution
     */
    private Long resolvedByUserId;

    /**
     * Optional notes
     */
    private String notes;

    /**
     * Whether to regenerate schedules after resolution
     */
    @Builder.Default
    private Boolean regenerateSchedules = true;

    /**
     * Whether to notify student of resolution
     */
    @Builder.Default
    private Boolean notifyStudent = true;

    /**
     * List of week numbers to regenerate (if null, regenerate all affected weeks)
     */
    private java.util.List<Integer> weekNumbersToRegenerate;
}