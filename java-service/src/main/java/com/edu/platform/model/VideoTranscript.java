package com.edu.platform.model;

import jakarta.persistence.*;
import lombok.*;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.Type;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "video_transcripts", schema = "academic")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VideoTranscript {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ==================== Relationship ====================
    
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_lesson_id", nullable = false)
    private VideoLesson videoLesson;

    // ==================== Transcript Data ====================
    
    @Column(name = "full_transcript", nullable = false, columnDefinition = "TEXT")
    private String fullTranscript;

    @Column(name = "language", length = 10)
    @Builder.Default
    private String language = "en";

    // Segments as JSONB (array of {start, end, text})
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "segments", columnDefinition = "jsonb")
    private String segments;

    // ==================== Metadata ====================
    
    @Column(name = "generated_at")
    private Instant generatedAt;

    @Column(name = "model_used", length = 50)
    private String modelUsed;

    @Column(name = "confidence_score", precision = 4, scale = 3)
    private BigDecimal confidenceScore;

    @PrePersist
    protected void onCreate() {
        if (this.generatedAt == null) {
            this.generatedAt = Instant.now();
        }
    }
}