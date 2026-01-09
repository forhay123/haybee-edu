package com.edu.platform.service.assessment;

import com.edu.platform.dto.assessment.AccessCheckResult;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.model.assessment.AssessmentWindowReschedule;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.assessment.AssessmentRepository;
import com.edu.platform.repository.assessment.AssessmentSubmissionRepository;
import com.edu.platform.repository.assessment.AssessmentWindowRescheduleRepository;
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
 * Assessment Access Control Service
 * ✅ FIXED: Now properly handles assessment access with reschedules
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AssessmentAccessService {
    
    private final StudentLessonProgressRepository progressRepository;
    private final AssessmentSubmissionRepository submissionRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final AssessmentWindowRescheduleRepository rescheduleRepository;
    private final AssessmentRepository assessmentRepository;
    
    /**
     * ✅ FIXED: Check if student can access assessment right now
     * Properly handles null assessment by fetching it from progress
     */
    @Transactional
    public AccessCheckResult canAccessAssessment(
            StudentProfile student, 
            Assessment assessment,
            LocalDateTime now) {
        
        log.debug("Checking assessment access: student={}, assessment={}, time={}", 
                 student.getId(), assessment != null ? assessment.getId() : "null", now);
        
        // ✅ FIX: Handle case where assessment is null
        if (assessment == null) {
            log.warn("Assessment is null, cannot check access");
            return AccessCheckResult.blocked("Assessment not found");
        }
        
        // ✅ STEP 1: Check for active reschedule FIRST
        Optional<AssessmentWindowReschedule> activeReschedule = 
            rescheduleRepository.findActiveRescheduleForStudent(student.getId(), assessment.getId());
        
        boolean hasReschedule = activeReschedule.isPresent();
        
        if (hasReschedule) {
            log.info("🔄 Found active reschedule for student {} on assessment {}", 
                     student.getId(), assessment.getId());
        }
        
        // ✅ STEP 2: Get ALL progress records (handles multi-period lessons)
        List<StudentLessonProgress> progressList = progressRepository
                .findAllByStudentProfileIdAndAssessmentId(student.getId(), assessment.getId());
        
        // Filter to find the currently accessible progress record
        Optional<StudentLessonProgress> accessibleProgress = progressList.stream()
                .filter(p -> p.isAssessmentAccessible() && !p.isCompleted())
                .filter(p -> p.getAssessmentWindowStart() != null && p.getAssessmentWindowEnd() != null)
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
        
        // ✅ STEP 3: Use rescheduled windows if exists, otherwise use original
        LocalDateTime windowStart;
        LocalDateTime windowEnd;
        
        if (hasReschedule) {
            AssessmentWindowReschedule reschedule = activeReschedule.get();
            windowStart = reschedule.getNewWindowStart();
            windowEnd = reschedule.getNewWindowEnd();
            
            log.info("🔄 Using rescheduled window: start={}, end={} (original was {}-{})", 
                     windowStart, windowEnd, 
                     progress.getAssessmentWindowStart(), 
                     progress.getAssessmentWindowEnd());
        } else {
            windowStart = progress.getAssessmentWindowStart();
            windowEnd = progress.getAssessmentWindowEnd();
        }
        
        // ✅ STEP 4: Continue with existing access checks using the (possibly rescheduled) windows
        
        // Check if before window starts
        if (now.isBefore(windowStart)) {
            long minutesUntil = ChronoUnit.MINUTES.between(now, windowStart);
            String reason = String.format(
                "Assessment opens at %s. Current time: %s",
                formatTime(windowStart),
                formatTime(now)
            );
            
            if (hasReschedule) {
                reason += " (Rescheduled by teacher)";
            }
            
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
            
            if (hasReschedule) {
                reason += " (Rescheduled window)";
            }
            
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
        boolean inGracePeriod = isInGracePeriod(progress, now, activeReschedule);
        
        log.debug("Access ALLOWED: {} minutes remaining, grace period: {}, rescheduled: {}", 
                 minutesRemaining, inGracePeriod, hasReschedule);
        
        AccessCheckResult result = AccessCheckResult.allowed(
                windowEnd,
                minutesRemaining,
                inGracePeriod
        );
        
        if (hasReschedule) {
            log.info("✅ Access granted with rescheduled window: {} to {}", 
                     windowStart, windowEnd);
        }
        
        return result;
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
            .date(date)
            .completed(false)
            .periodNumber(1)
            .priority(3)
            .weight(1.0)
            .assessmentAccessible(true)
            .build();
        
        configureAssessmentWindow(progress, date);
        
        progress = progressRepository.save(progress);
        
        log.info("✅ Created automatic progress record: {}", progress.getId());
        return progress;
    }
    
    /**
     * ✅ NEW: Configure assessment window with default values
     */
    private void configureAssessmentWindow(StudentLessonProgress progress, LocalDate date) {
        LocalDateTime windowStart = date.atStartOfDay();
        LocalDateTime windowEnd = date.atTime(23, 59, 59);
        
        progress.setAssessmentWindowStart(windowStart);
        progress.setAssessmentWindowEnd(windowEnd);
        
        log.info("⚙️ Configured assessment window: {} to {}", windowStart, windowEnd);
    }
    
    /**
     * ✅ UPDATED: Check if currently in grace period
     */
    private boolean isInGracePeriod(
            StudentLessonProgress progress, 
            LocalDateTime now,
            Optional<AssessmentWindowReschedule> reschedule) {
        
        LocalDateTime graceEnd;
        
        if (reschedule.isPresent() && reschedule.get().getNewGraceEnd() != null) {
            graceEnd = reschedule.get().getNewGraceEnd();
        } else if (progress.getGracePeriodEnd() != null) {
            graceEnd = progress.getGracePeriodEnd();
        } else {
            LocalDateTime windowEnd = reschedule.isPresent() 
                ? reschedule.get().getNewWindowEnd()
                : progress.getAssessmentWindowEnd();
            graceEnd = windowEnd.plusMinutes(30);
        }
        
        LocalDateTime windowEnd = reschedule.isPresent()
            ? reschedule.get().getNewWindowEnd()
            : progress.getAssessmentWindowEnd();
        
        return now.isAfter(windowEnd) && now.isBefore(graceEnd);
    }
    
    /**
     * Format time for display
     */
    private String formatTime(LocalDateTime dateTime) {
        return dateTime.toLocalTime().toString();
    }
    
    /**
     * ✅ FIXED: Batch check access for multiple assessments
     * Now properly fetches the assessment before checking
     */
    @Transactional
    public AccessCheckResult canAccessAssessment(Long studentId, Long assessmentId) {
        log.debug("Checking access by IDs: student={}, assessment={}", studentId, assessmentId);
        
        StudentProfile student = studentProfileRepository.findById(studentId)
            .orElseThrow(() -> new IllegalArgumentException("Student not found: " + studentId));
        
        // ✅ FIX: Fetch the assessment before passing it
        Assessment assessment = assessmentRepository.findById(assessmentId)
            .orElseThrow(() -> new IllegalArgumentException("Assessment not found: " + assessmentId));
        
        return canAccessAssessment(student, assessment, LocalDateTime.now());
    }
}