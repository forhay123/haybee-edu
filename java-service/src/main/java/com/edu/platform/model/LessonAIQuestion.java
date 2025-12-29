package com.edu.platform.model;

import com.edu.platform.model.enums.StudentType;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

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

    // ✅ REMOVE @Lob and @Column(columnDefinition = "TEXT")
    @Column(name = "question_text", nullable = false)
    private String questionText;

    @Column(length = 50)
    private String difficulty;

    @Column(name = "max_score")
    private Integer maxScore;

    // ✅ REMOVE @Lob
    @Column(name = "answer_text")
    private String answerText;

    // ✅ REMOVE @Lob for all option columns
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

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "student_type", length = 20)
    private StudentType studentType;
}