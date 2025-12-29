package com.edu.platform.service.individual;

import com.edu.platform.dto.assessment.CreateCustomAssessmentRequest;
import com.edu.platform.exception.InvalidRequestException;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.exception.UnauthorizedException;
import com.edu.platform.exception.ValidationException;
import com.edu.platform.model.DailySchedule;
import com.edu.platform.model.LessonTopic;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.model.TeacherProfile;
import com.edu.platform.model.User;
import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.model.assessment.AssessmentQuestion;
import com.edu.platform.model.assessment.AssessmentType;
import com.edu.platform.model.assessment.TeacherQuestionBank;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.LessonTopicRepository;
import com.edu.platform.repository.StudentProfileRepository;
import com.edu.platform.repository.SubjectRepository;
import com.edu.platform.repository.TeacherProfileRepository;
import com.edu.platform.repository.assessment.AssessmentQuestionRepository;
import com.edu.platform.repository.assessment.AssessmentRepository;
import com.edu.platform.repository.assessment.AssessmentSubmissionRepository;
import com.edu.platform.repository.assessment.TeacherQuestionBankRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * ✅ FIXED: Custom Assessment Service with Week-Based Validation
 * 
 * CRITICAL FIXES:
 * 1. Duplicate check now only looks at CURRENT WEEK (not all time)
 * 2. Validates that custom assessments are linked to progress records with the SAME lesson topic
 * 3. Correct week calculation to ensure assessments use current week's lesson topics only
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class CustomAssessmentService {

    private final AssessmentRepository assessmentRepository;
    private final AssessmentSubmissionRepository submissionRepository;
    private final StudentLessonProgressRepository progressRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final SubjectRepository subjectRepository;
    private final LessonTopicRepository lessonTopicRepository;
    private final TeacherProfileRepository teacherProfileRepository;
    private final TeacherQuestionBankRepository teacherQuestionRepository;
    private final AssessmentQuestionRepository questionRepository;

    /**
     * Create a custom assessment for a specific student and period
     */
    @Transactional
    public Assessment createCustomPeriodAssessment(CreateCustomAssessmentRequest request, User teacherUser) {

        log.info("Teacher {} creating custom assessment for student {} - subject {} - period {}",
                teacherUser.getId(),
                request.getStudentProfileId(),
                request.getSubjectId(),
                request.getPeriodNumber());

        validateCustomAssessmentRequest(request, teacherUser);

        StudentProfile student = studentProfileRepository.findById(request.getStudentProfileId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Student not found: " + request.getStudentProfileId()));

        Subject subject = subjectRepository.findById(request.getSubjectId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Subject not found: " + request.getSubjectId()));

        // Get CURRENT week dates (Sunday to Saturday) - needed for both checks
        LocalDate today = LocalDate.now();
        java.time.DayOfWeek dayOfWeek = today.getDayOfWeek();
        int daysFromSunday = (dayOfWeek.getValue() % 7); // Sunday = 0
        LocalDate weekStart = today.minusDays(daysFromSunday);
        LocalDate weekEnd = weekStart.plusDays(6); // Saturday

        log.info("🗓️ Current week: {} to {}", weekStart, weekEnd);

        // ✅ FIXED: Check for existing custom assessment IN CURRENT WEEK ONLY
        Optional<Assessment> existing = assessmentRepository.findAll().stream()
                .filter(Assessment::isCustomAssessment)
                .filter(a -> a.getTargetStudentProfile() != null 
                        && a.getTargetStudentProfile().getId().equals(student.getId()))
                .filter(a -> a.getSubject() != null 
                        && a.getSubject().getId().equals(subject.getId()))
                .filter(a -> a.getPeriodNumber() != null 
                        && a.getPeriodNumber().equals(request.getPeriodNumber()))
                // ✅ NEW: Only check assessments created this week
                .filter(a -> a.getCreatedAt() != null 
                        && !a.getCreatedAt().toLocalDate().isBefore(weekStart)
                        && !a.getCreatedAt().toLocalDate().isAfter(weekEnd))
                .findFirst();

        if (existing.isPresent()) {
            log.warn("⚠️ Custom assessment already exists for this week: {}", existing.get().getId());
            throw new InvalidRequestException(
                    String.format("Custom assessment already exists for student %s, subject %s, period %d in current week",
                            student.getUser().getFullName(),
                            subject.getName(),
                            request.getPeriodNumber()));
        }

        Assessment parentAssessment = null;
        if (request.getParentAssessmentId() != null) {
            parentAssessment = assessmentRepository
                    .findById(request.getParentAssessmentId())
                    .orElse(null);
        }

        // ✅ Get lesson topic from progress record in CURRENT WEEK ONLY
        LessonTopic lessonTopic = null;

        log.info("🗓️ Looking for progress record in CURRENT week: {} to {}", weekStart, weekEnd);

        List<StudentLessonProgress> progressRecords = progressRepository
                .findByStudentProfileAndScheduledDateBetween(student, weekStart, weekEnd);

        log.info("📊 Found {} progress records in current week", progressRecords.size());

        lessonTopic = progressRecords.stream()
                .filter(p -> p.getSubject() != null && p.getSubject().getId().equals(subject.getId()))
                .filter(p -> request.getPeriodNumber().equals(p.getPeriodSequence()))
                .filter(p -> Boolean.TRUE.equals(p.getRequiresCustomAssessment()))  // ✅ Only custom assessment progress
                .map(StudentLessonProgress::getLessonTopic)
                .filter(lt -> lt != null)
                .findFirst()
                .orElse(null);

        if (lessonTopic != null) {
            log.info("✅ Found lesson topic {} ({}) from progress record in current week", 
                    lessonTopic.getId(), lessonTopic.getTopicTitle());
        } else {
            log.error("❌ No lesson topic found for student {} - subject {} - period {} in week {} to {}", 
                    student.getId(), subject.getId(), request.getPeriodNumber(), weekStart, weekEnd);
            
            // Log all progress records for debugging
            progressRecords.forEach(p -> 
                log.debug("Progress {}: subject={}, period={}, lesson_topic={}, date={}, requires_custom={}", 
                    p.getId(), 
                    p.getSubject() != null ? p.getSubject().getId() : "null",
                    p.getPeriodSequence(),
                    p.getLessonTopic() != null ? p.getLessonTopic().getId() : "null",
                    p.getScheduledDate(),
                    p.getRequiresCustomAssessment())
            );
            
            throw new ValidationException(
                    "No progress record found with lesson topic for this student/subject/period combination in the current week. " +
                    "Please ensure the student has a scheduled lesson for this period this week.");
        }

        Assessment customAssessment = Assessment.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .type(AssessmentType.LESSON_TOPIC_ASSESSMENT)
                .subject(subject)
                .lessonTopic(lessonTopic)
                .createdBy(teacherUser)
                .totalMarks(request.getTotalMarks())
                .passingMarks(request.getPassingMarks())
                .durationMinutes(request.getDurationMinutes())
                .autoGrade(true)
                .published(true)
                .dueDate(request.getDueDate())
                .targetStudentProfile(student)
                .periodNumber(request.getPeriodNumber())
                .parentAssessment(parentAssessment)
                .isCustomPeriodAssessment(true)
                .questions(new ArrayList<>())
                .build();

        Assessment saved = assessmentRepository.save(customAssessment);

        // Add questions to assessment
        if (request.getQuestionIds() != null && !request.getQuestionIds().isEmpty()) {
            log.info("📝 Adding {} questions to custom assessment {}", 
                    request.getQuestionIds().size(), saved.getId());
            
            List<TeacherQuestionBank> questions = teacherQuestionRepository
                    .findAllById(request.getQuestionIds());
            
            if (questions.isEmpty()) {
                log.warn("⚠️ No questions found for IDs: {}", request.getQuestionIds());
            } else {
                int orderNumber = 1;
                List<AssessmentQuestion> assessmentQuestions = new ArrayList<>();
                
                for (TeacherQuestionBank tq : questions) {
                    AssessmentQuestion aq = AssessmentQuestion.builder()
                            .assessment(saved)
                            .questionText(tq.getQuestionText())
                            .questionType(tq.getQuestionType())
                            .optionA(tq.getOptionA())
                            .optionB(tq.getOptionB())
                            .optionC(tq.getOptionC())
                            .optionD(tq.getOptionD())
                            .correctAnswer(tq.getCorrectAnswer())
                            .marks(1)  // Default 1 mark per question
                            .orderNumber(orderNumber++)
                            .aiGenerated(false)
                            .build();
                    assessmentQuestions.add(aq);
                }
                
                questionRepository.saveAll(assessmentQuestions);
                log.info("✅ Added {} questions to assessment {}", assessmentQuestions.size(), saved.getId());
            }
        } else {
            log.warn("⚠️ No question IDs provided for custom assessment {}", saved.getId());
        }

        updateProgressWithCustomAssessment(
                saved, student, subject, request.getPeriodNumber(), teacherUser);

        return saved;
    }

    /**
     * Add questions to a custom assessment
     */
    @Transactional
    public void addQuestionsToCustomAssessment(
            Long assessmentId,
            List<AssessmentQuestion> questions,
            User teacherUser) {

        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Assessment not found: " + assessmentId));

        if (!assessment.isCustomAssessment()) {
            throw new InvalidRequestException("This is not a custom assessment");
        }

        if (!assessment.getCreatedBy().getId().equals(teacherUser.getId())) {
            throw new UnauthorizedException("You do not have permission to modify this assessment");
        }

        questions.forEach(assessment::addQuestion);
        assessmentRepository.save(assessment);
    }

    /**
     * Update an existing custom assessment
     */
    @Transactional
    public Assessment updateCustomAssessment(
            Long assessmentId,
            CreateCustomAssessmentRequest request,
            User teacherUser) {

        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Assessment not found: " + assessmentId));

        if (!assessment.isCustomAssessment()) {
            throw new InvalidRequestException("This is not a custom assessment");
        }

        if (!assessment.getCreatedBy().getId().equals(teacherUser.getId())) {
            throw new UnauthorizedException("You do not have permission to modify this assessment");
        }

        if (request.getTitle() != null) assessment.setTitle(request.getTitle());
        if (request.getDescription() != null) assessment.setDescription(request.getDescription());
        if (request.getTotalMarks() != null) assessment.setTotalMarks(request.getTotalMarks());
        if (request.getPassingMarks() != null) assessment.setPassingMarks(request.getPassingMarks());
        if (request.getDurationMinutes() != null) assessment.setDurationMinutes(request.getDurationMinutes());
        if (request.getDueDate() != null) assessment.setDueDate(request.getDueDate());

        return assessmentRepository.save(assessment);
    }

    /**
     * Delete a custom assessment
     */
    @Transactional
    public void deleteCustomAssessment(Long assessmentId, User teacherUser) {

        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Assessment not found: " + assessmentId));

        if (!assessment.isCustomAssessment()) {
            throw new InvalidRequestException("This is not a custom assessment");
        }

        if (!assessment.getCreatedBy().getId().equals(teacherUser.getId())) {
            throw new UnauthorizedException("You do not have permission to delete this assessment");
        }

        // Check for submissions
        boolean hasSubmissions = submissionRepository.existsByAssessmentId(assessmentId);
        if (hasSubmissions) {
            throw new InvalidRequestException(
                    "Cannot delete assessment - student has already submitted answers");
        }

        // Unlink from progress records
        List<StudentLessonProgress> progressRecords =
                progressRepository.findAllByStudentProfileIdAndAssessmentId(
                        assessment.getTargetStudentProfile().getId(), assessmentId);

        for (StudentLessonProgress progress : progressRecords) {
            progress.setAssessment(null);
            progress.setRequiresCustomAssessment(true);
            progress.setCustomAssessmentCreatedAt(null);
            progress.setCustomAssessmentCreatedBy(null);
        }

        progressRepository.saveAll(progressRecords);
        assessmentRepository.delete(assessment);
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private void validateCustomAssessmentRequest(
            CreateCustomAssessmentRequest request, User teacherUser) {

        if (request.getPeriodNumber() == null
                || request.getPeriodNumber() < 2
                || request.getPeriodNumber() > 3) {
            throw new ValidationException(
                    "Period number must be 2 or 3 for custom assessments");
        }

        // Validate teacher has access to subject
        validateTeacherCanAccessSubject(teacherUser.getId(), request.getSubjectId());

        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new ValidationException("Assessment title is required");
        }

        if (request.getTotalMarks() == null || request.getTotalMarks() <= 0) {
            throw new ValidationException("Total marks must be greater than 0");
        }

        if (request.getPassingMarks() != null
                && request.getPassingMarks() > request.getTotalMarks()) {
            throw new ValidationException(
                    "Passing marks cannot exceed total marks");
        }
    }

    /**
     * Validate that teacher can access subject
     */
    private void validateTeacherCanAccessSubject(Long teacherId, Long subjectId) {
        // Find teacher profile by user ID
        Optional<TeacherProfile> teacherProfileOpt = teacherProfileRepository.findByUserId(teacherId);
        
        if (teacherProfileOpt.isEmpty()) {
            throw new UnauthorizedException("Teacher profile not found");
        }

        TeacherProfile teacherProfile = teacherProfileOpt.get();
        
        // Check if teacher teaches this subject
        boolean canAccess = teacherProfile.getSubjects().stream()
                .anyMatch(subject -> subject.getId().equals(subjectId));

        if (!canAccess) {
            throw new UnauthorizedException(
                    "You do not have permission to create assessments for this subject");
        }
    }

    /**
     * ✅ CRITICAL FIX: Update progress with custom assessment
     * NOW VALIDATES LESSON TOPIC MATCHES!
     */
    private void updateProgressWithCustomAssessment(
            Assessment assessment,
            StudentProfile student,
            Subject subject,
            Integer periodNumber,
            User teacher) {

        // Get CURRENT week dates
        LocalDate today = LocalDate.now();
        
        // Calculate the start of current week (Sunday)
        java.time.DayOfWeek dayOfWeek = today.getDayOfWeek();
        int daysFromSunday = (dayOfWeek.getValue() % 7); // Sunday = 0
        LocalDate weekStart = today.minusDays(daysFromSunday);
        LocalDate weekEnd = weekStart.plusDays(6); // Saturday
        
        log.info("🗓️ Looking for progress in current week: {} to {}", weekStart, weekEnd);

        List<StudentLessonProgress> progressRecords =
                progressRepository.findByStudentProfileAndScheduledDateBetween(
                        student,
                        weekStart,
                        weekEnd
                );

        log.info("📊 Found {} progress records in current week for student {}", 
                progressRecords.size(), student.getId());

        // ✅ CRITICAL FIX: Filter by subject, period, AND lesson topic
        Optional<StudentLessonProgress> targetProgress = progressRecords.stream()
                .filter(p -> p.getSubject() != null 
                        && p.getSubject().getId().equals(subject.getId()))
                .filter(p -> periodNumber.equals(p.getPeriodSequence()))
                .filter(p -> Boolean.TRUE.equals(p.getRequiresCustomAssessment()))
                // ✅ NEW: Ensure lesson topic matches!
                .filter(p -> {
                    if (assessment.getLessonTopic() == null) {
                        log.warn("⚠️ Assessment {} has no lesson topic", assessment.getId());
                        return false;
                    }
                    if (p.getLessonTopic() == null) {
                        log.warn("⚠️ Progress {} has no lesson topic", p.getId());
                        return false;
                    }
                    boolean matches = p.getLessonTopic().getId().equals(assessment.getLessonTopic().getId());
                    if (!matches) {
                        log.debug("⚠️ Lesson topic mismatch - Progress {}: topic {}, Assessment {}: topic {}", 
                                p.getId(), p.getLessonTopic().getId(),
                                assessment.getId(), assessment.getLessonTopic().getId());
                    }
                    return matches;
                })
                .findFirst();
        
        if (targetProgress.isEmpty()) {
            log.warn("⚠️ No matching progress record found for student {} - subject {} - period {} - lesson topic {} in week {} to {}", 
                    student.getId(), subject.getId(), periodNumber, 
                    assessment.getLessonTopic() != null ? assessment.getLessonTopic().getId() : "null",
                    weekStart, weekEnd);
            
            // Log all progress records to debug
            progressRecords.forEach(p -> 
                log.debug("Progress {}: subject={}, period={}, lesson_topic={}, date={}, requires_custom={}", 
                    p.getId(), 
                    p.getSubject() != null ? p.getSubject().getId() : "null",
                    p.getPeriodSequence(),
                    p.getLessonTopic() != null ? p.getLessonTopic().getId() : "null",
                    p.getScheduledDate(),
                    p.getRequiresCustomAssessment())
            );
            return;
        }
        
        StudentLessonProgress progress = targetProgress.get();
        
        log.info("🎯 Found target progress record: {} (date: {}, period: {}, lesson_topic: {})", 
                progress.getId(), progress.getScheduledDate(), progress.getPeriodSequence(),
                progress.getLessonTopic() != null ? progress.getLessonTopic().getId() : "null");
        
        progress.markCustomAssessmentCreated(assessment, teacher);
        
        // Set requires_custom_assessment to false since assessment now exists
        progress.setRequiresCustomAssessment(false);
        
        // Copy assessment windows from schedule to progress
        if (progress.getSchedule() != null) {
            DailySchedule schedule = progress.getSchedule();
            
            // If schedule has windows, copy them
            if (schedule.getAssessmentWindowStart() != null) {
                progress.setAssessmentWindowStart(schedule.getAssessmentWindowStart());
                progress.setAssessmentWindowEnd(schedule.getAssessmentWindowEnd());
                progress.setGracePeriodEnd(schedule.getGraceEndDatetime());
            } else {
                // If schedule doesn't have windows, generate them from schedule date + time
                if (schedule.getStartTime() != null && schedule.getEndTime() != null) {
                    LocalDateTime windowStart = LocalDateTime.of(
                        schedule.getScheduledDate(), 
                        schedule.getStartTime()
                    );
                    LocalDateTime windowEnd = LocalDateTime.of(
                        schedule.getScheduledDate(), 
                        schedule.getEndTime()
                    );
                    LocalDateTime graceEnd = windowEnd.plusMinutes(15);
                    
                    progress.setAssessmentWindowStart(windowStart);
                    progress.setAssessmentWindowEnd(windowEnd);
                    progress.setGracePeriodEnd(graceEnd);
                    
                    // Also update the schedule with these windows
                    schedule.setAssessmentWindowStart(windowStart);
                    schedule.setAssessmentWindowEnd(windowEnd);
                    schedule.setGraceEndDatetime(graceEnd);
                }
            }
            
            // Mark assessment as accessible if within window
            LocalDateTime currentTime = LocalDateTime.now();
            boolean isAccessible = !currentTime.isBefore(progress.getAssessmentWindowStart()) &&
                                 !currentTime.isAfter(progress.getAssessmentWindowEnd());
            progress.setAssessmentAccessible(isAccessible);
        }
        
        progressRepository.save(progress);
        
        log.info("✅ Updated progress {} with custom assessment {} - windows set, requires_custom=false, lesson_topic validated", 
            progress.getId(), assessment.getId());
    }

    private LessonTopic getLessonTopic(Long lessonTopicId) {
        return lessonTopicRepository.findById(lessonTopicId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Lesson topic not found: " + lessonTopicId));
    }
}