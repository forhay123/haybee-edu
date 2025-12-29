package com.edu.platform.dto.individual;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

/**
 * ✅ SPRINT 9: DTO for conflict resolution response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConflictResolutionResponse {

    /**
     * Whether resolution was successful
     */
    private Boolean success;

    /**
     * Response message
     */
    private String message;

    /**
     * Timetable that was updated
     */
    private Long timetableId;

    /**
     * Student affected
     */
    private Long studentProfileId;
    private String studentName;

    /**
     * Resolution details
     */
    private String resolutionAction;
    private String dayOfWeek;
    private Integer entryIndex;

    /**
     * What was changed
     */
    private String removedSubject; // If period was deleted
    private String keptSubject;    // If period was kept
    private String editedSubject;  // If time was edited
    private String oldTime;
    private String newTime;

    /**
     * Impact of resolution
     */
    private Integer schedulesDeleted;
    private Integer schedulesRegenerated;
    private List<Integer> affectedWeekNumbers;

    /**
     * Notification status
     */
    private Boolean studentNotified;

    /**
     * Resolution metadata
     */
    private Long resolvedByUserId;
    private Instant resolvedAt;

    /**
     * Remaining conflicts (if any)
     */
    private Integer remainingConflictsCount;
    private List<String> remainingConflicts;

    /**
     * Warnings or issues
     */
    private List<String> warnings;

    /**
     * ✅ ADDED: Helper method for checking success
     * Fixes: isSuccess() undefined error
     */
    public boolean isSuccess() {
        return Boolean.TRUE.equals(success);
    }
}