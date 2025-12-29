package com.edu.platform.dto.classdata;

import com.edu.platform.model.DailySchedule;
import lombok.Builder;

import java.time.format.DateTimeFormatter;

/**
 * DTO for daily lesson schedules with time window and assessment info
 */
@Builder
public record DailyScheduleDto(
        Long id,
        Long studentId,
        String studentName,
        Long subjectId,
        String subjectName,
        Long lessonTopicId,
        String lessonTitle,
        String scheduledDate,    // yyyy-MM-dd
        Integer periodNumber,
        Integer priority,        // 1-4
        Double weight,
        Boolean completed,       // ✅ NEW: Completion status
        String completedAt,      // ✅ NEW: When completed
        String createdAt,
        
        // ✅ NEW: Assessment fields
        Long assessmentId,
        String assessmentTitle,
        
        // ✅ NEW: Time window fields
        String lessonStartDatetime,      // ISO datetime
        String lessonEndDatetime,        // ISO datetime
        String graceEndDatetime,         // ISO datetime
        String assessmentWindowStart,    // ISO datetime
        String assessmentWindowEnd,      // ISO datetime
        
        // ✅ NEW: Incomplete tracking
        String markedIncompleteReason,
        
        // ✅ Schedule source
        String scheduleSource            // 'CLASS' or 'INDIVIDUAL'
) {
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    
    /**
     * Convert entity to DTO with all fields
     */
    public static DailyScheduleDto fromEntity(DailySchedule s) {
        return DailyScheduleDto.builder()
                .id(s.getId())
                .studentId(s.getStudentProfile() != null ? s.getStudentProfile().getId() : null)
                .studentName(s.getStudentProfile() != null && s.getStudentProfile().getUser() != null
                        ? s.getStudentProfile().getUser().getFullName()
                        : null)
                .subjectId(s.getSubject() != null ? s.getSubject().getId() : null)
                .subjectName(s.getSubject() != null ? s.getSubject().getName() : null)
                .lessonTopicId(s.getLessonTopic() != null ? s.getLessonTopic().getId() : null)
                .lessonTitle(s.getLessonTopic() != null ? s.getLessonTopic().getTopicTitle() : null)
                .scheduledDate(s.getScheduledDate() != null ? s.getScheduledDate().toString() : null)
                .periodNumber(s.getPeriodNumber())
                .priority(s.getPriority())
                .weight(s.getWeight())
                .completed(s.isCompleted())
                .completedAt(s.getCompletedAt() != null 
                        ? s.getCompletedAt().format(DATETIME_FORMATTER) 
                        : null)
                .createdAt(s.getCreatedAt() != null ? s.getCreatedAt().toString() : null)
                
                // ✅ NEW: Assessment info
                .assessmentId(s.getAssessment() != null ? s.getAssessment().getId() : null)
                .assessmentTitle(s.getAssessment() != null ? s.getAssessment().getTitle() : null)
                
                // ✅ NEW: Time windows
                .lessonStartDatetime(s.getLessonStartDatetime() != null
                        ? s.getLessonStartDatetime().format(DATETIME_FORMATTER)
                        : null)
                .lessonEndDatetime(s.getLessonEndDatetime() != null
                        ? s.getLessonEndDatetime().format(DATETIME_FORMATTER)
                        : null)
                .graceEndDatetime(s.getGraceEndDatetime() != null
                        ? s.getGraceEndDatetime().format(DATETIME_FORMATTER)
                        : null)
                .assessmentWindowStart(s.getAssessmentWindowStart() != null
                        ? s.getAssessmentWindowStart().format(DATETIME_FORMATTER)
                        : null)
                .assessmentWindowEnd(s.getAssessmentWindowEnd() != null
                        ? s.getAssessmentWindowEnd().format(DATETIME_FORMATTER)
                        : null)
                
                // ✅ NEW: Incomplete tracking
                .markedIncompleteReason(s.getMarkedIncompleteReason())
                
                // ✅ Schedule source
                .scheduleSource(s.getScheduleSource())
                
                .build();
    }
    
    /**
     * ✅ NEW: Check if this is a CLASS schedule
     */
    public boolean isClassSchedule() {
        return "CLASS".equals(scheduleSource);
    }
    
    /**
     * ✅ NEW: Check if this is an INDIVIDUAL schedule
     */
    public boolean isIndividualSchedule() {
        return "INDIVIDUAL".equals(scheduleSource);
    }
    
    /**
     * ✅ NEW: Check if marked incomplete
     */
    public boolean isMarkedIncomplete() {
        return !completed && markedIncompleteReason != null;
    }
}