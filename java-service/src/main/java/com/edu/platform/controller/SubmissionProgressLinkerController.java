package com.edu.platform.controller;

import com.edu.platform.service.maintenance.AssessmentSubmissionProgressLinker;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * ✅ EMERGENCY FIX: Link assessment submissions to progress records
 * 
 * This controller fixes the critical issue where students submit assessments
 * but their progress records aren't updated (completed = false)
 * 
 * Run this ONCE to fix all existing submissions, then the issue should be
 * prevented going forward by updating the submission handler
 */
@RestController
@RequestMapping("/admin/maintenance/submissions")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Submission Linking (Admin)", description = "Fix unlinked assessment submissions")
@PreAuthorize("hasRole('ADMIN')")
public class SubmissionProgressLinkerController {

    private final AssessmentSubmissionProgressLinker linker;

    /**
     * ✅ FIX ALL: Link all assessment submissions to their progress records
     * 
     * This is the main fix - run this once to repair all existing data
     * 
     * What it does:
     * 1. Finds all assessment submissions
     * 2. For each submission, finds the matching progress record
     * 3. Updates progress: completed=true, completed_at=submission_time
     * 4. Links submission to progress via assessment_submission_id
     */
    @PostMapping("/link-all")
    @Operation(summary = "Link all submissions to progress (FIX ALL)", 
               description = "Emergency fix: Links all assessment submissions to their progress records")
    public ResponseEntity<Map<String, Object>> linkAllSubmissions() {
        log.info("========================================");
        log.info("🚀 ADMIN: Starting comprehensive submission linking");
        log.info("========================================");

        AssessmentSubmissionProgressLinker.LinkingResult result = 
                linker.linkAllSubmissionsToProgress();

        Map<String, Object> response = Map.of(
                "success", result.isSuccess(),
                "linkedCount", result.getLinkedCount(),
                "alreadyLinkedCount", result.getAlreadyLinkedCount(),
                "noProgressFoundCount", result.getNoProgressFoundCount(),
                "errorCount", result.getErrors().size(),
                "errors", result.getErrors(),
                "fatalError", result.getFatalError() != null ? result.getFatalError() : "",
                "message", String.format(
                        "Processed submissions: %d linked, %d already linked, %d no progress, %d errors",
                        result.getLinkedCount(),
                        result.getAlreadyLinkedCount(),
                        result.getNoProgressFoundCount(),
                        result.getErrors().size()
                )
        );

        log.info("========================================");
        log.info("✅ Linking complete");
        log.info("========================================");

        return ResponseEntity.ok(response);
    }

    /**
     * ✅ Fix a specific student's submissions
     * Useful for testing or fixing one student at a time
     */
    @PostMapping("/link-student/{studentProfileId}")
    @Operation(summary = "Link submissions for one student", 
               description = "Fix submission links for a specific student")
    public ResponseEntity<Map<String, Object>> linkStudentSubmissions(
            @PathVariable Long studentProfileId) {
        
        log.info("🔗 ADMIN: Linking submissions for student {}", studentProfileId);

        AssessmentSubmissionProgressLinker.LinkingResult result = 
                linker.linkSubmissionsForStudent(studentProfileId);

        Map<String, Object> response = Map.of(
                "success", result.isSuccess(),
                "studentProfileId", studentProfileId,
                "linkedCount", result.getLinkedCount(),
                "alreadyLinkedCount", result.getAlreadyLinkedCount(),
                "noProgressFoundCount", result.getNoProgressFoundCount(),
                "errorCount", result.getErrors().size(),
                "errors", result.getErrors(),
                "message", String.format(
                        "Student %d: %d linked, %d already linked, %d no progress, %d errors",
                        studentProfileId,
                        result.getLinkedCount(),
                        result.getAlreadyLinkedCount(),
                        result.getNoProgressFoundCount(),
                        result.getErrors().size()
                )
        );

        return ResponseEntity.ok(response);
    }

    /**
     * ✅ Get statistics about unlinked submissions
     * Check this BEFORE running the fix to see how many need fixing
     */
    @GetMapping("/statistics")
    @Operation(summary = "Get unlinked submission statistics", 
               description = "Check how many submissions need linking")
    public ResponseEntity<Map<String, Object>> getStatistics() {
        log.info("📊 ADMIN: Getting unlinked submission statistics");

        Map<String, Object> stats = linker.getUnlinkedStatistics();

        return ResponseEntity.ok(stats);
    }

    /**
     * ✅ Health check endpoint
     */
    @GetMapping("/health")
    @Operation(summary = "Health check", 
               description = "Verify the linking service is working")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "OK",
                "service", "AssessmentSubmissionProgressLinker",
                "message", "Service is ready to link submissions"
        ));
    }
}