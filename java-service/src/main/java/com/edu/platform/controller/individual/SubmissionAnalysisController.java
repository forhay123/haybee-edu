package com.edu.platform.controller.individual;

import com.edu.platform.dto.ApiResponse;
import com.edu.platform.model.User;
import com.edu.platform.service.UserService;
import com.edu.platform.service.individual.PreviousSubmissionAnalyzer;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * ✅ NEW CONTROLLER: Submission Analysis for Custom Assessment Creation
 * Provides detailed analysis of student submissions to help teachers create targeted assessments
 */
@RestController
@RequestMapping("/individual/submission-analysis")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Submission Analysis", description = "Analyze student submissions for custom assessment creation")
@SecurityRequirement(name = "bearerAuth")
public class SubmissionAnalysisController {

    private final PreviousSubmissionAnalyzer submissionAnalyzer;
    private final UserService userService;

    /**
     * ✅ GET /api/v1/individual/submission-analysis/{submissionId}/detailed
     * Get complete detailed analysis of a submission
     */
    @GetMapping("/{submissionId}/detailed")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Get detailed submission analysis",
               description = "Full breakdown of student's performance for creating custom assessment")
    public ResponseEntity<ApiResponse<PreviousSubmissionAnalyzer.SubmissionAnalysis>> getDetailedAnalysis(
            @PathVariable Long submissionId,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        try {
            log.info("🔍 GET /submission-analysis/{}/detailed - User: {}",
                    submissionId, userDetails.getUsername());

            PreviousSubmissionAnalyzer.SubmissionAnalysis analysis = 
                    submissionAnalyzer.analyzeSubmission(submissionId);

            log.info("✅ Analysis complete: {}/{} correct ({} weak areas identified)",
                    analysis.getCorrectAnswers(),
                    analysis.getTotalQuestions(),
                    analysis.getWeakAreas().size());

            // ✅ FIXED: message first, then data
            return ResponseEntity.ok(ApiResponse.success(
                    "Submission analysis retrieved successfully",
                    analysis
            ));

        } catch (IllegalArgumentException e) {
            log.error("❌ Submission not found: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Submission not found: " + e.getMessage()));

        } catch (Exception e) {
            log.error("❌ Error analyzing submission: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to analyze submission: " + e.getMessage()));
        }
    }

    /**
     * ✅ GET /api/v1/individual/submission-analysis/{submissionId}/weak-topics
     * Get topics where student performed poorly (<60% correct)
     */
    @GetMapping("/{submissionId}/weak-topics")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Get weak topics from submission",
               description = "Topics where student scored below 60% - focus areas for next assessment")
    public ResponseEntity<ApiResponse<List<PreviousSubmissionAnalyzer.TopicPerformance>>> getWeakTopics(
            @PathVariable Long submissionId,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        try {
            log.info("📊 GET /submission-analysis/{}/weak-topics - User: {}",
                    submissionId, userDetails.getUsername());

            List<PreviousSubmissionAnalyzer.TopicPerformance> weakTopics = 
                    submissionAnalyzer.getWeakTopics(submissionId);

            log.info("✅ Found {} weak topics", weakTopics.size());

            // ✅ FIXED: message first, then data
            return ResponseEntity.ok(ApiResponse.success(
                    weakTopics.size() + " weak topic(s) identified",
                    weakTopics
            ));

        } catch (IllegalArgumentException e) {
            log.error("❌ Submission not found: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Submission not found: " + e.getMessage()));

        } catch (Exception e) {
            log.error("❌ Error analyzing weak topics: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to analyze weak topics: " + e.getMessage()));
        }
    }

    /**
     * ✅ GET /api/v1/individual/submission-analysis/{submissionId}/incorrect-questions
     * Get all questions student answered incorrectly
     */
    @GetMapping("/{submissionId}/incorrect-questions")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Get incorrect questions",
               description = "List of all questions student got wrong - for re-testing or review")
    public ResponseEntity<ApiResponse<List<PreviousSubmissionAnalyzer.QuestionAnalysis>>> getIncorrectQuestions(
            @PathVariable Long submissionId,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        try {
            log.info("❌ GET /submission-analysis/{}/incorrect-questions - User: {}",
                    submissionId, userDetails.getUsername());

            List<PreviousSubmissionAnalyzer.QuestionAnalysis> incorrectQuestions = 
                    submissionAnalyzer.getIncorrectQuestions(submissionId);

            log.info("✅ Found {} incorrect questions", incorrectQuestions.size());

            // ✅ FIXED: message first, then data
            return ResponseEntity.ok(ApiResponse.success(
                    incorrectQuestions.size() + " incorrect question(s)",
                    incorrectQuestions
            ));

        } catch (IllegalArgumentException e) {
            log.error("❌ Submission not found: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Submission not found: " + e.getMessage()));

        } catch (Exception e) {
            log.error("❌ Error fetching incorrect questions: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to fetch incorrect questions: " + e.getMessage()));
        }
    }

    /**
     * ✅ GET /api/v1/individual/submission-analysis/{submissionId}/recommended-questions
     * Get AI-recommended question mix for next assessment based on performance
     */
    @GetMapping("/{submissionId}/recommended-questions")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Get recommended question mix",
               description = "AI suggestions for next assessment based on student's weak areas")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> getRecommendedQuestions(
            @PathVariable Long submissionId,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        try {
            log.info("💡 GET /submission-analysis/{}/recommended-questions - User: {}",
                    submissionId, userDetails.getUsername());

            Map<String, Integer> recommendations = 
                    submissionAnalyzer.getRecommendedQuestionMix(submissionId);

            log.info("✅ Generated recommendations: {}", recommendations);

            // ✅ FIXED: message first, then data
            return ResponseEntity.ok(ApiResponse.success(
                    "Question recommendations generated successfully",
                    recommendations
            ));

        } catch (IllegalArgumentException e) {
            log.error("❌ Submission not found: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Submission not found: " + e.getMessage()));

        } catch (Exception e) {
            log.error("❌ Error generating recommendations: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to generate recommendations: " + e.getMessage()));
        }
    }

    /**
     * ✅ GET /api/v1/individual/submission-analysis/{submissionId}/summary
     * Get quick summary statistics for dashboard/card view
     */
    @GetMapping("/{submissionId}/summary")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Get submission summary",
               description = "Quick stats for dashboard view")
    public ResponseEntity<ApiResponse<SubmissionSummaryDto>> getSubmissionSummary(
            @PathVariable Long submissionId,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        try {
            log.info("📝 GET /submission-analysis/{}/summary - User: {}",
                    submissionId, userDetails.getUsername());

            PreviousSubmissionAnalyzer.SubmissionAnalysis analysis = 
                    submissionAnalyzer.analyzeSubmission(submissionId);

            SubmissionSummaryDto summary = SubmissionSummaryDto.builder()
                    .submissionId(analysis.getSubmissionId())
                    .studentName(analysis.getStudentName())
                    .assessmentTitle(analysis.getAssessmentTitle())
                    .score(analysis.getScorePercentage())
                    .totalQuestions(analysis.getTotalQuestions())
                    .correctAnswers(analysis.getCorrectAnswers())
                    .incorrectAnswers(analysis.getIncorrectAnswers())
                    .weakAreaCount(analysis.getWeakAreas().size())
                    .weakAreas(analysis.getWeakAreas())
                    .needsCustomAssessment(analysis.getScorePercentage() < 70.0)
                    .build();

            log.info("✅ Summary: {}/{} correct, {} weak areas",
                    summary.getCorrectAnswers(),
                    summary.getTotalQuestions(),
                    summary.getWeakAreaCount());

            // ✅ FIXED: message first, then data
            return ResponseEntity.ok(ApiResponse.success(
                    "Submission summary retrieved successfully",
                    summary
            ));

        } catch (IllegalArgumentException e) {
            log.error("❌ Submission not found: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Submission not found: " + e.getMessage()));

        } catch (Exception e) {
            log.error("❌ Error generating summary: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to generate summary: " + e.getMessage()));
        }
    }

    /**
     * ✅ POST /api/v1/individual/submission-analysis/compare
     * Compare multiple submissions to track performance trends
     */
    @PostMapping("/compare")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Compare multiple submissions",
               description = "Track performance trends across multiple assessments")
    public ResponseEntity<ApiResponse<List<PreviousSubmissionAnalyzer.SubmissionAnalysis>>> compareSubmissions(
            @RequestBody List<Long> submissionIds,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        try {
            log.info("📊 POST /submission-analysis/compare - User: {}, Submissions: {}",
                    userDetails.getUsername(), submissionIds.size());

            if (submissionIds == null || submissionIds.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Submission IDs are required"));
            }

            if (submissionIds.size() > 10) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Maximum 10 submissions can be compared at once"));
            }

            List<PreviousSubmissionAnalyzer.SubmissionAnalysis> analyses = 
                    submissionAnalyzer.compareSubmissions(submissionIds);

            log.info("✅ Compared {} submissions", analyses.size());

            // ✅ FIXED: message first, then data
            return ResponseEntity.ok(ApiResponse.success(
                    "Submission comparison completed successfully",
                    analyses
            ));

        } catch (Exception e) {
            log.error("❌ Error comparing submissions: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to compare submissions: " + e.getMessage()));
        }
    }

    // ============================================================
    // DTOs
    // ============================================================

    @lombok.Data
    @lombok.Builder
    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    public static class SubmissionSummaryDto {
        private Long submissionId;
        private String studentName;
        private String assessmentTitle;
        private double score;
        private int totalQuestions;
        private int correctAnswers;
        private int incorrectAnswers;
        private int weakAreaCount;
        private List<String> weakAreas;
        private boolean needsCustomAssessment;
    }
}
