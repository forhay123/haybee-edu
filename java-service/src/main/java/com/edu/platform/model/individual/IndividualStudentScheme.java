package com.edu.platform.model.individual;

import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.model.Term;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "individual_student_schemes", schema = "academic")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IndividualStudentScheme {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ============================================
    // STUDENT & SUBJECT CONTEXT
    // ============================================
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_profile_id", nullable = false)
    private StudentProfile studentProfile;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "term_id")
    private Term term;

    @Column(name = "academic_year", length = 20)
    private String academicYear;

    // ============================================
    // FILE METADATA
    // ============================================
    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    @Column(name = "file_url", nullable = false, length = 500)
    private String fileUrl;

    @Column(name = "file_type", nullable = false, length = 20)
    private String fileType;

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    // ============================================
    // PROCESSING STATUS
    // ============================================
    @Column(name = "processing_status", nullable = false, length = 30)
    @Builder.Default
    private String processingStatus = "PENDING";

    @Column(name = "processing_error", columnDefinition = "TEXT")
    private String processingError;

    // ============================================
    // EXTRACTION SUMMARY
    // ============================================
    @Column(name = "total_topics_extracted")
    @Builder.Default
    private Integer totalTopicsExtracted = 0;

    @Column(name = "weeks_covered")
    @Builder.Default
    private Integer weeksCovered = 0;

    @Column(name = "confidence_score", precision = 5, scale = 2)
    private BigDecimal confidenceScore;

    // ============================================
    // TIMESTAMPS
    // ============================================
    @Column(name = "uploaded_at", nullable = false)
    @Builder.Default
    private Instant uploadedAt = Instant.now();

    @Column(name = "processed_at")
    private Instant processedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // ============================================
    // LIFECYCLE HOOKS
    // ============================================
    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (uploadedAt == null) uploadedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    // ============================================
    // STATUS HELPERS
    // ============================================
    public boolean isProcessed() {
        return "COMPLETED".equals(processingStatus);
    }

    public boolean isFailed() {
        return "FAILED".equals(processingStatus);
    }

    public boolean isPending() {
        return "PENDING".equals(processingStatus);
    }

    public boolean isProcessing() {
        return "PROCESSING".equals(processingStatus);
    }

    public void markAsProcessing() {
        this.processingStatus = "PROCESSING";
    }

    public void markAsCompleted() {
        this.processingStatus = "COMPLETED";
        this.processedAt = Instant.now();
    }

    public void markAsFailed(String error) {
        this.processingStatus = "FAILED";
        this.processingError = error;
        this.processedAt = Instant.now();
    }
}
