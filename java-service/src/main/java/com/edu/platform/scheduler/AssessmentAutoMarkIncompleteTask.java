package com.edu.platform.scheduler;

import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import com.edu.platform.service.assessment.AssessmentService;
import com.edu.platform.service.individual.IndividualScheduleService;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * ✅ Auto-marks missed assessments and creates zero-score submissions
 * Runs every hour to check for assessments past grace period
 * 
 * This task ensures that:
 * 1. Students who miss assessments get zero-score submissions automatically
 * 2. Progress records are marked as completed (so teachers can create next period's custom assessment)
 * 3. Subsequent periods become unblocked for custom assessment creation
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AssessmentAutoMarkIncompleteTask {
    
    private final StudentLessonProgressRepository progressRepository;
    private final AssessmentService assessmentService;
    private final IndividualScheduleService individualScheduleService;
    
    @PostConstruct
    public void init() {
        log.info("🎯 AssessmentAutoMarkIncompleteTask LOADED SUCCESSFULLY!");
    }
    /**
     * Run every hour to mark missed assessments
     * Cron: Every hour at minute 5 (e.g., 1:05, 2:05, 3:05...)
     * 
     * Checks for assessments that:
     * - Grace period has expired
     * - No submission exists
     * - Not yet marked as completed
     * 
     * Then creates:
     * - Zero-score submission with wrong answers
     * - Sets completed = true and completed_at
     * - Links submission to progress record
     */
    @Scheduled(cron = "0 5 * * * *") // Every hour at minute 5
    @Transactional
    public void markMissedAssessmentsWithZeroScore() {
        log.info("🔍 Starting missed assessment auto-marking task...");
        
        LocalDateTime now = LocalDateTime.now();
        
        // ✅ Check last 7 days for missed assessments (catches old missed assessments)
        LocalDateTime graceBuffer = now.minusDays(7);
        
        log.info("📅 Checking for expired assessments from {} to {}", graceBuffer, now);
        
        // Find assessments past grace period with no submission
        List<StudentLessonProgress> expiredAssessments = 
            progressRepository.findExpiredAssessments(graceBuffer);
        
        if (expiredAssessments.isEmpty()) {
            log.info("✅ No expired assessments found");
            return;
        }
        
        log.info("📋 Found {} expired assessments to process", expiredAssessments.size());
        
        int successCount = 0;
        int failCount = 0;
        
        for (StudentLessonProgress progress : expiredAssessments) {
            try {
                processExpiredAssessment(progress);
                successCount++;
            } catch (Exception e) {
                failCount++;
                log.error("❌ Failed to process progress {}: {}", 
                         progress.getId(), e.getMessage(), e);
                // Continue processing other assessments even if one fails
            }
        }
        
        log.info("✅ Missed assessment marking complete: {} succeeded, {} failed", 
                successCount, failCount);
        
        if (failCount > 0) {
            log.warn("⚠️ {} assessments failed to process - check error logs above", failCount);
        }
    }
    
    /**
     * Process a single expired assessment
     * 
     * Steps:
     * 1. Create zero-score submission with wrong answers for all questions
     * 2. Mark progress as completed with submission linked
     * 3. Set incomplete_reason for tracking
     * 
     * This ensures that:
     * - The progress is marked as completed (important for multi-period flow)
     * - The next period becomes available for custom assessment creation
     * - The student sees a 0% score in their results
     */
    private void processExpiredAssessment(StudentLessonProgress progress) {
        log.info("⏰ Processing expired assessment - Progress: {}, Student: {}, Assessment: {}",
                progress.getId(),
                progress.getStudentProfile().getId(),
                progress.getAssessment() != null ? progress.getAssessment().getId() : "null");
        
        // ✅ CHECK: Does this progress have an assessment?
        if (progress.getAssessment() != null) {
            // CASE 1: Has assessment - create zero-score submission
            Long submissionId = assessmentService.createZeroScoreSubmission(
                progress.getAssessment().getId(),
                progress.getStudentProfile().getId(),
                "Missed deadline - Assessment grace period expired"
            );
            
            log.info("✅ Created zero-score submission: {}", submissionId);
            
            // Mark as missed with submission
            individualScheduleService.markAssessmentMissedWithZeroScore(
                progress.getId(),
                submissionId,
                "Assessment grace period expired"
            );
            
            log.info("✅ Marked progress {} as MISSED with submission {}", 
                    progress.getId(), submissionId);
        } else {
            // CASE 2: NO assessment (custom assessment never created)
            // Just mark as missed without submission
            log.warn("⚠️ Progress {} has no assessment (custom assessment was never created)", 
                    progress.getId());
            
            // Mark as completed/missed without submission
            progress.setCompleted(true);
            progress.setCompletedAt(LocalDateTime.now());
            progress.setIncompleteReason("MISSED_GRACE_PERIOD");
            progress.setAutoMarkedIncompleteAt(LocalDateTime.now());
            progressRepository.save(progress);
            
            log.info("✅ Marked progress {} as MISSED (no assessment to score)", progress.getId());
        }
    }
}