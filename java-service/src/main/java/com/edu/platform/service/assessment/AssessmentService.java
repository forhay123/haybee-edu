package com.edu.platform.service.assessment;

import com.edu.platform.dto.assessment.*;
import com.edu.platform.event.NotificationEventPublisher;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.exception.UnauthorizedException;
import com.edu.platform.model.*;
import com.edu.platform.model.assessment.*;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.*;
import com.edu.platform.repository.assessment.*;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import com.edu.platform.service.EnrollmentService;
import com.edu.platform.service.progress.LessonProgressService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssessmentService {

    private final AssessmentRepository assessmentRepository;
    private final AssessmentQuestionRepository questionRepository;
    private final AssessmentSubmissionRepository submissionRepository;
    private final AssessmentAnswerRepository answerRepository;
    private final SubjectRepository subjectRepository;
    private final TermRepository termRepository;
    private final LessonTopicRepository lessonTopicRepository;
    private final LessonAIQuestionRepository aiQuestionRepository;
    private final TeacherQuestionBankRepository teacherQuestionRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final LessonProgressService lessonProgressService;
    private final ClassRepository classRepository;
    private final NotificationEventPublisher eventPublisher;
    private final EnrollmentService enrollmentService;
    private final StudentLessonProgressRepository progressRepository;
    

    @Transactional
    public AssessmentDto createAssessment(AssessmentRequest request, User teacher) {
        log.info("Creating assessment: {} for subject: {}", request.getTitle(), request.getSubjectId());

        Subject subject = subjectRepository.findById(request.getSubjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));

        Assessment assessment = Assessment.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .type(request.getType())
                .subject(subject)
                .createdBy(teacher)
                .totalMarks(request.getTotalMarks())
                .passingMarks(request.getPassingMarks())
                .durationMinutes(request.getDurationMinutes())
                .autoGrade(request.getAutoGrade() != null ? request.getAutoGrade() : true)
                .published(request.getPublished() != null ? request.getPublished() : false)
                .dueDate(request.getDueDate())
                .build();

        if (request.getTermId() != null) {
            Term term = termRepository.findById(request.getTermId())
                    .orElseThrow(() -> new ResourceNotFoundException("Term not found"));
            assessment.setTerm(term);
        }

        if (request.getLessonTopicId() != null) {
            LessonTopic lessonTopic = lessonTopicRepository.findById(request.getLessonTopicId())
                    .orElseThrow(() -> new ResourceNotFoundException("Lesson topic not found"));
            assessment.setLessonTopic(lessonTopic);
        }

        assessment = assessmentRepository.save(assessment);
        addQuestionsToAssessment(assessment, request);
        return convertToDto(assessment, null);
    }

    /**
     * ✅ FIXED: Add questions with proper type detection
     */
    private void addQuestionsToAssessment(Assessment assessment, AssessmentRequest request) {
        List<AssessmentQuestion> questions = new ArrayList<>();
        int orderNumber = 1;

        // Add AI-generated questions with smart type detection
        if (request.getNumberOfAIQuestions() != null && request.getNumberOfAIQuestions() > 0 
                && assessment.getLessonTopic() != null) {
            
            List<LessonAIQuestion> aiQuestions = aiQuestionRepository
                    .findByLessonAIResult_LessonTopic_Id(assessment.getLessonTopic().getId())
                    .stream()
                    .limit(request.getNumberOfAIQuestions())
                    .toList();

            for (LessonAIQuestion aiQ : aiQuestions) {
                // ✅ SMART TYPE DETECTION: Check if question has options
                AssessmentQuestion.QuestionType questionType;
                boolean hasAllOptions = aiQ.getOptionA() != null && !aiQ.getOptionA().trim().isEmpty()
                        && aiQ.getOptionB() != null && !aiQ.getOptionB().trim().isEmpty()
                        && aiQ.getOptionC() != null && !aiQ.getOptionC().trim().isEmpty()
                        && aiQ.getOptionD() != null && !aiQ.getOptionD().trim().isEmpty();
                
                if (hasAllOptions) {
                    questionType = AssessmentQuestion.QuestionType.MULTIPLE_CHOICE;
                    log.debug("Question '{}' detected as MULTIPLE_CHOICE", aiQ.getQuestionText());
                } else {
                    // No options = theory/essay question
                    questionType = AssessmentQuestion.QuestionType.ESSAY;
                    log.debug("Question '{}' detected as ESSAY (no options)", aiQ.getQuestionText());
                }
                
                AssessmentQuestion question = AssessmentQuestion.builder()
                        .assessment(assessment)
                        .questionText(aiQ.getQuestionText())
                        .questionType(questionType) // ✅ Dynamic type
                        .optionA(aiQ.getOptionA())
                        .optionB(aiQ.getOptionB())
                        .optionC(aiQ.getOptionC())
                        .optionD(aiQ.getOptionD())
                        .correctAnswer(aiQ.getCorrectOption())
                        .marks(aiQ.getMaxScore() != null ? aiQ.getMaxScore() : 1)
                        .orderNumber(orderNumber++)
                        .aiGenerated(true)
                        .build();
                questions.add(question);
            }
        }

        // Add teacher-created questions
        if (request.getTeacherQuestionIds() != null && !request.getTeacherQuestionIds().isEmpty()) {
            List<TeacherQuestionBank> teacherQuestions = teacherQuestionRepository
                    .findAllById(request.getTeacherQuestionIds());

            for (TeacherQuestionBank tq : teacherQuestions) {
                AssessmentQuestion question = AssessmentQuestion.builder()
                        .assessment(assessment)
                        .questionText(tq.getQuestionText())
                        .questionType(tq.getQuestionType())
                        .optionA(tq.getOptionA())
                        .optionB(tq.getOptionB())
                        .optionC(tq.getOptionC())
                        .optionD(tq.getOptionD())
                        .correctAnswer(tq.getCorrectAnswer())
                        .marks(1)
                        .orderNumber(orderNumber++)
                        .aiGenerated(false)
                        .build();
                questions.add(question);
            }
        }

        if (!questions.isEmpty()) {
            questionRepository.saveAll(questions);
            
            int totalMarks = questions.stream()
                    .mapToInt(q -> q.getMarks() != null ? q.getMarks() : 1)
                    .sum();
            assessment.setTotalMarks(totalMarks);
            assessmentRepository.save(assessment);
            
            log.info("✅ Added {} questions to assessment {} (total marks: {})", 
                    questions.size(), assessment.getId(), totalMarks);
        }
    }

    @Transactional(readOnly = true)
    public AssessmentDto getAssessment(Long id, Long studentProfileId) {
        Assessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment not found"));
        return convertToDto(assessment, studentProfileId);
    }

    @Transactional(readOnly = true)
    public List<AssessmentDto> getAssessmentsBySubject(Long subjectId, Long studentProfileId) {
        List<Assessment> assessments = assessmentRepository.findBySubjectIdAndPublishedTrue(subjectId);
        return assessments.stream()
                .map(a -> convertToDto(a, studentProfileId))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AssessmentQuestionDto> getAssessmentQuestions(Long assessmentId, boolean isTeacher) {
        List<AssessmentQuestion> questions = questionRepository
                .findByAssessmentIdOrderByOrderNumberAsc(assessmentId);
        
        return questions.stream()
                .map(q -> convertQuestionToDto(q, isTeacher))
                .collect(Collectors.toList());
    }

	
    @Transactional
    public AssessmentSubmissionDto submitAssessment(
            AssessmentSubmissionRequest request, 
            Long studentProfileId) {
        
        log.info("Student {} submitting assessment {} at {}", 
                studentProfileId, request.getAssessmentId(), LocalDateTime.now());

        Assessment assessment = assessmentRepository.findById(request.getAssessmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Assessment not found"));

        StudentProfile student = studentProfileRepository.findById(studentProfileId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        if (submissionRepository.existsByAssessmentIdAndStudentId(assessment.getId(), student.getId())) {
            throw new IllegalStateException("Assessment already submitted");
        }

        // ✅ NEW: Validate submission time for INDIVIDUAL student assessments
        LocalDateTime submissionTime = LocalDateTime.now();
        if (assessment.getType() == AssessmentType.LESSON_TOPIC_ASSESSMENT 
                && assessment.getLessonTopic() != null
                && student.getStudentType() == StudentType.INDIVIDUAL) {
            
            validateSubmissionTime(student, assessment.getLessonTopic(), submissionTime);
        }

        AssessmentSubmission submission = AssessmentSubmission.builder()
                .assessment(assessment)
                .student(student)
                .totalMarks(assessment.getTotalMarks())
                .build();

        submission = submissionRepository.save(submission);
        
        List<StudentLessonProgress> progressRecords = progressRepository
        	    .findAllByStudentProfileIdAndAssessmentId(
        	        studentProfileId, 
        	        request.getAssessmentId()
        	    );

        if (!progressRecords.isEmpty()) {
            for (StudentLessonProgress progress : progressRecords) {
                // ❌ OLD: Mark everything as completed
                // progress.setCompleted(true);
                
                // ✅ NEW: Only mark as completed if it doesn't need custom assessment
                if (!Boolean.TRUE.equals(progress.getRequiresCustomAssessment())) {
                    progress.setAssessmentSubmissionId(submission.getId());
                    progress.setCompleted(true);
                    progress.setCompletedAt(LocalDateTime.now());
                    log.info("✅ Marked progress {} as completed (no custom assessment needed)", 
                            progress.getId());
                } else {
                    log.info("⏸️ Skipping progress {} - requires custom assessment", 
                            progress.getId());
                }
            }
            progressRepository.saveAll(progressRecords);
        	    progressRepository.saveAll(progressRecords);
        	    log.info("✅ Updated {} progress record(s) with submission {}", 
        	            progressRecords.size(), submission.getId());
        	} else {
        	    log.warn("⚠️ No progress records found for assessment {} and student {}", 
        	            request.getAssessmentId(), studentProfileId);
        	}

        List<AssessmentAnswer> answers = new ArrayList<>();
        double totalScore = 0.0;

        for (AssessmentSubmissionRequest.AnswerDto answerDto : request.getAnswers()) {
            AssessmentQuestion question = questionRepository.findById(answerDto.getQuestionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Question not found"));

            AssessmentAnswer answer = AssessmentAnswer.builder()
                    .submission(submission)
                    .question(question)
                    .studentAnswer(answerDto.getStudentAnswer())
                    .build();

            // ✅ Auto-grade ONLY multiple choice questions
            if (assessment.getAutoGrade() && 
                question.getQuestionType() == AssessmentQuestion.QuestionType.MULTIPLE_CHOICE) {
                
                boolean isCorrect = question.getCorrectAnswer() != null &&
                        question.getCorrectAnswer().equalsIgnoreCase(answerDto.getStudentAnswer().trim());
                
                answer.setIsCorrect(isCorrect);
                answer.setMarksObtained(isCorrect ? question.getMarks().doubleValue() : 0.0);
                totalScore += answer.getMarksObtained();
                
                log.debug("Auto-graded MCQ {}: {} (correct: {})", 
                        question.getId(), isCorrect ? "✓" : "✗", question.getCorrectAnswer());
            } else {
                // Essay/Short answer - needs manual grading
                log.debug("Essay/Theory question {} - requires manual grading", question.getId());
            }

            answers.add(answer);
        }

        answerRepository.saveAll(answers);

        // Update submission with score (only if fully auto-gradable)
        if (assessment.getAutoGrade()) {
            submission.setScore(totalScore);
            submission.setPercentage((totalScore / assessment.getTotalMarks()) * 100);
            submission.setPassed(submission.getPercentage() >= 
                    ((assessment.getPassingMarks().doubleValue() / assessment.getTotalMarks()) * 100));
            submission.setGraded(true);
            submission.setGradedAt(LocalDateTime.now());
            submission = submissionRepository.save(submission);
        }

        // Auto-complete lesson progress (now with submission time validation)
        if (assessment.getType() == AssessmentType.LESSON_TOPIC_ASSESSMENT 
                && assessment.getLessonTopic() != null) {
            try {
                lessonProgressService.autoCompleteOnAssessmentSubmission(
                        student,
                        assessment.getLessonTopic(),
                        submission.getId(),
                        LocalDate.now(),
                        submissionTime // ✅ Pass submission time
                );
                log.info("✅ Lesson progress auto-completed for submission {}", submission.getId());
            } catch (Exception e) {
                log.error("❌ Failed to auto-complete lesson progress: {}", e.getMessage());
                // If progress completion fails due to time validation, rollback submission
                if (e instanceof IllegalStateException) {
                    throw e;
                }
            }
        }

        // Notify teacher about submission
        try {
            User teacher = assessment.getCreatedBy();
            if (teacher != null) {
                String studentName = student.getUser().getFullName();
                eventPublisher.publishAssessmentSubmitted(
                        submission, 
                        teacher.getId(), 
                        studentName
                );
                log.info("📧 Published submission event for teacher {} (Student: {})", 
                        teacher.getEmail(), studentName);
            } else {
                log.warn("⚠️ Assessment {} has no teacher assigned, skipping notification", 
                        assessment.getId());
            }
        } catch (Exception e) {
            log.error("❌ Failed to publish submission event: {}", e.getMessage());
            // Don't fail submission if notification fails
        }

        return convertSubmissionToDto(submission);
    }

    /**
     * ✅ NEW: Validate submission time against assessment window
     * Enforces strict per-period deadlines with 5-minute grace tolerance
     */
    private void validateSubmissionTime(
            StudentProfile student, 
            LessonTopic lessonTopic, 
            LocalDateTime submissionTime) {
        
        LocalDate today = submissionTime.toLocalDate();
        
        // Find today's progress records for this lesson
        List<StudentLessonProgress> progressList = progressRepository
                .findByStudentProfileAndLessonTopicAndScheduledDate(
                        student, lessonTopic, today);
        
        if (progressList.isEmpty()) {
            log.warn("⚠️ No progress record found for validation");
            return; // Allow submission if no progress record (shouldn't happen)
        }
        
        // Find the accessible progress record
        StudentLessonProgress progress = progressList.stream()
                .filter(p -> p.isAssessmentAccessible() && !p.isCompleted())
                .findFirst()
                .orElse(null);
        
        if (progress == null) {
            throw new IllegalStateException(
                    "No accessible assessment found for this lesson today. " +
                    "Assessment window may not be open or you may have already submitted."
            );
        }
        
        // Check if submission is past grace deadline
        LocalDateTime graceDeadline = progress.getAssessmentWindowEnd().plusMinutes(5);
        
        if (submissionTime.isAfter(graceDeadline)) {
            long minutesLate = java.time.Duration.between(
                    progress.getAssessmentWindowEnd(), 
                    submissionTime
            ).toMinutes();
            
            log.error("❌ Submission rejected - {} minutes past deadline", minutesLate);
            throw new IllegalStateException(String.format(
                    "Assessment window closed. Deadline was %s (5-minute grace period expired). " +
                    "You attempted to submit %d minutes late.",
                    progress.getAssessmentWindowEnd().toLocalTime(),
                    minutesLate
            ));
        }
        
        // Check if in grace period
        if (submissionTime.isAfter(progress.getAssessmentWindowEnd())) {
            long minutesLate = java.time.Duration.between(
                    progress.getAssessmentWindowEnd(), 
                    submissionTime
            ).toMinutes();
            
            log.warn("⚠️ Late submission accepted - {} minutes within grace period", minutesLate);
            
            // Log for admin review
            log.info("📝 LATE_SUBMISSION: Student={}, Assessment={}, Minutes Late={}", 
                    student.getId(), lessonTopic.getId(), minutesLate);
        }
        
        log.debug("✅ Submission time validated successfully");
    }

    // ✅ Add this method to AssessmentService as well
    /**
     * Check if assessment is currently accessible for submission
     */
    @Transactional(readOnly = true)
    public boolean isAssessmentAccessibleForSubmission(
            Long assessmentId, 
            Long studentProfileId) {
        
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment not found"));
        
        if (assessment.getType() != AssessmentType.LESSON_TOPIC_ASSESSMENT) {
            return true; // Non-lesson assessments are always accessible
        }
        
        StudentProfile student = studentProfileRepository.findById(studentProfileId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        
        if (student.getStudentType() != StudentType.INDIVIDUAL) {
            return true; // Only INDIVIDUAL students have time restrictions
        }
        
        if (assessment.getLessonTopic() == null) {
            return true;
        }
        
        LocalDate today = LocalDate.now();
        List<StudentLessonProgress> progressList = progressRepository
                .findByStudentProfileAndLessonTopicAndScheduledDate(
                        student, assessment.getLessonTopic(), today);
        
        return progressList.stream()
                .anyMatch(p -> p.isAssessmentAccessible() && !p.isCompleted());
    }
    
    
    @Transactional(readOnly = true)
    public List<AssessmentSubmissionDto> getAssessmentSubmissions(Long assessmentId) {
        List<AssessmentSubmission> submissions = submissionRepository.findByAssessmentId(assessmentId);
        return submissions.stream()
                .map(this::convertSubmissionToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AssessmentDto getAssessmentByLessonTopic(Long lessonTopicId, Long studentProfileId) {
        log.info("Getting assessment for lesson topic: {}", lessonTopicId);
        List<Assessment> assessments = assessmentRepository.findByLessonTopicIdAndType(
            lessonTopicId, AssessmentType.LESSON_TOPIC_ASSESSMENT
        );
        if (assessments.isEmpty()) {
            throw new ResourceNotFoundException("No assessment found for lesson topic: " + lessonTopicId);
        }
        return convertToDto(assessments.get(0), studentProfileId);
    }

    @Transactional(readOnly = true)
    public AssessmentSubmissionDto getSubmissionByLessonAndStudent(Long lessonTopicId, Long studentProfileId) {
        List<Assessment> assessments = assessmentRepository.findByLessonTopicIdAndType(
            lessonTopicId, AssessmentType.LESSON_TOPIC_ASSESSMENT
        );
        if (assessments.isEmpty()) {
            throw new ResourceNotFoundException("No assessment found for this lesson topic");
        }
        AssessmentSubmission submission = submissionRepository
            .findByAssessmentIdAndStudentId(assessments.get(0).getId(), studentProfileId)
            .orElseThrow(() -> new ResourceNotFoundException("No submission found"));
        return convertSubmissionToDto(submission);
    }

    @Transactional(readOnly = true)
    public AssessmentSubmissionDto getSubmissionResults(Long submissionId) {
        AssessmentSubmission submission = submissionRepository.findById(submissionId)
            .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));
        return convertSubmissionToDto(submission);
    }

    @Transactional(readOnly = true)
    public List<AssessmentSubmissionDto> getStudentAssessments(
            Long studentProfileId, AssessmentType type, Long subjectId) {
        List<AssessmentSubmission> submissions;
        if (subjectId != null) {
            submissions = submissionRepository.findByStudentIdAndAssessmentSubjectId(
                studentProfileId, subjectId
            );
        } else {
            submissions = submissionRepository.findByStudentId(studentProfileId);
        }
        return submissions.stream()
            .filter(s -> s.getAssessment().getType() == type)
            .map(this::convertSubmissionToDto)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStudentAssessmentStats(
            Long studentProfileId, AssessmentType type, Long subjectId) {
        List<AssessmentSubmissionDto> submissions = getStudentAssessments(studentProfileId, type, subjectId);
        int totalAssessments = submissions.size();
        int passedAssessments = (int) submissions.stream()
            .filter(AssessmentSubmissionDto::getPassed)
            .count();
        double averageScore = submissions.stream()
            .filter(s -> s.getPercentage() != null)
            .mapToDouble(AssessmentSubmissionDto::getPercentage)
            .average()
            .orElse(0.0);
        double highestScore = submissions.stream()
            .filter(s -> s.getPercentage() != null)
            .mapToDouble(AssessmentSubmissionDto::getPercentage)
            .max()
            .orElse(0.0);
        double lowestScore = submissions.stream()
            .filter(s -> s.getPercentage() != null)
            .mapToDouble(AssessmentSubmissionDto::getPercentage)
            .min()
            .orElse(0.0);
        return Map.of(
            "totalAssessments", totalAssessments,
            "passedAssessments", passedAssessments,
            "failedAssessments", totalAssessments - passedAssessments,
            "averageScore", Math.round(averageScore * 100.0) / 100.0,
            "highestScore", highestScore,
            "lowestScore", lowestScore,
            "passRate", totalAssessments > 0 
                ? Math.round((passedAssessments * 100.0 / totalAssessments) * 100.0) / 100.0 
                : 0.0
        );
    }

    public AssessmentDto convertToDto(Assessment assessment, Long studentProfileId) {
        AssessmentDto dto = AssessmentDto.builder()
                .id(assessment.getId())
                .title(assessment.getTitle())
                .description(assessment.getDescription())
                .type(assessment.getType())
                .subjectId(assessment.getSubject().getId())
                .subjectName(assessment.getSubject().getName())
                .totalMarks(assessment.getTotalMarks())
                .passingMarks(assessment.getPassingMarks())
                .durationMinutes(assessment.getDurationMinutes())
                .autoGrade(assessment.getAutoGrade())
                .published(assessment.getPublished())
                .dueDate(assessment.getDueDate())
                .createdAt(assessment.getCreatedAt())
                .updatedAt(assessment.getUpdatedAt())
                .questionCount((int) questionRepository.countByAssessmentId(assessment.getId()))
                .build();

        if (assessment.getTerm() != null) {
            dto.setTermId(assessment.getTerm().getId());
            dto.setTermName(assessment.getTerm().getName());
        }
        if (assessment.getLessonTopic() != null) {
            dto.setLessonTopicId(assessment.getLessonTopic().getId());
            dto.setLessonTopicTitle(assessment.getLessonTopic().getTopicTitle());
        }
        if (assessment.getCreatedBy() != null) {
            dto.setCreatedById(assessment.getCreatedBy().getId());
            dto.setCreatedByName(assessment.getCreatedBy().getFullName());
        }
        
        // ✅ FIXED: Include submissionId when student has submitted
        if (studentProfileId != null) {
            submissionRepository.findByAssessmentIdAndStudentId(assessment.getId(), studentProfileId)
                    .ifPresent(submission -> {
                        dto.setHasSubmitted(true);
                        dto.setSubmissionId(submission.getId()); // ✅ ADD THIS LINE
                        dto.setStudentScore(submission.getScore());
                        dto.setStudentPassed(submission.getPassed());
                    });
        }
        
        return dto;
    }

    private AssessmentQuestionDto convertQuestionToDto(AssessmentQuestion question, boolean isTeacher) {
        AssessmentQuestionDto dto = AssessmentQuestionDto.builder()
                .id(question.getId())
                .assessmentId(question.getAssessment().getId())
                .questionText(question.getQuestionText())
                .questionType(question.getQuestionType())
                .optionA(question.getOptionA())
                .optionB(question.getOptionB())
                .optionC(question.getOptionC())
                .optionD(question.getOptionD())
                .marks(question.getMarks())
                .orderNumber(question.getOrderNumber())
                .aiGenerated(question.getAiGenerated())
                .build();
        if (isTeacher) {
            dto.setCorrectAnswer(question.getCorrectAnswer());
        }
        return dto;
    }

    private AssessmentAnswerDto convertAnswerToDto(AssessmentAnswer answer) {
        return AssessmentAnswerDto.builder()
                .id(answer.getId())
                .questionId(answer.getQuestion().getId())
                .questionText(answer.getQuestion().getQuestionText())
                .questionType(answer.getQuestion().getQuestionType())
                .studentAnswer(answer.getStudentAnswer())
                .correctAnswer(answer.getQuestion().getCorrectAnswer())
                .isCorrect(answer.getIsCorrect())
                .marksObtained(answer.getMarksObtained())
                .maxMarks(answer.getQuestion().getMarks())
                .teacherFeedback(answer.getTeacherFeedback())
                .build();
    }

    private AssessmentSubmissionDto convertSubmissionToDto(AssessmentSubmission submission) {
        List<AssessmentAnswerDto> answerDtos = answerRepository.findBySubmissionId(submission.getId())
                .stream()
                .map(this::convertAnswerToDto)
                .collect(Collectors.toList());
        
        return AssessmentSubmissionDto.builder()
                .id(submission.getId())
                .assessmentId(submission.getAssessment().getId())
                .assessmentTitle(submission.getAssessment().getTitle())
                .studentId(submission.getStudent().getId())
                .studentName(submission.getStudent().getUser().getFullName())
                .lessonTopicId(submission.getAssessment().getLessonTopic() != null 
                        ? submission.getAssessment().getLessonTopic().getId() 
                        : null)
                .submittedAt(submission.getSubmittedAt())
                .score(submission.getScore())
                .totalMarks(submission.getTotalMarks())
                .percentage(submission.getPercentage())
                .passed(submission.getPassed())
                .graded(submission.getGraded())
                .gradedAt(submission.getGradedAt())
                .answers(answerDtos)
                .build();
    }
    
    
    /**
     * ✅ Get all assessments created by a specific teacher
     */
    @Transactional(readOnly = true)
    public List<AssessmentDto> getAssessmentsByTeacher(Long teacherId) {
        log.info("Fetching assessments created by teacher ID: {}", teacherId);
        
        List<Assessment> assessments = assessmentRepository.findByCreatedBy_Id(teacherId);
        
        return assessments.stream()
                .map(a -> convertToDto(a, null))
                .collect(Collectors.toList());
    }

    /**
     * ✅ Get assessments created by a teacher for a specific subject
     */
    @Transactional(readOnly = true)
    public List<AssessmentDto> getAssessmentsByTeacherAndSubject(Long teacherId, Long subjectId) {
        log.info("Fetching assessments created by teacher {} for subject {}", teacherId, subjectId);
        
        List<Assessment> assessments = assessmentRepository.findByCreatedBy_Id(teacherId);
        
        // Filter by subject
        return assessments.stream()
                .filter(a -> a.getSubject().getId().equals(subjectId))
                .map(a -> convertToDto(a, null))
                .collect(Collectors.toList());
    }

    /**
     * ✅ Toggle publish status of an assessment
     * 🔔 UPDATED: Now publishes assessment published events
     */
    @Transactional
    public AssessmentDto togglePublish(Long assessmentId, User teacher) {
        log.info("Toggling publish status for assessment {} by teacher {}", assessmentId, teacher.getEmail());
        
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment not found"));
        
        // Verify ownership
        if (!assessment.getCreatedBy().getId().equals(teacher.getId())) {
            throw new IllegalStateException("You can only publish/unpublish your own assessments");
        }
        
        assessment.setPublished(!assessment.getPublished());
        assessment = assessmentRepository.save(assessment);
        
        // 🔔 NEW CODE: If assessment was just published, notify students
        if (assessment.getPublished()) {
            try {
                // Get all enrolled student user IDs for this subject
                List<Long> studentUserIds = enrollmentService.getStudentUserIdsBySubjectId(
                    assessment.getSubject().getId()
                );
                
                if (!studentUserIds.isEmpty()) {
                    // Publish event (creates notifications for all students)
                    eventPublisher.publishAssessmentPublished(assessment, studentUserIds);
                    log.info("📢 Published {} assessment published events for subject {} (students: {})", 
                            studentUserIds.size(), 
                            assessment.getSubject().getName(),
                            studentUserIds);
                } else {
                    log.warn("⚠️ No students enrolled in subject {} for assessment {}", 
                            assessment.getSubject().getName(), 
                            assessmentId);
                }
            } catch (Exception e) {
                log.error("❌ Failed to send assessment published notifications: {}", e.getMessage(), e);
                // Don't fail the publish operation if notifications fail
            }
        }
        
        log.info("Assessment {} publish status set to: {}", assessmentId, assessment.getPublished());
        return convertToDto(assessment, null);
    }

    /**
     * ✅ Update an existing assessment
     */
    @Transactional
    public AssessmentDto updateAssessment(Long assessmentId, AssessmentRequest request, User teacher) {
        log.info("Updating assessment {} by teacher {}", assessmentId, teacher.getEmail());
        
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment not found"));
        
        // Verify ownership
        if (!assessment.getCreatedBy().getId().equals(teacher.getId())) {
            throw new IllegalStateException("You can only update your own assessments");
        }
        
        // Update basic fields
        assessment.setTitle(request.getTitle());
        assessment.setDescription(request.getDescription());
        assessment.setType(request.getType());
        assessment.setTotalMarks(request.getTotalMarks());
        assessment.setPassingMarks(request.getPassingMarks());
        assessment.setDurationMinutes(request.getDurationMinutes());
        assessment.setDueDate(request.getDueDate());
        
        if (request.getAutoGrade() != null) {
            assessment.setAutoGrade(request.getAutoGrade());
        }
        if (request.getPublished() != null) {
            assessment.setPublished(request.getPublished());
        }
        
        // Update subject if changed
        if (request.getSubjectId() != null && !assessment.getSubject().getId().equals(request.getSubjectId())) {
            Subject subject = subjectRepository.findById(request.getSubjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
            assessment.setSubject(subject);
        }
        
        // Update term if provided
        if (request.getTermId() != null) {
            Term term = termRepository.findById(request.getTermId())
                    .orElseThrow(() -> new ResourceNotFoundException("Term not found"));
            assessment.setTerm(term);
        }
        
        // Update lesson topic if provided
        if (request.getLessonTopicId() != null) {
            LessonTopic lessonTopic = lessonTopicRepository.findById(request.getLessonTopicId())
                    .orElseThrow(() -> new ResourceNotFoundException("Lesson topic not found"));
            assessment.setLessonTopic(lessonTopic);
        }
        
        assessment = assessmentRepository.save(assessment);
        
        // Note: Questions are not updated here. If you need to update questions,
        // you should create separate endpoints for adding/removing/updating questions
        
        log.info("✅ Assessment {} updated successfully", assessmentId);
        return convertToDto(assessment, null);
    }

    /**
     * ✅ Delete an assessment
     */
    @Transactional
    public void deleteAssessment(Long assessmentId, User teacher) {
        log.info("Deleting assessment {} by teacher {}", assessmentId, teacher.getEmail());
        
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment not found"));
        
        // Verify ownership
        if (!assessment.getCreatedBy().getId().equals(teacher.getId())) {
            throw new IllegalStateException("You can only delete your own assessments");
        }
        
        // Check if there are any submissions
        long submissionCount = submissionRepository.countByAssessmentId(assessmentId);
        if (submissionCount > 0) {
            throw new IllegalStateException(
                    "Cannot delete assessment with existing submissions. Found " + submissionCount + " submission(s)."
            );
        }
        
        // Delete all questions first (cascade should handle this, but being explicit)
        questionRepository.deleteByAssessmentId(assessmentId);
        
        // Delete the assessment
        assessmentRepository.delete(assessment);
        
        log.info("✅ Assessment {} deleted successfully", assessmentId);
    }
    
    
    /**
     * Get all assessments available to a student
     * This includes published assessments from subjects the student is enrolled in
     */
    @Transactional(readOnly = true)
    public List<AssessmentDto> getAssessmentsForStudent(Long studentProfileId) {
        log.info("📚 Fetching assessments for student profile {}", studentProfileId);
        
        // Fetch the student profile
        StudentProfile studentProfile = studentProfileRepository.findById(studentProfileId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found: " + studentProfileId));
        
        // Get subject IDs based on student's class and department (dynamic calculation)
        List<Long> subjectIds = getSubjectIdsForStudent(studentProfile);
        
        if (subjectIds.isEmpty()) {
            log.info("⚠️ Student has no subject enrollments");
            return List.of();
        }
        
        log.info("🔍 Student enrolled in {} subjects: {}", subjectIds.size(), subjectIds);
        
        // Get all published assessments for those subjects
        List<Assessment> assessments = assessmentRepository.findBySubject_IdInAndPublishedTrue(subjectIds);
        
        log.info("✅ Found {} published assessments", assessments.size());
        
        // Convert to DTOs with student-specific data (submission status, scores, etc.)
        return assessments.stream()
                .map(assessment -> convertToDto(assessment, studentProfileId))
                .collect(Collectors.toList());
    }

    /**
     * Get subject IDs for a student based on their class and department
     * ✅ FIXED: Now properly filters by StudentType like SubjectService does
     */
    private List<Long> getSubjectIdsForStudent(StudentProfile studentProfile) {
        if (studentProfile.getClassLevel() == null) {
            log.warn("⚠️ Student profile {} has no class assigned", studentProfile.getId());
            return List.of();
        }
        
        Long classId = studentProfile.getClassLevel().getId();
        Long departmentId = studentProfile.getDepartment() != null ? 
                studentProfile.getDepartment().getId() : null;
        String className = studentProfile.getClassLevel().getName();
        StudentType studentType = studentProfile.getStudentType(); // ✅ CRITICAL: Get student type
        
        log.info("🔍 Getting subjects for student profile {}: class={} (ID={}), department={}, type={}", 
                studentProfile.getId(), className, classId, departmentId, studentType);
        
        // Extract grade from class name (e.g., "SSS1 Science" -> "SSS1")
        String grade = extractGrade(className);
        log.info("📚 Extracted grade: {}", grade);
        
        List<Long> subjectIds = new ArrayList<>();
        
        // ✅ CRITICAL FIX: Find allowed classes for THIS student type only
        List<Long> allowedClassIds = findClassesByGradeAndStudentType(grade, studentType);
        log.info("🏫 Allowed class IDs for grade={}, type={}: {}", grade, studentType, allowedClassIds);
        
        if (allowedClassIds.isEmpty()) {
            log.warn("⚠️ No classes found for grade={}, type={}", grade, studentType);
            return List.of();
        }
        
        // 1. Get general/compulsory subjects for this grade and student type
        // Find the "General" class for this student type
        List<ClassEntity> allClasses = classRepository.findAll();
        List<Long> generalClassIds = allClasses.stream()
                .filter(c -> c.getName().contains(grade) && 
                            c.getName().contains("General") &&
                            c.getStudentType() == studentType) // ✅ FIXED: Use == for enum comparison
                .map(ClassEntity::getId)
                .collect(Collectors.toList());
        
        if (!generalClassIds.isEmpty()) {
            List<Subject> generalSubjects = subjectRepository.findByClassEntityId(generalClassIds.get(0));
            log.info("📚 Found {} general subjects from class IDs: {}", generalSubjects.size(), generalClassIds);
            
            subjectIds.addAll(generalSubjects.stream()
                    .map(Subject::getId)
                    .collect(Collectors.toList()));
            
            generalSubjects.forEach(subject -> 
                log.debug("  - General: {} (ID={})", subject.getName(), subject.getId())
            );
        } else {
            log.warn("⚠️ No general class found for grade={}, type={}", grade, studentType);
        }
        
        // 2. Get departmental subjects for the student's specific class
        List<Subject> classSubjects = subjectRepository.findByClassEntityId(classId);
        log.info("📚 Found {} departmental subjects for classId {}", classSubjects.size(), classId);
        
        classSubjects.forEach(subject -> {
            if (!subjectIds.contains(subject.getId())) {
                subjectIds.add(subject.getId());
                log.debug("  - Departmental: {} (ID={})", subject.getName(), subject.getId());
            }
        });
        
        log.info("✅ Total {} subjects found for student: {}", subjectIds.size(), subjectIds);
        
        return subjectIds;
    }

    /**
     * ✅ CRITICAL: Find classes by grade AND student type
     * This mirrors the logic in SubjectService
     */
    private List<Long> findClassesByGradeAndStudentType(String grade, StudentType type) {
        log.info("🔎 Finding classes for grade={}, type={}", grade, type);
        
        List<ClassEntity> allClasses = classRepository.findAll();
        log.info("📋 Total classes in database: {}", allClasses.size());
        
        List<Long> result = allClasses.stream()
                .filter(cls -> {
                    String classGrade = extractGrade(cls.getName());
                    boolean gradeMatches = grade.equals(classGrade);
                    
                    if (!gradeMatches) {
                        return false;
                    }
                    
                    // ✅ CRITICAL: Use the studentType field from ClassEntity
                    StudentType classStudentType = cls.getStudentType();
                    boolean typeMatches = (classStudentType == type); // ✅ Use == for enum
                    
                    log.debug("  📝 Class: {} | Grade: {} | Type: {} | RequestedType: {} | Matches: {}", 
                             cls.getName(), classGrade, classStudentType, type, typeMatches);
                    
                    return typeMatches;
                })
                .map(ClassEntity::getId)
                .collect(Collectors.toList());
        
        log.info("✅ Filtered to {} matching classes: {}", result.size(), result);
        return result;
    }
    
    
    /**
     * Get submission by submission ID
     * ✅ UPDATED: Uses eager fetching to avoid LazyInitializationException
     */
    @Transactional(readOnly = true)
    public AssessmentSubmissionDto getSubmissionById(Long submissionId) {
        log.info("📋 Fetching submission by ID: {}", submissionId);
        
        AssessmentSubmission submission = submissionRepository
            .findByIdWithDetails(submissionId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Assessment submission not found: " + submissionId));
        
        log.info("✅ Found submission {} for student {}", 
                 submissionId, submission.getStudent().getId());
        
        return AssessmentSubmissionDto.fromEntity(submission);
    }

    /**
     * ✅ NEW: Get submission by assessment ID and student profile ID
     * Returns null if no submission exists
     */
    @Transactional(readOnly = true)
    public AssessmentSubmissionDto getSubmissionByAssessmentAndStudent(
        Long assessmentId, 
        Long studentProfileId
    ) {
        log.info("📋 Fetching submission for assessment {} and student {}", 
                 assessmentId, studentProfileId);
        
        Optional<AssessmentSubmission> submissionOpt = submissionRepository
            .findByAssessmentIdAndStudentIdWithDetails(assessmentId, studentProfileId);
        
        if (submissionOpt.isEmpty()) {
            log.warn("❌ No submission found for assessment {} and student {}", 
                     assessmentId, studentProfileId);
            return null;
        }
        
        AssessmentSubmission submission = submissionOpt.get();
        
        log.info("✅ Found submission {} (submitted at: {})", 
                 submission.getId(), submission.getSubmittedAt());
        
        return AssessmentSubmissionDto.fromEntity(submission);
    }
    
    
    /**
     * ✅ NEW: Get all submissions for a student (across all assessments)
     */
    @Transactional(readOnly = true)
    public List<AssessmentSubmissionDto> getStudentSubmissions(Long studentProfileId) {
        log.info("📚 Fetching all submissions for student profile {}", studentProfileId);
        
        List<AssessmentSubmission> submissions = submissionRepository.findByStudentId(studentProfileId);
        
        log.info("✅ Found {} total submissions", submissions.size());
        
        return submissions.stream()
                .map(this::convertSubmissionToDto)
                .collect(Collectors.toList());
    }

    /**
     * Extract grade from class name
     * E.g., "SSS1 Science HOME" -> "SSS1", "JSS2 Art SCHOOL" -> "JSS2"
     */
    private String extractGrade(String className) {
        if (className == null) return "";
        
        // Common patterns: "JSS1", "JSS2", "JSS3", "SSS1", "SSS2", "SSS3"
        if (className.startsWith("JSS")) {
            return className.substring(0, 4); // "JSS1", "JSS2", "JSS3"
        } else if (className.startsWith("SSS")) {
            return className.substring(0, 4); // "SSS1", "SSS2", "SSS3"
        }
        
        // Fallback: take first word
        return className.split(" ")[0];
    }
    
	
	/**
	 * ✅ NEW: Get custom assessment for a specific student, subject, and period
	 * Returns null if no custom assessment exists yet
	 */
	@Transactional(readOnly = true)
	public AssessmentDto getCustomAssessmentForPeriod(
	        Long studentId, 
	        Long subjectId, 
	        Integer periodNumber) {
	    
	    log.info("🔍 Looking for custom assessment - Student: {}, Subject: {}, Period: {}", 
	            studentId, subjectId, periodNumber);
	    
	    // Find custom assessments for this student/subject/period
	    Optional<Assessment> customAssessment = assessmentRepository.findAll().stream()
	            .filter(Assessment::isCustomAssessment)
	            .filter(a -> a.getTargetStudentProfile() != null 
	                    && a.getTargetStudentProfile().getId().equals(studentId))
	            .filter(a -> a.getSubject() != null 
	                    && a.getSubject().getId().equals(subjectId))
	            .filter(a -> a.getPeriodNumber() != null 
	                    && a.getPeriodNumber().equals(periodNumber))
	            .findFirst();
	    
	    if (customAssessment.isEmpty()) {
	        log.info("❌ No custom assessment found for student {}, subject {}, period {}", 
	                studentId, subjectId, periodNumber);
	        return null;
	    }
	    
	    log.info("✅ Found custom assessment {} for student {}", 
	            customAssessment.get().getId(), studentId);
	    
	    return convertToDto(customAssessment.get(), studentId);
	}
	
	/**
	 * ✅ UPDATED: Get assessments by subject with custom assessment filtering
	 * Students only see custom assessments targeted to them
	 */
	@Transactional(readOnly = true)
	public List<AssessmentDto> getAssessmentsBySubjectFiltered(
	        Long subjectId, 
	        Long studentProfileId, 
	        User user) {
	    
	    log.info("📚 Getting assessments for subject {} (student: {})", subjectId, studentProfileId);
	    
	    List<Assessment> allAssessments = assessmentRepository.findBySubjectIdAndPublishedTrue(subjectId);
	    
	    // Filter based on user role and custom assessment rules
	    List<Assessment> filteredAssessments = allAssessments.stream()
	            .filter(assessment -> {
	                // If not a custom assessment, everyone can see it
	                if (!assessment.isCustomAssessment()) {
	                    return true;
	                }
	                
	                // Custom assessments: only visible to target student or teacher who created it
	                if (studentProfileId != null && assessment.isForStudent(studentProfileId)) {
	                    log.debug("✓ Including custom assessment {} for target student {}", 
	                            assessment.getId(), studentProfileId);
	                    return true;
	                }
	                
	                if (user != null && assessment.getCreatedBy() != null 
	                        && assessment.getCreatedBy().getId().equals(user.getId())) {
	                    log.debug("✓ Including custom assessment {} for creator teacher", 
	                            assessment.getId());
	                    return true;
	                }
	                
	                // Hide custom assessments meant for other students
	                log.debug("✗ Hiding custom assessment {} (not for this student)", assessment.getId());
	                return false;
	            })
	            .collect(Collectors.toList());
	    
	    log.info("✅ Returning {} assessments ({} hidden due to custom assessment rules)", 
	            filteredAssessments.size(), 
	            allAssessments.size() - filteredAssessments.size());
	    
	    return filteredAssessments.stream()
	            .map(a -> convertToDto(a, studentProfileId))
	            .collect(Collectors.toList());
	}
	
	/**
	 * ✅ NEW: Check if custom assessment is needed for a progress record
	 * Used by frontend to show "Waiting for teacher" messages
	 */
	@Transactional(readOnly = true)
	public boolean isWaitingForCustomAssessment(Long progressId) {
	    StudentLessonProgress progress = progressRepository.findById(progressId)
	            .orElse(null);
	    
	    if (progress == null) {
	        return false;
	    }
	    
	    return Boolean.TRUE.equals(progress.getRequiresCustomAssessment()) 
	            && progress.getAssessment() == null;
	}
	
	/**
	 * ✅ NEW: Get all custom assessments created by a teacher
	 * Used in teacher dashboard to show what custom assessments they've created
	 */
	@Transactional(readOnly = true)
	public List<AssessmentDto> getCustomAssessmentsByTeacher(Long teacherId) {
	    log.info("📋 Getting custom assessments created by teacher {}", teacherId);
	    
	    List<Assessment> customAssessments = assessmentRepository.findByCreatedBy_Id(teacherId).stream()
	            .filter(Assessment::isCustomAssessment)
	            .collect(Collectors.toList());
	    
	    log.info("✅ Found {} custom assessments for teacher {}", customAssessments.size(), teacherId);
	    
	    return customAssessments.stream()
	            .map(a -> convertToDto(a, null))
	            .collect(Collectors.toList());
	}
	
	/**
	 * ✅ NEW: Get custom assessments for a specific student
	 * Shows student which custom assessments teachers have created for them
	 */
	@Transactional(readOnly = true)
	public List<AssessmentDto> getCustomAssessmentsForStudent(Long studentProfileId) {
	    log.info("📋 Getting custom assessments for student {}", studentProfileId);
	    
	    List<Assessment> customAssessments = assessmentRepository.findAll().stream()
	            .filter(Assessment::isCustomAssessment)
	            .filter(a -> a.isForStudent(studentProfileId))
	            .collect(Collectors.toList());
	    
	    log.info("✅ Found {} custom assessments for student {}", customAssessments.size(), studentProfileId);
	    
	    return customAssessments.stream()
	            .map(a -> convertToDto(a, studentProfileId))
	            .collect(Collectors.toList());
	}
	
	/**
	 * ✅ NEW: Get assessment with access validation
	 * Enforces that students can only access custom assessments targeted to them
	 */
	@Transactional(readOnly = true)
	public AssessmentDto getAssessmentWithAccessCheck(Long assessmentId, Long studentProfileId) {
	    log.info("🔍 Getting assessment {} for student {}", assessmentId, studentProfileId);
	    
	    Assessment assessment = assessmentRepository.findById(assessmentId)
	            .orElseThrow(() -> new ResourceNotFoundException("Assessment not found: " + assessmentId));
	    
	    // Check access for custom assessments
	    if (assessment.isCustomAssessment()) {
	        if (!assessment.isAccessibleToStudent(studentProfileId)) {
	            log.error("❌ Access denied: Assessment {} is custom for another student", assessmentId);
	            throw new UnauthorizedException(
	                    "You do not have permission to access this assessment");
	        }
	    }
	    
	    log.info("✅ Access granted to assessment {}", assessmentId);
	    return convertToDto(assessment, studentProfileId);
	}
	
	/**
	 * ✅ NEW: Check if assessment is accessible to student
	 * Used before allowing submission or viewing
	 */
	@Transactional(readOnly = true)
	public boolean canStudentAccessAssessment(Long assessmentId, Long studentProfileId) {
	    Assessment assessment = assessmentRepository.findById(assessmentId)
	            .orElse(null);
	    
	    if (assessment == null) {
	        return false;
	    }
	    
	    // Regular assessments are accessible to all
	    if (!assessment.isCustomAssessment()) {
	        return true;
	    }
	    
	    // Custom assessments only accessible to target student
	    return assessment.isAccessibleToStudent(studentProfileId);
	}
	
	/**
	 * ✅ UPDATED: Enhanced DTO conversion with custom assessment info
	 */
	private AssessmentDto convertToDtoEnhanced(Assessment assessment, Long studentProfileId) {
	    AssessmentDto dto = convertToDto(assessment, studentProfileId);
	    
	    // Add custom assessment metadata
	    if (assessment.isCustomAssessment()) {
	        dto.setIsCustomAssessment(true);
	        dto.setPeriodNumber(assessment.getPeriodNumber());
	        
	        if (assessment.getTargetStudentProfile() != null) {
	            dto.setTargetStudentId(assessment.getTargetStudentId());
	            dto.setTargetStudentName(assessment.getTargetStudentProfile().getUser().getFullName());
	        }
	        
	        if (assessment.getParentAssessment() != null) {
	            dto.setParentAssessmentId(assessment.getParentAssessmentId());
	            dto.setParentAssessmentTitle(assessment.getParentAssessment().getTitle());
	        }
	    }
	    
	    return dto;
	}
	
	
	/**
	 * ✅ NEW: Create zero-score submission for missed assessment
	 * Returns the submission ID
	 */
	@Transactional
	public Long createZeroScoreSubmission(
	        Long assessmentId, 
	        Long studentProfileId, 
	        String missedReason) {
	    
	    log.info("📝 Creating zero-score submission - Assessment: {}, Student: {}", 
	            assessmentId, studentProfileId);
	    
	    Assessment assessment = assessmentRepository.findById(assessmentId)
	        .orElseThrow(() -> new ResourceNotFoundException("Assessment not found: " + assessmentId));
	    
	    StudentProfile student = studentProfileRepository.findById(studentProfileId)
	        .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + studentProfileId));
	    
	    // Check if submission already exists
	    if (submissionRepository.existsByAssessmentIdAndStudentId(assessmentId, studentProfileId)) {
	        Optional<AssessmentSubmission> existing = submissionRepository
	            .findByAssessmentIdAndStudentId(assessmentId, studentProfileId);
	        log.warn("⚠️ Submission already exists for assessment {}, student {}", 
	                assessmentId, studentProfileId);
	        return existing.get().getId();
	    }
	    
	    // Create zero-score submission
	    AssessmentSubmission submission = AssessmentSubmission.builder()
	        .assessment(assessment)
	        .student(student)
	        .submittedAt(LocalDateTime.now())
	        .score(0.0)
	        .totalMarks(assessment.getTotalMarks())
	        .percentage(0.0)
	        .passed(false)
	        .graded(true)
	        .gradedAt(LocalDateTime.now())
	        .build();
	    
	    submission = submissionRepository.save(submission);
	    
	    // Create answer records for all questions (all incorrect)
	    List<AssessmentQuestion> questions = questionRepository
	        .findByAssessmentIdOrderByOrderNumberAsc(assessmentId);
	    
	    List<AssessmentAnswer> answers = new ArrayList<>();
	    for (AssessmentQuestion question : questions) {
	        AssessmentAnswer answer = AssessmentAnswer.builder()
	            .submission(submission)
	            .question(question)
	            .studentAnswer("") // Empty answer
	            .isCorrect(false)
	            .marksObtained(0.0)
	            .teacherFeedback("Missed deadline - Assessment not submitted")
	            .build();
	        answers.add(answer);
	    }
	    
	    if (!answers.isEmpty()) {
	        answerRepository.saveAll(answers);
	        log.info("✅ Created {} zero-score answer records", answers.size());
	    }
	    
	    log.info("✅ Created zero-score submission {} for missed assessment", submission.getId());
	    
	    return submission.getId();
	}
	
	
	
	// Add to AssessmentService.java

	/**
	 * ✅ NEW: Get gradebook assessments for student
	 * Returns ONLY: QUIZ, CLASSWORK, TEST1, TEST2, ASSIGNMENT, EXAM
	 * Excludes: LESSON_TOPIC_ASSESSMENT (handled by progress API)
	 * 
	 * @param studentProfileId Student profile ID
	 * @return List of gradebook assessments with access status
	 */
	@Transactional(readOnly = true)
	public List<GradebookAssessmentDto> getGradebookAssessmentsForStudent(Long studentProfileId) {
	    log.info("📚 Fetching gradebook assessments for student profile {}", studentProfileId);
	    
	    // Get student profile
	    StudentProfile studentProfile = studentProfileRepository.findById(studentProfileId)
	            .orElseThrow(() -> new ResourceNotFoundException(
	                    "Student profile not found: " + studentProfileId));
	    
	    // Get subject IDs for this student
	    List<Long> subjectIds = getSubjectIdsForStudent(studentProfile);
	    
	    if (subjectIds.isEmpty()) {
	        log.warn("⚠️ Student {} has no subject enrollments", studentProfileId);
	        return List.of();
	    }
	    
	    log.info("🔍 Student enrolled in {} subjects: {}", subjectIds.size(), subjectIds);
	    
	    // Define gradebook assessment types
	    List<AssessmentType> gradebookTypes = List.of(
	        AssessmentType.QUIZ,
	        AssessmentType.CLASSWORK,
	        AssessmentType.TEST1,
	        AssessmentType.TEST2,
	        AssessmentType.ASSIGNMENT,
	        AssessmentType.EXAM
	    );
	    
	    // Get all published assessments for these subjects
	    List<Assessment> allAssessments = assessmentRepository
	            .findBySubject_IdInAndPublishedTrue(subjectIds);
	    
	    log.info("📋 Found {} total published assessments", allAssessments.size());
	    
	    // Filter to only gradebook types and exclude custom assessments not for this student
	    List<Assessment> gradebookAssessments = allAssessments.stream()
	            .filter(a -> gradebookTypes.contains(a.getType()))
	            .filter(a -> {
	                // Include non-custom assessments
	                if (!a.isCustomAssessment()) {
	                    return true;
	                }
	                
	                // For custom assessments, only include if targeted to this student
	                if (a.getTargetStudentId() != null && 
	                    a.getTargetStudentId().equals(studentProfileId)) {
	                    log.debug("✅ Including custom assessment {} for student {}", 
	                            a.getId(), studentProfileId);
	                    return true;
	                }
	                
	                log.debug("🔒 Filtering out custom assessment {} not for student {}", 
	                        a.getId(), studentProfileId);
	                return false;
	            })
	            .collect(Collectors.toList());
	    
	    log.info("✅ Filtered to {} gradebook assessments", gradebookAssessments.size());
	    
	    // Convert to DTOs with access status
	    LocalDateTime now = LocalDateTime.now();
	    
	    List<GradebookAssessmentDto> dtos = gradebookAssessments.stream()
	            .map(assessment -> convertToGradebookDto(assessment, studentProfileId, now))
	            .collect(Collectors.toList());
	    
	    // Log summary by type
	    Map<AssessmentType, Long> countByType = dtos.stream()
	            .collect(Collectors.groupingBy(
	                    GradebookAssessmentDto::getType, 
	                    Collectors.counting()));
	    
	    countByType.forEach((type, count) -> 
	        log.info("  📊 {}: {} assessment(s)", type, count));
	    
	    return dtos;
	}

	/**
	 * ✅ Convert Assessment entity to GradebookAssessmentDto with enriched data
	 */
	private GradebookAssessmentDto convertToGradebookDto(
	        Assessment assessment, 
	        Long studentProfileId, 
	        LocalDateTime now) {
	    
	    // Get submission if exists
	    Optional<AssessmentSubmission> submissionOpt = submissionRepository
	            .findByAssessmentIdAndStudentId(assessment.getId(), studentProfileId);
	    
	    // Calculate time until due
	    Long hoursUntilDue = null;
	    Long daysUntilDue = null;
	    
	    if (assessment.getDueDate() != null) {
	        long hours = java.time.Duration.between(now, assessment.getDueDate()).toHours();
	        long days = java.time.Duration.between(now, assessment.getDueDate()).toDays();
	        hoursUntilDue = hours;
	        daysUntilDue = days;
	    }
	    
	    // Build DTO
	    GradebookAssessmentDto.GradebookAssessmentDtoBuilder builder = GradebookAssessmentDto.builder()
	            .id(assessment.getId())
	            .title(assessment.getTitle())
	            .description(assessment.getDescription())
	            .type(assessment.getType())
	            .subjectId(assessment.getSubject().getId())
	            .subjectName(assessment.getSubject().getName())
	            .subjectCode(assessment.getSubject().getCode())
	            .totalMarks(assessment.getTotalMarks())
	            .passingMarks(assessment.getPassingMarks())
	            .durationMinutes(assessment.getDurationMinutes())
	            .questionCount((int) questionRepository.countByAssessmentId(assessment.getId()))
	            .autoGrade(assessment.getAutoGrade())
	            .published(assessment.getPublished())
	            .dueDate(assessment.getDueDate())
	            .createdAt(assessment.getCreatedAt())
	            .hoursUntilDue(hoursUntilDue)
	            .daysUntilDue(daysUntilDue)
	            .gradebookWeight(GradebookAssessmentDto.getGradebookWeight(assessment.getType()));
	    
	    // Add term info if exists
	    if (assessment.getTerm() != null) {
	        builder.termId(assessment.getTerm().getId())
	               .termName(assessment.getTerm().getName());
	    }
	    
	    // Add creator info if exists
	    if (assessment.getCreatedBy() != null) {
	        builder.createdById(assessment.getCreatedBy().getId())
	               .createdByName(assessment.getCreatedBy().getFullName());
	    }
	    
	    // Add submission info if exists
	    if (submissionOpt.isPresent()) {
	        AssessmentSubmission submission = submissionOpt.get();
	        builder.hasSubmitted(true)
	               .submissionId(submission.getId())
	               .score(submission.getScore())
	               .percentage(submission.getPercentage())
	               .passed(submission.getPassed())
	               .submittedAt(submission.getSubmittedAt())
	               .graded(submission.getGraded());
	    } else {
	        builder.hasSubmitted(false);
	    }
	    
	    GradebookAssessmentDto dto = builder.build();
	    
	    // Calculate access status
	    dto.setAccessStatus(GradebookAssessmentDto.calculateAccessStatus(
	            assessment.getDueDate(), 
	            dto.getHasSubmitted(), 
	            now));
	    
	    // Set accessibility flag
	    dto.setIsAccessible(
	            dto.getAccessStatus() == GradebookAssessmentDto.AccessStatus.OPEN ||
	            dto.getAccessStatus() == GradebookAssessmentDto.AccessStatus.DUE_SOON
	    );
	    
	    // Generate time message
	    dto.setTimeMessage(GradebookAssessmentDto.generateTimeMessage(
	            assessment.getDueDate(), 
	            dto.getHasSubmitted(), 
	            now));
	    
	    log.debug("📝 Assessment {}: type={}, status={}, due={}, submitted={}", 
	            assessment.getId(), 
	            assessment.getType(), 
	            dto.getAccessStatus(), 
	            assessment.getDueDate(), 
	            dto.getHasSubmitted());
	    
	    return dto;
	}
}