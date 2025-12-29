package com.edu.platform.model.progress;

import com.edu.platform.model.LessonTopic;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.model.User;
import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.model.assessment.AssessmentSubmission;
import com.edu.platform.model.DailySchedule;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.math.BigDecimal;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "student_lesson_progress", schema = "academic",
       uniqueConstraints = @UniqueConstraint(columnNames = {
               "student_profile_id", "lesson_topic_id",
               "scheduled_date", "period_number"
       }))
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentLessonProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_profile_id", nullable = false)
    private StudentProfile studentProfile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_period_id")
    private LessonPeriod lessonPeriod;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_topic_id")
    private LessonTopic lessonTopic;

    @Column(name = "scheduled_date")
    private LocalDate scheduledDate;

    @Column(name = "period_number")
    private Integer periodNumber;

    @Column(name = "priority")
    private Integer priority;

    @Column(name = "weight")
    private Double weight;

    @Column(name = "date", nullable = false)
    private LocalDate date;

    @Column(name = "completed", nullable = false)
    private boolean completed = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id")
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id")
    private LessonTopic topic;

    @Column(name = "assessment_submission_id")
    private Long assessmentSubmissionId;

    @Column(name = "completion_time")
    private LocalDateTime completionTime;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "assessment_score", precision = 5, scale = 2)
    private BigDecimal assessmentScore;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "daily_schedule_id")
    private DailySchedule schedule;

    @Column(name = "assessment_instance_id")
    private Long assessmentInstanceId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id")
    private Assessment assessment;

    @Column(name = "assessment_accessible")
    private Boolean assessmentAccessible;

    @Column(name = "lesson_content_accessible", nullable = false)
    @Builder.Default
    private Boolean lessonContentAccessible = true;

    @Column(name = "assessment_window_start")
    private LocalDateTime assessmentWindowStart;

    @Column(name = "assessment_window_end")
    private LocalDateTime assessmentWindowEnd;

    @Column(name = "incomplete_reason", length = 100)
    private String incompleteReason;

    @Column(name = "auto_marked_incomplete_at")
    private LocalDateTime autoMarkedIncompleteAt;

    // Multi-assessment support
    @Column(name = "period_sequence")
    private Integer periodSequence;

    @Column(name = "total_periods_in_sequence")
    private Integer totalPeriodsInSequence;

    @Column(name = "linked_progress_ids")
    @JdbcTypeCode(SqlTypes.JSON)
    @Builder.Default
    private List<Long> linkedProgressIds = new ArrayList<>();

    @Builder.Default
    @Column(name = "all_periods_completed")
    private Boolean allPeriodsCompleted = false;

    @Column(name = "topic_average_score", precision = 5, scale = 2)
    private BigDecimal topicAverageScore;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_submission_id", insertable = false, updatable = false)
    private AssessmentSubmission assessmentSubmission;
    
    @Column(name = "grace_period_end")
    private LocalDateTime gracePeriodEnd;

    // ============================================================
    // ⭐ NEW: CUSTOM PERIOD ASSESSMENT FIELDS
    // ============================================================
    
    /**
     * Links to the previous period in a multi-period sequence.
     * Used to enforce sequential completion.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "previous_period_progress_id")
    private StudentLessonProgress previousPeriodProgress;
    
    /**
     * TRUE if this period is waiting for teacher to create a custom assessment (Period 2/3)
     */
    @Column(name = "requires_custom_assessment")
    @Builder.Default
    private Boolean requiresCustomAssessment = false;
    
    /**
     * Timestamp when the teacher created the custom assessment for this period
     */
    @Column(name = "custom_assessment_created_at")
    private LocalDateTime customAssessmentCreatedAt;
    
    /**
     * User ID of the teacher who created the custom assessment
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "custom_assessment_created_by_user_id")
    private User customAssessmentCreatedBy;

    // ============================================================
    // GETTERS AND SETTERS
    // ============================================================

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public StudentProfile getStudentProfile() { return studentProfile; }
    public void setStudentProfile(StudentProfile studentProfile) { this.studentProfile = studentProfile; }

    public LessonPeriod getLessonPeriod() { return lessonPeriod; }
    public void setLessonPeriod(LessonPeriod lessonPeriod) { this.lessonPeriod = lessonPeriod; }

    public LessonTopic getLessonTopic() { return lessonTopic; }
    public void setLessonTopic(LessonTopic lessonTopic) { this.lessonTopic = lessonTopic; }

    public LocalDate getScheduledDate() { return scheduledDate; }
    public void setScheduledDate(LocalDate scheduledDate) { this.scheduledDate = scheduledDate; }

    public Integer getPeriodNumber() { return periodNumber; }
    public void setPeriodNumber(Integer periodNumber) { this.periodNumber = periodNumber; }

    public Integer getPriority() { return priority; }
    public void setPriority(Integer priority) { this.priority = priority; }

    public Double getWeight() { return weight; }
    public void setWeight(Double weight) { this.weight = weight; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }

    public Subject getSubject() { return subject; }
    public void setSubject(Subject subject) { this.subject = subject; }

    public LessonTopic getTopic() { return topic; }
    public void setTopic(LessonTopic topic) { this.topic = topic; }

    public Long getAssessmentSubmissionId() { return assessmentSubmissionId; }
    public void setAssessmentSubmissionId(Long id) { this.assessmentSubmissionId = id; }

    public LocalDateTime getCompletionTime() { return completionTime; }
    public void setCompletionTime(LocalDateTime completionTime) { this.completionTime = completionTime; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public Assessment getAssessment() { return assessment; }
    public void setAssessment(Assessment assessment) { this.assessment = assessment; }

    public Boolean getAssessmentAccessible() { return assessmentAccessible; }
    public void setAssessmentAccessible(Boolean val) { this.assessmentAccessible = val; }

    public LocalDateTime getAssessmentWindowStart() { return assessmentWindowStart; }
    public void setAssessmentWindowStart(LocalDateTime t) { this.assessmentWindowStart = t; }

    public LocalDateTime getAssessmentWindowEnd() { return assessmentWindowEnd; }
    public void setAssessmentWindowEnd(LocalDateTime t) { this.assessmentWindowEnd = t; }

    public String getIncompleteReason() { return incompleteReason; }
    public void setIncompleteReason(String r) { this.incompleteReason = r; }

    public LocalDateTime getAutoMarkedIncompleteAt() { return autoMarkedIncompleteAt; }
    public void setAutoMarkedIncompleteAt(LocalDateTime t) { this.autoMarkedIncompleteAt = t; }

    public DailySchedule getSchedule() { return schedule; }
    public void setSchedule(DailySchedule schedule) { this.schedule = schedule; }

    public Long getAssessmentInstanceId() { return assessmentInstanceId; }
    public void setAssessmentInstanceId(Long id) { this.assessmentInstanceId = id; }

    public Boolean getLessonContentAccessible() { return lessonContentAccessible; }
    public void setLessonContentAccessible(Boolean lessonContentAccessible) {
        this.lessonContentAccessible = lessonContentAccessible;
    }

    public Integer getPeriodSequence() { return periodSequence; }
    public void setPeriodSequence(Integer v) { this.periodSequence = v; }

    public Integer getTotalPeriodsInSequence() { return totalPeriodsInSequence; }
    public void setTotalPeriodsInSequence(Integer v) { this.totalPeriodsInSequence = v; }

    public Boolean getAllPeriodsCompleted() { return allPeriodsCompleted; }
    public void setAllPeriodsCompleted(Boolean b) { this.allPeriodsCompleted = b; }

    public AssessmentSubmission getAssessmentSubmission() { return assessmentSubmission; }
    public void setAssessmentSubmission(AssessmentSubmission a) { this.assessmentSubmission = a; }

    public List<Long> getLinkedProgressIds() {
        return linkedProgressIds != null ? linkedProgressIds : Collections.emptyList();
    }

    public void setLinkedProgressIds(List<Long> ids) {
        this.linkedProgressIds = ids != null ? ids : new ArrayList<>();
    }

    public LocalDateTime getGracePeriodEnd() { return gracePeriodEnd; }
    public void setGracePeriodEnd(LocalDateTime gracePeriodEnd) { this.gracePeriodEnd = gracePeriodEnd; }

    // ⭐ NEW GETTERS/SETTERS
    public StudentLessonProgress getPreviousPeriodProgress() { return previousPeriodProgress; }
    public void setPreviousPeriodProgress(StudentLessonProgress prev) { this.previousPeriodProgress = prev; }
    
    public Boolean getRequiresCustomAssessment() { return requiresCustomAssessment; }
    public void setRequiresCustomAssessment(Boolean req) { this.requiresCustomAssessment = req; }
    
    public LocalDateTime getCustomAssessmentCreatedAt() { return customAssessmentCreatedAt; }
    public void setCustomAssessmentCreatedAt(LocalDateTime dt) { this.customAssessmentCreatedAt = dt; }
    
    public User getCustomAssessmentCreatedBy() { return customAssessmentCreatedBy; }
    public void setCustomAssessmentCreatedBy(User user) { this.customAssessmentCreatedBy = user; }

    // ============================================================
    // SCORE METHODS
    // ============================================================

    public BigDecimal getAssessmentScore() { return assessmentScore; }
    
    public Double getAssessmentScoreAsDouble() {
        return assessmentScore != null ? assessmentScore.doubleValue() : null;
    }
    
    public void setAssessmentScore(Double score) {
        this.assessmentScore = score != null ? BigDecimal.valueOf(score) : null;
    }
    
    public void setAssessmentScore(BigDecimal score) { 
        this.assessmentScore = score; 
    }

    public BigDecimal getTopicAverageScore() { 
        return topicAverageScore; 
    }
    
    public Double getTopicAverageScoreAsDouble() {
        return topicAverageScore != null ? topicAverageScore.doubleValue() : null;
    }
    
    public void setTopicAverageScore(Double score) {
        this.topicAverageScore = score != null ? BigDecimal.valueOf(score) : null;
    }
    
    public void setTopicAverageScore(BigDecimal score) { 
        this.topicAverageScore = score; 
    }

    // ============================================================
    // HELPER METHODS
    // ============================================================

    public Long getSubjectId() {
        return subject != null ? subject.getId() : null;
    }

    public Long getTopicId() {
        return topic != null ? topic.getId() : null;
    }

    public void markCompleted() {
        this.completed = true;
        this.completedAt = LocalDateTime.now();
        this.incompleteReason = null;
        this.autoMarkedIncompleteAt = null;
    }

    public void markIncomplete(String reason) {
        this.completed = false;
        this.incompleteReason = reason;
        this.autoMarkedIncompleteAt = LocalDateTime.now();
    }

    public boolean isMultiPeriodTopic() {
        return totalPeriodsInSequence != null && totalPeriodsInSequence > 1;
    }

    public boolean isFirstPeriod() {
        return periodSequence != null && periodSequence == 1;
    }

    public boolean isLastPeriod() {
        return periodSequence != null &&
               totalPeriodsInSequence != null &&
               periodSequence.equals(totalPeriodsInSequence);
    }

    public boolean isAssessmentAccessible() {
        return assessmentAccessible != null && assessmentAccessible;
    }

    // ============================================================
    // ⭐ NEW: CUSTOM PERIOD ASSESSMENT HELPER METHODS
    // ============================================================
    
    /**
     * Check if this progress record has a previous period dependency
     */
    public boolean hasPreviousPeriod() {
        return previousPeriodProgress != null;
    }
    
    /**
     * Get the ID of the previous period progress (null if none)
     */
    public Long getPreviousPeriodProgressId() {
        return previousPeriodProgress != null ? previousPeriodProgress.getId() : null;
    }
    
    /**
     * Check if the previous period has been completed
     */
    public boolean isPreviousPeriodCompleted() {
        if (!hasPreviousPeriod()) {
            return true; // No dependency means we can proceed
        }
        return previousPeriodProgress.isCompleted();
    }
    
    /**
     * Check if this period needs a teacher to create a custom assessment
     */
    public boolean needsTeacherAssessment() {
        return Boolean.TRUE.equals(requiresCustomAssessment) && assessment == null;
    }
    
    /**
     * Check if custom assessment has been created for this period
     */
    public boolean hasCustomAssessment() {
        return Boolean.TRUE.equals(requiresCustomAssessment) && 
               assessment != null && 
               customAssessmentCreatedAt != null;
    }
    
    /**
     * Check if student can access this period
     * Considers both: previous period completion and custom assessment availability
     */
    public boolean canStudentAccess() {
        // Previous period must be completed
        if (!isPreviousPeriodCompleted()) {
            return false;
        }
        
        // If requires custom assessment, it must exist
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
     * Mark that custom assessment has been created
     */
    public void markCustomAssessmentCreated(Assessment customAssessment, User teacher) {
        this.assessment = customAssessment;
        this.customAssessmentCreatedAt = LocalDateTime.now();
        this.customAssessmentCreatedBy = teacher;
    }
    
    
    /**
     * ✅ NEW: Link this progress to a previous period
     * Sets up the dependency chain for multi-period subjects
     */
    public void linkToPreviousPeriod(StudentLessonProgress previousProgress) {
        if (previousProgress == null) {
            return;
        }
        
        this.previousPeriodProgress = previousProgress;
        
        // Add this progress to the previous progress's linked IDs
        List<Long> linkedIds = previousProgress.getLinkedProgressIds();
        if (linkedIds == null) {
            linkedIds = new ArrayList<>();
        }
        if (!linkedIds.contains(this.id)) {
            linkedIds.add(this.id);
            previousProgress.setLinkedProgressIds(linkedIds);
        }
    }

    /**
     * ✅ NEW: Set whether this is the first period in sequence
     */
    public void setIsFirstPeriod(boolean isFirst) {
        if (isFirst) {
            this.periodSequence = 1;
        }
    }

    // ============================================================
    // PRE-PERSIST
    // ============================================================

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) this.createdAt = LocalDateTime.now();
        if (this.priority == null) this.priority = 3;
        if (this.weight == null) this.weight = 1.0;
        if (this.assessmentAccessible == null) this.assessmentAccessible = false;
        if (this.linkedProgressIds == null) this.linkedProgressIds = new ArrayList<>();
        if (this.lessonContentAccessible == null) this.lessonContentAccessible = true;
        if (this.requiresCustomAssessment == null) this.requiresCustomAssessment = false;
    }
}