package com.edu.platform.dto.individual;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

/**
 * ✅ SPRINT 7: DTO for manual lesson topic assignment response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManualAssignmentResponse {

    /**
     * Whether assignment was successful
     */
    private Boolean success;

    /**
     * Response message
     */
    private String message;

    /**
     * Schedule IDs that were updated
     */
    private List<Long> updatedScheduleIds;

    /**
     * Lesson topic that was assigned
     */
    private Long assignedTopicId;
    private String assignedTopicTitle;

    /**
     * Number of schedules updated
     */
    private Integer schedulesUpdatedCount;

    /**
     * Number of progress records created/updated
     */
    private Integer progressRecordsUpdated;

    /**
     * Assignment metadata
     */
    private Long assignedByUserId;
    private String assignmentMethod;
    private Instant assignedAt;

    /**
     * Whether schedules were regenerated
     */
    private Boolean schedulesRegenerated;

    /**
     * Whether notifications were sent
     */
    private Boolean notificationsSent;
    private Integer notificationsSentCount;

    /**
     * Any warnings or issues encountered
     */
    private List<String> warnings;

    /**
     * Failed schedule IDs (if any)
     */
    private List<Long> failedScheduleIds;

    /**
     * Error details for failed schedules
     */
    private String errorDetails;
}