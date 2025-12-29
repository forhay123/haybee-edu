package com.edu.platform.service.progress;

import com.edu.platform.model.DailySchedule;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.DailyScheduleRepository;
import com.edu.platform.repository.assessment.AssessmentSubmissionRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Phase 2.8: Auto-Mark Incomplete Service
 * Automatically marks lessons as incomplete after grace period expires
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class IncompleteLessonService {
    
    private final StudentLessonProgressRepository progressRepository;
    private final DailyScheduleRepository dailyScheduleRepository;
    private final AssessmentSubmissionRepository submissionRepository;
    
    private static final String INCOMPLETE_REASON_MISSED_GRACE = "MISSED_GRACE_PERIOD";
    private static final String INCOMPLETE_REASON_NO_SUBMISSION = "NO_SUBMISSION";
    
    /**
     * Auto-mark lessons as incomplete after grace period
     * Runs every 5 minutes
     */
    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    public void markIncompleteAfterGracePeriod() {
        LocalDateTime now = LocalDateTime.now();
        
        log.info("🔍 Checking for expired grace periods at {}", now);
        
        // Find all progress records where grace period has ended and not yet marked
        List<StudentLessonProgress> expiredProgress = progressRepository
            .findByCompletedFalseAndAssessmentWindowEndBeforeAndIncompleteReasonIsNull(now);
        
        if (expiredProgress.isEmpty()) {
            log.debug("No lessons with expired grace periods found");
            return;
        }
        
        log.info("Found {} lessons with expired grace periods", expiredProgress.size());
        
        int markedIncomplete = 0;
        
        for (StudentLessonProgress progress : expiredProgress) {
            try {
                // Check if assessment was submitted
                boolean submitted = false;
                if (progress.getAssessment() != null) {
                    submitted = submissionRepository.existsByAssessmentIdAndStudentId(
                        progress.getAssessment().getId(),
                        progress.getStudentProfile().getId()
                    );
                }
                
                if (!submitted) {
                    // Mark progress as incomplete using helper method
                    progress.markIncomplete(INCOMPLETE_REASON_MISSED_GRACE);
                    progressRepository.save(progress);
                    
                    // Update daily schedule
                    updateDailyScheduleAsIncomplete(progress, now);
                    
                    markedIncomplete++;
                    
                    log.info("⚠️ Auto-marked incomplete: Student {}, Lesson '{}', Date {}",
                             progress.getStudentProfile().getId(),
                             progress.getLessonTopic().getTopicTitle(),
                             progress.getScheduledDate());
                }
            } catch (Exception e) {
                log.error("Error marking progress {} as incomplete: {}",
                          progress.getId(), e.getMessage(), e);
            }
        }
        
        log.info("✅ Marked {} lessons as incomplete", markedIncomplete);
    }
    
    /**
     * Update daily schedule to reflect incomplete status
     */
    private void updateDailyScheduleAsIncomplete(StudentLessonProgress progress, LocalDateTime now) {
        dailyScheduleRepository
            .findByStudentProfileAndScheduledDateAndPeriodNumber(
                progress.getStudentProfile(),
                progress.getScheduledDate(),
                progress.getPeriodNumber()
            )
            .ifPresent(schedule -> {
                schedule.setCompleted(false);
                schedule.setMarkedIncompleteReason("No assessment submission within grace period");
                dailyScheduleRepository.save(schedule);
                
                log.debug("Updated daily schedule {} as incomplete", schedule.getId());
            });
    }
    
    /**
     * Get incomplete lessons count for a student
     */
    public long getIncompleteCount(Long studentId) {
        return progressRepository.countByStudentProfileIdAndCompletedFalseAndIncompleteReasonIsNotNull(studentId);
    }
    
    /**
     * Get all incomplete lessons for a student
     */
    public List<StudentLessonProgress> getIncompleteLessons(Long studentId) {
        return progressRepository.findByStudentProfileIdAndCompletedFalseAndIncompleteReasonIsNotNull(studentId);
    }
    
    /**
     * Get incomplete lessons by reason
     */
    public List<StudentLessonProgress> getIncompleteLessonsByReason(Long studentId, String reason) {
        return progressRepository.findByStudentProfileIdAndIncompleteReason(studentId, reason);
    }
}