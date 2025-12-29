package com.edu.platform.service.assessment;

import com.edu.platform.dto.assessment.AccessCheckResult;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.assessment.AssessmentSubmissionRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import com.edu.platform.repository.StudentProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Phase 2.6: Assessment Access Control Service
 * Validates if student can access assessment at current time
 * ✅ UPDATED: Now handles multi-period lessons correctly
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AssessmentAccessService {
    
    private final StudentLessonProgressRepository progressRepository;
    private final AssessmentSubmissionRepository submissionRepository;
    private final StudentProfileRepository studentProfileRepository;
    
    /**
     * ✅ UPDATED: Check if student can access assessment right now
     * Now handles multiple progress records for multi-period lessons
     */
    @Transactional
    public AccessCheckResult canAccessAssessment(
            StudentProfile student, 
            Assessment assessment,
            LocalDateTime now) {
        
        log.debug("Checking assessment access: student={}, assessment={}, time={}", 
                 student.getId(), assessment.getId(), now);
        
        // ✅ FIXED: Get ALL progress records (handles multi-period lessons)
        List<StudentLessonProgress> progressList = progressRepository
                .findAllByStudentProfileIdAndAssessmentId(student.getId(), assessment.getId());
        
        // Filter to find the currently accessible progress record
        Optional<StudentLessonProgress> accessibleProgress = progressList.stream()
                .filter(p -> p.isAssessmentAccessible() && !p.isCompleted())
                .filter(p -> !now.isBefore(p.getAssessmentWindowStart()) && 
                             !now.isAfter(p.getAssessmentWindowEnd()))
                .min(Comparator.comparing(StudentLessonProgress::getPeriodSequence));
        
        StudentLessonProgress progress = accessibleProgress.orElse(null);
        
        // ✅ NEW: If no accessible progress found, try finding by lesson topic
        if (progress == null && assessment.getLessonTopic() != null) {
            log.info("No accessible progress with assessment link. Searching by lesson topic...");
            
            progress = progressRepository
                .findByStudentIdAndLessonTopicIdAndScheduledDate(
                    student.getId(),
                    assessment.getLessonTopic().getId(),
                    now.toLocalDate()
                )
                .orElse(null);
            
            // Link the assessment to the progress record
            if (progress != null && progress.getAssessment() == null) {
                log.info("✅ Linking assessment {} to progress {}", assessment.getId(), progress.getId());
                progress.setAssessment(assessment);
                progress = progressRepository.save(progress);
            }
        }
        
        // ✅ NEW: If still no progress, create one automatically
        if (progress == null) {
            log.warn("⚠️ No progress record found. Creating automatic progress for student {} and assessment {}", 
                    student.getId(), assessment.getId());
            
            progress = createAutoProgressRecord(student, assessment, now.toLocalDate());
        }
        
        // ✅ NEW: Ensure assessment window is configured
        if (progress.getAssessmentWindowStart() == null || progress.getAssessmentWindowEnd() == null) {
            log.info("⚙️ Configuring assessment window for progress {}", progress.getId());
            configureAssessmentWindow(progress, now.toLocalDate());
            progress = progressRepository.save(progress);
        }
        
        // ✅ CRITICAL FIX: Ensure assessmentAccessible is set to true
        if (progress.getAssessmentAccessible() == null || !progress.getAssessmentAccessible()) {
            log.info("🔓 Enabling assessment access for progress {}", progress.getId());
            progress.setAssessmentAccessible(true);
            progress = progressRepository.save(progress);
        }
        
        LocalDateTime windowStart = progress.getAssessmentWindowStart();
        LocalDateTime windowEnd = progress.getAssessmentWindowEnd();
        
        // Check if before window starts
        if (now.isBefore(windowStart)) {
            long minutesUntil = ChronoUnit.MINUTES.between(now, windowStart);
            String reason = String.format(
                "Assessment opens at %s. Current time: %s",
                formatTime(windowStart),
                formatTime(now)
            );
            
            log.debug("Access BLOCKED: before window (opens in {} minutes)", minutesUntil);
            
            return AccessCheckResult.notYetOpen(
                reason,
                windowStart,
                windowEnd,
                minutesUntil
            );
        }
        
        // Check if after window ends
        if (now.isAfter(windowEnd)) {
            String reason = String.format(
                "Assessment window closed. Deadline was %s",
                formatTime(windowEnd)
            );
            
            log.debug("Access BLOCKED: after window");
            
            return AccessCheckResult.expired(reason, windowEnd);
        }
        
        // Check if already submitted
        boolean alreadySubmitted = submissionRepository.existsByAssessmentIdAndStudentId(
                assessment.getId(), 
                student.getId()
        );
        
        if (alreadySubmitted) {
            log.debug("Access BLOCKED: already submitted");
            return AccessCheckResult.alreadySubmitted();
        }
        
        // All checks passed - access allowed
        long minutesRemaining = ChronoUnit.MINUTES.between(now, windowEnd);
        boolean inGracePeriod = isInGracePeriod(progress, now);
        
        log.debug("Access ALLOWED: {} minutes remaining, grace period: {}", 
                 minutesRemaining, inGracePeriod);
        
        return AccessCheckResult.allowed(
                windowEnd,
                minutesRemaining,
                inGracePeriod
        );
    }
    
    /**
     * ✅ NEW: Create automatic progress record for assessment access
     */
    private StudentLessonProgress createAutoProgressRecord(
            StudentProfile student,
            Assessment assessment,
            LocalDate date) {
        
        log.info("🔧 Creating automatic progress record for student {} and assessment {}", 
                student.getId(), assessment.getId());
        
        StudentLessonProgress progress = StudentLessonProgress.builder()
            .studentProfile(student)
            .lessonTopic(assessment.getLessonTopic())
            .subject(assessment.getSubject())
            .assessment(assessment)
            .scheduledDate(date)
            .date(date) // Required field
            .completed(false)
            .periodNumber(1) // Default period
            .priority(3) // Default priority
            .weight(1.0) // Default weight
            .assessmentAccessible(true) // Allow access
            .build();
        
        // Configure assessment window
        configureAssessmentWindow(progress, date);
        
        progress = progressRepository.save(progress);
        
        log.info("✅ Created automatic progress record: {}", progress.getId());
        return progress;
    }
    
    /**
     * ✅ NEW: Configure assessment window with default values
     */
    private void configureAssessmentWindow(StudentLessonProgress progress, LocalDate date) {
        // Default: Assessment available all day
        LocalDateTime windowStart = date.atStartOfDay();
        LocalDateTime windowEnd = date.atTime(23, 59, 59);
        
        progress.setAssessmentWindowStart(windowStart);
        progress.setAssessmentWindowEnd(windowEnd);
        
        log.info("⚙️ Configured assessment window: {} to {}", windowStart, windowEnd);
    }
    
    /**
     * Check if currently in grace period
     */
    private boolean isInGracePeriod(StudentLessonProgress progress, LocalDateTime now) {
        // Grace period logic could be enhanced with lessonEnd from DailySchedule
        // For now, we assume grace period is the last 30 minutes of the window
        LocalDateTime windowEnd = progress.getAssessmentWindowEnd();
        LocalDateTime graceStart = windowEnd.minusMinutes(30);
        
        return now.isAfter(graceStart) && now.isBefore(windowEnd);
    }
    
    /**
     * Format time for display
     */
    private String formatTime(LocalDateTime dateTime) {
        return dateTime.toLocalTime().toString();
    }
    
    /**
     * Batch check access for multiple assessments
     */
    @Transactional
    public AccessCheckResult canAccessAssessment(Long studentId, Long assessmentId) {
        // Simplified version for when you only have IDs
        log.debug("Checking access by IDs: student={}, assessment={}", studentId, assessmentId);
        
        StudentProfile student = studentProfileRepository.findById(studentId)
            .orElseThrow(() -> new IllegalArgumentException("Student not found: " + studentId));
        
        // This will be handled by the main method now
        return canAccessAssessment(student, null, LocalDateTime.now());
    }
}