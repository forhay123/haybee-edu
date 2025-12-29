package com.edu.platform.dto.assessment;

import com.edu.platform.model.assessment.AssessmentSubmission;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * DTO for assessment results with nullification support
 * ✅ UPDATED: Added nullification fields
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentResultDTO {
    
    private Long id;
    private Long assessmentId;
    private String assessmentTitle;
    private Long studentId;
    private String studentName;
    private Long lessonTopicId;
    private LocalDateTime submittedAt;
    private Double score;
    private Integer totalMarks;
    private Double percentage;
    private Boolean passed;
    private Boolean graded;
    private LocalDateTime gradedAt;
    
    // ✅ NEW: Nullification tracking
    private Boolean submittedBeforeWindow;
    private LocalDateTime originalSubmissionTime;
    private LocalDateTime nullifiedAt;
    private String nullifiedReason;
    private Boolean valid;
    private Boolean nullified;
    
    private List<AssessmentAnswerDto> answers;
    
    /**
     * Convert AssessmentSubmission entity to DTO
     */
    public static AssessmentResultDTO fromEntity(AssessmentSubmission submission) {
        if (submission == null) return null;
        
        return AssessmentResultDTO.builder()
            .id(submission.getId())
            .assessmentId(submission.getAssessment().getId())
            .assessmentTitle(submission.getAssessment().getTitle())
            .studentId(submission.getStudent().getId())
            .studentName(submission.getStudent().getUser().getFullName())
            .lessonTopicId(submission.getAssessment().getLessonTopic() != null 
                ? submission.getAssessment().getLessonTopic().getId() 
                : null)
            .submittedAt(submission.getSubmittedAt())
            .score(submission.getScore())
            .totalMarks(submission.getTotalMarks())
            .percentage(submission.getPercentage())
            .passed(submission.getPassed())
            .graded(submission.getGraded())
            .gradedAt(submission.getGradedAt())
            // ✅ NEW: Include nullification data
            .submittedBeforeWindow(submission.getSubmittedBeforeWindow())
            .originalSubmissionTime(submission.getOriginalSubmissionTime())
            .nullifiedAt(submission.getNullifiedAt())
            .nullifiedReason(submission.getNullifiedReason())
            .valid(submission.isValid())
            .nullified(submission.isNullified())
            .answers(submission.getAnswers().stream()
                .map(AssessmentAnswerDto::fromEntity)
                .collect(Collectors.toList()))
            .build();
    }
}