package com.edu.platform.controller.individual;

import com.edu.platform.dto.individual.*;
import com.edu.platform.service.individual.StudentDashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * ✅ SPRINT 8: Controller for student dashboard
 * Provides multi-assessment progress tracking and overview
 */
@RestController
@RequestMapping("/individual/dashboard")
@RequiredArgsConstructor
@Slf4j
public class StudentDashboardController {

    private final StudentDashboardService dashboardService;

    // ============================================================
    // DASHBOARD OVERVIEW
    // ============================================================

    /**
     * ✅ Get complete dashboard overview
     * GET /api/individual/dashboard/overview/{studentProfileId}
     */
    @GetMapping("/overview/{studentProfileId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getDashboardOverview(
            @PathVariable Long studentProfileId) {
        
        log.info("📊 GET /dashboard/overview/{}", studentProfileId);

        Map<String, Object> overview = dashboardService.getDashboardOverview(studentProfileId);
        return ResponseEntity.ok(overview);
    }

    /**
     * ✅ Get current user's dashboard (for logged-in students)
     * GET /api/individual/dashboard/my-overview
     */
    @GetMapping("/my-overview")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, Object>> getMyDashboard() {
        log.info("📊 GET /dashboard/my-overview");
        
        // TODO: Get student ID from authentication context
        // For now, return placeholder
        log.warn("⚠️ Authentication context not yet implemented");
        return ResponseEntity.ok(Map.of("message", "Not implemented"));
    }

    // ============================================================
    // LESSON TOPIC PROGRESS
    // ============================================================

    /**
     * ✅ Get multi-assessment progress for a specific lesson topic
     * GET /api/individual/dashboard/topic-progress/{studentProfileId}/{lessonTopicId}
     */
    @GetMapping("/topic-progress/{studentProfileId}/{lessonTopicId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN', 'TEACHER')")
    public ResponseEntity<MultiAssessmentProgressDto> getTopicProgress(
            @PathVariable Long studentProfileId,
            @PathVariable Long lessonTopicId) {
        
        log.info("📚 GET /dashboard/topic-progress/{}/{}", studentProfileId, lessonTopicId);

        MultiAssessmentProgressDto progress = dashboardService
            .getTopicProgress(studentProfileId, lessonTopicId);
        return ResponseEntity.ok(progress);
    }

    /**
     * ✅ Get all lesson topics with completion status
     * GET /api/individual/dashboard/topic-summary/{studentProfileId}
     */
    @GetMapping("/topic-summary/{studentProfileId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN', 'TEACHER')")
    public ResponseEntity<List<LessonTopicCompletionDto>> getTopicCompletionSummary(
            @PathVariable Long studentProfileId) {
        
        log.info("📋 GET /dashboard/topic-summary/{}", studentProfileId);

        List<LessonTopicCompletionDto> summary = dashboardService
            .getTopicCompletionSummary(studentProfileId);
        return ResponseEntity.ok(summary);
    }

    // ============================================================
    // ASSESSMENT AVAILABILITY
    // ============================================================

    /**
     * ✅ Get assessment availability status (for countdown timers)
     * GET /api/individual/dashboard/availability/{scheduleId}
     */
    @GetMapping("/availability/{scheduleId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    public ResponseEntity<AssessmentAvailabilityDto> getAssessmentAvailability(
            @PathVariable Long scheduleId) {
        
        log.info("🕒 GET /dashboard/availability/{}", scheduleId);

        AssessmentAvailabilityDto availability = dashboardService
            .getAssessmentAvailability(scheduleId);
        return ResponseEntity.ok(availability);
    }

    // ============================================================
    // DAILY & UPCOMING ASSESSMENTS
    // ============================================================

    /**
     * ✅ Get today's assessments
     * GET /api/individual/dashboard/today/{studentProfileId}
     */
    @GetMapping("/today/{studentProfileId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    public ResponseEntity<List<AssessmentPeriodDto>> getTodaysAssessments(
            @PathVariable Long studentProfileId) {
        
        log.info("📅 GET /dashboard/today/{}", studentProfileId);

        List<AssessmentPeriodDto> assessments = dashboardService
            .getTodaysAssessments(studentProfileId);
        return ResponseEntity.ok(assessments);
    }

    /**
     * ✅ Get upcoming assessments (next N days)
     * GET /api/individual/dashboard/upcoming/{studentProfileId}?days=7
     */
    @GetMapping("/upcoming/{studentProfileId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    public ResponseEntity<List<AssessmentPeriodDto>> getUpcomingAssessments(
            @PathVariable Long studentProfileId,
            @RequestParam(required = false, defaultValue = "7") Integer days) {
        
        log.info("📅 GET /dashboard/upcoming/{} (days={})", studentProfileId, days);

        List<AssessmentPeriodDto> assessments = dashboardService
            .getUpcomingAssessments(studentProfileId, days);
        return ResponseEntity.ok(assessments);
    }

    /**
     * ✅ Get current user's today's assessments
     * GET /api/individual/dashboard/my-today
     */
    @GetMapping("/my-today")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<AssessmentPeriodDto>> getMyTodaysAssessments() {
        log.info("📅 GET /dashboard/my-today");
        
        // TODO: Get student ID from authentication context
        log.warn("⚠️ Authentication context not yet implemented");
        return ResponseEntity.ok(List.of());
    }

    /**
     * ✅ Get current user's upcoming assessments
     * GET /api/individual/dashboard/my-upcoming?days=7
     */
    @GetMapping("/my-upcoming")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<AssessmentPeriodDto>> getMyUpcomingAssessments(
            @RequestParam(required = false, defaultValue = "7") Integer days) {
        
        log.info("📅 GET /dashboard/my-upcoming (days={})", days);
        
        // TODO: Get student ID from authentication context
        log.warn("⚠️ Authentication context not yet implemented");
        return ResponseEntity.ok(List.of());
    }
}