package com.edu.platform.dto.classdata;

import com.edu.platform.model.enums.StudentType;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LessonAiQuestionDto {
    private Long id;
    private Long lessonId;
    private String questionText;
    private String answerText;
    private String difficulty;
    private Integer maxScore;
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    private String correctOption;
    private StudentType studentType;
}
