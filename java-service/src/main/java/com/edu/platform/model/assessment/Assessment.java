// ============================================================
// ASSESSMENT ENTITY - WITH CUSTOM PERIOD ASSESSMENT SUPPORT
// ============================================================
package com.edu.platform.model.assessment;

import com.edu.platform.model.LessonTopic;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.model.Term;
import com.edu.platform.model.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "assessments", schema = "academic")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Assessment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AssessmentType type;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "term_id")
    private Term term;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_topic_id")
    private LessonTopic lessonTopic;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;
    
    @Column(name = "total_marks")
    private Integer totalMarks;
    
    @Column(name = "passing_marks")
    private Integer passingMarks;
    
    @Column(name = "duration_minutes")
    private Integer durationMinutes;
    
    @Column(name = "auto_grade")
    private Boolean autoGrade = true;
    
    @Column(name = "published")
    private Boolean published = false;
    
    @Column(name = "due_date")
    private LocalDateTime dueDate;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // ============================================================
    // ⭐ NEW: CUSTOM PERIOD ASSESSMENT FIELDS
    // ============================================================
    
    /**
     * When set, this assessment is custom-created for a specific student.
     * NULL for regular assessments that are available to all students.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_student_profile_id")
    private StudentProfile targetStudentProfile;
    
    /**
     * Which period this custom assessment is for (1, 2, 3, etc.)
     * Only used for custom period assessments.
     */
    @Column(name = "period_number")
    private Integer periodNumber;
    
    /**
     * Links to the base assessment (usually Period 1) that this 
     * custom assessment is derived from.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_assessment_id")
    private Assessment parentAssessment;
    
    /**
     * TRUE if this is a teacher-created custom assessment for a 
     * specific student/period. FALSE for regular assessments.
     */
    @Column(name = "is_custom_period_assessment")
    @Builder.Default
    private Boolean isCustomPeriodAssessment = false;
    
    // ============================================================
    // EXISTING QUESTIONS COLLECTION
    // ============================================================
    
    /**
     * ✅ Initialize collection with @Builder.Default
     * This prevents NullPointerException across the entire codebase
     */
    @OneToMany(mappedBy = "assessment", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<AssessmentQuestion> questions = new ArrayList<>();
    
    // ============================================================
    // LIFECYCLE HOOKS
    // ============================================================
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (autoGrade == null) autoGrade = true;
        if (published == null) published = false;
        if (isCustomPeriodAssessment == null) isCustomPeriodAssessment = false;
        
        // ✅ Ensure questions list is never null
        if (questions == null) {
            questions = new ArrayList<>();
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        
        // ✅ Ensure questions list is never null
        if (questions == null) {
            questions = new ArrayList<>();
        }
    }
    
    // ============================================================
    // HELPER METHODS - EXISTING
    // ============================================================
    
    /**
     * ✅ Safely add a question to the assessment
     * Maintains bidirectional relationship consistency
     */
    public void addQuestion(AssessmentQuestion question) {
        if (this.questions == null) {
            this.questions = new ArrayList<>();
        }
        this.questions.add(question);
        question.setAssessment(this);
    }
    
    /**
     * ✅ Safely remove a question from the assessment
     * Maintains bidirectional relationship consistency
     */
    public void removeQuestion(AssessmentQuestion question) {
        if (this.questions != null) {
            this.questions.remove(question);
            question.setAssessment(null);
        }
    }
    
    /**
     * ✅ Safe getter for question count
     * Never throws NullPointerException
     */
    public int getQuestionCount() {
        return (this.questions != null) ? this.questions.size() : 0;
    }
    
    /**
     * ✅ Check if assessment has any questions
     */
    public boolean hasQuestions() {
        return this.questions != null && !this.questions.isEmpty();
    }
    
    /**
     * ✅ Get questions safely (defensive copy)
     * Returns empty list if null, never returns null
     */
    public List<AssessmentQuestion> getQuestionsSafe() {
        return (this.questions != null) ? new ArrayList<>(this.questions) : new ArrayList<>();
    }
    
    /**
     * ✅ Check if assessment is published
     */
    public boolean isPublished() {
        return published != null && published;
    }
    
    // ============================================================
    // ⭐ NEW: CUSTOM PERIOD ASSESSMENT HELPER METHODS
    // ============================================================
    
    /**
     * Check if this is a custom assessment created for a specific student
     */
    public boolean isCustomAssessment() {
        return Boolean.TRUE.equals(isCustomPeriodAssessment);
    }
    
    /**
     * Check if this assessment is for a specific student
     * @param studentId The student profile ID to check
     * @return true if this assessment is targeted to the given student
     */
    public boolean isForStudent(Long studentId) {
        if (studentId == null || targetStudentProfile == null) {
            return false;
        }
        return studentId.equals(targetStudentProfile.getId());
    }
    
    /**
     * Check if this assessment is accessible to a given student
     * Regular assessments are accessible to all students
     * Custom assessments are only accessible to their target student
     */
    public boolean isAccessibleToStudent(Long studentId) {
        // Regular assessments are accessible to everyone
        if (!isCustomAssessment()) {
            return true;
        }
        // Custom assessments only accessible to target student
        return isForStudent(studentId);
    }
    
    /**
     * Get the target student's ID (if this is a custom assessment)
     */
    public Long getTargetStudentId() {
        return targetStudentProfile != null ? targetStudentProfile.getId() : null;
    }
    
    /**
     * Get the parent assessment's ID (if this is derived from another assessment)
     */
    public Long getParentAssessmentId() {
        return parentAssessment != null ? parentAssessment.getId() : null;
    }
    
    /**
     * Check if this is a base assessment (Period 1)
     */
    public boolean isBaseAssessment() {
        return !isCustomAssessment() || (periodNumber != null && periodNumber == 1);
    }
    
    /**
     * Check if this is a subsequent period assessment (Period 2+)
     */
    public boolean isSubsequentPeriodAssessment() {
        return isCustomAssessment() && periodNumber != null && periodNumber > 1;
    }
    
    /**
     * Generate a descriptive name for this assessment
     */
    public String getDescriptiveName() {
        if (!isCustomAssessment()) {
            return title;
        }
        
        StringBuilder name = new StringBuilder(title);
        if (periodNumber != null) {
            name.append(" - Period ").append(periodNumber);
        }
        if (targetStudentProfile != null) {
            name.append(" (Custom for ").append(targetStudentProfile.getUser().getFullName()).append(")");
        }
        return name.toString();
    }
}