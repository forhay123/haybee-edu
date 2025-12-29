package com.edu.platform.dto.assessment;

import com.edu.platform.model.assessment.AssessmentSubmission;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssessmentSubmissionDto {
    private Long id;
    private Long assessmentId;
    private String assessmentTitle;
    private Long studentId;
    private String studentName;
    
    // ✅ ADDED: So frontend can redirect properly
    private Long lessonTopicId;
    
    private LocalDateTime submittedAt;
    private Double score;
    private Integer totalMarks;
    private Double percentage;
    private Boolean passed;
    private Boolean graded;
    private LocalDateTime gradedAt;
    private List<AssessmentAnswerDto> answers;
    
    // ============================================================
    // PHASE 1.4: Retroactive submission tracking fields
    // ============================================================
    private Boolean submittedBeforeWindow;
    private LocalDateTime originalSubmissionTime;
    private LocalDateTime nullifiedAt;
    private String nullifiedReason;
    
    // ============================================================
    // ENTITY CONVERSION METHOD
    // ============================================================
    
    /**
     * Convert AssessmentSubmission entity to DTO
     */
    public static AssessmentSubmissionDto fromEntity(AssessmentSubmission submission) {
        if (submission == null) {
            return null;
        }
        
        return AssessmentSubmissionDto.builder()
            .id(submission.getId())
            .assessmentId(submission.getAssessment() != null ? 
                submission.getAssessment().getId() : null)
            .assessmentTitle(submission.getAssessment() != null ? 
                submission.getAssessment().getTitle() : null)
            .studentId(submission.getStudent() != null ? 
                submission.getStudent().getId() : null)
            .studentName(submission.getStudent() != null && 
                submission.getStudent().getUser() != null ? 
                submission.getStudent().getUser().getFullName() : null)
            .lessonTopicId(submission.getAssessment() != null && 
                submission.getAssessment().getLessonTopic() != null ? 
                submission.getAssessment().getLessonTopic().getId() : null)
            .submittedAt(submission.getSubmittedAt())
            .score(submission.getScore())
            .totalMarks(submission.getTotalMarks())
            .percentage(submission.getPercentage())
            .passed(submission.getPassed())
            .graded(submission.getGraded())
            .gradedAt(submission.getGradedAt())
            .answers(submission.getAnswers() != null && !submission.getAnswers().isEmpty() ? 
                submission.getAnswers().stream()
                    .map(AssessmentAnswerDto::fromEntity)
                    .collect(Collectors.toList()) : null)
            // Phase 1.4 fields
            .submittedBeforeWindow(submission.getSubmittedBeforeWindow())
            .originalSubmissionTime(submission.getOriginalSubmissionTime())
            .nullifiedAt(submission.getNullifiedAt())
            .nullifiedReason(submission.getNullifiedReason())
            .build();
    }
    
    /**
     * Helper method to check if submission is valid
     */
    public boolean isValid() {
        return nullifiedAt == null && !Boolean.TRUE.equals(submittedBeforeWindow);
    }
    
    /**
     * Helper method to check if submission is nullified
     */
    public boolean isNullified() {
        return nullifiedAt != null;
    }
}