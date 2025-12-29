package com.edu.platform.model;

import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.model.enums.StudentType;
import jakarta.persistence.*;
import lombok.*;

import java.time.DayOfWeek;
import java.time.LocalTime;

@Entity
@Table(name = "weekly_schedules", schema = "academic",
       uniqueConstraints = @UniqueConstraint(
           columnNames = {"class_id", "week_number", "day_of_week", "period_number", "student_type"}  // ✅ Added student_type
       ))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WeeklySchedule {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private ClassEntity classEntity;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_topic_id")
    private LessonTopic lessonTopic;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id")
    private User teacher;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id")
    private Assessment assessment;
    
    @Column(name = "week_number", nullable = false)
    private Integer weekNumber;
    
    @Column(name = "day_of_week", nullable = false)
    @Enumerated(EnumType.STRING)
    private DayOfWeek dayOfWeek;
    
    @Column(name = "period_number", nullable = false)
    private Integer periodNumber;
    
    @Column(name = "start_time")
    private LocalTime startTime;
    
    @Column(name = "end_time")
    private LocalTime endTime;
    
    @Column(name = "priority")
    private Integer priority;
    
    @Column(name = "weight")
    private Double weight;
    
    // ✅ NEW: Student type for this schedule
    @Column(name = "student_type")
    @Enumerated(EnumType.STRING)
    private StudentType studentType;
    
    @PrePersist
    protected void onCreate() {
        if (this.priority == null) {
            this.priority = 3;
        }
        if (this.weight == null) {
            this.weight = 1.0;
        }
        if (this.weekNumber == null) {
            this.weekNumber = 1;
        }
        // ✅ Set default student type from class if not specified
        if (this.studentType == null && this.classEntity != null) {
            this.studentType = this.classEntity.getStudentType();
        }
    }
    
    // ============================================================
    // HELPER METHODS
    // ============================================================
    
    public Long getClassId() {
        return classEntity != null ? classEntity.getId() : null;
    }
    
    public String getClassName() {
        return classEntity != null ? classEntity.getName() : null;
    }
    
    public boolean hasAssessment() {
        return this.assessment != null;
    }
    
    public Long getAssessmentId() {
        return this.assessment != null ? this.assessment.getId() : null;
    }
}