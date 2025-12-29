package com.edu.platform.service.assessment;

import com.edu.platform.dto.assessment.*;
import com.edu.platform.event.NotificationEventPublisher;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.model.TeacherProfile;
import com.edu.platform.model.User;
import com.edu.platform.model.assessment.*;
import com.edu.platform.repository.TeacherProfileRepository;
import com.edu.platform.repository.assessment.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssessmentGradingService {

    private final AssessmentSubmissionRepository submissionRepository;
    private final AssessmentAnswerRepository answerRepository;
    private final AssessmentRepository assessmentRepository;
    private final TeacherProfileRepository teacherProfileRepository;
    private final NotificationEventPublisher eventPublisher;

    /**
     * Get all pending submissions for a teacher
     * ✅ UPDATED: Now checks both created assessments AND subjects taught
     */
    @Transactional(readOnly = true)
    public List<PendingSubmissionDto> getPendingSubmissionsForTeacher(Long teacherId) {
        // Get submissions where assessment was created by this teacher
        List<AssessmentSubmission> createdSubmissions = submissionRepository
                .findByAssessment_CreatedBy_Id(teacherId);
        
        // Get submissions for subjects taught by this teacher
        List<AssessmentSubmission> subjectSubmissions = submissionRepository
                .findByAssessment_Subject_TeacherId(teacherId);
        
        // Combine and remove duplicates
        Set<AssessmentSubmission> uniqueSubmissions = new HashSet<>();
        uniqueSubmissions.addAll(createdSubmissions);
        uniqueSubmissions.addAll(subjectSubmissions);
        
        log.info("✅ Found {} created submissions + {} subject submissions = {} unique submissions for teacher {}", 
                createdSubmissions.size(), subjectSubmissions.size(), uniqueSubmissions.size(), teacherId);
        
        return uniqueSubmissions.stream()
                .map(this::toPendingSubmissionDto)
                .filter(dto -> dto.getPendingAnswersCount() > 0)
                .collect(Collectors.toList());
    }

    /**
     * Get pending submissions for a specific assessment
     * ✅ UPDATED: Now checks both creator AND subject teacher
     */
    @Transactional(readOnly = true)
    public List<PendingSubmissionDto> getPendingSubmissionsByAssessment(
            Long assessmentId, Long teacherId) {
        
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment not found"));
        
        // Check if teacher has permission
        if (!canTeacherGradeAssessment(assessment, teacherId)) {
            throw new IllegalStateException("You can only grade assessments you created or for subjects you teach");
        }
        
        List<AssessmentSubmission> submissions = submissionRepository
                .findByAssessmentId(assessmentId);
        
        return submissions.stream()
                .map(this::toPendingSubmissionDto)
                .filter(dto -> dto.getPendingAnswersCount() > 0)
                .collect(Collectors.toList());
    }

    /**
     * Get detailed submission for grading
     */
    @Transactional(readOnly = true)
    public AssessmentSubmissionDto getSubmissionForGrading(Long submissionId) {
        AssessmentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));
        
        return convertSubmissionToDto(submission);
    }

    /**
     * Grade a single answer
     * ✅ UPDATED: Now checks both creator AND subject teacher + publishes notification
     */
    @Transactional
    public AssessmentAnswerDto gradeAnswer(
            Long answerId, 
            GradeAnswerRequest request, 
            User teacher) {
        
        AssessmentAnswer answer = answerRepository.findById(answerId)
                .orElseThrow(() -> new ResourceNotFoundException("Answer not found"));
        
        Assessment assessment = answer.getSubmission().getAssessment();
        
        // Check if teacher has permission
        if (!canTeacherGradeAssessment(assessment, teacher.getId())) {
            throw new IllegalStateException("You can only grade assessments you created or for subjects you teach");
        }
        
        answer.setMarksObtained(request.getMarksObtained());
        answer.setTeacherFeedback(request.getTeacherFeedback());
        answer.setIsCorrect(request.getMarksObtained() >= (answer.getQuestion().getMarks() * 0.5));
        
        answer = answerRepository.save(answer);
        updateSubmissionScore(answer.getSubmission().getId());
        
        log.info("✅ Teacher {} graded answer {} with {} marks", 
                teacher.getId(), answerId, request.getMarksObtained());
        
        // 🔔 PUBLISH NOTIFICATION: After grading any answer, notify student
        try {
            AssessmentSubmission submission = answer.getSubmission();
            eventPublisher.publishGradeReleased(submission);
            log.info("📢 Grade released event published for submission {} after grading answer {}", 
                    submission.getId(), answerId);
        } catch (Exception e) {
            log.error("❌ Failed to publish grade released event: {}", e.getMessage());
        }
        
        return convertAnswerToDto(answer);
    }

    /**
     * Grade multiple answers in a submission
     * ✅ FIXED: Now ALWAYS publishes grade released event after grading
     */
    @Transactional
    public AssessmentSubmissionDto gradeSubmission(
            Long submissionId,
            GradeSubmissionRequest request,
            User teacher) {
        
        AssessmentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));
        
        Assessment assessment = submission.getAssessment();
        
        // Check if teacher has permission
        if (!canTeacherGradeAssessment(assessment, teacher.getId())) {
            throw new IllegalStateException("You can only grade assessments you created or for subjects you teach");
        }
        
        // Grade each answer
        for (GradeSubmissionRequest.GradeAnswerDto gradeDto : request.getGrades()) {
            AssessmentAnswer answer = answerRepository.findById(gradeDto.getAnswerId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Answer not found: " + gradeDto.getAnswerId()));
            
            answer.setMarksObtained(gradeDto.getMarksObtained());
            answer.setTeacherFeedback(gradeDto.getTeacherFeedback());
            answer.setIsCorrect(gradeDto.getMarksObtained() >= 
                    (answer.getQuestion().getMarks() * 0.5));
            
            answerRepository.save(answer);
        }
        
        updateSubmissionScore(submissionId);
        submission = submissionRepository.findById(submissionId).orElseThrow();
        
        // Check if all answers are graded
        boolean allGraded = submission.getAnswers().stream()
                .allMatch(a -> a.getMarksObtained() != null);
        
        if (allGraded) {
            submission.setGraded(true);
            submission.setGradedAt(LocalDateTime.now());
            submission = submissionRepository.save(submission);
            log.info("✅ Submission {} fully graded by teacher {}", submissionId, teacher.getId());
        } else {
            long ungradedCount = submission.getAnswers().stream()
                    .filter(a -> a.getMarksObtained() == null)
                    .count();
            log.info("⏳ Submission {} partially graded by teacher {} ({} answers pending)", 
                    submissionId, teacher.getId(), ungradedCount);
        }
        
        // 🔔 CRITICAL FIX: Publish grade released event ALWAYS (not just when allGraded)
        // Students should be notified whenever their work is graded
        try {
            eventPublisher.publishGradeReleased(submission);
            log.info("📢 Grade released event published for submission {} (student user ID: {}, allGraded: {})", 
                    submission.getId(), 
                    submission.getStudent().getUser().getId(),
                    allGraded);
        } catch (Exception e) {
            log.error("❌ Failed to publish grade released event: {}", e.getMessage());
            // Don't fail the grading operation if notification fails
        }
        
        return convertSubmissionToDto(submission);
    }

    /**
     * ✅ Helper method to check if teacher can grade an assessment
     */
    private boolean canTeacherGradeAssessment(Assessment assessment, Long teacherId) {
        // Check if teacher created the assessment
        boolean isCreator = assessment.getCreatedBy() != null && 
                           assessment.getCreatedBy().getId().equals(teacherId);
        
        if (isCreator) {
            return true;
        }
        
        // Check if teacher teaches the subject
        if (assessment.getSubject() != null) {
            TeacherProfile teacherProfile = teacherProfileRepository.findByUserId(teacherId)
                    .orElse(null);
            
            if (teacherProfile != null && teacherProfile.getSubjects() != null) {
                boolean teachesSubject = teacherProfile.getSubjects().stream()
                        .anyMatch(subject -> subject.getId().equals(assessment.getSubject().getId()));
                
                if (teachesSubject) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Update submission score based on all graded answers
     */
    private void updateSubmissionScore(Long submissionId) {
        AssessmentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));
        
        List<AssessmentAnswer> answers = answerRepository.findBySubmissionId(submissionId);
        
        double totalScore = answers.stream()
                .filter(a -> a.getMarksObtained() != null)
                .mapToDouble(AssessmentAnswer::getMarksObtained)
                .sum();
        
        submission.setScore(totalScore);
        submission.setPercentage((totalScore / submission.getTotalMarks()) * 100);
        
        double passingPercentage = (submission.getAssessment().getPassingMarks().doubleValue() 
                / submission.getTotalMarks()) * 100;
        submission.setPassed(submission.getPercentage() >= passingPercentage);
        
        submissionRepository.save(submission);
        
        log.debug("Updated submission {} score: {}/{}", 
                submissionId, totalScore, submission.getTotalMarks());
    }

    /**
     * ✅ FIXED: Helper method to check if a question needs manual grading
     */
    private boolean requiresManualGrading(AssessmentQuestion.QuestionType questionType) {
        // Only MULTIPLE_CHOICE is auto-graded. Everything else needs manual grading.
        return questionType != AssessmentQuestion.QuestionType.MULTIPLE_CHOICE;
    }

    // DTO Conversion Methods
    
    /**
     * ✅ FIXED: Now includes ALL non-MCQ questions (TRUE_FALSE, ESSAY, SHORT_ANSWER, etc.)
     */
    private PendingSubmissionDto toPendingSubmissionDto(AssessmentSubmission submission) {
        List<AssessmentAnswer> answers = answerRepository.findBySubmissionId(submission.getId());
        
        // ✅ CRITICAL FIX: Count ALL questions that need manual grading (not just ESSAY/SHORT_ANSWER)
        long pendingCount = answers.stream()
                .filter(a -> requiresManualGrading(a.getQuestion().getQuestionType()) && 
                            a.getMarksObtained() == null)
                .count();
        
        return PendingSubmissionDto.builder()
                .id(submission.getId())
                .assessmentId(submission.getAssessment().getId())
                .assessmentTitle(submission.getAssessment().getTitle())
                .studentId(submission.getStudent().getId())
                .studentName(submission.getStudent().getUser().getFullName())
                .submittedAt(submission.getSubmittedAt())
                .score(submission.getScore())
                .totalMarks(submission.getTotalMarks() != null ? submission.getTotalMarks().doubleValue() : null)
                .percentage(submission.getPercentage())
                .passed(submission.getPassed())
                .graded(submission.getGraded())
                .pendingAnswersCount((int) pendingCount)
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
}