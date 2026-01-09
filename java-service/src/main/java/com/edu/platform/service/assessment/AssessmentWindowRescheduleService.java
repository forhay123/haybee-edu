package com.edu.platform.service.assessment;

import com.edu.platform.dto.assessment.WindowRescheduleDto;
import com.edu.platform.dto.assessment.WindowRescheduleRequest;
import com.edu.platform.exception.UnauthorizedException;
import com.edu.platform.exception.ValidationException;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.model.TeacherProfile;
import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.model.assessment.AssessmentWindowReschedule;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.StudentProfileRepository;
import com.edu.platform.repository.SubjectRepository;
import com.edu.platform.repository.TeacherProfileRepository;
import com.edu.platform.repository.assessment.AssessmentWindowRescheduleRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing assessment window RESCHEDULING (not extensions)
 * Teacher proactively changes assessment time BEFORE it starts
 * Prevents cheating by cancelling original window
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AssessmentWindowRescheduleService {
    
    private final AssessmentWindowRescheduleRepository rescheduleRepository;
    private final StudentLessonProgressRepository progressRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final TeacherProfileRepository teacherProfileRepository;
    private final SubjectRepository subjectRepository;
    
    @Value("${assessment-reschedule.require-reason:true}")
    private boolean requireReason;
    
    @Value("${assessment-reschedule.min-reason-length:10}")
    private int minReasonLength;
    
    /**
     * ✅ Reschedule an assessment window (BEFORE original start)
     * Creates NEW 1-hour window, cancels original window
     */
    @Transactional
    public WindowRescheduleDto rescheduleAssessment(
            Long teacherProfileId,
            WindowRescheduleRequest request) {
        
        log.info("🔄 Rescheduling assessment: teacher={}, schedule={}", 
                 teacherProfileId, request.getDailyScheduleId());
        
        LocalDateTime now = LocalDateTime.now();
        
        // 1. Get and validate progress record
        StudentLessonProgress progress = progressRepository.findById(request.getDailyScheduleId())
            .orElseThrow(() -> new EntityNotFoundException(
                "Progress record not found: " + request.getDailyScheduleId()));
        
        // 2. Get teacher
        TeacherProfile teacher = teacherProfileRepository.findById(teacherProfileId)
            .orElseThrow(() -> new EntityNotFoundException(
                "Teacher not found: " + teacherProfileId));
        
        // 3. Get student
        StudentProfile student = progress.getStudentProfile();
        if (student == null) {
            throw new ValidationException("Progress record has no associated student");
        }
        
        // 4. Get assessment
        Assessment assessment = progress.getAssessment();
        if (assessment == null) {
            throw new ValidationException("Progress record has no associated assessment");
        }
        
        // 5. Validate teacher teaches this subject
        validateTeacherSubject(teacher, progress.getSubject(), student);
        
        // ✅ CRITICAL: Must reschedule BEFORE original window starts (anti-cheating)
        validateRescheduleBeforeStart(progress, now);
        
        // 6. Validate student hasn't accessed yet
        validateNoAccess(progress);
        
        // 7. Validate reason
        validateReason(request.getReason());
        
        // 8. Check for existing active reschedule (ONE RESCHEDULE ONLY)
        checkExistingReschedule(request.getDailyScheduleId(), student.getId());
        
        // 9. Calculate new window (EXACTLY 1 hour)
        LocalDateTime newWindowStart = request.getNewWindowStart();
        LocalDateTime newWindowEnd = newWindowStart.plusHours(1); // Always 1 hour
        LocalDateTime newGraceEnd = newWindowEnd.plusMinutes(30); // 30-min grace
        
        // 10. Validate new window timing
        validateNewWindow(newWindowStart, now);
        
        // 11. Create reschedule record
        AssessmentWindowReschedule reschedule = AssessmentWindowReschedule.builder()
            .dailySchedule(progress)
            .assessment(assessment)
            .student(student)
            .teacher(teacher)
            .originalWindowStart(progress.getAssessmentWindowStart())
            .originalWindowEnd(progress.getAssessmentWindowEnd())
            .originalGraceEnd(progress.getGracePeriodEnd())
            .newWindowStart(newWindowStart)
            .newWindowEnd(newWindowEnd)
            .newGraceEnd(newGraceEnd)
            .reason(request.getReason())
            .rescheduledAt(now)
            .rescheduledByTeacherId(teacherProfileId)
            .isActive(true)
            .build();
        
        reschedule = rescheduleRepository.save(reschedule);
        
        // 12. Update progress record with NEW windows
        progress.setAssessmentWindowStart(newWindowStart);
        progress.setAssessmentWindowEnd(newWindowEnd);
        progress.setGracePeriodEnd(newGraceEnd);
        progress.setIncompleteReason(null); // Clear any incomplete status
        progress.setAssessmentAccessible(true); // Enable access at new time
        progressRepository.save(progress);
        
        log.info("✅ Assessment rescheduled: id={}, originalStart={}, newStart={}, duration=1 hour", 
                 reschedule.getId(), progress.getAssessmentWindowStart(), newWindowStart);
        
        return WindowRescheduleDto.fromEntity(reschedule);
    }
    
    /**
     * Cancel a reschedule (reverts to original window)
     */
    @Transactional
    public void cancelReschedule(Long teacherProfileId, Long rescheduleId, String reason) {
        log.info("🚫 Cancelling reschedule: teacher={}, reschedule={}", teacherProfileId, rescheduleId);
        
        AssessmentWindowReschedule reschedule = rescheduleRepository.findById(rescheduleId)
            .orElseThrow(() -> new EntityNotFoundException("Reschedule not found: " + rescheduleId));
        
        // Validate ownership
        if (!reschedule.getTeacher().getId().equals(teacherProfileId)) {
            throw new UnauthorizedException("You can only cancel your own reschedules");
        }
        
        // Check if already cancelled
        if (!reschedule.getIsActive()) {
            throw new ValidationException("Reschedule is already cancelled");
        }
        
        // ✅ Must cancel BEFORE new window starts (student hasn't accessed yet)
        LocalDateTime now = LocalDateTime.now();
        if (now.isAfter(reschedule.getNewWindowStart())) {
            throw new ValidationException(
                "Cannot cancel reschedule after new window has started. " +
                "Student may have already accessed the assessment.");
        }
        
        // Cancel reschedule
        reschedule.cancel(reason);
        rescheduleRepository.save(reschedule);
        
        // Restore original windows in progress record
        StudentLessonProgress progress = reschedule.getDailySchedule();
        progress.setAssessmentWindowStart(reschedule.getOriginalWindowStart());
        progress.setAssessmentWindowEnd(reschedule.getOriginalWindowEnd());
        progress.setGracePeriodEnd(reschedule.getOriginalGraceEnd());
        progressRepository.save(progress);
        
        log.info("✅ Reschedule cancelled: reschedule={}, reverted to original window", rescheduleId);
    }
    
    /**
     * Get all reschedules created by teacher
     */
    @Transactional(readOnly = true)
    public List<WindowRescheduleDto> getTeacherReschedules(Long teacherProfileId, Long studentId) {
        List<AssessmentWindowReschedule> reschedules;
        
        if (studentId != null) {
            reschedules = rescheduleRepository.findByTeacherIdAndStudentId(teacherProfileId, studentId);
        } else {
            reschedules = rescheduleRepository.findByTeacherIdWithDetails(teacherProfileId);
        }
        
        return reschedules.stream()
            .map(WindowRescheduleDto::fromEntity)
            .collect(Collectors.toList());
    }
    
    /**
     * Get all reschedules for a student
     */
    @Transactional(readOnly = true)
    public List<WindowRescheduleDto> getStudentReschedules(Long studentId) {
        List<AssessmentWindowReschedule> reschedules = 
            rescheduleRepository.findByStudentIdWithDetails(studentId);
        
        return reschedules.stream()
            .map(WindowRescheduleDto::fromEntity)
            .collect(Collectors.toList());
    }
    
    // ========== Validation Methods ==========
    
    /**
     * Validate teacher teaches this subject to this student
     */
    private void validateTeacherSubject(TeacherProfile teacher, Subject subject, StudentProfile student) {
        // Check teacher teaches the subject
        boolean teachesSubject = teacher.getSubjects().stream()
            .anyMatch(s -> s.getId().equals(subject.getId()));
        
        if (!teachesSubject) {
            throw new UnauthorizedException(
                "You don't teach " + subject.getName());
        }
        
        // Check student is enrolled in the subject
        boolean studentEnrolled = isStudentEnrolledInSubject(student, subject);
        
        if (!studentEnrolled) {
            throw new UnauthorizedException(
                "Student is not enrolled in " + subject.getName());
        }
    }
    
    /**
     * Check if student is enrolled in subject
     */
    private boolean isStudentEnrolledInSubject(StudentProfile student, Subject subject) {
        if (student.getStudentType() == StudentType.ASPIRANT) {
            // ASPIRANT: Check student's chosen subjects
            return student.getSubjects().stream()
                .anyMatch(s -> s.getId().equals(subject.getId()));
        } else {
            // SCHOOL/HOME: Check class subjects
            if (student.getClassLevel() == null) {
                return false;
            }
            
            List<Subject> classSubjects = subjectRepository
                .findByClassEntityId(student.getClassLevel().getId());
            
            return classSubjects.stream()
                .anyMatch(s -> s.getId().equals(subject.getId()));
        }
    }
    
    /**
     * ✅ CRITICAL: Reschedule must happen BEFORE original window starts
     * This prevents cheating (student viewing questions then "missing" to get rescheduled)
     */
    private void validateRescheduleBeforeStart(StudentLessonProgress progress, LocalDateTime now) {
        LocalDateTime originalStart = progress.getAssessmentWindowStart();
        
        if (originalStart == null) {
            throw new ValidationException("Assessment window not configured");
        }
        
        if (now.isAfter(originalStart) || now.isEqual(originalStart)) {
            throw new ValidationException(
                "Cannot reschedule assessment after it has started. " +
                "Original start time was: " + originalStart + ". " +
                "Rescheduling must happen BEFORE the window opens to prevent cheating.");
        }
        
        log.debug("✅ Reschedule timing valid: now={}, originalStart={}", now, originalStart);
    }
    
    /**
     * Validate student hasn't accessed the assessment yet
     */
    private void validateNoAccess(StudentLessonProgress progress) {
        // Check if student has started assessment
        if (progress.isCompleted()) {
            throw new ValidationException(
                "Cannot reschedule - student has already completed this assessment");
        }
        
        // Check if submission exists (even incomplete)
        if (progress.getAssessmentSubmissionId() != null) {
            throw new ValidationException(
                "Cannot reschedule - student has already started this assessment");
        }
    }
    
    /**
     * Validate new window timing
     */
    private void validateNewWindow(LocalDateTime newWindowStart, LocalDateTime now) {
        // New window must be in the future
        if (newWindowStart.isBefore(now) || newWindowStart.isEqual(now)) {
            throw new ValidationException(
                "New window start must be in the future. Selected: " + newWindowStart);
        }
        
        // New window should be reasonable (not years in the future)
        if (newWindowStart.isAfter(now.plusMonths(3))) {
            throw new ValidationException(
                "New window cannot be more than 3 months in the future");
        }
    }
    
    /**
     * Validate reason
     */
    private void validateReason(String reason) {
        if (requireReason) {
            if (reason == null || reason.trim().isEmpty()) {
                throw new ValidationException("Reason is required");
            }
            
            if (reason.trim().length() < minReasonLength) {
                throw new ValidationException(
                    String.format("Reason must be at least %d characters", minReasonLength));
            }
        }
    }
    
    /**
     * Check for existing active reschedule (ONE RESCHEDULE ONLY)
     */
    private void checkExistingReschedule(Long scheduleId, Long studentId) {
        boolean exists = rescheduleRepository.existsActiveRescheduleForSchedule(scheduleId, studentId);
        
        if (exists) {
            throw new ValidationException(
                "This assessment has already been rescheduled. " +
                "You must cancel the existing reschedule first.");
        }
    }
}