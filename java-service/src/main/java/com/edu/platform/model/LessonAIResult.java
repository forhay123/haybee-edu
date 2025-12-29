package com.edu.platform.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "lesson_ai_results", schema = "ai")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"questions"})
public class LessonAIResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_topic_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private LessonTopic lessonTopic;

    @Column(name = "subject_id", nullable = false)
    private Long subjectId;

    @Column(name = "week_number", nullable = false)
    private Integer weekNumber;

    @Column(name = "file_url", length = 1024, nullable = false)
    private String fileUrl;

    // ✅ REMOVE @Lob - PostgreSQL TEXT doesn't need it
    @Column(name = "extracted_text", columnDefinition = "TEXT")
    private String extractedText;

    // ✅ REMOVE @Lob - PostgreSQL TEXT doesn't need it
    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(length = 50)
    private String status;

    @Column
    private Double progress;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "lessonAIResult", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<LessonAIQuestion> questions;
}