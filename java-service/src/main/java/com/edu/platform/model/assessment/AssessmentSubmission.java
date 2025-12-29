package com.edu.platform.model.assessment;

import com.edu.platform.model.StudentProfile;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * ✅ PHASE 1.4 UPDATES:
 * - Added retroactive submission tracking
 * - Added nullification support
 * - Added original submission time preservation
 */
@Entity
@Table(name = "assessment_submissions", schema = "academic")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssessmentSubmission {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    private Assessment assessment;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private StudentProfile student;
    
    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;
    
    @Column(name = "score")
    private Double score;
    
    @Column(name = "total_marks")
    private Integer totalMarks;
    
    @Column(name = "percentage")
    private Double percentage;
    
    @Column(name = "passed")
    private Boolean passed;
    
    @Column(name = "graded")
    @Builder.Default
    private Boolean graded = false;
    
    @Column(name = "graded_at")
    private LocalDateTime gradedAt;
    
    @OneToMany(mappedBy = "submission", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<AssessmentAnswer> answers = new ArrayList<>();
    
    // ============================================================
    // RETROACTIVE SUBMISSION TRACKING (NEW - PHASE 1.4)
    // ============================================================
    
    /**
     * ✅ NEW: Flag indicating submission was made before assessment window opened
     * Set to TRUE by SubmissionValidationService when detected
     */
    @Column(name = "submitted_before_window")
    @Builder.Default
    private Boolean submittedBeforeWindow = false;
    
    /**
     * ✅ NEW: Preserves the original submission time before nullification
     * Used for audit trail and reporting
     */
    @Column(name = "original_submission_time")
    private LocalDateTime originalSubmissionTime;
    
    /**
     * ✅ NEW: When this submission was nullified by the system
     * NULL if submission is valid
     */
    @Column(name = "nullified_at")
    private LocalDateTime nullifiedAt;
    
    /**
     * ✅ NEW: Detailed explanation of why submission was nullified
     * Example: "Submitted before assessment window opened at 2025-12-01 09:00:00"
     */
    @Column(name = "nullified_reason", length = 200)
    private String nullifiedReason;
    
    @PrePersist
    protected void onCreate() {
        if (submittedAt == null) {
            submittedAt = LocalDateTime.now();
        }
        if (graded == null) {
            graded = false;
        }
        if (submittedBeforeWindow == null) {
            submittedBeforeWindow = false;
        }
    }
    
    // ============================================================
    // HELPER METHODS
    // ============================================================
    
    /**
     * Check if this submission is valid (not nullified)
     */
    public boolean isValid() {
        return nullifiedAt == null && !Boolean.TRUE.equals(submittedBeforeWindow);
    }
    
    /**
     * Check if this submission has been nullified
     */
    public boolean isNullified() {
        return nullifiedAt != null;
    }
    
    /**
     * Nullify this submission with reason
     * Preserves original submission time and sets score to 0
     */
    public void nullify(String reason) {
        this.submittedBeforeWindow = true;
        this.originalSubmissionTime = this.submittedAt;
        this.nullifiedAt = LocalDateTime.now();
        this.nullifiedReason = reason;
        this.score = 0.0;
        this.graded = false;
        this.passed = false;
    }
    
    /**
     * Check if submission was made before given time
     */
    public boolean wasSubmittedBefore(LocalDateTime dateTime) {
        return submittedAt != null && submittedAt.isBefore(dateTime);
    }
    
    /**
     * Get the effective submission time (original if nullified, else submitted_at)
     */
    public LocalDateTime getEffectiveSubmissionTime() {
        return originalSubmissionTime != null ? originalSubmissionTime : submittedAt;
    }
}