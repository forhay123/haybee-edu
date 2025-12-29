package com.edu.platform.controller;

import com.edu.platform.dto.assessment.*;
import com.edu.platform.model.User;
import com.edu.platform.repository.UserRepository;
import com.edu.platform.service.assessment.AssessmentGradingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/assessments")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Assessment Grading", description = "Teacher grading endpoints for essay/theory questions")
public class AssessmentGradingController {

    private final AssessmentGradingService gradingService;
    private final UserRepository userRepository;

    /**
     * ✅ Helper method to get current authenticated user
     * Since your system uses email as username, we fetch by email
     */
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            log.error("❌ No authentication found in security context");
            throw new RuntimeException("User not authenticated");
        }
        
        String email = authentication.getName(); // This is the email from your CustomUserDetailsService
        log.debug("🔍 Fetching user with email: {}", email);
        
        return userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.error("❌ User not found with email: {}", email);
                    return new RuntimeException("User not found: " + email);
                });
    }

    /**
     * ✅ NEW: Get grading statistics for teacher dashboard
     */
    @GetMapping("/grading-stats")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Get grading statistics", 
               description = "Get statistics about pending submissions for teacher dashboard")
    public ResponseEntity<Map<String, Object>> getGradingStats() {
        User teacher = getCurrentUser();
        log.info("✅ Teacher {} ({}) fetching grading statistics", teacher.getFullName(), teacher.getId());
        
        List<PendingSubmissionDto> pending = gradingService.getPendingSubmissionsForTeacher(teacher.getId());
        
        int totalPendingAnswers = pending.stream()
                .mapToInt(PendingSubmissionDto::getPendingAnswersCount)
                .sum();
        
        long uniqueStudents = pending.stream()
                .map(PendingSubmissionDto::getStudentId)
                .distinct()
                .count();
        
        List<Map<String, Object>> recentSubmissions = pending.stream()
                .limit(5)
                .map(sub -> Map.of(
                    "id", (Object) sub.getId(),
                    "assessmentTitle", sub.getAssessmentTitle(),
                    "studentName", sub.getStudentName(),
                    "submittedAt", sub.getSubmittedAt().toString(),
                    "pendingAnswersCount", sub.getPendingAnswersCount()
                ))
                .collect(Collectors.toList());
        
        Map<String, Object> stats = Map.of(
            "totalPendingSubmissions", pending.size(),
            "totalPendingAnswers", totalPendingAnswers,
            "uniqueStudents", uniqueStudents,
            "recentSubmissions", recentSubmissions
        );
        
        log.info("📊 Grading stats: {} pending submissions, {} pending answers, {} students", 
                pending.size(), totalPendingAnswers, uniqueStudents);
        
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/pending-grading")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Get pending submissions", 
               description = "Get all submissions with ungraded essay/theory questions for the teacher")
    public ResponseEntity<List<PendingSubmissionDto>> getPendingSubmissions() {
        User teacher = getCurrentUser();
        log.info("✅ Teacher {} ({}) fetching pending submissions", teacher.getFullName(), teacher.getId());
        List<PendingSubmissionDto> submissions = gradingService.getPendingSubmissionsForTeacher(teacher.getId());
        log.info("📋 Found {} pending submissions", submissions.size());
        return ResponseEntity.ok(submissions);
    }

    @GetMapping("/{assessmentId}/pending-grading")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Get pending submissions for assessment", 
               description = "Get all submissions for a specific assessment that need grading")
    public ResponseEntity<List<PendingSubmissionDto>> getPendingSubmissionsByAssessment(
            @PathVariable Long assessmentId) {
        
        User teacher = getCurrentUser();
        log.info("Teacher {} fetching pending submissions for assessment {}", teacher.getId(), assessmentId);
        List<PendingSubmissionDto> submissions = gradingService
                .getPendingSubmissionsByAssessment(assessmentId, teacher.getId());
        return ResponseEntity.ok(submissions);
    }

    @GetMapping("/submissions/{submissionId}/grade")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Get submission for grading", 
               description = "Get detailed submission with all answers for grading")
    public ResponseEntity<AssessmentSubmissionDto> getSubmissionForGrading(
            @PathVariable Long submissionId) {
        
        log.info("Fetching submission {} for grading", submissionId);
        AssessmentSubmissionDto submission = gradingService.getSubmissionForGrading(submissionId);
        return ResponseEntity.ok(submission);
    }

    @PostMapping("/answers/{answerId}/grade")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Grade single answer", 
               description = "Grade a single essay/theory answer")
    public ResponseEntity<AssessmentAnswerDto> gradeAnswer(
            @PathVariable Long answerId,
            @RequestBody GradeAnswerRequest request) {
        
        User teacher = getCurrentUser();
        log.info("Teacher {} grading answer {}", teacher.getId(), answerId);
        AssessmentAnswerDto graded = gradingService.gradeAnswer(answerId, request, teacher);
        return ResponseEntity.ok(graded);
    }

    @PostMapping("/submissions/{submissionId}/grade")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Grade entire submission", 
               description = "Grade multiple answers in a submission at once")
    public ResponseEntity<AssessmentSubmissionDto> gradeSubmission(
            @PathVariable Long submissionId,
            @RequestBody GradeSubmissionRequest request) {
        
        User teacher = getCurrentUser();
        log.info("Teacher {} grading submission {}", teacher.getId(), submissionId);
        AssessmentSubmissionDto graded = gradingService.gradeSubmission(submissionId, request, teacher);
        return ResponseEntity.ok(graded);
    }
}