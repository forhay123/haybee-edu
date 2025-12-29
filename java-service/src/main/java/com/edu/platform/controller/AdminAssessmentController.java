package com.edu.platform.controller;

import com.edu.platform.dto.assessment.*;
import com.edu.platform.service.IntegrationService;
import com.edu.platform.service.assessment.AdminAssessmentService;
import com.edu.platform.service.assessment.ProgressMaintenanceService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/assessments")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Admin Assessment", description = "Admin endpoints for assessment management")
@PreAuthorize("hasRole('ADMIN')")
public class AdminAssessmentController {

    private final AdminAssessmentService adminAssessmentService;
    private final ProgressMaintenanceService maintenanceService;
    private final IntegrationService integrationService;
    private final JdbcTemplate jdbcTemplate;

    @GetMapping("/stats/overview")
    @Operation(summary = "Get assessment statistics overview", 
               description = "Get system-wide assessment statistics with subject breakdown and recent activity")
    public ResponseEntity<Map<String, Object>> getAssessmentStatsOverview() {
        log.info("Admin fetching assessment stats overview");
        Map<String, Object> stats = adminAssessmentService.getAssessmentStatsOverview();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/submissions/all")
    @Operation(summary = "Get all submissions", 
               description = "Get all assessment submissions across the system")
    public ResponseEntity<List<AssessmentSubmissionDto>> getAllSubmissions(
            @RequestParam(required = false) Long assessmentId,
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) Boolean graded) {
        
        log.info("Admin fetching all submissions (assessmentId={}, studentId={}, subjectId={}, graded={})", 
                assessmentId, studentId, subjectId, graded);
        
        List<AssessmentSubmissionDto> submissions = adminAssessmentService.getAllSubmissions(
                assessmentId, studentId, subjectId, graded);
        
        log.info("Found {} submissions", submissions.size());
        return ResponseEntity.ok(submissions);
    }

    @GetMapping("/pending-grading/all")
    @Operation(summary = "Get all pending grading submissions", 
               description = "Get all submissions pending grading across the system")
    public ResponseEntity<List<PendingSubmissionDto>> getAllPendingGrading(
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) Long teacherId) {
        
        log.info("Admin fetching all pending grading (subjectId={}, teacherId={})", 
                subjectId, teacherId);
        
        List<PendingSubmissionDto> submissions = adminAssessmentService.getAllPendingGrading(
                subjectId, teacherId);
        
        log.info("Found {} pending grading submissions", submissions.size());
        return ResponseEntity.ok(submissions);
    }

    @GetMapping("/all")
    @Operation(summary = "Get all assessments", 
               description = "Get all assessments in the system")
    public ResponseEntity<List<AssessmentDto>> getAllAssessments(
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) Long teacherId,
            @RequestParam(required = false) Boolean published) {
        
        log.info("Admin fetching all assessments (subjectId={}, teacherId={}, published={})", 
                subjectId, teacherId, published);
        
        List<AssessmentDto> assessments = adminAssessmentService.getAllAssessments(
                subjectId, teacherId, published);
        
        log.info("Found {} assessments", assessments.size());
        return ResponseEntity.ok(assessments);
    }

    @GetMapping("/stats/by-subject")
    @Operation(summary = "Get assessment stats by subject", 
               description = "Get assessment statistics grouped by subject")
    public ResponseEntity<List<Map<String, Object>>> getStatsBySubject() {
        log.info("Admin fetching assessment stats by subject");
        List<Map<String, Object>> stats = adminAssessmentService.getStatsBySubject();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/stats/by-teacher")
    @Operation(summary = "Get assessment stats by teacher", 
               description = "Get assessment statistics grouped by teacher")
    public ResponseEntity<List<Map<String, Object>>> getStatsByTeacher() {
        log.info("Admin fetching assessment stats by teacher");
        List<Map<String, Object>> stats = adminAssessmentService.getStatsByTeacher();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/stats/submission-trends")
    @Operation(summary = "Get submission trends", 
               description = "Get assessment submission trends over time")
    public ResponseEntity<Map<String, Object>> getSubmissionTrends(
            @RequestParam(required = false, defaultValue = "30") int days) {
        
        log.info("Admin fetching submission trends for last {} days", days);
        Map<String, Object> trends = adminAssessmentService.getSubmissionTrends(days);
        return ResponseEntity.ok(trends);
    }

    @GetMapping("/{assessmentId}/detailed-stats")
    @Operation(summary = "Get detailed assessment statistics", 
               description = "Get detailed statistics for a specific assessment")
    public ResponseEntity<Map<String, Object>> getDetailedAssessmentStats(
            @PathVariable Long assessmentId) {
        
        log.info("Admin fetching detailed stats for assessment {}", assessmentId);
        Map<String, Object> stats = adminAssessmentService.getDetailedAssessmentStats(assessmentId);
        return ResponseEntity.ok(stats);
    }

    // ✅ NEW ENDPOINTS FOR FRONTEND PAGES

    @GetMapping("/student/{studentId}/performance")
    @Operation(summary = "Get student performance", 
               description = "Get detailed performance analysis for a specific student")
    public ResponseEntity<Map<String, Object>> getStudentPerformance(
            @PathVariable Long studentId) {
        
        log.info("Admin fetching performance for student {}", studentId);
        Map<String, Object> performance = adminAssessmentService.getStudentPerformance(studentId);
        return ResponseEntity.ok(performance);
    }

    @GetMapping("/subject/{subjectId}/breakdown")
    @Operation(summary = "Get subject breakdown", 
               description = "Get detailed breakdown of assessments and performance for a subject")
    public ResponseEntity<Map<String, Object>> getSubjectBreakdown(
            @PathVariable Long subjectId) {
        
        log.info("Admin fetching breakdown for subject {}", subjectId);
        Map<String, Object> breakdown = adminAssessmentService.getSubjectBreakdown(subjectId);
        return ResponseEntity.ok(breakdown);
    }
    
    /**
     * ✅ Fix assessment access for all students
     * Call this once to fix existing data
     */
    @PostMapping("/fix-assessment-access")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Fix assessment access for all progress records")
    public ResponseEntity<Map<String, Object>> fixAssessmentAccess() {
        log.info("🔧 ADMIN: Fixing assessment access for all progress records");
        
        maintenanceService.enableAssessmentAccessForAll();
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Assessment access fixed for all progress records"
        ));
    }
    
    /**
     * ✅ Fix assessment access for a specific student
     */
    @PostMapping("/fix-assessment-access/student/{studentId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Fix assessment access for a specific student")
    public ResponseEntity<Map<String, Object>> fixAssessmentAccessForStudent(
            @PathVariable Long studentId) {
        
        log.info("🔧 ADMIN: Fixing assessment access for student {}", studentId);
        
        int fixedCount = maintenanceService.enableAssessmentAccessForStudent(studentId);
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "studentId", studentId,
            "recordsFixed", fixedCount,
            "message", String.format("Fixed %d progress records for student %d", 
                                    fixedCount, studentId)
        ));
    }
    
	
	/**
	 * ✅ AUTOMATED: Create assessment for a specific lesson topic
	 */
	@PostMapping("/create-for-lesson/{lessonTopicId}")
	@Operation(summary = "Create assessment for specific lesson", 
	           description = "Create assessment for a specific lesson topic with AI questions")
	public ResponseEntity<Map<String, Object>> createAssessmentForLesson(
	        @PathVariable Long lessonTopicId) {
	    
	    log.info("🎯 Admin: Creating assessment for lesson topic {}", lessonTopicId);
	    
	    Map<String, Object> result = integrationService.createAssessmentForLesson(lessonTopicId);
	    
	    boolean success = (boolean) result.getOrDefault("success", false);
	    
	    if (success) {
	        return ResponseEntity.ok(result);
	    } else {
	        return ResponseEntity.badRequest().body(result);
	    }
	}
	
	/**
	 * ✅ AUTOMATED: Create assessments for ALL topics with missing assessments
	 */
	@PostMapping("/create-all-missing")
	@Operation(summary = "Create all missing assessments", 
	           description = "Automatically create assessments for all lesson topics that have AI questions but no assessment")
	public ResponseEntity<Map<String, Object>> createAllMissingAssessments() {
	    
	    log.info("🔄 Admin: Creating ALL missing assessments");
	    
	    Map<String, Object> result = integrationService.createMissingAssessmentsForAllLessons();
	    
	    int created = (int) result.getOrDefault("assessmentsCreated", 0);
	    
	    log.info("✅ Created {} missing assessments", created);
	    
	    return ResponseEntity.ok(result);
	}
	
	/**
	 * ✅ Get statistics about missing assessments
	 */
	@GetMapping("/missing-assessments-stats")
	@Operation(summary = "Get missing assessments statistics", 
	           description = "Check how many lesson topics have questions but no assessment")
	public ResponseEntity<Map<String, Object>> getMissingAssessmentsStats() {
	    
	    log.info("📊 Admin: Fetching missing assessments statistics");
	    
	    String sql = """
	        SELECT 
	            lt.id as lesson_topic_id,
	            lt.topic_title,
	            s.name as subject_name,
	            s.id as subject_id,
	            COUNT(lq.id) as question_count,
	            SUM(lq.max_score) as total_marks
	        FROM academic.lesson_topics lt
	        INNER JOIN ai.lesson_ai_results lar ON lar.lesson_topic_id = lt.id
	        INNER JOIN ai.lesson_questions lq ON lq.lesson_id = lar.id
	        INNER JOIN academic.subjects s ON s.id = lt.subject_id
	        WHERE NOT EXISTS (
	            SELECT 1 FROM academic.assessments a
	            WHERE a.lesson_topic_id = lt.id
	            AND a.type = 'LESSON_TOPIC_ASSESSMENT'
	        )
	        AND lar.status = 'done'
	        GROUP BY lt.id, lt.topic_title, s.name, s.id
	        ORDER BY lt.id
	        """;
	    
	    List<Map<String, Object>> missingTopics = jdbcTemplate.query(sql, (rs, rowNum) -> {
	        Map<String, Object> topic = new HashMap<>();
	        topic.put("lessonTopicId", rs.getLong("lesson_topic_id"));
	        topic.put("topicTitle", rs.getString("topic_title"));
	        topic.put("subjectName", rs.getString("subject_name"));
	        topic.put("subjectId", rs.getLong("subject_id"));
	        topic.put("questionCount", rs.getInt("question_count"));
	        topic.put("totalMarks", rs.getInt("total_marks"));
	        return topic;
	    });
	    
	    Map<String, Object> stats = new HashMap<>();
	    stats.put("missingCount", missingTopics.size());
	    stats.put("topics", missingTopics);
	    
	    log.info("📊 Found {} topics with missing assessments", missingTopics.size());
	    
	    return ResponseEntity.ok(stats);
	}
}