package com.edu.platform.dto.individual;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * ✅ SPRINT 8: DTO for lesson topic completion summary
 * Provides high-level completion status for a lesson topic
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LessonTopicCompletionDto {

    /**
     * Lesson topic identification
     */
    private Long lessonTopicId;
    private String topicTitle;
    private Integer weekNumber;

    /**
     * Subject information
     */
    private Long subjectId;
    private String subjectName;

    /**
     * Completion summary
     */
    private String completionStatus; // "COMPLETED", "IN_PROGRESS", "NOT_STARTED", "INCOMPLETE"
    private Double completionPercentage;
    private Integer totalPeriods;
    private Integer completedPeriods;

    /**
     * Scoring summary
     */
    private Double averageScore;
    private String averageGrade;
    private Boolean passedAllPeriods;

    /**
     * Timeline
     */
    private LocalDate startDate;
    private LocalDate completionDate;
    private Integer daysToComplete; // How many days it took

    /**
     * Status flags
     */
    private Boolean isFullyCompleted; // All periods done
    private Boolean hasIncomplete; // Any periods missed
    private Boolean isOverdue; // Has periods past grace deadline

    /**
     * Visual representation
     */
    private String statusBadge; // "Complete", "In Progress", "Incomplete"
    private String statusColor; // "green", "yellow", "red"
    private String progressBar; // "75%" or "3/4"
}