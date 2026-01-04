package com.edu.platform.dto.classdata;

import com.edu.platform.model.enums.StudentType;
import lombok.*;

/**
 * ✅ ENHANCED: DTO for lesson AI questions with workings support
 * 
 * Data Transfer Object for AI-generated questions.
 * Now includes step-by-step solution workings.
 */
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
    
    // MCQ fields
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    private String correctOption;
    
    // ✅ NEW: Step-by-step workings
    private String workings;
    
    private StudentType studentType;

    /**
     * Check if this is an MCQ question
     */
    public boolean isMCQ() {
        return optionA != null || optionB != null || optionC != null || optionD != null;
    }

    /**
     * Check if this is a theory question
     */
    public boolean isTheory() {
        return !isMCQ();
    }

    /**
     * Check if this question has workings
     */
    public boolean hasWorkings() {
        return workings != null && !workings.trim().isEmpty();
    }
}