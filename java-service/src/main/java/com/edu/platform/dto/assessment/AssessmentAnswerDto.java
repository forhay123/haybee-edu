package com.edu.platform.dto.assessment;

import com.edu.platform.model.assessment.AssessmentAnswer;
import com.edu.platform.model.assessment.AssessmentQuestion;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssessmentAnswerDto {
    private Long id;
    private Long questionId;
    private String questionText;
    
    // ✅ ADDED: Question type so frontend can determine how to display the answer
    private AssessmentQuestion.QuestionType questionType;
    
    private String studentAnswer;
    private String correctAnswer;
    private Boolean isCorrect;
    private Double marksObtained;
    private Integer maxMarks;
    private String teacherFeedback;
    
    /**
     * Convert AssessmentAnswer entity to DTO
     */
    public static AssessmentAnswerDto fromEntity(AssessmentAnswer answer) {
        if (answer == null) {
            return null;
        }
        
        AssessmentQuestion question = answer.getQuestion();
        
        return AssessmentAnswerDto.builder()
            .id(answer.getId())
            .questionId(question != null ? question.getId() : null)
            .questionText(question != null ? question.getQuestionText() : null)
            .questionType(question != null ? question.getQuestionType() : null)
            .studentAnswer(answer.getStudentAnswer())
            .correctAnswer(question != null ? question.getCorrectAnswer() : null)
            .isCorrect(answer.getIsCorrect())
            .marksObtained(answer.getMarksObtained())
            .maxMarks(question != null ? question.getMarks() : null)
            .teacherFeedback(answer.getTeacherFeedback())
            .build();
    }
}