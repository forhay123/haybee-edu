package com.edu.platform.service.assessment;

import com.edu.platform.model.assessment.AssessmentSubmission;
import com.edu.platform.model.DailySchedule;
import com.edu.platform.repository.assessment.AssessmentSubmissionRepository;
import com.edu.platform.repository.DailyScheduleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Phase 2.7: Retroactive Submission Nullification Service
 * Nullifies assessment submissions made before their time window
 * 
 * ✅ UPDATED: Fixed to work with Individual Daily Schedules
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SubmissionValidationService {
    
    private final AssessmentSubmissionRepository submissionRepository;
    private final DailyScheduleRepository scheduleRepository;
    
    /**
     * Nullify invalid submissions (submitted before window)
     * Runs every 15 minutes
     */
    @Scheduled(cron = "0 */15 * * * *")
    @Transactional
    public void nullifyInvalidSubmissions() {
        log.info("🔍 Checking for invalid assessment submissions");
        
        // Find all graded submissions to validate
        List<AssessmentSubmission> submissions = submissionRepository.findAll();
        
        if (submissions.isEmpty()) {
            log.debug("No submissions to validate");
            return;
        }
        
        log.info("Validating {} submissions", submissions.size());
        
        int nullified = 0;
        int skipped = 0;
        
        for (AssessmentSubmission submission : submissions) {
            try {
                // Skip already nullified submissions
                if (submission.isNullified()) {
                    continue;
                }
                
                // ✅ NEW: Handle submissions without assessment or student gracefully
                if (submission.getAssessment() == null || submission.getStudent() == null) {
                    log.warn("Submission {} missing assessment or student data - skipping", submission.getId());
                    skipped++;
                    continue;
                }
                
                // ✅ FIXED: Find schedule using lesson topic ID and student profile ID
                Long lessonTopicId = submission.getAssessment().getLessonTopic() != null 
                    ? submission.getAssessment().getLessonTopic().getId() 
                    : null;
                
                if (lessonTopicId == null) {
                    log.debug("Submission {} has no lesson topic - skipping validation", submission.getId());
                    skipped++;
                    continue;
                }
                
                // Find the individual daily schedule for this submission
                Optional<DailySchedule> scheduleOpt = scheduleRepository
                    .findByLessonTopicIdAndStudentProfileId(
                        lessonTopicId,
                        submission.getStudent().getId()
                    )
                    .stream()
                    .findFirst();
                
                if (scheduleOpt.isEmpty()) {
                    log.warn("No schedule found for submission {} (lessonTopicId: {}, studentId: {})", 
                        submission.getId(), lessonTopicId, submission.getStudent().getId());
                    skipped++;
                    continue;
                }
                
                DailySchedule schedule = scheduleOpt.get();
                
                // ✅ CRITICAL: Check if submitted before window opened
                if (submission.getSubmittedAt().isBefore(schedule.getAssessmentWindowStart())) {
                    nullifySubmission(submission, schedule);
                    nullified++;
                    
                    log.warn("🚫 NULLIFIED submission {} - submitted at {} but window opens at {}",
                        submission.getId(),
                        submission.getSubmittedAt(),
                        schedule.getAssessmentWindowStart());
                }
                
            } catch (Exception e) {
                log.error("Error validating submission {}: {}", submission.getId(), e.getMessage(), e);
            }
        }
        
        log.info("✅ Nullified {} invalid submissions, skipped {} submissions", nullified, skipped);
    }
    
    /**
     * Nullify a submission with proper audit trail
     */
    private void nullifySubmission(AssessmentSubmission submission, DailySchedule schedule) {
        // Preserve original data
        submission.setSubmittedBeforeWindow(true);
        submission.setOriginalSubmissionTime(submission.getSubmittedAt());
        submission.setNullifiedAt(LocalDateTime.now());
        submission.setNullifiedReason(
            String.format("Submitted at %s before assessment window opened at %s",
                submission.getSubmittedAt(),
                schedule.getAssessmentWindowStart())
        );
        
        // Reset scores but keep answers for audit
        submission.setScore(0.0);
        submission.setPercentage(0.0);
        submission.setGraded(false);
        submission.setPassed(false);
        
        submissionRepository.save(submission);
    }
    
    /**
     * Validate a single submission immediately (called on submission)
     */
    @Transactional
    public boolean validateSubmission(AssessmentSubmission submission) {
        if (submission.getAssessment() == null || submission.getStudent() == null) {
            return true; // Can't validate without proper data
        }
        
        Long lessonTopicId = submission.getAssessment().getLessonTopic() != null 
            ? submission.getAssessment().getLessonTopic().getId() 
            : null;
        
        if (lessonTopicId == null) {
            return true; // Can't validate without lesson topic
        }
        
        Optional<DailySchedule> scheduleOpt = scheduleRepository
            .findByLessonTopicIdAndStudentProfileId(
                lessonTopicId,
                submission.getStudent().getId()
            )
            .stream()
            .findFirst();
        
        if (scheduleOpt.isEmpty()) {
            log.warn("No schedule found for submission validation");
            return true; // Can't validate without schedule
        }
        
        DailySchedule schedule = scheduleOpt.get();
        
        // Check if submission is before window
        if (submission.getSubmittedAt().isBefore(schedule.getAssessmentWindowStart())) {
            log.warn("⚠️ INVALID SUBMISSION DETECTED - submitted before window opened");
            nullifySubmission(submission, schedule);
            return false;
        }
        
        return true;
    }
    
    /**
     * Get count of nullified submissions for a student
     */
    public long getNullifiedCount(Long studentId) {
        return submissionRepository.countByStudentIdAndNullifiedAtIsNotNull(studentId);
    }
    
    /**
     * Check if a submission is valid (not nullified)
     */
    public boolean isSubmissionValid(Long submissionId) {
        return submissionRepository.findById(submissionId)
            .map(AssessmentSubmission::isValid)
            .orElse(false);
    }
    
    /**
     * Manual trigger to validate all submissions (for testing/admin)
     */
    @Transactional
    public void validateAllSubmissions() {
        log.info("🔧 MANUAL VALIDATION TRIGGERED");
        nullifyInvalidSubmissions();
    }
}