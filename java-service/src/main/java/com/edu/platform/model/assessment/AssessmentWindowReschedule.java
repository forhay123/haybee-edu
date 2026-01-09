package com.edu.platform.model.assessment;

import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.TeacherProfile;
import com.edu.platform.model.progress.StudentLessonProgress;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.Duration;

/**
 * Entity for tracking teacher-initiated assessment rescheduling
 * Used when teacher needs to change assessment time BEFORE it starts
 * NOT for mercy extensions after student misses deadline
 */
@Entity
@Table(name = "assessment_window_reschedules", 
       schema = "academic",
       indexes = {
           @Index(name = "idx_reschedule_student_schedule", 
                  columnList = "student_id,daily_schedule_id,is_active"),
           @Index(name = "idx_reschedule_teacher", 
                  columnList = "teacher_id,rescheduled_at"),
           @Index(name = "idx_reschedule_assessment", 
                  columnList = "assessment_id,is_active")
       })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class AssessmentWindowReschedule {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // ========== Relationships ==========
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "daily_schedule_id", nullable = false)
    private StudentLessonProgress dailySchedule;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    private Assessment assessment;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private StudentProfile student;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private TeacherProfile teacher;
    
    // ========== Original Windows (CANCELLED) ==========
    
    @Column(name = "original_window_start", nullable = false)
    private LocalDateTime originalWindowStart;
    
    @Column(name = "original_window_end", nullable = false)
    private LocalDateTime originalWindowEnd;
    
    @Column(name = "original_grace_end")
    private LocalDateTime originalGraceEnd;
    
    // ========== NEW Rescheduled Windows (1-hour duration) ==========
    
    @Column(name = "new_window_start", nullable = false)
    private LocalDateTime newWindowStart;
    
    @Column(name = "new_window_end", nullable = false)
    private LocalDateTime newWindowEnd;
    
    @Column(name = "new_grace_end")
    private LocalDateTime newGraceEnd;
    
    // ========== Metadata ==========
    
    @Column(name = "reason", length = 500, nullable = false)
    private String reason;
    
    @Column(name = "rescheduled_at", nullable = false)
    private LocalDateTime rescheduledAt;
    
    @Column(name = "rescheduled_by_teacher_id", nullable = false)
    private Long rescheduledByTeacherId;
    
    // ========== Status ==========
    
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
    
    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;
    
    @Column(name = "cancelled_reason", length = 500)
    private String cancelledReason;
    
    // ========== Timestamps ==========
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (rescheduledAt == null) {
            rescheduledAt = LocalDateTime.now();
        }
        
        // ✅ ENFORCE: New window must be exactly 1 hour
        if (newWindowStart != null && newWindowEnd == null) {
            newWindowEnd = newWindowStart.plusHours(1);
        }
        
        // ✅ AUTO-CALCULATE: Grace period (30 minutes after window end)
        if (newWindowEnd != null && newGraceEnd == null) {
            newGraceEnd = newWindowEnd.plusMinutes(30);
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    // ========== Business Methods ==========
    
    /**
     * Check if reschedule is currently active and not cancelled
     */
    public boolean isCurrentlyActive() {
        if (!Boolean.TRUE.equals(isActive)) {
            return false;
        }
        
        LocalDateTime now = LocalDateTime.now();
        
        // Check if cancelled
        if (cancelledAt != null && cancelledAt.isBefore(now)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Cancel this reschedule (reverts to original window)
     */
    public void cancel(String reason) {
        this.isActive = false;
        this.cancelledAt = LocalDateTime.now();
        this.cancelledReason = reason;
    }
    
    /**
     * Validate that rescheduling happens BEFORE original start
     */
    public boolean isRescheduledBeforeOriginalStart() {
        if (rescheduledAt == null || originalWindowStart == null) {
            return false;
        }
        return rescheduledAt.isBefore(originalWindowStart);
    }
    
    /**
     * Validate that new window is exactly 1 hour
     */
    public boolean isNewWindowOneHour() {
        if (newWindowStart == null || newWindowEnd == null) {
            return false;
        }
        Duration duration = Duration.between(newWindowStart, newWindowEnd);
        return duration.toHours() == 1;
    }
    
    /**
     * Get time difference between original and new start (for display)
     */
    public String getTimeDifference() {
        if (originalWindowStart == null || newWindowStart == null) {
            return "N/A";
        }
        
        Duration diff = Duration.between(originalWindowStart, newWindowStart);
        long hours = Math.abs(diff.toHours());
        
        if (newWindowStart.isAfter(originalWindowStart)) {
            return "+" + hours + " hours later";
        } else {
            return "-" + hours + " hours earlier";
        }
    }
}