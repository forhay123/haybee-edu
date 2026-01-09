package com.edu.platform.dto.progress;

import com.edu.platform.model.progress.StudentLessonProgress;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.format.DateTimeFormatter;

/**
 * ✅ Comprehensive DTO for lesson tracking
 * Shows scheduled, missed, completed, and in-progress lessons with full context
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComprehensiveLessonDto {
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    
    // ============================================================
    // LESSON IDENTITY
    // ============================================================
    private Long progressId;
    private Long lessonTopicId;
    private String lessonTopicTitle;
    private Long subjectId;              // ✅ NEW: Added for filtering
    private String subjectName;
    private String subjectCode;
    private Integer periodNumber;
    
    // ============================================================
    // STUDENT INFO (for teacher/admin views)
    // ============================================================
    private Long studentId;              // ✅ NEW: Added for teacher/admin
    private String studentName;          // ✅ NEW: Added for teacher/admin
    
    // ============================================================
    // SCHEDULED INFO
    // ============================================================
    private String scheduledDate;        // yyyy-MM-dd
    private String scheduledDateDisplay; // Human-readable format
    private String dayOfWeek;            // ✅ NEW: Added for frontend
    
    // ============================================================
    // STATUS FIELDS (Core tracking)
    // ============================================================
    /**
     * Status enum: SCHEDULED | IN_PROGRESS | COMPLETED | MISSED
     */
    private String status;
    private Boolean completed;
    private String completedAt;        // ISO datetime
    private String completionTimeAgo;  // "2 hours ago", "3 days ago"
    
    // ============================================================
    // INCOMPLETE/MISSED INFO
    // ============================================================
    private String incompleteReason;   // MISSED_GRACE_PERIOD, LATE_SUBMISSION, NO_SUBMISSION
    private String autoMarkedIncompleteAt;
    private Boolean canRetake;
    private Boolean canStillComplete;  // ✅ NEW: Added for frontend
    
    // ============================================================
    // ASSESSMENT TRACKING
    // ============================================================
    private Long assessmentId;
    private String assessmentTitle;
    private Long submissionId;
    private Boolean assessmentSubmitted;
    private Boolean assessmentPassed;
    private Double assessmentScore;
    private Integer assessmentTotalMarks;
    private Boolean hasActiveAssessment;    // ✅ NEW: Added for frontend
    private Boolean assessmentOverdue;      // ✅ NEW: Added for frontend
    
    // ============================================================
    // TIME WINDOWS
    // ============================================================
    private String assessmentWindowStart;  // ISO datetime
    private String assessmentWindowEnd;    // ISO datetime
    private Boolean withinGracePeriod;
    private String gracePeriodExpiresIn;  // "2 days", "Expired"
    
    // ============================================================
    // METADATA
    // ============================================================
    private Integer priority;             // 1-4 scale
    private Double weight;                // Weight multiplier
    private String daysUntilDue;         // "-3 days" (overdue), "2 days"
    private Integer daysSinceScheduled;  // ✅ NEW: Added for frontend
    private Boolean isOverdue;           // ✅ NEW: Added for frontend
    private Boolean requiresImmediateAction; // ✅ NEW: Added for frontend
    
    /**
     * ✅ Convert entity to DTO with computed status
     */
    public static ComprehensiveLessonDto fromEntity(StudentLessonProgress progress) {
        return fromEntity(progress, null);
    }
    
    /**
     * ✅ Convert entity with optional assessment info
     */
    public static ComprehensiveLessonDto fromEntity(StudentLessonProgress progress, String status) {
        var lessonTopic = progress.getLessonTopic();
        var subject = progress.getSubject();
        if (subject == null && lessonTopic != null) {
            subject = lessonTopic.getSubject();
        }
        
        var assessment = progress.getAssessment();
        
        // ✅ Compute status if not provided
        if (status == null) {
            status = computeStatus(progress);
        }
        
        String scheduledDate = progress.getScheduledDate() != null
                ? progress.getScheduledDate().format(DATE_FORMATTER)
                : null;
        
        String completedAt = progress.getCompletedAt() != null
                ? progress.getCompletedAt().format(DATETIME_FORMATTER)
                : null;
        
        String assessmentWindowStart = progress.getAssessmentWindowStart() != null
                ? progress.getAssessmentWindowStart().format(DATETIME_FORMATTER)
                : null;
        
        String assessmentWindowEnd = progress.getAssessmentWindowEnd() != null
                ? progress.getAssessmentWindowEnd().format(DATETIME_FORMATTER)
                : null;
        
        String autoMarkedIncompleteAt = progress.getAutoMarkedIncompleteAt() != null
                ? progress.getAutoMarkedIncompleteAt().format(DATETIME_FORMATTER)
                : null;
        
        // Calculate days since scheduled
        int daysSinceScheduled = 0;
        if (progress.getScheduledDate() != null) {
            daysSinceScheduled = (int) java.time.temporal.ChronoUnit.DAYS.between(
                progress.getScheduledDate(), 
                java.time.LocalDate.now()
            );
        }
        
        // Check if overdue
        boolean isOverdue = daysSinceScheduled > 0 && !progress.isCompleted();
        
        // Check if requires immediate action
        boolean requiresImmediateAction = "MISSED".equals(status) || 
                (isOverdue && daysSinceScheduled > 3);
        
        // Get day of week
        String dayOfWeek = progress.getScheduledDate() != null
                ? progress.getScheduledDate().getDayOfWeek().toString()
                : null;
        
        return ComprehensiveLessonDto.builder()
                // Identity
                .progressId(progress.getId())
                .lessonTopicId(lessonTopic != null ? lessonTopic.getId() : null)
                .lessonTopicTitle(lessonTopic != null ? lessonTopic.getTopicTitle() : "Unknown")
                .subjectId(subject != null ? subject.getId() : null)
                .subjectName(subject != null ? subject.getName() : "Unknown")
                .subjectCode(subject != null ? subject.getCode() : null)
                .periodNumber(progress.getPeriodNumber())
                
                // Student info (will be set later for teacher/admin views)
                .studentId(null)
                .studentName(null)
                
                // Scheduled info
                .scheduledDate(scheduledDate)
                .scheduledDateDisplay(formatDateHumanReadable(progress.getScheduledDate()))
                .dayOfWeek(dayOfWeek)
                
                // Status
                .status(status)
                .completed(progress.isCompleted())
                .completedAt(completedAt)
                .completionTimeAgo(formatTimeAgo(progress.getCompletedAt()))
                
                // Incomplete info
                .incompleteReason(progress.getIncompleteReason())
                .autoMarkedIncompleteAt(autoMarkedIncompleteAt)
                .canRetake(canRetakeLesson(progress))
                .canStillComplete(canStillComplete(progress))
                
                // Assessment
                .assessmentId(assessment != null ? assessment.getId() : null)
                .assessmentTitle(assessment != null ? assessment.getTitle() : null)
                .submissionId(progress.getAssessmentSubmissionId())
                .assessmentSubmitted(progress.getAssessmentSubmissionId() != null)
                .hasActiveAssessment(assessment != null)
                .assessmentOverdue(isAssessmentOverdue(progress))
                .assessmentWindowStart(assessmentWindowStart)
                .assessmentWindowEnd(assessmentWindowEnd)
                .withinGracePeriod(isWithinGracePeriod(progress))
                .gracePeriodExpiresIn(formatGracePeriodTime(progress))
                
                // Metadata
                .priority(progress.getPriority())
                .weight(progress.getWeight())
                .daysUntilDue(formatDaysUntilDue(progress.getScheduledDate()))
                .daysSinceScheduled(daysSinceScheduled)
                .isOverdue(isOverdue)
                .requiresImmediateAction(requiresImmediateAction)
                
                .build();
    }
    
    /**
     * ✅ FIXED: Compute lesson status from progress entity
     * Status logic:
     * 1. COMPLETED - Lesson is marked as completed
     * 2. MISSED - Grace period has expired OR has incomplete reason
     * 3. IN_PROGRESS - Assessment window has started but grace period not expired
     * 4. SCHEDULED - Assessment window hasn't started yet
     */
    private static String computeStatus(StudentLessonProgress progress) {
        var now = java.time.LocalDateTime.now();
        
        // 1. If completed
        if (progress.isCompleted()) {
            return "COMPLETED";
        }
        
        // 2. If has incomplete reason or grace period expired → MISSED
        if (progress.getIncompleteReason() != null) {
            return "MISSED";
        }
        
        if (progress.getGracePeriodEnd() != null && 
            progress.getGracePeriodEnd().isBefore(now)) {
            return "MISSED";
        }
        
        // 3. If assessment window has STARTED (but grace period not expired) → IN_PROGRESS
        if (progress.getAssessmentWindowStart() != null && 
            now.isAfter(progress.getAssessmentWindowStart()) &&
            (progress.getGracePeriodEnd() == null || now.isBefore(progress.getGracePeriodEnd()))) {
            return "IN_PROGRESS";
        }
        
        // 4. If scheduled date is today or in the future → SCHEDULED
        if (progress.getScheduledDate() != null &&
            !progress.getScheduledDate().isBefore(java.time.LocalDate.now())) {
            return "SCHEDULED";
        }
        
        // 5. Fallback for old uncompleted lessons → MISSED
        return "MISSED";
    }
    
    /**
     * ✅ Check if lesson can be retaken
     */
    private static Boolean canRetakeLesson(StudentLessonProgress progress) {
        if (progress.getIncompleteReason() == null) {
            return false;
        }
        
        return progress.getAssessmentWindowEnd() != null &&
               progress.getAssessmentWindowEnd().isAfter(java.time.LocalDateTime.now());
    }
    
    /**
     * ✅ Check if lesson can still be completed
     */
    private static Boolean canStillComplete(StudentLessonProgress progress) {
        if (progress.isCompleted()) {
            return false;
        }
        
        return progress.getAssessmentWindowEnd() == null ||
               progress.getAssessmentWindowEnd().isAfter(java.time.LocalDateTime.now());
    }
    
    /**
     * ✅ Check if assessment is overdue
     */
    private static Boolean isAssessmentOverdue(StudentLessonProgress progress) {
        if (progress.getAssessment() == null) {
            return false;
        }
        
        return progress.getAssessmentWindowEnd() != null &&
               progress.getAssessmentWindowEnd().isBefore(java.time.LocalDateTime.now()) &&
               !progress.isCompleted();
    }
    
    /**
     * ✅ Check if within grace period
     */
    private static Boolean isWithinGracePeriod(StudentLessonProgress progress) {
        return progress.getAssessmentWindowEnd() != null &&
               progress.getAssessmentWindowEnd().isAfter(java.time.LocalDateTime.now());
    }
    
    /**
     * ✅ Format grace period expiration
     */
    private static String formatGracePeriodTime(StudentLessonProgress progress) {
        if (progress.getAssessmentWindowEnd() == null) {
            return null;
        }
        
        var now = java.time.LocalDateTime.now();
        if (progress.getAssessmentWindowEnd().isBefore(now)) {
            return "Expired";
        }
        
        var duration = java.time.temporal.ChronoUnit.HOURS.between(now, progress.getAssessmentWindowEnd());
        if (duration > 24) {
            var days = duration / 24;
            return days + " day" + (days > 1 ? "s" : "");
        }
        return duration + " hour" + (duration > 1 ? "s" : "");
    }
    
    /**
     * ✅ Format days until due
     */
    private static String formatDaysUntilDue(java.time.LocalDate scheduledDate) {
        if (scheduledDate == null) return null;
        
        long days = java.time.temporal.ChronoUnit.DAYS.between(java.time.LocalDate.now(), scheduledDate);
        if (days < 0) {
            return Math.abs(days) + " day" + (Math.abs(days) > 1 ? "s" : "") + " ago";
        } else if (days == 0) {
            return "Today";
        } else {
            return "In " + days + " day" + (days > 1 ? "s" : "");
        }
    }
    
    /**
     * ✅ Format time ago
     */
    private static String formatTimeAgo(java.time.LocalDateTime dateTime) {
        if (dateTime == null) return null;
        
        var now = java.time.LocalDateTime.now();
        var minutes = java.time.temporal.ChronoUnit.MINUTES.between(dateTime, now);
        
        if (minutes < 1) return "Just now";
        if (minutes < 60) return minutes + " minute" + (minutes > 1 ? "s" : "") + " ago";
        
        var hours = java.time.temporal.ChronoUnit.HOURS.between(dateTime, now);
        if (hours < 24) return hours + " hour" + (hours > 1 ? "s" : "") + " ago";
        
        var days = java.time.temporal.ChronoUnit.DAYS.between(dateTime, now);
        return days + " day" + (days > 1 ? "s" : "") + " ago";
    }
    
    /**
     * ✅ Format date human-readable
     */
    private static String formatDateHumanReadable(java.time.LocalDate date) {
        if (date == null) return null;
        
        var today = java.time.LocalDate.now();
        var tomorrow = today.plusDays(1);
        var yesterday = today.minusDays(1);
        
        if (date.equals(today)) return "Today";
        if (date.equals(tomorrow)) return "Tomorrow";
        if (date.equals(yesterday)) return "Yesterday";
        
        return date.format(DateTimeFormatter.ofPattern("MMMM d, yyyy"));
    }
}