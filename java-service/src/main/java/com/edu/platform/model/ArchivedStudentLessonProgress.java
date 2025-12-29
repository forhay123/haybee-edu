package com.edu.platform.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Archived copy of StudentLessonProgress for historical analysis
 * Created when progress records are removed during weekly regeneration
 */
@Entity
@Table(name = "archived_student_lesson_progress", schema = "academic",
       indexes = {
           @Index(name = "idx_archived_progress_student", columnList = "student_id"),
           @Index(name = "idx_archived_progress_date", columnList = "scheduled_date"),
           @Index(name = "idx_archived_progress_term_week", columnList = "term_id, term_week_number"),
           @Index(name = "idx_archived_progress_original", columnList = "original_progress_id")
       })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ArchivedStudentLessonProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ============================================================
    // ARCHIVE METADATA
    // ============================================================
    
    /**
     * Reference to original progress ID before archival
     */
    @Column(name = "original_progress_id", nullable = false)
    private Long originalProgressId;
    
    /**
     * When this record was archived
     */
    @Column(name = "archived_at", nullable = false)
    private LocalDateTime archivedAt;
    
    /**
     * Which term this progress belonged to
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "term_id")
    private Term term;
    
    /**
     * Which week of the term (1-17)
     */
    @Column(name = "term_week_number")
    private Integer termWeekNumber;
    
    /**
     * Academic year for multi-year analysis (e.g., "2024/2025")
     */
    @Column(name = "academic_year", length = 20)
    private String academicYear;

    // ============================================================
    // ORIGINAL PROGRESS DATA (COPIED FROM StudentLessonProgress)
    // ============================================================
    
    @Column(name = "student_id", nullable = false)
    private Long studentId;
    
    @Column(name = "subject_id")
    private Long subjectId;
    
    @Column(name = "subject_name", length = 100)
    private String subjectName;
    
    @Column(name = "lesson_topic_id")
    private Long lessonTopicId;
    
    @Column(name = "lesson_topic_title", length = 255)
    private String lessonTopicTitle;
    
    @Column(name = "scheduled_date")
    private LocalDate scheduledDate;
    
    @Column(name = "period_number")
    private Integer periodNumber;
    
    @Column(name = "priority")
    private Integer priority;
    
    @Column(name = "weight")
    private Double weight;
    
    @Column(name = "completed", nullable = false)
    private boolean completed;
    
    @Column(name = "completed_at")
    private LocalDateTime completedAt;
    
    @Column(name = "completion_time")
    private LocalDateTime completionTime;
    
    @Column(name = "assessment_id")
    private Long assessmentId;
    
    @Column(name = "assessment_submission_id")
    private Long assessmentSubmissionId;
    
    @Column(name = "assessment_accessible")
    private Boolean assessmentAccessible;
    
    @Column(name = "assessment_window_start")
    private LocalDateTime assessmentWindowStart;
    
    @Column(name = "assessment_window_end")
    private LocalDateTime assessmentWindowEnd;
    
    @Column(name = "incomplete_reason", length = 100)
    private String incompleteReason;
    
    @Column(name = "auto_marked_incomplete_at")
    private LocalDateTime autoMarkedIncompleteAt;
    
    // ============================================================
    // NEW FIELDS (PHASE 2 - MULTI-ASSESSMENT) - ✅ CORRECTED
    // ============================================================
    
    @Column(name = "period_sequence")
    private Integer periodSequence;
    
    @Column(name = "total_periods_in_sequence")
    private Integer totalPeriodsInSequence;
    
    /**
     * ✅ CORRECTED: Changed from String to List<Long> with @JdbcTypeCode
     * Hibernate 6 will automatically handle JSON serialization to JSONB
     */
    @Column(name = "linked_progress_ids")
    @JdbcTypeCode(SqlTypes.JSON)
    @Builder.Default
    private List<Long> linkedProgressIds = new ArrayList<>();
    
    @Column(name = "all_periods_completed")
    private Boolean allPeriodsCompleted;
    
    @Column(name = "topic_average_score", precision = 5, scale = 2)
    private BigDecimal topicAverageScore;
    
    // ============================================================
    // STATISTICS (COMPUTED AT ARCHIVE TIME)
    // ============================================================
    
    /**
     * Assessment score if completed (0-100)
     */
    @Column(name = "assessment_score", precision = 5, scale = 2)
    private BigDecimal assessmentScore;
    
    /**
     * Completion status: COMPLETED, INCOMPLETE, MISSED
     */
    @Column(name = "completion_status", length = 20)
    private String completionStatus;

    // ============================================================
    // TIMESTAMPS (FROM ORIGINAL)
    // ============================================================
    
    @Column(name = "original_created_at")
    private LocalDateTime originalCreatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.archivedAt == null) {
            this.archivedAt = LocalDateTime.now();
        }
        if (this.linkedProgressIds == null) {
            this.linkedProgressIds = new ArrayList<>();
        }
    }
    
    // ============================================================
    // HELPER METHODS
    // ============================================================
    
    /**
     * ✅ Get linked progress IDs safely
     */
    public List<Long> getLinkedProgressIds() {
        return linkedProgressIds != null ? linkedProgressIds : Collections.emptyList();
    }
    
    /**
     * ✅ Set linked progress IDs safely
     */
    public void setLinkedProgressIds(List<Long> linkedProgressIds) {
        this.linkedProgressIds = linkedProgressIds != null ? linkedProgressIds : new ArrayList<>();
    }
}