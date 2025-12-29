package com.edu.platform.service.individual;

import com.edu.platform.event.NotificationEventPublisher;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import com.edu.platform.service.individual.AssessmentWindowCalculator.AssessmentWindow;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * ✅ SPRINT 5: Assessment Accessibility Service
 * Manages when assessments become available to students
 * 
 * Key Responsibilities:
 * - Mark assessments as accessible when window opens
 * - Send notifications when assessments become available
 * - Track assessment availability status
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AssessmentAccessibilityService {

    private final StudentLessonProgressRepository progressRepository;
    private final AssessmentWindowCalculator windowCalculator;
    private final NotificationEventPublisher eventPublisher;

    /**
     * ✅ Open assessments that have reached their window start time
     * Called by scheduled task every 10 minutes
     * 
     * @return Number of assessments opened
     */
    @Transactional
    public int openAvailableAssessments() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime tomorrow = now.plusDays(1);
        
        log.info("🔓 Checking for assessments to open...");

        // Find progress records that should become accessible
        List<StudentLessonProgress> progressList = progressRepository
                .findByAssessmentAccessibleFalseAndAssessmentWindowStartBeforeAndScheduledDateBetween(
                        now, 
                        now.toLocalDate(), 
                        tomorrow.toLocalDate()
                );

        if (progressList.isEmpty()) {
            log.debug("✅ No assessments need to be opened");
            return 0;
        }

        int opened = 0;

        for (StudentLessonProgress progress : progressList) {
            // Double-check window validity
            if (progress.getAssessmentWindowEnd() != null && 
                now.isAfter(progress.getAssessmentWindowEnd())) {
                // Window already expired, don't open
                log.warn("⚠️ Skipping expired assessment: Progress ID {}", progress.getId());
                continue;
            }

            // Check if not already completed or incomplete
            if (progress.isCompleted() || progress.getIncompleteReason() != null) {
                log.debug("⏭️ Skipping already processed progress ID {}", progress.getId());
                continue;
            }

            // Mark as accessible
            progress.setAssessmentAccessible(true);
            progressRepository.save(progress);
            opened++;

            log.info("✅ Opened assessment - Progress ID: {}, Student: {}, Subject: {}, Period: {} of {}", 
                    progress.getId(),
                    progress.getStudentProfile().getId(),
                    progress.getSubject() != null ? progress.getSubject().getName() : "N/A",
                    progress.getPeriodSequence(),
                    progress.getTotalPeriodsInSequence());

            // Send notification to student
            try {
                sendAssessmentAvailableNotification(progress);
            } catch (Exception e) {
                log.error("❌ Failed to send notification for progress {}: {}", 
                        progress.getId(), e.getMessage());
                // Don't fail the entire operation if notification fails
            }
        }

        log.info("🎉 Opened {} assessments", opened);
        return opened;
    }

    /**
     * ✅ Send notification when assessment becomes available
     */
    private void sendAssessmentAvailableNotification(StudentLessonProgress progress) {
        StudentProfile student = progress.getStudentProfile();
        String subjectName = progress.getSubject() != null ? progress.getSubject().getName() : "Assessment";
        String topicName = progress.getLessonTopic() != null ? 
                progress.getLessonTopic().getTopicTitle() : "Lesson";

        // Calculate time remaining
        AssessmentWindow window = new AssessmentWindow(
                progress.getAssessmentWindowStart(),
                progress.getAssessmentWindowEnd(),
                progress.getAssessmentWindowEnd().plusMinutes(5) // grace period
        );
        long minutesRemaining = windowCalculator.getMinutesRemaining(window);
        long hoursRemaining = minutesRemaining / 60;

        String timeRemaining = hoursRemaining > 0 ? 
                hoursRemaining + " hours" : minutesRemaining + " minutes";

        String title = "📚 " + subjectName + " Assessment Available!";
        String message = String.format(
                "%s assessment is now open. Time remaining: %s. " +
                "Deadline: %s (strict). Period %d of %d.",
                topicName,
                timeRemaining,
                progress.getAssessmentWindowEnd().toLocalTime(),
                progress.getPeriodSequence(),
                progress.getTotalPeriodsInSequence()
        );

        eventPublisher.publishAssessmentAvailable(
                student.getUser().getId(),
                progress.getId(),
                title,
                message,
                progress.getAssessmentWindowEnd()
        );

        log.debug("📧 Sent availability notification to user {}", student.getUser().getId());
    }

    /**
     * Check if assessment is currently accessible
     */
    @Transactional(readOnly = true)
    public boolean isAssessmentAccessible(Long progressId) {
        return progressRepository.findById(progressId)
                .map(progress -> {
                    if (!progress.isAssessmentAccessible()) {
                        return false;
                    }
                    
                    // Double-check time window
                    LocalDateTime now = LocalDateTime.now();
                    return !now.isBefore(progress.getAssessmentWindowStart()) &&
                           !now.isAfter(progress.getAssessmentWindowEnd());
                })
                .orElse(false);
    }

    /**
     * Get accessibility status for a progress record
     */
    @Transactional(readOnly = true)
    public AccessibilityStatus getAccessibilityStatus(Long progressId) {
        return progressRepository.findById(progressId)
                .map(progress -> {
                    LocalDateTime now = LocalDateTime.now();
                    
                    if (progress.isCompleted()) {
                        return AccessibilityStatus.COMPLETED;
                    }
                    
                    if (progress.getIncompleteReason() != null) {
                        return AccessibilityStatus.EXPIRED;
                    }
                    
                    if (now.isBefore(progress.getAssessmentWindowStart())) {
                        return AccessibilityStatus.NOT_YET_AVAILABLE;
                    }
                    
                    if (now.isAfter(progress.getAssessmentWindowEnd())) {
                        return AccessibilityStatus.EXPIRED;
                    }
                    
                    if (progress.isAssessmentAccessible()) {
                        return AccessibilityStatus.AVAILABLE;
                    }
                    
                    return AccessibilityStatus.PENDING_ACTIVATION;
                })
                .orElse(AccessibilityStatus.NOT_FOUND);
    }

    /**
     * Accessibility status enum
     */
    public enum AccessibilityStatus {
        NOT_FOUND,
        NOT_YET_AVAILABLE,
        PENDING_ACTIVATION,
        AVAILABLE,
        COMPLETED,
        EXPIRED
    }
}