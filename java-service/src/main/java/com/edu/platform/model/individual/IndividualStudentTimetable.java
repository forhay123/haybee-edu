package com.edu.platform.model.individual;

import com.edu.platform.model.ClassEntity;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Term;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Stores uploaded timetables for INDIVIDUAL students.
 * Each INDIVIDUAL student can upload their own timetable (PDF/Excel)
 * which gets processed by AI to extract schedule entries.
 */
@Entity
@Table(name = "individual_student_timetables", schema = "academic")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IndividualStudentTimetable {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    /**
     * The student who uploaded this timetable
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_profile_id", nullable = false)
    private StudentProfile studentProfile;
    
    /**
     * ✅ NEW: Student's class for subject filtering during AI processing
     * Optional but highly recommended for accurate subject mapping
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id")
    private ClassEntity classEntity;
    
    // ============================================================
    // FILE METADATA
    // ============================================================
    
    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;
    
    @Column(name = "file_url", nullable = false, length = 500)
    private String fileUrl;
    
    @Column(name = "file_type", nullable = false, length = 20)
    private String fileType; // PDF, EXCEL, IMAGE
    
    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;
    
    // ============================================================
    // PROCESSING STATUS
    // ============================================================
    
    @Column(name = "processing_status", nullable = false, length = 30)
    @Builder.Default
    private String processingStatus = "PENDING"; // PENDING, PROCESSING, COMPLETED, FAILED
    
    @Column(name = "processing_error", columnDefinition = "TEXT")
    private String processingError;
    
    // ============================================================
    // EXTRACTED DATA SUMMARY
    // ============================================================
    
    @Column(name = "total_periods_extracted")
    @Builder.Default
    private Integer totalPeriodsExtracted = 0;
    
    @Column(name = "subjects_identified")
    @Builder.Default
    private Integer subjectsIdentified = 0;
    
    /**
     * AI confidence score (0.00 to 100.00)
     */
    @Column(name = "confidence_score", precision = 5, scale = 2)
    private BigDecimal confidenceScore;
    
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "extracted_entries", columnDefinition = "jsonb")
    private List<Map<String, Object>> extractedEntries;
    
    // ============================================================
    // ACADEMIC CONTEXT
    // ============================================================
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "term_id")
    private Term term;
    
    @Column(name = "academic_year", length = 20)
    private String academicYear; // e.g., "2024/2025"
    
    /**
     * ✅ NEW: Track upload source for analytics
     */
    @Column(name = "upload_type", length = 10)
    private String uploadType; // "file" or "camera"
    
    // ============================================================
    // TIMESTAMPS
    // ============================================================
    
    @Column(name = "uploaded_at", nullable = false)
    @Builder.Default
    private Instant uploadedAt = Instant.now();
    
    @Column(name = "processed_at")
    private Instant processedAt;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    
    // ============================================================
    // LIFECYCLE CALLBACKS
    // ============================================================
    
    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.uploadedAt == null) {
            this.uploadedAt = now;
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
    
    // ============================================================
    // HELPER METHODS
    // ============================================================
    
    public boolean isProcessed() {
        return "COMPLETED".equals(this.processingStatus);
    }
    
    public boolean isFailed() {
        return "FAILED".equals(this.processingStatus);
    }
    
    public boolean isPending() {
        return "PENDING".equals(this.processingStatus);
    }
    
    public boolean isProcessing() {
        return "PROCESSING".equals(this.processingStatus);
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