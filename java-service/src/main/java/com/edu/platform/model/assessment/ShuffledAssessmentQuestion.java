package com.edu.platform.model.assessment;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

/**
 * Represents a single question within a shuffled assessment instance
 * Tracks the shuffled display order for this specific instance
 */
@Entity
@Table(name = "shuffled_assessment_questions", schema = "academic",
       indexes = {
           @Index(name = "idx_shuffled_instance", columnList = "assessment_instance_id"),
           @Index(name = "idx_shuffled_question", columnList = "original_question_id"),
           @Index(name = "idx_shuffled_display_order", columnList = "assessment_instance_id, shuffled_display_order")
       })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShuffledAssessmentQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The assessment instance this shuffled question belongs to
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assessment_instance_id", nullable = false)
    private AssessmentInstance assessmentInstance;

    /**
     * Reference to the original question from the base assessment
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "original_question_id", nullable = false)
    private AssessmentQuestion originalQuestion;

    /**
     * The shuffled display order for this instance (1, 2, 3, etc.)
     * Different from the original question's display order
     */
    @Column(name = "shuffled_display_order", nullable = false)
    private Integer shuffledDisplayOrder;

    /**
     * Optional: Shuffled answer options for this specific question
     * Stored as JSON array of option indices
     * Example: [2, 0, 3, 1] means option C, A, D, B
     */
    @Column(name = "shuffled_options_order", columnDefinition = "jsonb")
    private String shuffledOptionsOrder;

    /**
     * Whether this shuffled question is active
     */
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.updatedAt == null) {
            this.updatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // ============================================================
    // HELPER METHODS
    // ============================================================

    /**
     * Get the question text from the original question
     */
    public String getQuestionText() {
        return originalQuestion != null ? originalQuestion.getQuestionText() : null;
    }

    /**
     * Get the question type from the original question
     */
    public String getQuestionType() {
        if (originalQuestion != null && originalQuestion.getQuestionType() != null) {
            return originalQuestion.getQuestionType().name(); // Convert enum to String
        }
        return null;
    }

    /**
     * Check if this is a multiple choice question
     */
    public boolean isMultipleChoice() {
        return originalQuestion != null && originalQuestion.isMultipleChoice();
    }
}