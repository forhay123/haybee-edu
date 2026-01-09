package com.edu.platform.controller;

import com.edu.platform.dto.assessment.*;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.User;
import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.model.assessment.AssessmentType;
import com.edu.platform.repository.StudentProfileRepository;
import com.edu.platform.repository.UserRepository;
import com.edu.platform.repository.assessment.AssessmentRepository;
import com.edu.platform.service.LessonAIQuestionService;
import com.edu.platform.service.assessment.AssessmentAccessService;
import com.edu.platform.service.assessment.AssessmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;


import com.edu.platform.repository.assessment.AssessmentSubmissionRepository;
import com.edu.platform.service.EnrollmentService;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/assessments")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Assessment", description = "Assessment management endpoints")
public class AssessmentController {

    private final AssessmentService assessmentService;
    private final AssessmentRepository assessmentRepository;
    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository; 
    private final AssessmentAccessService assessmentAccessService;
    private final LessonAIQuestionService lessonAIQuestionService;
    private final AssessmentSubmissionRepository submissionRepository;
    private final EnrollmentService enrollmentService;

    /**
     * ✅ Helper method to get current authenticated user
     * Same pattern as TeacherQuestionController
     */
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            log.error("❌ No authentication found in security context");
            throw new RuntimeException("User not authenticated");
        }
        
        String email = authentication.getName(); // Email from CustomUserDetailsService
        log.debug("🔍 Fetching user with email: {}", email);
        
        return userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.error("❌ User not found with email: {}", email);
                    return new RuntimeException("User not found: " + email);
                });
    }

    // ======================================================
    // 📌 CREATE ASSESSMENT (TEACHER)
    // ======================================================
    @PostMapping
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Create assessment", description = "Teacher creates a new assessment")
    public ResponseEntity<AssessmentDto> createAssessment(
            @RequestBody AssessmentRequest request) {

        User teacher = getCurrentUser();
        log.info("Creating assessment: {} by teacher {}", request.getTitle(), teacher.getEmail());
        AssessmentDto created = assessmentService.createAssessment(request, teacher);
        return ResponseEntity.ok(created);
    }

    // ======================================================
    // 📌 GET SINGLE ASSESSMENT (ALL ROLES) - WITH CUSTOM ASSESSMENT ACCESS CHECK
    // ======================================================
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('STUDENT') or hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Get assessment", description = "Get assessment details")
    public ResponseEntity<AssessmentDto> getAssessment(
            @PathVariable Long id,
            @RequestParam(required = false) Long studentProfileId) {

        log.info("📖 Getting assessment {} for studentProfileId: {}", id, studentProfileId);

        // ✅ NEW: Check if this is a custom assessment and validate access
        Assessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment not found: " + id));

        // ✅ If it's a custom assessment, verify the student is the target
        if (assessment.isCustomAssessment() && assessment.getTargetStudentId() != null) {
            log.info("🔒 Custom assessment detected - target student: {}", assessment.getTargetStudentId());
            
            // Get current user
            User currentUser = getCurrentUser();
            
            // If student is requesting, verify they are the target
            boolean isStudent = currentUser.getRoles().stream()
                    .anyMatch(role -> role.getName().equals("STUDENT"));
            
            if (isStudent) {
                StudentProfile studentProfile = studentProfileRepository.findByUserId(currentUser.getId())
                        .orElseThrow(() -> new RuntimeException("Student profile not found"));
                
                if (!studentProfile.getId().equals(assessment.getTargetStudentId())) {
                    log.warn("❌ Student {} attempted to access custom assessment {} not meant for them", 
                            studentProfile.getId(), id);
                    throw new IllegalArgumentException(
                            "This custom assessment is not assigned to you");
                }
            }
            
            // Teachers and admins can view any custom assessment
            log.info("✅ Access granted to custom assessment {}", id);
        }

        AssessmentDto assessmentDto = assessmentService.getAssessment(id, studentProfileId);
        return ResponseEntity.ok(assessmentDto);
    }

    // ======================================================
    // 📌 GET ASSESSMENTS BY SUBJECT (ALL ROLES) - WITH CUSTOM ASSESSMENT FILTERING
    // ======================================================
    @GetMapping("/subject/{subjectId}")
    @PreAuthorize("hasRole('STUDENT') or hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Get assessments by subject", description = "Get all published assessments for a subject")
    public ResponseEntity<List<AssessmentDto>> getAssessmentsBySubject(
            @PathVariable Long subjectId,
            @RequestParam(required = false) Long studentProfileId) {

        log.info("📚 Getting assessments for subject {} (studentProfileId: {})", 
                subjectId, studentProfileId);

        List<AssessmentDto> assessments =
                assessmentService.getAssessmentsBySubject(subjectId, studentProfileId);

        // ✅ NEW: Filter out custom assessments not meant for current user
        User currentUser = getCurrentUser();
        
        boolean isStudent = currentUser.getRoles().stream()
                .anyMatch(role -> role.getName().equals("STUDENT"));
        
        if (isStudent) {
            StudentProfile studentProfile = studentProfileRepository.findByUserId(currentUser.getId())
                    .orElseThrow(() -> new RuntimeException("Student profile not found"));
            
            Long currentStudentProfileId = studentProfile.getId();
            
            // Filter assessments
            List<AssessmentDto> filteredAssessments = assessments.stream()
                    .filter(dto -> {
                        // Keep non-custom assessments
                        if (dto.getIsCustomAssessment() == null || !dto.getIsCustomAssessment()) {
                            return true;
                        }
                        
                        // For custom assessments, only show if targeted to this student
                        if (dto.getTargetStudentId() != null && 
                            dto.getTargetStudentId().equals(currentStudentProfileId)) {
                            log.debug("✅ Including custom assessment {} for student {}", 
                                    dto.getId(), currentStudentProfileId);
                            return true;
                        }
                        
                        log.debug("🔒 Filtering out custom assessment {} not for student {}", 
                                dto.getId(), currentStudentProfileId);
                        return false;
                    })
                    .collect(Collectors.toList());
            
            log.info("✅ Filtered {} assessments down to {} for student {}", 
                    assessments.size(), filteredAssessments.size(), currentStudentProfileId);
            
            return ResponseEntity.ok(filteredAssessments);
        }
        
        // Teachers and admins see all assessments
        log.info("✅ Returning all {} assessments (teacher/admin view)", assessments.size());
        return ResponseEntity.ok(assessments);
    }

    // ======================================================
    // 📌 GET ASSESSMENT QUESTIONS (ALL ROLES)
    // ======================================================
    @GetMapping("/{id}/questions")
    @PreAuthorize("hasRole('STUDENT') or hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Get assessment questions", description = "Get all questions for an assessment")
    public ResponseEntity<List<AssessmentQuestionDto>> getAssessmentQuestions(
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean isTeacher) {

        // ✅ NEW: Verify access to custom assessment before returning questions
        Assessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment not found: " + id));

        if (assessment.isCustomAssessment() && assessment.getTargetStudentId() != null) {
            User currentUser = getCurrentUser();
            
            boolean isStudent = currentUser.getRoles().stream()
                    .anyMatch(role -> role.getName().equals("STUDENT"));
            
            if (isStudent) {
                StudentProfile studentProfile = studentProfileRepository.findByUserId(currentUser.getId())
                        .orElseThrow(() -> new RuntimeException("Student profile not found"));
                
                if (!studentProfile.getId().equals(assessment.getTargetStudentId())) {
                    throw new IllegalArgumentException(
                            "You do not have permission to view questions for this assessment");
                }
            }
        }

        List<AssessmentQuestionDto> questions = assessmentService.getAssessmentQuestions(id, isTeacher);
        return ResponseEntity.ok(questions);
    }

    // ======================================================
    // 📌 SUBMIT ASSESSMENT (STUDENT)
    // ======================================================
    @PostMapping("/submit")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Submit assessment", description = "Student submits assessment answers")
    public ResponseEntity<AssessmentSubmissionDto> submitAssessment(
            @RequestBody AssessmentSubmissionRequest request) {

        // ✅ FIXED: Get student profile from authenticated user
        User student = getCurrentUser();
        StudentProfile studentProfile = studentProfileRepository.findByUserId(student.getId())
                .orElseThrow(() -> new RuntimeException("Student profile not found for user: " + student.getEmail()));

        log.info("Student {} (profile {}) submitting assessment {}", 
                student.getEmail(), studentProfile.getId(), request.getAssessmentId());
        
        // ✅ NEW: Verify access to custom assessment before allowing submission
        Assessment assessment = assessmentRepository.findById(request.getAssessmentId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Assessment not found: " + request.getAssessmentId()));

        if (assessment.isCustomAssessment() && assessment.getTargetStudentId() != null) {
            if (!studentProfile.getId().equals(assessment.getTargetStudentId())) {
                throw new IllegalArgumentException(
                        "You do not have permission to submit this assessment");
            }
        }
        
        AssessmentSubmissionDto submission =
                assessmentService.submitAssessment(request, studentProfile.getId());

        return ResponseEntity.ok(submission);
    }

 // ======================================================
 // 📌 GET STUDENT SUBMISSION
 // ======================================================
 @GetMapping("/{assessmentId}/submission")
 @PreAuthorize("hasRole('STUDENT') or hasRole('TEACHER') or hasRole('ADMIN')")
 @Operation(summary = "Get student submission", description = "Get student's submission for an assessment")
 public ResponseEntity<AssessmentSubmissionDto> getSubmission(
         @PathVariable Long assessmentId,
         @RequestParam Long studentProfileId) {

     log.info("📋 Fetching submission for assessment {} and student {}", assessmentId, studentProfileId);

     // ✅ FIXED: Use correct method name from AssessmentService
     AssessmentSubmissionDto submission =
             assessmentService.getSubmissionByAssessmentAndStudent(assessmentId, studentProfileId);

     if (submission == null) {
         log.warn("❌ No submission found for assessment {} and student {}", assessmentId, studentProfileId);
         throw new ResourceNotFoundException(
             "No submission found for this assessment and student"
         );
     }

     return ResponseEntity.ok(submission);
 }

    // ======================================================
    // 📌 GET ALL SUBMISSIONS FOR ASSESSMENT (TEACHER)
    // ======================================================
    @GetMapping("/{assessmentId}/submissions")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Get all submissions", description = "Teacher views all submissions for an assessment")
    public ResponseEntity<List<AssessmentSubmissionDto>> getAssessmentSubmissions(
            @PathVariable Long assessmentId) {

        List<AssessmentSubmissionDto> submissions =
                assessmentService.getAssessmentSubmissions(assessmentId);

        return ResponseEntity.ok(submissions);
    }

    // ======================================================
    // 📌 GET ASSESSMENTS BY LESSON TOPIC (ALL ROLES)
    // ======================================================
    @GetMapping("/lesson-topic/{lessonTopicId}")
    @PreAuthorize("hasRole('STUDENT') or hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(
            summary = "Get assessments by lesson topic",
            description = "Get all assessments for a specific lesson topic"
    )
    public ResponseEntity<List<AssessmentDto>> getAssessmentsByLessonTopic(
            @PathVariable Long lessonTopicId,
            @RequestParam(required = false) Long studentProfileId) {

        log.info("Getting assessments for lesson topic: {}", lessonTopicId);

        List<Assessment> assessments = assessmentRepository.findByLessonTopicIdAndType(
                lessonTopicId,
                AssessmentType.LESSON_TOPIC_ASSESSMENT
        );

        List<AssessmentDto> dtos = assessments.stream()
                .map(a -> assessmentService.convertToDto(a, studentProfileId))
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    // ======================================================
    // 📌 TEACHER: GET MY ASSESSMENTS
    // ======================================================
    @GetMapping("/teacher/my-assessments")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Get my assessments", description = "Teacher fetches all assessments they created")
    public ResponseEntity<List<AssessmentDto>> getMyAssessments() {

        User teacher = getCurrentUser();
        log.info("✅ Teacher {} ({}) fetching their assessments", teacher.getFullName(), teacher.getId());

        List<AssessmentDto> assessments =
                assessmentService.getAssessmentsByTeacher(teacher.getId());

        log.info("📋 Found {} assessments", assessments.size());
        return ResponseEntity.ok(assessments);
    }

    // ======================================================
    // 📌 TEACHER: GET MY ASSESSMENTS BY SUBJECT
    // ======================================================
    @GetMapping("/teacher/subject/{subjectId}")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Get my assessments by subject", description = "Teacher fetches assessments by subject")
    public ResponseEntity<List<AssessmentDto>> getTeacherAssessmentsBySubject(
            @PathVariable Long subjectId) {

        User teacher = getCurrentUser();
        log.info("Teacher {} fetching assessments for subject {}", teacher.getEmail(), subjectId);

        List<AssessmentDto> assessments =
                assessmentService.getAssessmentsByTeacherAndSubject(teacher.getId(), subjectId);

        return ResponseEntity.ok(assessments);
    }

    // ======================================================
    // 📌 TEACHER: TOGGLE PUBLISH STATUS
    // ======================================================
    @PatchMapping("/{id}/toggle-publish")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Toggle publish", description = "Teacher publishes/unpublishes an assessment")
    public ResponseEntity<AssessmentDto> togglePublish(@PathVariable Long id) {

        User teacher = getCurrentUser();
        log.info("Teacher {} toggling publish for assessment {}", teacher.getEmail(), id);

        AssessmentDto updated = assessmentService.togglePublish(id, teacher);

        return ResponseEntity.ok(updated);
    }

    // ======================================================
    // 📌 TEACHER: UPDATE ASSESSMENT
    // ======================================================
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Update assessment", description = "Teacher updates an assessment")
    public ResponseEntity<AssessmentDto> updateAssessment(
            @PathVariable Long id,
            @RequestBody AssessmentRequest request) {

        User teacher = getCurrentUser();
        log.info("Teacher {} updating assessment {}", teacher.getEmail(), id);

        AssessmentDto updated = assessmentService.updateAssessment(id, request, teacher);

        return ResponseEntity.ok(updated);
    }

    // ======================================================
    // 📌 TEACHER: DELETE ASSESSMENT
    // ======================================================
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Delete assessment", description = "Teacher deletes their assessment")
    public ResponseEntity<Void> deleteAssessment(@PathVariable Long id) {

        User teacher = getCurrentUser();
        log.info("Teacher {} deleting assessment {}", teacher.getEmail(), id);

        assessmentService.deleteAssessment(id, teacher);

        return ResponseEntity.noContent().build();
    }
    
    
	 // ======================================================
	 // 📌 STUDENT: GET ALL MY SUBMISSIONS
	 // ✅ NEW: Returns ALL submissions across all assessments
	 // ======================================================
	 @GetMapping("/student/{studentProfileId}/submissions")
	 @PreAuthorize("hasRole('STUDENT') or hasRole('TEACHER') or hasRole('ADMIN')")
	 @Operation(summary = "Get all student submissions", description = "Get all submissions for a student across all assessments")
	 public ResponseEntity<List<AssessmentSubmissionDto>> getStudentSubmissions(
	         @PathVariable Long studentProfileId) {
	     
	     log.info("📚 Fetching all submissions for student profile {}", studentProfileId);
	     
	     List<AssessmentSubmissionDto> submissions = assessmentService.getStudentSubmissions(studentProfileId);
	     
	     log.info("✅ Found {} submissions for student {}", submissions.size(), studentProfileId);
	     
	     return ResponseEntity.ok(submissions);
	 }
    
    // ======================================================
    // 📌 STUDENT: GET MY ASSESSMENTS - WITH CUSTOM ASSESSMENT FILTERING
    // ✅ FIXED: Lookup student profile from authenticated user
    // ======================================================
    @GetMapping("/student/my-assessments")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Get my assessments", description = "Student fetches all their assigned/available assessments")
    public ResponseEntity<List<AssessmentDto>> getMyStudentAssessments() {

        // ✅ FIX: Get the authenticated user
        User student = getCurrentUser();
        
        // ✅ FIX: Look up their actual student profile
        StudentProfile studentProfile = studentProfileRepository.findByUserId(student.getId())
                .orElseThrow(() -> new RuntimeException("Student profile not found for user: " + student.getEmail()));
        
        log.info("✅ Student {} ({}) fetching their assessments for profile {}", 
                student.getFullName(), student.getId(), studentProfile.getId());

        // ✅ Now using the CORRECT studentProfileId
        List<AssessmentDto> assessments =
                assessmentService.getAssessmentsForStudent(studentProfile.getId());

        // ✅ NEW: Filter to only include assessments this student should see
        List<AssessmentDto> filteredAssessments = assessments.stream()
                .filter(dto -> {
                    // Keep non-custom assessments
                    if (dto.getIsCustomAssessment() == null || !dto.getIsCustomAssessment()) {
                        return true;
                    }
                    
                    // For custom assessments, only show if targeted to this student
                    if (dto.getTargetStudentId() != null && 
                        dto.getTargetStudentId().equals(studentProfile.getId())) {
                        log.debug("✅ Including custom assessment {} for student {}", 
                                dto.getId(), studentProfile.getId());
                        return true;
                    }
                    
                    log.debug("🔒 Filtering out custom assessment {} not for student {}", 
                            dto.getId(), studentProfile.getId());
                    return false;
                })
                .collect(Collectors.toList());

        log.info("📋 Found {} assessments (filtered from {}) for student", 
                filteredAssessments.size(), assessments.size());
        return ResponseEntity.ok(filteredAssessments);
    }
    
    


    /**
     * ✅ Check if student can access assessment at current time
     * Returns detailed access information including:
     * - Whether access is allowed
     * - Time window (start/end)
     * - Minutes until open / minutes remaining
     * - Grace period status
     * - Submission status
     * 
     * Used by: AssessmentAccessCard, useAssessmentAccess hook
     */
    @GetMapping("/{assessmentId}/access-check")
    @PreAuthorize("hasRole('STUDENT') or hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(
        summary = "Check assessment access",
        description = "Check if student can access assessment at current time. " +
                      "Returns detailed timing information and access status."
    )
    public ResponseEntity<AccessCheckResult> checkAssessmentAccess(
            @PathVariable Long assessmentId,
            @RequestParam Long studentProfileId) {

        log.info("🔍 Checking access for assessment {} and student profile {}",
                assessmentId, studentProfileId);

        try {
            // Get current time
            LocalDateTime now = LocalDateTime.now();
            log.debug("Current time: {}", now);

            // Find student profile
            StudentProfile student = studentProfileRepository.findById(studentProfileId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                        "Student profile not found with ID: " + studentProfileId));
            
            log.debug("Found student: {} (ID: {})", 
                     student.getUser().getFullName(), student.getId());

            // Find assessment
            Assessment assessment = assessmentRepository.findById(assessmentId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                        "Assessment not found with ID: " + assessmentId));
            
            log.debug("Found assessment: {} (ID: {})", 
                     assessment.getTitle(), assessment.getId());

            // ✅ NEW: Check custom assessment access
            if (assessment.isCustomAssessment() && assessment.getTargetStudentId() != null) {
                if (!student.getId().equals(assessment.getTargetStudentId())) {
                    log.warn("❌ Student {} attempted to access custom assessment {} not meant for them", 
                            student.getId(), assessmentId);
                    return ResponseEntity.ok(AccessCheckResult.blocked(
                            "This custom assessment is not assigned to you"));
                }
            }

            // Check access using service
            AccessCheckResult result = assessmentAccessService.canAccessAssessment(
                    student,
                    assessment,
                    now
            );

            // Log result details
            log.info("✅ Access check completed for assessment {}: " +
                    "canAccess={}, statusCode={}, minutesRemaining={}, gracePeriod={}",
                    assessmentId,
                    result.isCanAccess(),
                    result.getStatusCode(),
                    result.getMinutesRemaining(),
                    result.getGracePeriodActive());

            return ResponseEntity.ok(result);

        } catch (ResourceNotFoundException e) {
            log.error("❌ Resource not found during access check: {}", e.getMessage());
            throw e; // Let GlobalExceptionHandler handle this
            
        } catch (Exception e) {
            log.error("❌ Unexpected error checking assessment access: {}", 
                     e.getMessage(), e);
            
            // Return a blocked result with error message
            // This prevents the frontend from breaking on errors
            AccessCheckResult errorResult = AccessCheckResult.blocked(
                "Unable to check assessment access. Please try again later."
            );
            
            return ResponseEntity.ok(errorResult);
        }
    }


    

    // ============================================================
    // OPTIONAL: Batch check endpoint (if you need it)
    // ============================================================

    /**
     * ✅ OPTIONAL: Check access for multiple assessments at once
     * Useful for dashboard views
     */
    @PostMapping("/batch-access-check")
    @PreAuthorize("hasRole('STUDENT') or hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(
        summary = "Batch check assessment access",
        description = "Check access for multiple assessments at once"
    )
    public ResponseEntity<Map<Long, AccessCheckResult>> batchCheckAssessmentAccess(
            @RequestBody List<Long> assessmentIds,
            @RequestParam Long studentProfileId) {

        log.info("🔍 Batch checking access for {} assessments (student: {})",
                assessmentIds.size(), studentProfileId);

        try {
            StudentProfile student = studentProfileRepository.findById(studentProfileId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                        "Student profile not found: " + studentProfileId));

            LocalDateTime now = LocalDateTime.now();
            Map<Long, AccessCheckResult> results = new HashMap<>();

            for (Long assessmentId : assessmentIds) {
                try {
                    Assessment assessment = assessmentRepository.findById(assessmentId)
                            .orElse(null);
                    
                    if (assessment != null) {
                        // ✅ NEW: Check custom assessment access
                        if (assessment.isCustomAssessment() && 
                            assessment.getTargetStudentId() != null &&
                            !student.getId().equals(assessment.getTargetStudentId())) {
                            results.put(assessmentId, AccessCheckResult.blocked(
                                "Not assigned to you"));
                            continue;
                        }
                        
                        AccessCheckResult result = assessmentAccessService.canAccessAssessment(
                                student, assessment, now);
                        results.put(assessmentId, result);
                    } else {
                        results.put(assessmentId, AccessCheckResult.blocked(
                            "Assessment not found"));
                    }
                } catch (Exception e) {
                    log.error("Error checking access for assessment {}: {}", 
                             assessmentId, e.getMessage());
                    results.put(assessmentId, AccessCheckResult.blocked(
                        "Error checking access"));
                }
            }

            log.info("✅ Batch check completed: {} results", results.size());
            return ResponseEntity.ok(results);

        } catch (Exception e) {
            log.error("❌ Error in batch access check: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to perform batch access check", e);
        }
    }
    
    
    /**
     * ✅ Add this endpoint to your AssessmentController
     * 
     * This allows admins to manually trigger creation of assessments
     * for all lesson topics that have AI questions but no assessment
     */

    @PostMapping("/admin/create-missing-assessments")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Create missing assessments", 
        description = "Create assessments for all lesson topics that have AI questions but no assessment"
    )
    public ResponseEntity<Map<String, Object>> createMissingAssessments() {
        
        User admin = getCurrentUser(); // Your method to get current user
        log.info("🔧 Creating missing assessments - initiated by {}", admin.getEmail());
        
        Map<String, Object> response = lessonAIQuestionService.createMissingAssessments(admin);
        
        return ResponseEntity.ok(response);
    }

    /**
     * ✅ ALTERNATIVE: Create assessment for a single lesson topic
     */
    @PostMapping("/admin/lesson-topic/{lessonTopicId}/create-assessment")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Create assessment for a specific lesson topic",
        description = "Creates an assessment for a lesson topic if it has AI questions but no assessment"
    )
    public ResponseEntity<Map<String, String>> createAssessmentForLesson(
        @PathVariable Long lessonTopicId
    ) {
        User admin = getCurrentUser();
        
        try {
            lessonAIQuestionService.autoCreateAssessmentForLesson(lessonTopicId, admin);
            
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Assessment created for lesson topic " + lessonTopicId
            ));
            
        } catch (Exception e) {
            log.error("Failed to create assessment for lesson {}: {}", lessonTopicId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(
                    "status", "error",
                    "message", e.getMessage()
                ));
        }
    }
    
    
    /**
     * ✅ NEW: Get gradebook assessments for student
     * Returns QUIZ, CLASSWORK, TEST1, TEST2, ASSIGNMENT, EXAM assessments
     * These are due-date based assessments (not lesson-based)
     * 
     * Separate from /student/my-assessments which returns ALL assessment types
     */
    @GetMapping("/student/gradebook-assessments")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(
        summary = "Get gradebook assessments", 
        description = "Get student's gradebook assessments (QUIZ, CLASSWORK, TEST1, TEST2, ASSIGNMENT, EXAM). " +
                      "These are filtered by student's enrolled subjects and published status."
    )
    public ResponseEntity<List<GradebookAssessmentDto>> getGradebookAssessments() {
        
        // Get authenticated student
        User student = getCurrentUser();
        
        StudentProfile studentProfile = studentProfileRepository.findByUserId(student.getId())
                .orElseThrow(() -> new RuntimeException("Student profile not found for user: " + student.getEmail()));
        
        log.info("📚 Student {} ({}) fetching gradebook assessments for profile {}", 
                student.getFullName(), student.getId(), studentProfile.getId());
        
        // Get gradebook assessments from service
        List<GradebookAssessmentDto> assessments = 
                assessmentService.getGradebookAssessmentsForStudent(studentProfile.getId());
        
        log.info("✅ Returning {} gradebook assessments for student", assessments.size());
        
        return ResponseEntity.ok(assessments);
    }
    
    
    /**
     * ✅ Manual trigger for testing missed assessment processing
     */
    @PostMapping("/admin/process-missed-assessments")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Process missed assessments",
        description = "Manually trigger processing of missed gradebook assessments (creates zero scores)"
    )
    public ResponseEntity<Map<String, Object>> processMissedAssessments() {
        
        User admin = getCurrentUser();
        log.info("🔧 Manual trigger: Processing missed assessments - initiated by {}", admin.getEmail());
        
        LocalDateTime now = LocalDateTime.now();
        
        List<AssessmentType> gradebookTypes = List.of(
            AssessmentType.QUIZ,
            AssessmentType.CLASSWORK,
            AssessmentType.TEST1,
            AssessmentType.TEST2,
            AssessmentType.ASSIGNMENT,
            AssessmentType.EXAM
        );
        
        List<Assessment> overdueAssessments = assessmentRepository.findAll().stream()
            .filter(a -> a.getPublished())
            .filter(a -> gradebookTypes.contains(a.getType()))
            .filter(a -> a.getDueDate() != null && a.getDueDate().isBefore(now))
            .collect(Collectors.toList());
        
        int zeroSubmissionsCreated = 0;
        int assessmentsProcessed = 0;
        
        for (Assessment assessment : overdueAssessments) {
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
                            "Missed deadline - manual processing"
                        );
                        zeroSubmissionsCreated++;
                    }
                }
                assessmentsProcessed++;
            } catch (Exception e) {
                log.error("Failed to process assessment {}: {}", assessment.getId(), e.getMessage());
            }
        }
        
        return ResponseEntity.ok(Map.of(
            "message", "Processing complete",
            "overdueAssessments", overdueAssessments.size(),
            "assessmentsProcessed", assessmentsProcessed,
            "zeroSubmissionsCreated", zeroSubmissionsCreated,
            "processedBy", admin.getEmail()
        ));
    }
    
}
