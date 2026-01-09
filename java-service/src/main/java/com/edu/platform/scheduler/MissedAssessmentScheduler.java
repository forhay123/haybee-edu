package com.edu.platform.scheduler;

import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.model.assessment.AssessmentType;
import com.edu.platform.repository.assessment.AssessmentRepository;
import com.edu.platform.repository.assessment.AssessmentSubmissionRepository;
import com.edu.platform.service.EnrollmentService;
import com.edu.platform.service.assessment.AssessmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class MissedAssessmentScheduler {

    private final AssessmentRepository assessmentRepository;
    private final AssessmentSubmissionRepository submissionRepository;
    private final EnrollmentService enrollmentService;
    private final AssessmentService assessmentService;

    /**
     * ✅ Run every hour to check for missed gradebook assessments
     * Creates zero-score submissions for students who missed the deadline
     */
    @Scheduled(cron = "0 0 * * * *") // Every hour at :00
    @Transactional
    public void processMissedGradebookAssessments() {
        log.info("🔍 Checking for missed gradebook assessments...");
        
        LocalDateTime now = LocalDateTime.now();
        
        // Define gradebook assessment types
        List<AssessmentType> gradebookTypes = List.of(
            AssessmentType.QUIZ,
            AssessmentType.CLASSWORK,
            AssessmentType.TEST1,
            AssessmentType.TEST2,
            AssessmentType.ASSIGNMENT,
            AssessmentType.EXAM
        );
        
        // Find all published gradebook assessments with passed due dates
        List<Assessment> overdueAssessments = assessmentRepository.findAll().stream()
            .filter(a -> a.getPublished())
            .filter(a -> gradebookTypes.contains(a.getType()))
            .filter(a -> a.getDueDate() != null && a.getDueDate().isBefore(now))
            // ✅ IMPORTANT: Only process assessments that became overdue in the last 2 hours
            // This prevents reprocessing old assessments every hour
            .filter(a -> a.getDueDate().isAfter(now.minusHours(2)))
            .toList();
        
        log.info("📋 Found {} recently overdue gradebook assessments to check", overdueAssessments.size());
        
        int zeroSubmissionsCreated = 0;
        
        for (Assessment assessment : overdueAssessments) {
            try {
                // Get all enrolled students for this subject
                List<Long> enrolledStudentIds = enrollmentService
                    .getStudentProfileIdsBySubjectId(assessment.getSubject().getId());
                
                log.debug("📝 Checking {} students for assessment {} ({})",
                        enrolledStudentIds.size(), assessment.getId(), assessment.getTitle());
                
                // Check each student
                for (Long studentId : enrolledStudentIds) {
                    // Skip if student already submitted
                    boolean hasSubmitted = submissionRepository
                        .existsByAssessmentIdAndStudentId(assessment.getId(), studentId);
                    
                    if (!hasSubmitted) {
                        // ✅ Skip custom assessments not assigned to this student
                        if (assessment.isCustomAssessment() && 
                            assessment.getTargetStudentId() != null &&
                            !assessment.getTargetStudentId().equals(studentId)) {
                            log.debug("⏭️ Skipping custom assessment {} not for student {}", 
                                    assessment.getId(), studentId);
                            continue;
                        }
                        
                        // Create zero-score submission
                        Long submissionId = assessmentService.createZeroScoreSubmission(
                            assessment.getId(),
                            studentId,
                            "Missed deadline - automatic zero score"
                        );
                        
                        log.info("✅ Created zero-score submission {} for student {} " +
                                "on missed assessment {} ({} - {})",
                                submissionId, studentId, assessment.getId(), 
                                assessment.getType(), assessment.getTitle());
                        
                        zeroSubmissionsCreated++;
                    }
                }
            } catch (Exception e) {
                log.error("❌ Failed to process missed assessment {}: {}",
                        assessment.getId(), e.getMessage(), e);
                // Continue processing other assessments
            }
        }
        
        if (zeroSubmissionsCreated > 0) {
            log.info("✅ Completed processing: Created {} zero-score submissions for missed assessments",
                    zeroSubmissionsCreated);
        } else {
            log.info("✅ No missed assessments to process");
        }
    }
    
    /**
     * ✅ OPTIONAL: Run once daily at midnight to catch any stragglers
     * This is a safety net in case the hourly check misses anything
     */
    @Scheduled(cron = "0 0 0 * * *") // Every day at midnight
    @Transactional
    public void dailySafetyCheck() {
        log.info("🌙 Running daily safety check for missed assessments...");
        
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime yesterdayStart = now.minusDays(1).withHour(0).withMinute(0).withSecond(0);
        
        List<AssessmentType> gradebookTypes = List.of(
            AssessmentType.QUIZ,
            AssessmentType.CLASSWORK,
            AssessmentType.TEST1,
            AssessmentType.TEST2,
            AssessmentType.ASSIGNMENT,
            AssessmentType.EXAM
        );
        
        // Find assessments that became overdue yesterday
        List<Assessment> yesterdayOverdue = assessmentRepository.findAll().stream()
            .filter(a -> a.getPublished())
            .filter(a -> gradebookTypes.contains(a.getType()))
            .filter(a -> a.getDueDate() != null)
            .filter(a -> a.getDueDate().isBefore(now) && a.getDueDate().isAfter(yesterdayStart))
            .toList();
        
        log.info("🔍 Safety check: Found {} assessments from yesterday", yesterdayOverdue.size());
        
        int fixedCount = 0;
        
        for (Assessment assessment : yesterdayOverdue) {
            try {
                List<Long> enrolledStudentIds = enrollmentService
                    .getStudentProfileIdsBySubjectId(assessment.getSubject().getId());
                
                for (Long studentId : enrolledStudentIds) {
                    boolean hasSubmitted = submissionRepository
                        .existsByAssessmentIdAndStudentId(assessment.getId(), studentId);
                    
                    if (!hasSubmitted) {
                        if (assessment.isCustomAssessment() && 
                            assessment.getTargetStudentId() != null &&
                            !assessment.getTargetStudentId().equals(studentId)) {
                            continue;
                        }
                        
                        assessmentService.createZeroScoreSubmission(
                            assessment.getId(),
                            studentId,
                            "Missed deadline - automatic zero score (safety check)"
                        );
                        
                        fixedCount++;
                    }
                }
            } catch (Exception e) {
                log.error("❌ Safety check error for assessment {}: {}", 
                        assessment.getId(), e.getMessage());
            }
        }
        
        log.info("✅ Safety check complete: Created {} additional zero-score submissions", fixedCount);
    }
}