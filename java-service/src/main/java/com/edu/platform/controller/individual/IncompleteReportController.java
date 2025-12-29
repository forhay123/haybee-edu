package com.edu.platform.controller.individual;

import com.edu.platform.dto.individual.*;
import com.edu.platform.service.individual.IncompleteTrackingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * SPRINT 11: Incomplete Report Controller
 * Endpoints for tracking and reporting incomplete lessons
 */
@RestController
@RequestMapping("/individual/incomplete")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Incomplete Tracking", description = "Track and report incomplete lessons")
public class IncompleteReportController {

    private final IncompleteTrackingService incompleteTrackingService;

    // ============================================================
    // STUDENT ENDPOINTS
    // ============================================================

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get all incomplete lessons for a student")
    public ResponseEntity<List<IncompleteProgressDto>> getIncompleteForStudent(
            @PathVariable Long studentId) {
        
        log.info("📊 Fetching incomplete lessons for student {}", studentId);
        
        List<IncompleteProgressDto> incomplete = incompleteTrackingService
            .getIncompleteForStudent(studentId);
        
        return ResponseEntity.ok(incomplete);
    }

    @GetMapping("/student/{studentId}/range")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get incomplete lessons for a student in date range")
    public ResponseEntity<List<IncompleteProgressDto>> getIncompleteForStudentInRange(
            @PathVariable Long studentId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        log.info("📊 Fetching incomplete for student {} from {} to {}", 
            studentId, startDate, endDate);
        
        List<IncompleteProgressDto> incomplete = incompleteTrackingService
            .getIncompleteForStudentInRange(studentId, startDate, endDate);
        
        return ResponseEntity.ok(incomplete);
    }

    @GetMapping("/student/{studentId}/count")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get incomplete count for a student")
    public ResponseEntity<Long> getIncompleteCount(@PathVariable Long studentId) {
        log.info("📊 Getting incomplete count for student {}", studentId);
        
        long count = incompleteTrackingService.getIncompleteCountForStudent(studentId);
        
        return ResponseEntity.ok(count);
    }

    @GetMapping("/student/{studentId}/statistics")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get incomplete statistics for a student")
    public ResponseEntity<IncompleteStatisticsDto> getStudentStatistics(
            @PathVariable Long studentId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        log.info("📊 Getting statistics for student {} from {} to {}", 
            studentId, startDate, endDate);
        
        IncompleteStatisticsDto stats = incompleteTrackingService
            .getStatisticsForStudent(studentId, startDate, endDate);
        
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/student/{studentId}/report")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Generate incomplete report for a student")
    public ResponseEntity<IncompleteReportDto> generateStudentReport(
            @PathVariable Long studentId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        log.info("📊 Generating incomplete report for student {} from {} to {}", 
            studentId, startDate, endDate);
        
        IncompleteReportDto report = incompleteTrackingService
            .generateStudentReport(studentId, startDate, endDate);
        
        return ResponseEntity.ok(report);
    }

    @GetMapping("/student/{studentId}/by-reason")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get incomplete lessons by reason for a student")
    public ResponseEntity<List<IncompleteProgressDto>> getIncompleteByReason(
            @PathVariable Long studentId,
            @RequestParam String reason) {
        
        log.info("📊 Fetching incomplete for student {} with reason {}", studentId, reason);
        
        List<IncompleteProgressDto> incomplete = incompleteTrackingService
            .getIncompleteByReason(studentId, reason);
        
        return ResponseEntity.ok(incomplete);
    }

    // ============================================================
    // SUBJECT ENDPOINTS (TEACHER)
    // ============================================================

    @GetMapping("/subject/{subjectId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get incomplete lessons for a subject")
    public ResponseEntity<List<IncompleteProgressDto>> getIncompleteBySubject(
            @PathVariable Long subjectId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        log.info("📊 Fetching incomplete for subject {} from {} to {}", 
            subjectId, startDate, endDate);
        
        List<IncompleteProgressDto> incomplete = incompleteTrackingService
            .getIncompleteBySubject(subjectId, startDate, endDate);
        
        return ResponseEntity.ok(incomplete);
    }

    @GetMapping("/subject/{subjectId}/statistics")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get incomplete statistics for a subject")
    public ResponseEntity<IncompleteStatisticsDto> getSubjectStatistics(
            @PathVariable Long subjectId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        log.info("📊 Getting statistics for subject {} from {} to {}", 
            subjectId, startDate, endDate);
        
        IncompleteStatisticsDto stats = incompleteTrackingService
            .getStatisticsForSubject(subjectId, startDate, endDate);
        
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/subject/{subjectId}/report")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Generate incomplete report for a subject")
    public ResponseEntity<IncompleteReportDto> generateSubjectReport(
            @PathVariable Long subjectId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        log.info("📊 Generating incomplete report for subject {} from {} to {}", 
            subjectId, startDate, endDate);
        
        IncompleteReportDto report = incompleteTrackingService
            .generateSubjectReport(subjectId, startDate, endDate);
        
        return ResponseEntity.ok(report);
    }

    // ============================================================
    // SYSTEM ENDPOINTS (ADMIN)
    // ============================================================

    @GetMapping("/system/statistics")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get system-wide incomplete statistics")
    public ResponseEntity<IncompleteStatisticsDto> getSystemStatistics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        log.info("📊 Getting system-wide statistics from {} to {}", startDate, endDate);
        
        IncompleteStatisticsDto stats = incompleteTrackingService
            .getSystemStatistics(startDate, endDate);
        
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/system/report")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Generate system-wide incomplete report")
    public ResponseEntity<IncompleteReportDto> generateSystemReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        log.info("📊 Generating system-wide report from {} to {}", startDate, endDate);
        
        IncompleteReportDto report = incompleteTrackingService
            .generateSystemReport(startDate, endDate);
        
        return ResponseEntity.ok(report);
    }

    // ============================================================
    // CONVENIENCE ENDPOINTS
    // ============================================================

    @GetMapping("/current-term/student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get incomplete for student in current term")
    public ResponseEntity<List<IncompleteProgressDto>> getIncompleteForCurrentTerm(
            @PathVariable Long studentId) {
        
        log.info("📊 Fetching incomplete for student {} in current term", studentId);
        
        // Get current term dates (you'll need TermWeekCalculator service)
        LocalDate startDate = LocalDate.now().minusMonths(3); // Placeholder
        LocalDate endDate = LocalDate.now();
        
        List<IncompleteProgressDto> incomplete = incompleteTrackingService
            .getIncompleteForStudentInRange(studentId, startDate, endDate);
        
        return ResponseEntity.ok(incomplete);
    }

    @GetMapping("/current-week/student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get incomplete for student in current week")
    public ResponseEntity<List<IncompleteProgressDto>> getIncompleteForCurrentWeek(
            @PathVariable Long studentId) {
        
        log.info("📊 Fetching incomplete for student {} in current week", studentId);
        
        // Get current week dates
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(java.time.DayOfWeek.MONDAY);
        LocalDate weekEnd = weekStart.plusDays(6);
        
        List<IncompleteProgressDto> incomplete = incompleteTrackingService
            .getIncompleteForStudentInRange(studentId, weekStart, weekEnd);
        
        return ResponseEntity.ok(incomplete);
    }

    @GetMapping("/last-month/student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get incomplete for student in last 30 days")
    public ResponseEntity<IncompleteReportDto> getIncompleteLastMonth(
            @PathVariable Long studentId) {
        
        log.info("📊 Generating last 30 days report for student {}", studentId);
        
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(30);
        
        IncompleteReportDto report = incompleteTrackingService
            .generateStudentReport(studentId, startDate, endDate);
        
        return ResponseEntity.ok(report);
    }

    // ============================================================
    // EXPORT ENDPOINTS (Future Enhancement)
    // ============================================================

    @GetMapping("/student/{studentId}/report/export")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Export incomplete report as CSV (Future)")
    public ResponseEntity<String> exportStudentReportCsv(
            @PathVariable Long studentId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        log.info("📊 Exporting CSV report for student {} from {} to {}", 
            studentId, startDate, endDate);
        
        // TODO: Implement CSV export
        return ResponseEntity.ok("CSV export not yet implemented");
    }
}