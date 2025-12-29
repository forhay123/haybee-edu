package com.edu.platform.dto.assessment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;

/**
 * DTO for creating custom period assessments
 * Used when teacher creates Period 2/3 assessment after reviewing Period 1
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCustomAssessmentRequest {

    /**
     * Target student for this custom assessment
     */
    @NotNull(message = "Student profile ID is required")
    private Long studentProfileId;

    /**
     * Subject for the assessment
     */
    @NotNull(message = "Subject ID is required")
    private Long subjectId;

    /**
     * Lesson topic (optional)
     */
    private Long lessonTopicId;

    /**
     * Period number (2 or 3)
     */
    @NotNull(message = "Period number is required")
    @Min(value = 2, message = "Period number must be 2 or 3")
    @Max(value = 3, message = "Period number must be 2 or 3")
    private Integer periodNumber;

    /**
     * Assessment title
     */
    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    /**
     * Assessment description
     */
    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;

    /**
     * Total marks for the assessment
     */
    @NotNull(message = "Total marks is required")
    @Min(value = 1, message = "Total marks must be at least 1")
    private Integer totalMarks;

    /**
     * Passing marks threshold
     */
    @Min(value = 0, message = "Passing marks cannot be negative")
    private Integer passingMarks;

    /**
     * Duration in minutes
     */
    @Min(value = 1, message = "Duration must be at least 1 minute")
    private Integer durationMinutes;

    /**
     * Due date for the assessment
     */
    private LocalDateTime dueDate;

    /**
     * Parent assessment ID (typically the Period 1 base assessment)
     */
    private Long parentAssessmentId;

    /**
     * List of question IDs to include in the assessment
     */
    private List<Long> questionIds;

    /**
     * Previous period submission ID (for reference/analysis)
     */
    private Long previousSubmissionId;

    /**
     * Notes from teacher about why this custom assessment was created
     */
    @Size(max = 500, message = "Notes must not exceed 500 characters")
    private String teacherNotes;

    /**
     * Whether to include questions student got wrong from previous period
     */
    @Builder.Default
    private Boolean includeIncorrectQuestions = false;

    /**
     * Whether to focus on weak topics from previous period
     */
    @Builder.Default
    private Boolean focusOnWeakTopics = false;

    /**
     * Scheduled date for this assessment (usually from the period schedule)
     */
    private LocalDate scheduledDate;
}
