package com.edu.platform.model;

import com.edu.platform.model.enums.StudentType;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * ✅ ENHANCED: LessonAIQuestion entity with workings support
 * 
 * Represents AI-generated questions from lesson topics.
 * Now includes step-by-step solution workings for calculation-based questions.
 */
@Entity
@Table(name = "lesson_questions", schema = "ai")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"lessonAIResult"})
public class LessonAIQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private LessonAIResult lessonAIResult;

    @Column(name = "question_text", nullable = false)
    private String questionText;

    @Column(length = 50)
    private String difficulty;

    @Column(name = "max_score")
    private Integer maxScore;

    // Theory question answer
    @Column(name = "answer_text")
    private String answerText;

    // MCQ options
    @Column(name = "option_a")
    private String optionA;

    @Column(name = "option_b")
    private String optionB;

    @Column(name = "option_c")
    private String optionC;

    @Column(name = "option_d")
    private String optionD;

    @Column(name = "correct_option", length = 1)
    private String correctOption;

    // ✅ NEW: Step-by-step workings for calculation-based questions
    @Column(name = "workings", columnDefinition = "TEXT")
    private String workings;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "student_type", length = 20)
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

    /**
     * Get the correct answer (for MCQ questions)
     */
    public String getCorrectAnswer() {
        if (!isMCQ() || correctOption == null) {
            return answerText;
        }

        switch (correctOption.toUpperCase()) {
            case "A":
                return optionA;
            case "B":
                return optionB;
            case "C":
                return optionC;
            case "D":
                return optionD;
            default:
                return answerText;
        }
    }
}