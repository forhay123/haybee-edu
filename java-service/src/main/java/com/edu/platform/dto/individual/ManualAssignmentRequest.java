package com.edu.platform.dto.individual;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * ✅ SPRINT 7: DTO for manual lesson topic assignment request
 * Used by admin or teacher to assign topics to schedules
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManualAssignmentRequest {

    /**
     * Schedule ID(s) to assign topic to
     */
    private Long scheduleId;
    private List<Long> scheduleIds; // For bulk assignment

    /**
     * Lesson topic to assign
     */
    private Long lessonTopicId;

    /**
     * User performing the assignment
     */
    private Long assignedByUserId;

    /**
     * Assignment method: "MANUAL_ADMIN" or "MANUAL_TEACHER"
     */
    private String assignmentMethod;

    /**
     * Optional: Week number filter (for bulk assignment)
     */
    private Integer weekNumber;

    /**
     * Optional: Subject ID filter (for bulk assignment)
     */
    private Long subjectId;

    /**
     * Optional: Student ID filter (for bulk assignment)
     */
    private Long studentProfileId;

    /**
     * Optional: Notes or reason for manual assignment
     */
    private String notes;

    /**
     * Whether to regenerate schedules after assignment
     */
    @Builder.Default
    private Boolean regenerateSchedules = false;

    /**
     * Whether to send notifications after assignment
     */
    @Builder.Default
    private Boolean sendNotifications = true;
}