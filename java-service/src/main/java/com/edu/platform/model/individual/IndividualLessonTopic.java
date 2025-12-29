package com.edu.platform.model.individual;

import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.model.Term;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Lesson topics extracted from INDIVIDUAL student scheme of work documents.
 * These are unique to each INDIVIDUAL student, unlike shared lesson_topics table.
 */
@Entity
@Table(name = "individual_lesson_topics", schema = "academic")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IndividualLessonTopic {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    /**
     * The student this topic belongs to
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_profile_id", nullable = false)
    private StudentProfile studentProfile;
    
    /**
     * The scheme this topic was extracted from
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "scheme_id", nullable = false)
    private IndividualStudentScheme scheme;
    
    /**
     * Subject as identified in the uploaded document
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;
    
    // ============================================================
    // TOPIC DETAILS
    // ============================================================
    
    @Column(name = "topic_title", nullable = false, length = 255)
    private String topicTitle;
    
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "week_number")
    private Integer weekNumber;
    
    // ============================================================
    // SUBJECT MAPPING (AI-generated)
    // ============================================================
    
    /**
     * Platform subject this topic was mapped to (can be different from extracted subject)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mapped_subject_id")
    private Subject mappedSubject;
    
    /**
     * Confidence in the subject mapping (0.00 to 100.00)
     */
    @Column(name = "mapping_confidence", precision = 5, scale = 2)
    private BigDecimal mappingConfidence;
    
    // ============================================================
    // LEARNING RESOURCES
    // ============================================================
    
    @Column(name = "file_name", length = 255)
    private String fileName;
    
    @Column(name = "file_url", length = 500)
    private String fileUrl;
    
    // ============================================================
    // ACADEMIC CONTEXT
    // ============================================================
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "term_id")
    private Term term;
    
    // ============================================================
    // TIMESTAMPS
    // ============================================================
    
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
    }
    
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
    
    // ============================================================
    // HELPER METHODS
    // ============================================================
    
    /**
     * Get the effective subject (mapped subject if available, otherwise original)
     */
    public Subject getEffectiveSubject() {
        return mappedSubject != null ? mappedSubject : subject;
    }
    
    /**
     * Check if mapping confidence is high (>= 80%)
     */
    public boolean hasHighMappingConfidence() {
        return mappingConfidence != null && 
               mappingConfidence.compareTo(new BigDecimal("80.00")) >= 0;
    }
    
    /**
     * Check if this topic has been manually reviewed/approved
     */
    public boolean isMappingApproved() {
        return mappedSubject != null;
    }
}