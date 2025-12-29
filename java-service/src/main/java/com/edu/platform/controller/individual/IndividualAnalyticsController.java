package com.edu.platform.controller.individual;

import com.edu.platform.dto.individual.SystemDashboardDto;
import com.edu.platform.dto.individual.TeacherSubjectPerformanceDto;
import com.edu.platform.service.individual.AdminSystemDashboardService;
import com.edu.platform.service.individual.TeacherSubjectReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * SPRINT 12: Individual Analytics Controller
 * Admin and Teacher analytics for INDIVIDUAL student system
 */
@RestController
@RequestMapping("/individual/analytics")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Individual Analytics", description = "Analytics and reporting for INDIVIDUAL student system (Admin/Teacher)")
public class IndividualAnalyticsController {

    private final TeacherSubjectReportService teacherReportService;
    private final AdminSystemDashboardService dashboardService;

    // ==================== TEACHER ENDPOINTS ====================

    /**
     * Get teacher's subject performance report
     * Accessible by: TEACHER (own subjects), ADMIN
     */
    @GetMapping("/teacher/{teacherId}/subject/{subjectId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(
        summary = "Get Teacher Subject Performance Report",
        description = "Retrieve comprehensive performance report for a teacher's subject. " +
                     "Shows student performance breakdown, topic analysis, completion rates, and teaching effectiveness metrics."
    )
    public ResponseEntity<TeacherSubjectPerformanceDto> getTeacherSubjectReport(
            @Parameter(description = "Teacher User ID", required = true)
            @PathVariable Long teacherId,
            
            @Parameter(description = "Subject ID", required = true)
            @PathVariable Long subjectId,
            
            @Parameter(description = "Start date (ISO format)", example = "2025-01-01")
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) 
            LocalDate startDate,
            
            @Parameter(description = "End date (ISO format)", example = "2025-03-31")
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) 
            LocalDate endDate) {
        
        log.info("📚 GET /api/individual/analytics/teacher/{}/subject/{} - Fetching teacher report", 
                teacherId, subjectId);

        // Default to current month if dates not provided
        if (startDate == null || endDate == null) {
            endDate = LocalDate.now();
            startDate = endDate.minusMonths(1);
            log.debug("Using default date range: {} to {}", startDate, endDate);
        }

        TeacherSubjectPerformanceDto report = teacherReportService.getTeacherSubjectReport(
                teacherId, subjectId, startDate, endDate);
        
        log.info("✅ Teacher report generated: {} students, {:.1f}% completion, {} at risk", 
                report.getTotalStudents(), report.getOverallCompletionRate(), report.getStudentsAtRisk());

        return ResponseEntity.ok(report);
    }

    /**
     * Get current week teacher report
     */
    @GetMapping("/teacher/{teacherId}/subject/{subjectId}/current-week")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(
        summary = "Get Current Week Teacher Report",
        description = "Retrieve performance report for the current week only"
    )
    public ResponseEntity<TeacherSubjectPerformanceDto> getCurrentWeekTeacherReport(
            @Parameter(description = "Teacher User ID", required = true)
            @PathVariable Long teacherId,
            
            @Parameter(description = "Subject ID", required = true)
            @PathVariable Long subjectId) {
        
        log.info("📚 GET /api/individual/analytics/teacher/{}/subject/{}/current-week", 
                teacherId, subjectId);

        // Get current week's Monday and Sunday
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(java.time.DayOfWeek.MONDAY);
        LocalDate weekEnd = today.with(java.time.DayOfWeek.SUNDAY);

        TeacherSubjectPerformanceDto report = teacherReportService.getTeacherSubjectReport(
                teacherId, subjectId, weekStart, weekEnd);

        return ResponseEntity.ok(report);
    }

    /**
     * Get at-risk students for a teacher's subject
     */
    @GetMapping("/teacher/{teacherId}/subject/{subjectId}/at-risk")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(
        summary = "Get At-Risk Students",
        description = "Retrieve list of students who need immediate attention (low completion, failing grades)"
    )
    public ResponseEntity<AtRiskStudentsDto> getAtRiskStudents(
            @Parameter(description = "Teacher User ID", required = true)
            @PathVariable Long teacherId,
            
            @Parameter(description = "Subject ID", required = true)
            @PathVariable Long subjectId,
            
            @Parameter(description = "Start date (ISO format)")
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) 
            LocalDate startDate,
            
            @Parameter(description = "End date (ISO format)")
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) 
            LocalDate endDate) {
        
        log.info("🚨 GET /api/individual/analytics/teacher/{}/subject/{}/at-risk", 
                teacherId, subjectId);

        if (startDate == null || endDate == null) {
            endDate = LocalDate.now();
            startDate = endDate.minusMonths(1);
        }

        TeacherSubjectPerformanceDto report = teacherReportService.getTeacherSubjectReport(
                teacherId, subjectId, startDate, endDate);

        AtRiskStudentsDto atRiskDto = AtRiskStudentsDto.builder()
                .subjectId(subjectId)
                .subjectName(report.getSubjectName())
                .totalStudents(report.getTotalStudents())
                .atRiskCount(report.getStudentsAtRisk())
                .atRiskStudents(report.getAtRiskStudents())
                .recommendations(report.getRecommendations())
                .build();

        log.info("✅ Found {} at-risk students out of {}", 
                atRiskDto.getAtRiskCount(), atRiskDto.getTotalStudents());

        return ResponseEntity.ok(atRiskDto);
    }

    // ==================== ADMIN ENDPOINTS ====================

    /**
     * Get system dashboard (Admin only)
     */
    @GetMapping("/admin/dashboard")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Get Admin System Dashboard",
        description = "Retrieve comprehensive system-wide dashboard showing all INDIVIDUAL student statistics, " +
                     "completion rates, missing topics, conflicts, and system health indicators."
    )
    public ResponseEntity<SystemDashboardDto> getSystemDashboard() {
        log.info("📊 GET /api/individual/analytics/admin/dashboard - Generating system dashboard");

        SystemDashboardDto dashboard = dashboardService.getSystemDashboard();
        
        log.info("✅ System dashboard generated: {} students, {} schedules, {:.1f}% completion, Health: {}", 
                dashboard.getTotalIndividualStudents(), 
                dashboard.getSchedulesThisWeek(),
                dashboard.getOverallCompletionRate(),
                dashboard.getSystemHealth() != null ? dashboard.getSystemHealth().getOverallStatus() : "UNKNOWN");

        return ResponseEntity.ok(dashboard);
    }

    /**
     * Get system health status
     */
    @GetMapping("/admin/health")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Get System Health Status",
        description = "Quick health check showing critical issues and warnings"
    )
    public ResponseEntity<SystemHealthDto> getSystemHealth() {
        log.info("🏥 GET /api/individual/analytics/admin/health - Checking system health");

        SystemDashboardDto dashboard = dashboardService.getSystemDashboard();
        SystemDashboardDto.SystemHealth health = dashboard.getSystemHealth();

        SystemHealthDto healthDto = SystemHealthDto.builder()
                .overallStatus(health.getOverallStatus())
                .criticalIssues(health.getCriticalIssues())
                .warnings(health.getWarnings())
                .totalMissingTopics(dashboard.getTotalMissingTopics())
                .unresolvedConflicts(dashboard.getUnresolvedConflicts())
                .completionRate(dashboard.getOverallCompletionRate())
                .lastGenerationSuccessful(dashboard.isLastGenerationSuccessful())
                .healthIndicators(health.getHealthIndicators())
                .build();

        return ResponseEntity.ok(healthDto);
    }

    /**
     * Get high-priority alerts
     */
    @GetMapping("/admin/alerts")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Get High-Priority Alerts",
        description = "Retrieve all unacknowledged critical alerts and errors"
    )
    public ResponseEntity<AlertsDto> getHighPriorityAlerts() {
        log.info("🚨 GET /api/individual/analytics/admin/alerts - Fetching alerts");

        SystemDashboardDto dashboard = dashboardService.getSystemDashboard();

        AlertsDto alertsDto = AlertsDto.builder()
                .totalAlerts(dashboard.getSystemAlerts().size())
                .highPriorityAlerts(dashboard.getHighPriorityAlerts())
                .missingTopicAlerts(dashboard.getMissingTopicAlerts())
                .conflictAlerts(dashboard.getConflictAlerts())
                .build();

        log.info("✅ Found {} total alerts, {} high priority", 
                alertsDto.getTotalAlerts(), alertsDto.getHighPriorityAlerts().size());

        return ResponseEntity.ok(alertsDto);
    }

    /**
     * Export system dashboard as CSV
     */
    @GetMapping("/admin/dashboard/export")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Export System Dashboard",
        description = "Export dashboard data as CSV file for external analysis"
    )
    public ResponseEntity<String> exportSystemDashboard() {
        log.info("📥 GET /api/individual/analytics/admin/dashboard/export - Exporting dashboard");

        SystemDashboardDto dashboard = dashboardService.getSystemDashboard();

        StringBuilder csv = new StringBuilder();
        csv.append("Metric,Value\n");
        csv.append("Generated At,").append(dashboard.getGeneratedAt()).append("\n");
        csv.append("Term,").append(dashboard.getTermName()).append("\n");
        csv.append("Current Week,").append(dashboard.getCurrentWeekNumber()).append("\n");
        csv.append("Total Students,").append(dashboard.getTotalIndividualStudents()).append("\n");
        csv.append("Schedules This Week,").append(dashboard.getSchedulesThisWeek()).append("\n");
        csv.append("Completion Rate,").append(String.format("%.2f%%", dashboard.getOverallCompletionRate())).append("\n");
        csv.append("Assessment Completion,").append(String.format("%.2f%%", dashboard.getAssessmentCompletionRate())).append("\n");
        csv.append("Average Score,").append(dashboard.getSystemAverageScore()).append("\n");
        csv.append("Missing Topics,").append(dashboard.getTotalMissingTopics()).append("\n");
        csv.append("Unresolved Conflicts,").append(dashboard.getUnresolvedConflicts()).append("\n");
        csv.append("System Health,").append(dashboard.getSystemHealth().getOverallStatus()).append("\n");

        String filename = "system_dashboard_" + 
                LocalDate.now().format(DateTimeFormatter.ISO_DATE) + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.toString());
    }

    /**
     * Get weekly trends (last 4 weeks)
     */
    @GetMapping("/admin/trends/weekly")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Get Weekly Trends",
        description = "Retrieve system-wide trends for the last 4 weeks"
    )
    public ResponseEntity<WeeklyTrendsDto> getWeeklyTrends() {
        log.info("📈 GET /api/individual/analytics/admin/trends/weekly - Fetching trends");

        SystemDashboardDto dashboard = dashboardService.getSystemDashboard();

        WeeklyTrendsDto trendsDto = WeeklyTrendsDto.builder()
                .currentWeek(dashboard.getCurrentWeekNumber())
                .weeklyTrends(dashboard.getWeeklyTrends())
                .overallTrend(determineTrend(dashboard.getWeeklyTrends()))
                .build();

        return ResponseEntity.ok(trendsDto);
    }

    // ==================== HELPER METHODS ====================

    /**
     * Determine overall trend from weekly data
     */
    private String determineTrend(java.util.List<SystemDashboardDto.WeeklySystemTrend> trends) {
        if (trends == null || trends.size() < 2) {
            return "INSUFFICIENT_DATA";
        }

        SystemDashboardDto.WeeklySystemTrend latest = trends.get(trends.size() - 1);
        SystemDashboardDto.WeeklySystemTrend previous = trends.get(trends.size() - 2);

        double diff = latest.getCompletionRate() - previous.getCompletionRate();

        if (diff > 5) return "IMPROVING";
        if (diff < -5) return "DECLINING";
        return "STABLE";
    }

    // ==================== RESPONSE DTOs ====================

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class AtRiskStudentsDto {
        private Long subjectId;
        private String subjectName;
        private Integer totalStudents;
        private Integer atRiskCount;
        private java.util.List<TeacherSubjectPerformanceDto.StudentPerformanceSummary> atRiskStudents;
        private java.util.List<String> recommendations;
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class SystemHealthDto {
        private String overallStatus;
        private Integer criticalIssues;
        private Integer warnings;
        private Integer totalMissingTopics;
        private Integer unresolvedConflicts;
        private Double completionRate;
        private Boolean lastGenerationSuccessful;
        private java.util.List<String> healthIndicators;
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class AlertsDto {
        private Integer totalAlerts;
        private java.util.List<SystemDashboardDto.SystemAlert> highPriorityAlerts;
        private java.util.List<SystemDashboardDto.MissingTopicAlert> missingTopicAlerts;
        private java.util.List<SystemDashboardDto.ConflictAlert> conflictAlerts;
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class WeeklyTrendsDto {
        private Integer currentWeek;
        private java.util.List<SystemDashboardDto.WeeklySystemTrend> weeklyTrends;
        private String overallTrend; // "IMPROVING", "DECLINING", "STABLE"
    }
}