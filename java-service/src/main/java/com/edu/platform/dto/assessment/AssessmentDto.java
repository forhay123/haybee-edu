package com.edu.platform.dto.assessment;

import com.edu.platform.model.assessment.AssessmentType;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssessmentDto {
    
    private Long id;
    private String title;
    private String description;
    private AssessmentType type;
    private Long subjectId;
    private String subjectName;
    private Long termId;
    private String termName;
    private Long lessonTopicId;
    private String lessonTopicTitle;
    private Long createdById;
    private String createdByName;
    private Integer totalMarks;
    private Integer passingMarks;
    private Integer durationMinutes;
    private Boolean autoGrade;
    private Boolean published;
    private LocalDateTime dueDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Integer questionCount;
    
    // ✅ For student view - submission details
    private Boolean hasSubmitted;
    private Long submissionId;      
    private Double studentScore;
    private Boolean studentPassed;
    
    // ===================================================================
    // ✅ NEW: Custom Period Assessment Fields (Sprint 12)
    // ===================================================================
    
    /**
     * Is this a custom period assessment created by a teacher?
     */
    private Boolean isCustomAssessment;
    
    /**
     * Which period is this for? (1, 2, or 3)
     * Only relevant for custom assessments
     */
    private Integer periodNumber;
    
    /**
     * Target student for custom assessments
     * NULL for regular assessments (available to all students)
     */
    private Long targetStudentId;
    private String targetStudentName;
    
    /**
     * Parent assessment (usually Period 1) that this custom assessment is based on
     * Used to track lineage: Period 1 → Period 2 → Period 3
     */
    private Long parentAssessmentId;
    private String parentAssessmentTitle;
    
    /**
     * When was this custom assessment created?
     */
    private LocalDateTime customAssessmentCreatedAt;
    
    /**
     * Who created this custom assessment?
     */
    private Long customAssessmentCreatedBy;
    private String customAssessmentCreatedByName;
}