package com.edu.platform.dto.progress;

import com.edu.platform.model.progress.StudentLessonProgress;
import lombok.Builder;

import java.time.format.DateTimeFormatter;

/**
 * DTO for student lesson progress with time window and assessment info
 */
@Builder
public record LessonProgressDto(
        Long id,
        Long studentProfileId,
        Long lessonId,         // lessonTopic ID
        String lessonTitle,    // lessonTopic title
        Long subjectId,        // subject ID
        String subjectName,    // subject name
        String subjectCode,    // subject code
        String topicName,      // lessonTopic title (duplicate for compatibility)
        String scheduledDate,  // yyyy-MM-dd
        String dayOfWeek,      // e.g., "MONDAY"
        Integer periodNumber,
        String startTime,      // HH:mm:ss
        String endTime,        // HH:mm:ss
        Boolean completed,
        String completedAt,    // ISO datetime
        Integer priority,      // 1-4
        Double weight,         // Weight multiplier
        
        // ✅ Assessment fields
        Long assessmentId,
        String assessmentTitle,
        Boolean assessmentAccessible,
        String assessmentWindowStart,  // ISO datetime
        String assessmentWindowEnd,    // ISO datetime
        String gracePeriodEnd,         // ISO datetime (calculated)
        Long assessmentInstanceId,
        
        // ✅ Schedule reference
        Long scheduleId,
        
        // ✅ Incomplete tracking
        String incompleteReason,       // 'MISSED_GRACE_PERIOD', 'LATE_SUBMISSION', 'NO_SUBMISSION'
        String autoMarkedIncompleteAt  // ISO datetime
) {
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss");
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    
    /**
     * Convert entity to DTO with all fields
     */
    public static LessonProgressDto fromEntity(StudentLessonProgress progress) {
        var lessonTopic = progress.getLessonTopic();
        
        // ✅ Use direct subject field first, fallback to lessonTopic.subject
        var subject = progress.getSubject();
        if (subject == null && lessonTopic != null) {
            subject = lessonTopic.getSubject();
        }
        
        var assessment = progress.getAssessment();
        var schedule = progress.getSchedule();
        
        // ✅ Calculate grace period - your DB already stores it as assessmentWindowEnd
        // No need to add 30 minutes since it's already included
        String gracePeriodEnd = null;
        if (progress.getAssessmentWindowEnd() != null) {
            gracePeriodEnd = progress.getAssessmentWindowEnd()
                    .format(DATETIME_FORMATTER);
        }
        
        return LessonProgressDto.builder()
                .id(progress.getId())
                .studentProfileId(progress.getStudentProfile() != null 
                        ? progress.getStudentProfile().getId() : null)
                .lessonId(lessonTopic != null ? lessonTopic.getId() : null)
                .lessonTitle(lessonTopic != null ? lessonTopic.getTopicTitle() : "Unknown")
                .subjectId(subject != null ? subject.getId() : null)
                .subjectName(subject != null ? subject.getName() : "Unknown")
                .subjectCode(subject != null ? subject.getCode() : "N/A")
                .topicName(lessonTopic != null ? lessonTopic.getTopicTitle() : "Unknown")
                .scheduledDate(progress.getScheduledDate() != null
                        ? progress.getScheduledDate().format(DATE_FORMATTER)
                        : null)
                .dayOfWeek(schedule != null ? schedule.getDayOfWeek() : null)
                .periodNumber(progress.getPeriodNumber())
                .startTime(schedule != null && schedule.getStartTime() != null
                        ? schedule.getStartTime().format(TIME_FORMATTER)
                        : null)
                .endTime(schedule != null && schedule.getEndTime() != null
                        ? schedule.getEndTime().format(TIME_FORMATTER)
                        : null)
                .completed(progress.isCompleted())
                .completedAt(progress.getCompletedAt() != null
                        ? progress.getCompletedAt().format(DATETIME_FORMATTER)
                        : null)
                .priority(progress.getPriority())
                .weight(progress.getWeight())
                
                // ✅ Assessment info
                .assessmentId(assessment != null ? assessment.getId() : null)
                .assessmentTitle(assessment != null ? assessment.getTitle() : null)
                .assessmentAccessible(progress.getAssessmentAccessible())
                .assessmentWindowStart(progress.getAssessmentWindowStart() != null
                        ? progress.getAssessmentWindowStart().format(DATETIME_FORMATTER)
                        : null)
                .assessmentWindowEnd(progress.getAssessmentWindowEnd() != null
                        ? progress.getAssessmentWindowEnd().format(DATETIME_FORMATTER)
                        : null)
                .gracePeriodEnd(gracePeriodEnd)
                .assessmentInstanceId(progress.getAssessmentInstanceId())
                
                // ✅ Schedule reference
                .scheduleId(schedule != null ? schedule.getId() : null)
                
                // ✅ Incomplete tracking
                .incompleteReason(progress.getIncompleteReason())
                .autoMarkedIncompleteAt(progress.getAutoMarkedIncompleteAt() != null
                        ? progress.getAutoMarkedIncompleteAt().format(DATETIME_FORMATTER)
                        : null)
                
                .build();
    }
    
    /**
     * ✅ Check if lesson is incomplete and has a reason
     */
    public boolean isIncomplete() {
        return !completed && incompleteReason != null;
    }
    
    /**
     * ✅ Check if assessment is currently accessible
     */
    public boolean canAccessAssessment() {
        return assessmentAccessible != null && assessmentAccessible;
    }
    
    /**
     * ✅ Check if lesson was auto-marked incomplete
     */
    public boolean wasAutoMarkedIncomplete() {
        return autoMarkedIncompleteAt != null;
    }
}