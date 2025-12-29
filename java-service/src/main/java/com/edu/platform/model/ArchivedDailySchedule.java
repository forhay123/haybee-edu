package com.edu.platform.model;

import com.edu.platform.model.assessment.Assessment;
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
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Archived copy of DailySchedule for historical progress analysis
 * Created when schedules are removed from active table during weekly regeneration
 */
@Entity
@Table(name = "archived_daily_schedules", schema = "academic",
       indexes = {
           @Index(name = "idx_archived_schedule_student", columnList = "student_id"),
           @Index(name = "idx_archived_schedule_date", columnList = "scheduled_date"),
           @Index(name = "idx_archived_schedule_term_week", columnList = "term_id, term_week_number"),
           @Index(name = "idx_archived_schedule_original", columnList = "original_schedule_id")
       })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ArchivedDailySchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ============================================================
    // ARCHIVE METADATA
    // ============================================================
    
    /**
     * Reference to original schedule ID before archival
     */
    @Column(name = "original_schedule_id", nullable = false)
    private Long originalScheduleId;
    
    /**
     * When this record was archived
     */
    @Column(name = "archived_at", nullable = false)
    private LocalDateTime archivedAt;
    
    /**
     * Which term this schedule belonged to
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
    // ORIGINAL SCHEDULE DATA (COPIED FROM DailySchedule)
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
    
    @Column(name = "assessment_id")
    private Long assessmentId;
    
    @Column(name = "scheduled_date", nullable = false)
    private LocalDate scheduledDate;
    
    @Column(name = "period_number", nullable = false)
    private Integer periodNumber;
    
    @Column(name = "priority")
    private Integer priority;
    
    @Column(name = "weight")
    private Double weight;
    
    @Column(name = "lesson_start_datetime")
    private LocalDateTime lessonStartDatetime;
    
    @Column(name = "lesson_end_datetime")
    private LocalDateTime lessonEndDatetime;
    
    @Column(name = "grace_end_datetime")
    private LocalDateTime graceEndDatetime;
    
    @Column(name = "assessment_window_start")
    private LocalDateTime assessmentWindowStart;
    
    @Column(name = "assessment_window_end")
    private LocalDateTime assessmentWindowEnd;
    
    @Column(name = "completed", nullable = false)
    private boolean completed;
    
    @Column(name = "completed_at")
    private LocalDateTime completedAt;
    
    @Column(name = "marked_incomplete_reason", length = 100)
    private String markedIncompleteReason;
    
    @Column(name = "schedule_source", length = 20)
    private String scheduleSource;
    
    @Column(name = "individual_timetable_id")
    private Long individualTimetableId;
    
    @Column(name = "day_of_week", length = 10)
    private String dayOfWeek;
    
    @Column(name = "start_time")
    private LocalTime startTime;
    
    @Column(name = "end_time")
    private LocalTime endTime;
    
    // ============================================================
    // NEW FIELDS (PHASE 2 - MULTI-ASSESSMENT) - ✅ CORRECTED
    // ============================================================
    
    @Column(name = "period_sequence")
    private Integer periodSequence;
    
    @Column(name = "total_periods_for_topic")
    private Integer totalPeriodsForTopic;
    
    /**
     * ✅ CORRECTED: Using @JdbcTypeCode for proper JSONB handling
     * Changed from String to List<Long> for type safety
     */
    @Column(name = "linked_schedule_ids")
    @JdbcTypeCode(SqlTypes.JSON)
    @Builder.Default
    private List<Long> linkedScheduleIds = new ArrayList<>();
    
    @Column(name = "assessment_instance_id")
    private Long assessmentInstanceId;
    
    @Column(name = "all_assessments_completed")
    private Boolean allAssessmentsCompleted;
    
    @Column(name = "topic_completion_percentage", precision = 5, scale = 2)
    private BigDecimal topicCompletionPercentage;
    
    @Column(name = "schedule_status", length = 20)
    private String scheduleStatus; // READY, IN_PROGRESS, COMPLETED
    
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
    
    @Column(name = "original_updated_at")
    private LocalDateTime originalUpdatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.archivedAt == null) {
            this.archivedAt = LocalDateTime.now();
        }
        if (this.linkedScheduleIds == null) {
            this.linkedScheduleIds = new ArrayList<>();
        }
    }
    
    // ============================================================
    // HELPER METHODS
    // ============================================================
    
    /**
     * Check if this was a CLASS-based schedule
     */
    public boolean isClassSchedule() {
        return "CLASS".equals(this.scheduleSource);
    }
    
    /**
     * Check if this was an INDIVIDUAL schedule
     */
    public boolean isIndividualSchedule() {
        return "INDIVIDUAL".equals(this.scheduleSource);
    }
    
    /**
     * ✅ Get linked schedule IDs safely
     */
    public List<Long> getLinkedScheduleIds() {
        return linkedScheduleIds != null ? linkedScheduleIds : Collections.emptyList();
    }
    
    /**
     * ✅ Set linked schedule IDs safely
     */
    public void setLinkedScheduleIds(List<Long> linkedScheduleIds) {
        this.linkedScheduleIds = linkedScheduleIds != null ? linkedScheduleIds : new ArrayList<>();
    }
}