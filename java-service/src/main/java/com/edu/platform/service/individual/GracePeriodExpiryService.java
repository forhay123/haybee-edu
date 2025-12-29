package com.edu.platform.service.individual;

import com.edu.platform.event.NotificationEventPublisher;
import com.edu.platform.model.DailySchedule;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.model.User;
import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.DailyScheduleRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * ✅ SPRINT 5: Grace Period Expiry Service
 * Marks assessments as incomplete when grace period expires
 * 
 * Key Responsibilities:
 * - Find assessments past grace deadline
 * - Mark them as incomplete with reason "MISSED_GRACE_PERIOD"
 * - Update linked schedules
 * - Notify students and teachers
 * - Calculate completion percentages
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GracePeriodExpiryService {

    private final StudentLessonProgressRepository progressRepository;
    private final DailyScheduleRepository scheduleRepository;
    private final NotificationEventPublisher eventPublisher;

    /**
     * ✅ Process expired assessments (past grace deadline)
     * Called by scheduled task every 15 minutes
     * 
     * @return Number of assessments marked incomplete
     */
    @Transactional
    public int processExpiredAssessments() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime graceBuffer = now.minusMinutes(5); // 5-min grace tolerance
        
        log.info("⏰ Checking for expired assessments (grace deadline before: {})...", graceBuffer);

        // Find progress records that are past grace deadline
        // Grace deadline = assessmentWindowEnd + 5 minutes
        List<StudentLessonProgress> expiredList = progressRepository
                .findExpiredAssessments(graceBuffer);

        if (expiredList.isEmpty()) {
            log.debug("✅ No expired assessments found");
            return 0;
        }

        log.info("⚠️ Found {} expired assessments to process", expiredList.size());

        int processed = 0;

        for (StudentLessonProgress progress : expiredList) {
            try {
                processExpiredProgress(progress, now);
                processed++;
            } catch (Exception e) {
                log.error("❌ Failed to process expired progress {}: {}", 
                        progress.getId(), e.getMessage(), e);
                // Continue processing others
            }
        }

        log.info("✅ Processed {} expired assessments", processed);
        return processed;
    }

    /**
     * Process a single expired progress record
     */
    private void processExpiredProgress(StudentLessonProgress progress, LocalDateTime now) {
        log.info("❌ Marking as incomplete - Progress ID: {}, Student: {}, Subject: {}", 
                progress.getId(),
                progress.getStudentProfile().getId(),
                progress.getSubject() != null ? progress.getSubject().getName() : "N/A");

        // Mark as incomplete
        progress.setCompleted(false);
        progress.setIncompleteReason("MISSED_GRACE_PERIOD");
        progress.setAutoMarkedIncompleteAt(now);
        progress.setAssessmentAccessible(false); // Lock it
        progress = progressRepository.save(progress);

        // Update linked schedules and calculate completion percentage
        updateLinkedSchedules(progress);

        // Send notifications
        sendExpiryNotifications(progress);
    }

    /**
     * Update all linked schedules when one period expires
     */
    private void updateLinkedSchedules(StudentLessonProgress expiredProgress) {
        List<Long> linkedProgressIds = expiredProgress.getLinkedProgressIds(); // ✅ FIXED
        
        if (linkedProgressIds == null || linkedProgressIds.isEmpty()) {
            log.debug("No linked progress records for progress {}", expiredProgress.getId());
            return;
        }

        // Get all linked progress records (including this one)
        List<StudentLessonProgress> allLinkedProgress = progressRepository
                .findAllById(linkedProgressIds);
        allLinkedProgress.add(expiredProgress);

        // Calculate completion stats
        long totalPeriods = allLinkedProgress.size();
        long completedPeriods = allLinkedProgress.stream()
                .filter(StudentLessonProgress::isCompleted)
                .count();
        
        double completionPercentage = (completedPeriods * 100.0) / totalPeriods;
        boolean allCompleted = (completedPeriods == totalPeriods);

        log.debug("📊 Completion: {} of {} periods ({}%)", 
                completedPeriods, totalPeriods, completionPercentage);

        // Update all linked schedules
        if (expiredProgress.getSchedule() != null) {
            DailySchedule schedule = expiredProgress.getSchedule();
            List<Long> linkedScheduleIds = schedule.getLinkedScheduleIdsList(); // ✅ FIXED
            
            if (!linkedScheduleIds.isEmpty()) {
                linkedScheduleIds.add(schedule.getId()); // Add current schedule
                List<DailySchedule> linkedSchedules = scheduleRepository.findAllById(linkedScheduleIds);
                
                for (DailySchedule linkedSchedule : linkedSchedules) {
                    linkedSchedule.setTopicCompletionPercentage(completionPercentage);
                    linkedSchedule.setAllAssessmentsCompleted(allCompleted);
                    scheduleRepository.save(linkedSchedule);
                }
                
                log.debug("✅ Updated {} linked schedules", linkedSchedules.size());
            }
        }
    }

    /**
     * Send notifications about expired assessment
     */
    private void sendExpiryNotifications(StudentLessonProgress progress) {
        StudentProfile student = progress.getStudentProfile();
        Subject subject = progress.getSubject();
        String subjectName = subject != null ? subject.getName() : "Assessment";
        String topicName = progress.getLessonTopic() != null ? 
                progress.getLessonTopic().getTopicTitle() : "Lesson";

        // Notify student
        String studentTitle = "⏰ Assessment Window Closed";
        String studentMessage = String.format(
                "The %s assessment for '%s' has expired. " +
                "Deadline was %s. Period %d of %d is now marked as INCOMPLETE.",
                subjectName,
                topicName,
                progress.getAssessmentWindowEnd().toLocalTime(),
                progress.getPeriodSequence(),
                progress.getTotalPeriodsInSequence()
        );

        eventPublisher.publishAssessmentExpired(
                student.getUser().getId(),
                progress.getId(),
                studentTitle,
                studentMessage
        );

        log.debug("📧 Sent expiry notification to student {}", student.getUser().getId());

        // Notify teacher (if lesson topic has assessment with teacher)
        if (progress.getLessonTopic() != null && progress.getAssessment() != null) {
            Assessment assessment = progress.getAssessment();
            if (assessment.getCreatedBy() != null) {
                User teacher = assessment.getCreatedBy();
                String teacherTitle = "Student Missed Assessment";
                String teacherMessage = String.format(
                        "%s missed the %s assessment for '%s'. " +
                        "Period %d of %d expired at %s.",
                        student.getUser().getFullName(),
                        subjectName,
                        topicName,
                        progress.getPeriodSequence(),
                        progress.getTotalPeriodsInSequence(),
                        progress.getAssessmentWindowEnd().toLocalTime()
                );

                eventPublisher.publishStudentMissedAssessment(
                        teacher.getId(),
                        student.getId(),
                        progress.getId(),
                        teacherTitle,
                        teacherMessage
                );

                log.debug("📧 Sent missed assessment notification to teacher {}", teacher.getId());
            }
        }
    }

    /**
     * Manually expire a specific assessment (admin override)
     */
    @Transactional
    public void expireAssessmentManually(Long progressId, String reason) {
        StudentLessonProgress progress = progressRepository.findById(progressId)
                .orElseThrow(() -> new IllegalArgumentException("Progress not found: " + progressId));

        if (progress.isCompleted()) {
            throw new IllegalStateException("Cannot expire completed assessment");
        }

        log.info("🔧 Manually expiring progress {} - Reason: {}", progressId, reason);

        progress.setCompleted(false);
        progress.setIncompleteReason(reason);
        progress.setAutoMarkedIncompleteAt(LocalDateTime.now());
        progress.setAssessmentAccessible(false);
        progressRepository.save(progress);

        updateLinkedSchedules(progress);
        
        log.info("✅ Progress {} manually expired", progressId);
    }

    /**
     * Get count of expired assessments for reporting
     */
    @Transactional(readOnly = true)
    public long countExpiredAssessments(LocalDateTime since) {
        return progressRepository.countExpiredAssessmentsSince(since);
    }

    /**
     * Get expired assessments for a specific student
     */
    @Transactional(readOnly = true)
    public List<StudentLessonProgress> getExpiredAssessmentsForStudent(Long studentProfileId) {
        return progressRepository.findExpiredAssessmentsForStudent(studentProfileId);
    }
}