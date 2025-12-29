package com.edu.platform.dto.assessment;

import com.edu.platform.model.assessment.AssessmentQuestion.QuestionType;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherQuestionDto {
    
    private Long id;
    private Long teacherId;
    private String teacherName;
    private Long subjectId;
    private String subjectName;
    private Long lessonTopicId;
    private String lessonTopicTitle;
    private String questionText;
    private QuestionType questionType;
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    private String correctAnswer;
    private String difficultyLevel;
    private LocalDateTime createdAt;
}