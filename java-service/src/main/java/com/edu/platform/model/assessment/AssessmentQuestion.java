package com.edu.platform.model.assessment;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "assessment_questions", schema = "academic")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssessmentQuestion {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    private Assessment assessment;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String questionText;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuestionType questionType;
    
    @Column(name = "option_a", columnDefinition = "TEXT")
    private String optionA;
    
    @Column(name = "option_b", columnDefinition = "TEXT")
    private String optionB;
    
    @Column(name = "option_c", columnDefinition = "TEXT")
    private String optionC;
    
    @Column(name = "option_d", columnDefinition = "TEXT")
    private String optionD;
    
    @Column(name = "correct_answer", columnDefinition = "TEXT")
    private String correctAnswer;
    
    @Column(name = "marks")
    private Integer marks = 1;
    
    @Column(name = "order_number")
    private Integer orderNumber;
    
    @Column(name = "ai_generated")
    private Boolean aiGenerated = false;
    
    // ============================================================
    // HELPER METHODS - ADD THESE
    // ============================================================
    
    /**
     * Check if this is a multiple choice question
     */
    public boolean isMultipleChoice() {
        return questionType == QuestionType.MULTIPLE_CHOICE;
    }
    
    /**
     * Get question type as string
     */
    public String getQuestionTypeString() {
        return questionType != null ? questionType.name() : null;
    }
    
    /**
     * Check if question has options
     */
    public boolean hasOptions() {
        return isMultipleChoice() || questionType == QuestionType.TRUE_FALSE;
    }
    
    /**
     * Get the display order (uses orderNumber field)
     */
    public Integer getDisplayOrder() {
        return orderNumber;
    }
    
    public enum QuestionType {
        MULTIPLE_CHOICE,
        TRUE_FALSE,
        SHORT_ANSWER,
        ESSAY
    }
}