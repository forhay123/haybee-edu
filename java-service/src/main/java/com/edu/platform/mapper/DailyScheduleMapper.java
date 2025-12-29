package com.edu.platform.mapper;

import com.edu.platform.dto.individual.IndividualDailyScheduleDto;
import com.edu.platform.model.DailySchedule;
import com.edu.platform.model.progress.StudentLessonProgress;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Mapper for DailySchedule to IndividualDailyScheduleDto
 * ✅ UPDATED: Now includes assessmentSubmissionId, incompleteReason, and assessmentScore
 */
@Component
public class DailyScheduleMapper {

    private static final int GRACE_PERIOD_HOURS = 2;

    /**
     * ✅ PREFERRED: Map schedule with progress data
     * This includes completion information from StudentLessonProgress
     */
    public IndividualDailyScheduleDto toDto(DailySchedule schedule, StudentLessonProgress progress) {
        if (schedule == null) {
            return null;
        }

        IndividualDailyScheduleDto dto = IndividualDailyScheduleDto.builder()
            .id(schedule.getId())
            .studentProfileId(schedule.getStudentProfile().getId())
            .scheduledDate(schedule.getScheduledDate())
            .dayOfWeek(schedule.getDayOfWeek())
            .periodNumber(schedule.getPeriodNumber())
            .startTime(schedule.getStartTime() != null ? schedule.getStartTime().toString() : null)
            .endTime(schedule.getEndTime() != null ? schedule.getEndTime().toString() : null)
            .subjectId(schedule.getSubject() != null ? schedule.getSubject().getId() : null)
            .subjectName(schedule.getSubject() != null ? schedule.getSubject().getName() : null)
            .subjectCode(schedule.getSubject() != null ? schedule.getSubject().getCode() : null)
            .completed(schedule.isCompleted())
            .scheduleSource(schedule.getScheduleSource())
            .individualTimetableId(schedule.getIndividualTimetableId())
            .lessonContentAccessible(schedule.getLessonContentAccessible())
            .build();

        // Add lesson topic if available
        if (schedule.getLessonTopic() != null) {
            dto.setLessonTopicId(schedule.getLessonTopic().getId());
            dto.setLessonTopicTitle(schedule.getLessonTopic().getTitle());
        }

        // ✅ ADD PROGRESS DATA IF AVAILABLE
        if (progress != null) {
            dto.setProgressId(progress.getId());
            dto.setCompletedAt(progress.getCompletedAt());
            dto.setAssessmentWindowStart(progress.getAssessmentWindowStart());
            dto.setAssessmentWindowEnd(progress.getAssessmentWindowEnd());
            dto.setGracePeriodEnd(progress.getGracePeriodEnd());
            dto.setAssessmentAccessible(progress.isAssessmentAccessible());
            
            // ✅ NEW FIELDS - Critical for frontend to distinguish COMPLETED from MISSED
            dto.setAssessmentSubmissionId(progress.getAssessmentSubmissionId());
            dto.setIncompleteReason(progress.getIncompleteReason());
            dto.setAssessmentScore(progress.getAssessmentScore());
            
            // ✅ IMPROVED STATUS CALCULATION
            // Priority 1: Check incomplete_reason
            if (progress.getIncompleteReason() != null && !progress.getIncompleteReason().isEmpty()) {
                dto.setStatus("MISSED");
                dto.setCompleted(true); // Marked as processed
            }
            // Priority 2: Check if truly completed (has submission)
            else if (progress.getCompletedAt() != null && progress.getAssessmentSubmissionId() != null) {
                dto.setStatus("COMPLETED");
                dto.setCompleted(true);
            }
            // Priority 3: If completed but NO submission = MISSED
            else if (progress.getCompletedAt() != null && progress.getAssessmentSubmissionId() == null) {
                dto.setStatus("MISSED");
                dto.setCompleted(true);
            }
            // Priority 4: Time-based calculation
            else {
                dto.setStatus(calculateTimeBasedStatus(progress));
                dto.setCompleted(false);
            }
        } else {
            // ✅ Fallback: Calculate assessment windows from schedule times
            if (schedule.getStartTime() != null && schedule.getEndTime() != null) {
                LocalDateTime assessmentStart = LocalDateTime.of(
                    schedule.getScheduledDate(), 
                    schedule.getStartTime()
                );
                LocalDateTime assessmentEnd = LocalDateTime.of(
                    schedule.getScheduledDate(), 
                    schedule.getEndTime()
                );
                LocalDateTime graceEnd = assessmentEnd.plusHours(GRACE_PERIOD_HOURS);
                
                dto.setAssessmentWindowStart(assessmentStart);
                dto.setAssessmentWindowEnd(assessmentEnd);
                dto.setGracePeriodEnd(graceEnd);
            }
            
            dto.setAssessmentAccessible(calculateAssessmentAccessibility(schedule));
            dto.setStatus(schedule.isCompleted() ? "COMPLETED" : "SCHEDULED");
        }

        return dto;
    }

    /**
     * ✅ LEGACY: Map without progress data (backward compatibility)
     * Use the method above with progress data when possible
     */
    public IndividualDailyScheduleDto toDto(DailySchedule schedule) {
        return toDto(schedule, null);
    }

    /**
     * ✅ NEW: Calculate time-based status for progress without completion
     */
    private String calculateTimeBasedStatus(StudentLessonProgress progress) {
        LocalDateTime now = LocalDateTime.now();
        
        if (progress.getAssessmentWindowEnd() != null) {
            LocalDateTime windowEnd = progress.getGracePeriodEnd() != null 
                ? progress.getGracePeriodEnd() 
                : progress.getAssessmentWindowEnd();
            
            // Grace period passed - MISSED
            if (now.isAfter(windowEnd)) {
                return "MISSED";
            }
            
            // Within assessment window - AVAILABLE
            if (progress.getAssessmentWindowStart() != null && 
                now.isAfter(progress.getAssessmentWindowStart()) && 
                now.isBefore(windowEnd)) {
                return "AVAILABLE";
            }
            
            // Before window - PENDING
            if (progress.getAssessmentWindowStart() != null && 
                now.isBefore(progress.getAssessmentWindowStart())) {
                return "PENDING";
            }
        }
        
        return "SCHEDULED";
    }

    /**
     * Calculate if assessment is accessible based on current time
     * (Used only when no progress data is available)
     */
    private Boolean calculateAssessmentAccessibility(DailySchedule schedule) {
        if (schedule.getScheduledDate() == null || 
            schedule.getStartTime() == null || 
            schedule.getEndTime() == null) {
            return false;
        }

        try {
            LocalDateTime now = LocalDateTime.now();
            
            LocalDateTime windowStart = LocalDateTime.of(
                schedule.getScheduledDate(),
                schedule.getStartTime()
            );
            
            LocalDateTime windowEnd = LocalDateTime.of(
                schedule.getScheduledDate(),
                schedule.getEndTime()
            );
            
            LocalDateTime graceEnd = windowEnd.plusHours(GRACE_PERIOD_HOURS);
            
            // Assessment is accessible if current time is within window + grace period
            return !now.isBefore(windowStart) && !now.isAfter(graceEnd);
            
        } catch (Exception e) {
            System.err.println("Failed to calculate assessment accessibility for schedule " +
                schedule.getId() + ": " + e.getMessage());
            return false;
        }
    }
}