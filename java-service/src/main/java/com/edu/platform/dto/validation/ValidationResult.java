package com.edu.platform.dto.validation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Result of pre-creation validation for WeeklySchedule
 * Used to validate that sufficient MCQ questions exist before creating a schedule
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ValidationResult {
    
    /**
     * Whether the schedule can be created
     */
    private boolean canCreate;
    
    /**
     * Detailed reason if validation failed
     * Example: "Insufficient questions: Found 2 MCQs, need minimum 5"
     */
    private String reason;
    
    /**
     * Total number of available MCQ questions (AI + Teacher)
     */
    private int questionCount;
    
    /**
     * Number of AI-generated questions available
     */
    private int aiQuestions;
    
    /**
     * Number of teacher-created questions available
     */
    private int teacherQuestions;
    
    /**
     * Subject name for context
     */
    private String subjectName;
    
    /**
     * Lesson topic title for context
     */
    private String lessonTopicTitle;
    
    /**
     * Validation timestamp
     */
    private java.time.LocalDateTime validatedAt;
    
    // ============================================================
    // FACTORY METHODS
    // ============================================================
    
    /**
     * Create a successful validation result
     */
    public static ValidationResult success(
        int totalQuestions, 
        int aiQuestions, 
        int teacherQuestions,
        String subjectName,
        String lessonTopicTitle
    ) {
        return ValidationResult.builder()
            .canCreate(true)
            .reason("Validation passed")
            .questionCount(totalQuestions)
            .aiQuestions(aiQuestions)
            .teacherQuestions(teacherQuestions)
            .subjectName(subjectName)
            .lessonTopicTitle(lessonTopicTitle)
            .validatedAt(java.time.LocalDateTime.now())
            .build();
    }
    
    /**
     * Create a failed validation result
     */
    public static ValidationResult failure(
        String reason,
        int totalQuestions,
        int aiQuestions,
        int teacherQuestions,
        String subjectName,
        String lessonTopicTitle
    ) {
        return ValidationResult.builder()
            .canCreate(false)
            .reason(reason)
            .questionCount(totalQuestions)
            .aiQuestions(aiQuestions)
            .teacherQuestions(teacherQuestions)
            .subjectName(subjectName)
            .lessonTopicTitle(lessonTopicTitle)
            .validatedAt(java.time.LocalDateTime.now())
            .build();
    }
    
    /**
     * Check if validation passed
     */
    public boolean isValid() {
        return canCreate;
    }
}