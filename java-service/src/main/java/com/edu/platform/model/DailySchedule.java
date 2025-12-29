package com.edu.platform.model;

import com.edu.platform.model.assessment.Assessment;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.edu.platform.model.enums.ScheduleStatus;
import com.edu.platform.model.individual.IndividualStudentTimetable;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Daily lesson schedule for student progress tracking
 * Supports both CLASS-based and INDIVIDUAL student schedules
 */
@Entity
@Table(
    name = "daily_schedules",
    schema = "academic",
    uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "scheduled_date", "period_number"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailySchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private StudentProfile studentProfile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id")
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_topic_id")
    private LessonTopic lessonTopic;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id")
    private Assessment assessment;

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

    @Column(name = "marked_incomplete_reason", length = 100)
    private String markedIncompleteReason;

    @Column(name = "completed", nullable = false)
    @Builder.Default
    private boolean completed = false;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "schedule_source", length = 20)
    @Builder.Default
    private String scheduleSource = "CLASS";

    @Column(name = "individual_timetable_id")
    private Long individualTimetableId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "individual_timetable_id", insertable = false, updatable = false)
    private IndividualStudentTimetable individualStudentTimetable;

    @Column(name = "day_of_week", length = 10)
    private String dayOfWeek;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "period_sequence")
    private Integer periodSequence;

    @Column(name = "total_periods_for_topic")
    private Integer totalPeriodsForTopic;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "linked_schedule_ids", columnDefinition = "jsonb")
    private String linkedScheduleIds;

    @Column(name = "assessment_instance_id")
    private Long assessmentInstanceId;

    @Column(name = "all_assessments_completed")
    @Builder.Default
    private Boolean allAssessmentsCompleted = false;

    @Column(name = "topic_completion_percentage", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal topicCompletionPercentage = BigDecimal.ZERO;

    @Column(name = "has_schedule_conflict")
    @Builder.Default
    private Boolean hasScheduleConflict = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "conflict_details", columnDefinition = "jsonb")
    private String conflictDetails;

    @Column(name = "schedule_status", length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ScheduleStatus scheduleStatus = ScheduleStatus.READY;

    @Column(name = "missing_lesson_topic")
    @Builder.Default
    private Boolean missingLessonTopic = false;

    @Column(name = "lesson_assignment_method", length = 30)
    private String lessonAssignmentMethod;

    @Column(name = "manually_assigned_at")
    private LocalDateTime manuallyAssignedAt;

    @Column(name = "manually_assigned_by_user_id")
    private Long manuallyAssignedByUserId;

    @Column(name = "lesson_content_accessible", nullable = false)
    @Builder.Default
    private Boolean lessonContentAccessible = true;

    // ============================================================
    // ⭐ NEW: CUSTOM PERIOD ASSESSMENT FIELDS
    // ============================================================
    
    /**
     * Links to the previous period schedule in a multi-period sequence
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "previous_period_schedule_id")
    private DailySchedule previousPeriodSchedule;
    
    /**
     * TRUE if this schedule period is waiting for a custom assessment to be created
     */
    @Column(name = "requires_custom_assessment")
    @Builder.Default
    private Boolean requiresCustomAssessment = false;
    
    /**
     * TRUE when teacher has created the custom assessment and it is ready for student access
     */
    @Column(name = "custom_assessment_ready")
    @Builder.Default
    private Boolean customAssessmentReady = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ============================================================
    // LIFECYCLE
    // ============================================================

    @PrePersist
    protected void onCreate() {

        if (this.createdAt == null) this.createdAt = LocalDateTime.now();
        if (this.updatedAt == null) this.updatedAt = LocalDateTime.now();

        if (this.priority == null) this.priority = 3;
        if (this.weight == null) this.weight = 1.0;
        if (this.scheduleSource == null) this.scheduleSource = "CLASS";
        if (this.lessonContentAccessible == null) this.lessonContentAccessible = true;
        if (this.requiresCustomAssessment == null) this.requiresCustomAssessment = false;
        if (this.customAssessmentReady == null) this.customAssessmentReady = false;

        if (this.scheduledDate != null && this.dayOfWeek == null) {
            this.dayOfWeek = this.scheduledDate.getDayOfWeek().name();
        }

        // INDIVIDUAL LOGIC
        if ("INDIVIDUAL".equals(this.scheduleSource)) {

            if (this.lessonTopic == null) {
                this.missingLessonTopic = true;

                if (this.lessonAssignmentMethod == null) {
                    this.lessonAssignmentMethod = "PENDING_MANUAL";
                }

                if (this.scheduleStatus == null) {
                    this.scheduleStatus = ScheduleStatus.IN_PROGRESS;
                }

            } else {
                this.missingLessonTopic = false;
            }
        }

        // CLASS VALIDATION
        if ("CLASS".equals(this.scheduleSource)) {
            if (this.subject == null || this.lessonTopic == null) {
                throw new IllegalStateException(
                    "CLASS schedules MUST have both subject and lessonTopic."
                );
            }
        }
    }

    @PreUpdate
    protected void onUpdate() {

        this.updatedAt = LocalDateTime.now();

        if ("INDIVIDUAL".equals(this.scheduleSource)) {

            if (this.lessonTopic == null) {
                this.missingLessonTopic = true;

                if (this.scheduleStatus == ScheduleStatus.READY) {
                    this.scheduleStatus = ScheduleStatus.IN_PROGRESS;
                }

            } else {
                this.missingLessonTopic = false;

                if (this.scheduleStatus == ScheduleStatus.IN_PROGRESS) {
                    this.scheduleStatus = ScheduleStatus.READY;
                }
            }
        }
    }

    // ============================================================
    // HELPERS
    // ============================================================

    public void markCompleted() {
        this.completed = true;
        this.completedAt = LocalDateTime.now();
    }

    public void markIncomplete() {
        this.completed = false;
        this.completedAt = null;
    }

    public boolean isClassSchedule() { return "CLASS".equals(this.scheduleSource); }
    public boolean isIndividualSchedule() { return "INDIVIDUAL".equals(this.scheduleSource); }

    public boolean isMultiPeriodTopic() {
        return totalPeriodsForTopic != null && totalPeriodsForTopic > 1;
    }

    public boolean isFirstPeriod() {
        return periodSequence != null && periodSequence == 1;
    }

    public boolean isLastPeriod() {
        return periodSequence != null &&
            totalPeriodsForTopic != null &&
            periodSequence.equals(totalPeriodsForTopic);
    }

    public boolean hasConflict() {
        return Boolean.TRUE.equals(hasScheduleConflict);
    }

    public List<Long> getLinkedScheduleIdsList() {
        if (linkedScheduleIds == null || linkedScheduleIds.trim().isEmpty()) {
            return Collections.emptyList();
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(linkedScheduleIds, new TypeReference<List<Long>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public void setLinkedScheduleIdsList(List<Long> ids) {
        try {
            if (ids == null || ids.isEmpty()) {
                this.linkedScheduleIds = null;
                return;
            }
            ObjectMapper mapper = new ObjectMapper();
            this.linkedScheduleIds = mapper.writeValueAsString(ids);
        } catch (Exception e) {
            this.linkedScheduleIds = null;
        }
    }

    public Double getTopicCompletionPercentageAsDouble() {
        return topicCompletionPercentage != null
                ? topicCompletionPercentage.doubleValue()
                : null;
    }

    public void setTopicCompletionPercentage(Double percentage) {
        this.topicCompletionPercentage =
                (percentage != null ? BigDecimal.valueOf(percentage) : null);
    }

    public void setTopicCompletionPercentage(BigDecimal percentage) {
        this.topicCompletionPercentage = percentage;
    }

    // ============================================================
    // ⭐ NEW: CUSTOM PERIOD ASSESSMENT HELPER METHODS
    // ============================================================
    
    /**
     * Check if this schedule has a previous period dependency
     */
    public boolean hasPreviousPeriod() {
        return previousPeriodSchedule != null;
    }
    
    /**
     * Get the ID of the previous period schedule (null if none)
     */
    public Long getPreviousPeriodScheduleId() {
        return previousPeriodSchedule != null ? previousPeriodSchedule.getId() : null;
    }
    
    /**
     * Check if the previous period has been completed
     */
    public boolean isPreviousPeriodCompleted() {
        if (!hasPreviousPeriod()) {
            return true; // No dependency means we can proceed
        }
        return previousPeriodSchedule.isCompleted();
    }
    
    /**
     * Check if this period needs a teacher to create a custom assessment
     */
    public boolean needsTeacherAssessment() {
        return Boolean.TRUE.equals(requiresCustomAssessment) && 
               !Boolean.TRUE.equals(customAssessmentReady);
    }
    
    /**
     * Check if custom assessment has been created and is ready
     */
    public boolean hasCustomAssessmentReady() {
        return Boolean.TRUE.equals(requiresCustomAssessment) && 
               Boolean.TRUE.equals(customAssessmentReady);
    }
    
    /**
     * Check if student can access this schedule period
     */
    public boolean canStudentAccess() {
        // Previous period must be completed
        if (!isPreviousPeriodCompleted()) {
            return false;
        }
        
        // If requires custom assessment, it must be ready
        if (needsTeacherAssessment()) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Get the reason why student cannot access (for UI display)
     */
    public String getAccessBlockingReason() {
        if (!isPreviousPeriodCompleted()) {
            return "Previous period not completed";
        }
        
        if (needsTeacherAssessment()) {
            return "Waiting for teacher to create custom assessment";
        }
        
        return null;
    }
    
    /**
     * Mark that custom assessment has been created and is ready
     */
    public void markCustomAssessmentReady(Assessment customAssessment) {
        this.assessment = customAssessment;
        this.customAssessmentReady = true;
    }
}