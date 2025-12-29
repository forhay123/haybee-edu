package com.edu.platform.controller;

import com.edu.platform.dto.assessment.*;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.model.User;
import com.edu.platform.model.assessment.AssessmentType;
import com.edu.platform.service.assessment.AssessmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/lesson-assessments")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Lesson Assessments", description = "Lesson topic assessment endpoints")
public class LessonAssessmentController {

    private final AssessmentService assessmentService;
    private final JdbcTemplate jdbcTemplate;  // ✅ Added for direct DB queries

    // ============================================================
    // ✅ NEW: DIAGNOSTIC ENDPOINT - Get assessment by lesson topic
    // ============================================================
    @GetMapping("/by-lesson/{lessonTopicId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER') or hasRole('STUDENT')")
    @Operation(summary = "Get assessment by lesson topic ID (for diagnostics)", 
               description = "Get assessment details including questions for a specific lesson topic")
    public ResponseEntity<Map<String, Object>> getAssessmentByLessonTopicId(
            @PathVariable Long lessonTopicId) {
        
        log.info("🔍 DIAGNOSTIC: Getting assessment for lesson topic ID: {}", lessonTopicId);
        
        try {
            // Query assessment with questions
            String sql = """
                SELECT 
                    a.id,
                    a.title,
                    a.type,
                    a.total_marks,
                    a.passing_marks,
                    a.duration_minutes,
                    a.published,
                    a.auto_grade,
                    a.lesson_topic_id,
                    a.subject_id,
                    COUNT(aq.id) as question_count,
                    COALESCE(SUM(aq.marks), 0) as total_question_marks
                FROM academic.assessments a
                LEFT JOIN academic.assessment_questions aq ON aq.assessment_id = a.id
                WHERE a.lesson_topic_id = ?
                AND a.type = 'LESSON_TOPIC_ASSESSMENT'
                GROUP BY a.id
                LIMIT 1
                """;
            
            List<Map<String, Object>> results = jdbcTemplate.queryForList(sql, lessonTopicId);
            
            if (results.isEmpty()) {
                log.warn("❌ No assessment found for lesson topic {}", lessonTopicId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                        "error", "Assessment not found",
                        "message", "No assessment exists for this lesson topic",
                        "lessonTopicId", lessonTopicId
                    ));
            }
            
            Map<String, Object> assessment = results.get(0);
            
            // Get questions if they exist
            if (((Number) assessment.get("question_count")).intValue() > 0) {
                String questionsSql = """
                    SELECT 
                        id,
                        question_text,
                        question_type,
                        marks,
                        order_number,
                        ai_generated
                    FROM academic.assessment_questions
                    WHERE assessment_id = ?
                    ORDER BY order_number
                    """;
                
                List<Map<String, Object>> questions = jdbcTemplate.queryForList(
                    questionsSql, 
                    assessment.get("id")
                );
                
                assessment.put("questions", questions);
            } else {
                assessment.put("questions", List.of());
            }
            
            log.info("✅ Found assessment {} with {} questions for lesson topic {}", 
                assessment.get("id"), 
                assessment.get("question_count"), 
                lessonTopicId);
            
            return ResponseEntity.ok(assessment);
            
        } catch (Exception e) {
            log.error("❌ Error fetching assessment for lesson topic {}: {}", 
                lessonTopicId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(
                    "error", "Server error",
                    "message", e.getMessage(),
                    "lessonTopicId", lessonTopicId
                ));
        }
    }

    // ============================================================
    // EXISTING ENDPOINTS (keep as is)
    // ============================================================
    
    @GetMapping("/lesson/{lessonTopicId}")
    @PreAuthorize("hasRole('STUDENT') or hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Get assessment for lesson topic", 
               description = "Get the assessment associated with a lesson topic")
    public ResponseEntity<AssessmentDto> getLessonAssessment(
            @PathVariable Long lessonTopicId,
            @RequestParam(required = false) Long studentProfileId) {
        
        log.info("Getting assessment for lesson topic: {}", lessonTopicId);
        AssessmentDto assessment = assessmentService.getAssessmentByLessonTopic(
            lessonTopicId, 
            studentProfileId
        );
        return ResponseEntity.ok(assessment);
    }

    @GetMapping("/{assessmentId}/questions")
    @PreAuthorize("hasRole('STUDENT') or hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Get assessment questions", 
               description = "Get questions for a lesson assessment")
    public ResponseEntity<List<AssessmentQuestionDto>> getQuestions(
            @PathVariable Long assessmentId,
            @RequestParam(defaultValue = "false") boolean isTeacher) {
        
        log.info("Getting questions for assessment: {}", assessmentId);
        List<AssessmentQuestionDto> questions = assessmentService.getAssessmentQuestions(
            assessmentId, 
            isTeacher
        );
        return ResponseEntity.ok(questions);
    }

    @PostMapping("/submit")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Submit lesson assessment", 
               description = "Student submits answers for a lesson assessment")
    public ResponseEntity<AssessmentSubmissionDto> submitAssessment(
            @RequestBody AssessmentSubmissionRequest request,
            @RequestParam Long studentProfileId) {
        
        log.info("Student {} submitting lesson assessment {}", 
                 studentProfileId, request.getAssessmentId());
        
        if (request.getAssessmentId() == null) {
            throw new IllegalArgumentException("Assessment ID is required");
        }
        
        AssessmentSubmissionDto submission = assessmentService.submitAssessment(
            request, 
            studentProfileId
        );
        return ResponseEntity.ok(submission);
    }

    @GetMapping("/submission/{lessonTopicId}")
    @PreAuthorize("hasRole('STUDENT') or hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Get submission by lesson topic", 
               description = "Get student's submission for a lesson topic assessment")
    public ResponseEntity<?> getSubmissionByLesson(
            @PathVariable Long lessonTopicId,
            @RequestParam Long studentProfileId) {
        
        log.info("📋 Getting submission for lesson topic {} and student {}", 
                 lessonTopicId, studentProfileId);
        
        try {
            AssessmentDto assessment = assessmentService.getAssessmentByLessonTopic(
                lessonTopicId, 
                studentProfileId
            );
            
            if (assessment == null) {
                log.warn("❌ No assessment found for lesson topic: {}", lessonTopicId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                        "error", "No assessment found",
                        "message", "No assessment exists for this lesson topic",
                        "lessonTopicId", lessonTopicId
                    ));
            }
            
            AssessmentSubmissionDto submission = assessmentService
                .getSubmissionByAssessmentAndStudent(assessment.getId(), studentProfileId);
            
            if (submission == null) {
                log.warn("❌ No submission found for assessment {} and student {}", 
                         assessment.getId(), studentProfileId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                        "error", "No submission found",
                        "message", "Student has not submitted this assessment yet",
                        "assessmentId", assessment.getId(),
                        "studentProfileId", studentProfileId,
                        "lessonTopicId", lessonTopicId,
                        "hasAssessment", true
                    ));
            }
            
            return ResponseEntity.ok(submission);
            
        } catch (Exception e) {
            log.error("❌ Error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Server error", "message", e.getMessage()));
        }
    }

    @GetMapping("/results/{submissionId}")
    @PreAuthorize("hasRole('STUDENT') or hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Get submission results", 
               description = "Get detailed results of a submission")
    public ResponseEntity<AssessmentSubmissionDto> getSubmissionResults(
            @PathVariable Long submissionId) {
        
        log.info("Getting results for submission: {}", submissionId);
        AssessmentSubmissionDto submission = assessmentService.getSubmissionResults(submissionId);
        return ResponseEntity.ok(submission);
    }

    @GetMapping("/student/{studentProfileId}")
    @PreAuthorize("hasRole('STUDENT') or hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Get student's lesson assessments", 
               description = "Get all lesson assessments for a student")
    public ResponseEntity<List<AssessmentSubmissionDto>> getStudentLessonAssessments(
            @PathVariable Long studentProfileId,
            @RequestParam(required = false) Long subjectId) {
        
        log.info("Getting lesson assessments for student: {}", studentProfileId);
        List<AssessmentSubmissionDto> submissions = assessmentService.getStudentAssessments(
            studentProfileId,
            AssessmentType.LESSON_TOPIC_ASSESSMENT,
            subjectId
        );
        return ResponseEntity.ok(submissions);
    }

    @GetMapping("/student/{studentProfileId}/stats")
    @PreAuthorize("hasRole('STUDENT') or hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Get assessment statistics", 
               description = "Get statistics for student's lesson assessments")
    public ResponseEntity<Map<String, Object>> getStudentAssessmentStats(
            @PathVariable Long studentProfileId,
            @RequestParam(required = false) Long subjectId) {
        
        log.info("Getting assessment stats for student: {}", studentProfileId);
        Map<String, Object> stats = assessmentService.getStudentAssessmentStats(
            studentProfileId,
            AssessmentType.LESSON_TOPIC_ASSESSMENT,
            subjectId
        );
        return ResponseEntity.ok(stats);
    }
    
    @GetMapping("/submission-by-id/{submissionId}")
    @PreAuthorize("hasRole('STUDENT') or hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Get submission by submission ID", 
               description = "Get a specific submission by its ID")
    public ResponseEntity<?> getSubmissionById(
            @PathVariable Long submissionId,
            @RequestParam(required = false) Long studentProfileId) {
        
        log.info("📋 Getting submission by ID: {} for student: {}", submissionId, studentProfileId);
        
        try {
            AssessmentSubmissionDto submission = assessmentService.getSubmissionById(submissionId);
            
            if (studentProfileId != null && !submission.getStudentId().equals(studentProfileId)) {
                log.warn("❌ Submission {} does not belong to student {}", 
                         submissionId, studentProfileId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                        "error", "Access denied",
                        "message", "This submission does not belong to you"
                    ));
            }
            
            return ResponseEntity.ok(submission);
            
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", "Submission not found", "message", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Server error", "message", e.getMessage()));
        }
    }
    
    
    /**
     * ✅ NEW: Get submission by assessment ID (not lesson topic ID)
     * This is needed for custom assessments where multiple assessments 
     * exist for the same lesson topic
     */
    @GetMapping("/assessment/{assessmentId}/submission")
    @PreAuthorize("hasRole('STUDENT') or hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Get submission by assessment ID", 
               description = "Get student's submission for a specific assessment ID")
    public ResponseEntity<?> getSubmissionByAssessmentId(
            @PathVariable Long assessmentId,
            @RequestParam Long studentProfileId) {
        
        log.info("📋 Getting submission for ASSESSMENT {} and student {}", 
                 assessmentId, studentProfileId);
        
        try {
            AssessmentSubmissionDto submission = assessmentService
                .getSubmissionByAssessmentAndStudent(assessmentId, studentProfileId);
            
            if (submission == null) {
                log.info("❌ No submission found for assessment {} and student {}", 
                         assessmentId, studentProfileId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                        "error", "No submission found",
                        "message", "Student has not submitted this assessment yet",
                        "assessmentId", assessmentId,
                        "studentProfileId", studentProfileId
                    ));
            }
            
            log.info("✅ Found submission {} for assessment {} and student {}", 
                     submission.getId(), assessmentId, studentProfileId);
            
            return ResponseEntity.ok(submission);
            
        } catch (Exception e) {
            log.error("❌ Error getting submission for assessment {}: {}", 
                     assessmentId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Server error", "message", e.getMessage()));
        }
    }
}