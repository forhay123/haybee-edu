package com.edu.platform.dto.assessment;

import com.edu.platform.model.assessment.AssessmentWindowReschedule;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO for assessment window rescheduling
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WindowRescheduleDto {
    
    private Long id;
    
    // References
    private Long dailyScheduleId;
    private Long assessmentId;
    private Long studentId;
    private String studentName;
    private Long teacherId;
    private String teacherName;
    
    // Subject info
    private String subjectName;
    private String lessonTitle;
    
    // Original windows (CANCELLED)
    private LocalDateTime originalWindowStart;
    private LocalDateTime originalWindowEnd;
    private LocalDateTime originalGraceEnd;
    
    // NEW rescheduled windows
    private LocalDateTime newWindowStart;
    private LocalDateTime newWindowEnd;
    private LocalDateTime newGraceEnd;
    
    // Metadata
    private String reason;
    private LocalDateTime rescheduledAt;
    private Long rescheduledByTeacherId;
    
    // Status
    private Boolean isActive;
    private LocalDateTime cancelledAt;
    private String cancelledReason;
    
    // Computed fields
    private String timeDifference; // e.g., "+2 hours later"
    private Boolean isCurrentlyActive;
    private Boolean isOneHourWindow;
    
    /**
     * Convert entity to DTO
     */
    public static WindowRescheduleDto fromEntity(AssessmentWindowReschedule reschedule) {
        if (reschedule == null) {
            return null;
        }
        
        WindowRescheduleDto.WindowRescheduleDtoBuilder builder = WindowRescheduleDto.builder()
            .id(reschedule.getId())
            .dailyScheduleId(reschedule.getDailySchedule().getId())
            .assessmentId(reschedule.getAssessment().getId())
            .studentId(reschedule.getStudent().getId())
            .teacherId(reschedule.getTeacher().getId())
            .originalWindowStart(reschedule.getOriginalWindowStart())
            .originalWindowEnd(reschedule.getOriginalWindowEnd())
            .originalGraceEnd(reschedule.getOriginalGraceEnd())
            .newWindowStart(reschedule.getNewWindowStart())
            .newWindowEnd(reschedule.getNewWindowEnd())
            .newGraceEnd(reschedule.getNewGraceEnd())
            .reason(reschedule.getReason())
            .rescheduledAt(reschedule.getRescheduledAt())
            .rescheduledByTeacherId(reschedule.getRescheduledByTeacherId())
            .isActive(reschedule.getIsActive())
            .cancelledAt(reschedule.getCancelledAt())
            .cancelledReason(reschedule.getCancelledReason())
            .timeDifference(reschedule.getTimeDifference())
            .isCurrentlyActive(reschedule.isCurrentlyActive())
            .isOneHourWindow(reschedule.isNewWindowOneHour());
        
        // Safely get student name
        if (reschedule.getStudent() != null && reschedule.getStudent().getUser() != null) {
            builder.studentName(reschedule.getStudent().getUser().getFullName());
        }
        
        // Safely get teacher name
        if (reschedule.getTeacher() != null && reschedule.getTeacher().getUser() != null) {
            builder.teacherName(reschedule.getTeacher().getUser().getFullName());
        }
        
        // Safely get subject/lesson info
        if (reschedule.getAssessment() != null) {
            if (reschedule.getAssessment().getSubject() != null) {
                builder.subjectName(reschedule.getAssessment().getSubject().getName());
            }
            if (reschedule.getAssessment().getLessonTopic() != null) {
                builder.lessonTitle(reschedule.getAssessment().getLessonTopic().getTitle());
            }
        }
        
        return builder.build();
    }
}