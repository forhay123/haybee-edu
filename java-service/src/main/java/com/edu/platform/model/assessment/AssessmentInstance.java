package com.edu.platform.model.assessment;

import com.edu.platform.model.LessonTopic;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Represents a shuffled instance of an assessment
 * Multiple instances can be created from a single base assessment
 * for subjects that appear multiple times per week
 */
@Entity
@Table(name = "assessment_instances", schema = "academic",
       indexes = {
           @Index(name = "idx_instance_base_assessment", columnList = "base_assessment_id"),
           @Index(name = "idx_instance_lesson_topic", columnList = "lesson_topic_id"),
           @Index(name = "idx_instance_suffix", columnList = "base_assessment_id, instance_suffix")
       })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssessmentInstance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Reference to the original/base assessment
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "base_assessment_id", nullable = false)
    private Assessment baseAssessment;

    /**
     * Lesson topic this instance belongs to
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_topic_id")
    private LessonTopic lessonTopic;

    /**
     * Instance suffix (A, B, C, etc.)
     * Used to differentiate multiple instances of same assessment
     */
    @Column(name = "instance_suffix", nullable = false, length = 5)
    private String instanceSuffix;

    /**
     * Period sequence number (1, 2, 3, etc.)
     * Indicates which period this instance is for
     */
    @Column(name = "period_sequence", nullable = false)
    private Integer periodSequence;

    /**
     * Total number of periods for this lesson topic
     */
    @Column(name = "total_periods")
    private Integer totalPeriods;

    /**
     * Shuffled question order (JSON array of question IDs)
     * Example: [3, 7, 1, 9, 2, 5, 10, 4, 6, 8]
     */
    @Column(name = "shuffled_question_order", columnDefinition = "jsonb")
    private String shuffledQuestionOrder;

    /**
     * Optional: Shuffled answer options for each question (if applicable)
     * Stored as JSON for flexibility
     */
    @Column(name = "shuffled_answer_options", columnDefinition = "jsonb")
    private String shuffledAnswerOptions;

    /**
     * Is this instance currently active?
     */
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    /**
     * Week number this instance was created for
     */
    @Column(name = "week_number")
    private Integer weekNumber;

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
     * Get full instance identifier (e.g., "Assessment-123-A")
     */
    public String getInstanceIdentifier() {
        return String.format("Assessment-%d-%s", 
            baseAssessment != null ? baseAssessment.getId() : 0, 
            instanceSuffix);
    }

    /**
     * Check if this is the first instance
     */
    public boolean isFirstInstance() {
        return periodSequence != null && periodSequence == 1;
    }

    /**
     * Check if this is the last instance
     */
    public boolean isLastInstance() {
        return periodSequence != null && totalPeriods != null 
            && periodSequence.equals(totalPeriods);
    }
}