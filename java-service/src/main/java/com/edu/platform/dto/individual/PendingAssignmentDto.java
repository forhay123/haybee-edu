package com.edu.platform.dto.individual;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * ✅ SPRINT 7: DTO for schedules pending lesson topic assignment
 * ✅ PHASE 3: Added assessment information
 * Used in admin/teacher interfaces to show what needs assignment
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PendingAssignmentDto {

    /**
     * Schedule information
     */
    private Long scheduleId;
    private LocalDate scheduledDate;
    private String dayOfWeek;
    private Integer periodNumber;
    private LocalTime startTime;
    private LocalTime endTime;

    /**
     * Student information
     */
    private Long studentProfileId;
    private String studentName;
    private String className;
    private String studentType;

    /**
     * Subject information
     */
    private Long subjectId;
    private String subjectName;
    private String subjectCode;

    /**
     * Week information
     */
    private Integer weekNumber;
    private Long termId;
    private String termName;

    /**
     * Status information
     */
    private String scheduleStatus;
    private Boolean missingLessonTopic;
    private String assignmentMethod; // null if not yet assigned

    /**
     * Multi-period information
     */
    private Integer periodSequence;
    private Integer totalPeriodsForTopic;
    private List<Long> linkedScheduleIds;

    /**
     * Suggested lesson topics (from same subject/week)
     */
    private List<SuggestedTopicDto> suggestedTopics;

    /**
     * How long this has been pending
     */
    private Integer daysPending;

    /**
     * Whether this schedule has conflicts
     */
    private Boolean hasConflict;

    /**
     * ✅ PHASE 3: Nested DTO for suggested topics with assessment info
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SuggestedTopicDto {
        private Long topicId;
        private String topicTitle;
        private String description;
        private Integer weekNumber;
        private Boolean alreadyUsedByStudent;
        private Integer usageCount; // How many other students use this
        
        // ✅ NEW: Assessment information
        private Boolean hasAssessment;          // Does this topic have an assessment?
        private Long assessmentId;              // The assessment ID if exists
        private Integer questionCount;          // Number of questions in assessment
        private String assessmentTitle;         // Assessment title
        private Boolean assessmentPublished;    // Is assessment published?
    }
}