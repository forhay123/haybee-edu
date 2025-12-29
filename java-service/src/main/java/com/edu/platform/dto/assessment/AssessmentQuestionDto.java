package com.edu.platform.dto.assessment;

import com.edu.platform.model.assessment.AssessmentQuestion.QuestionType;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssessmentQuestionDto {
    
    private Long id;
    private Long assessmentId;
    private String questionText;
    private QuestionType questionType;
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    private String correctAnswer; // Only shown to teachers
    private Integer marks;
    private Integer orderNumber;
    private Boolean aiGenerated;
}