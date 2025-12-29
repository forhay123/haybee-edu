package com.edu.platform.controller.individual;

import com.edu.platform.dto.individual.SubjectProgressDto;
import com.edu.platform.dto.individual.TermCompletionDto;
import com.edu.platform.dto.individual.WeeklyProgressDto;
import com.edu.platform.service.individual.IndividualProgressReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * SPRINT 12: Individual Progress Report Controller
 * Provides endpoints for students and teachers to view progress reports
 */
@RestController
@RequestMapping("/individual/progress-reports")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Individual Progress Reports", description = "Progress reporting for INDIVIDUAL students")
public class IndividualProgressReportController {

    private final IndividualProgressReportService progressReportService;

    /**
     * Get weekly progress report for a student
     * Accessible by: STUDENT (own data), TEACHER, ADMIN
     */
    @GetMapping("/weekly/{studentId}/{weekNumber}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(
        summary = "Get Weekly Progress Report",
        description = "Retrieve comprehensive weekly progress report for an INDIVIDUAL student. " +
                     "Shows lesson completion, assessment scores, subject breakdown, and daily progress."
    )
    public ResponseEntity<WeeklyProgressDto> getWeeklyProgress(
            @Parameter(description = "Student Profile ID", required = true)
            @PathVariable Long studentId,
            
            @Parameter(description = "Week number (1-based)", required = true, example = "5")
            @PathVariable Integer weekNumber) {
        
        log.info("📊 GET /api/individual/progress-reports/weekly/{}/{} - Fetching weekly progress", 
                studentId, weekNumber);

        WeeklyProgressDto report = progressReportService.getWeeklyProgressReport(studentId, weekNumber);
        
        log.info("✅ Weekly progress report generated: {} lessons, {:.1f}% completion", 
                report.getTotalScheduledLessons(), report.getCompletionRate());

        return ResponseEntity.ok(report);
    }

    /**
     * Get current week's progress (convenience endpoint)
     */
    @GetMapping("/weekly/current/{studentId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(
        summary = "Get Current Week Progress",
        description = "Retrieve progress report for the current week of the active term"
    )
    public ResponseEntity<WeeklyProgressDto> getCurrentWeekProgress(
            @Parameter(description = "Student Profile ID", required = true)
            @PathVariable Long studentId) {
        
        log.info("📊 GET /api/individual/progress-reports/weekly/current/{} - Fetching current week", 
                studentId);

        // The service will automatically detect current week
        WeeklyProgressDto report = progressReportService.getWeeklyProgressReport(
                studentId, 
                null // Service should handle null to mean "current week"
        );

        return ResponseEntity.ok(report);
    }

    /**
     * Get subject-specific progress report
     * Accessible by: STUDENT (own data), TEACHER (their subject), ADMIN
     */
    @GetMapping("/subject/{studentId}/{subjectId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(
        summary = "Get Subject Progress Report",
        description = "Retrieve comprehensive progress report for a specific subject. " +
                     "Shows topic breakdown, weekly trends, completion rates, and performance analysis."
    )
    public ResponseEntity<SubjectProgressDto> getSubjectProgress(
            @Parameter(description = "Student Profile ID", required = true)
            @PathVariable Long studentId,
            
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
        
        log.info("📚 GET /api/individual/progress-reports/subject/{}/{} - Fetching subject progress", 
                studentId, subjectId);

        // Default to current term if dates not provided
        if (startDate == null || endDate == null) {
            // Service should handle null dates to use current term
            log.debug("Using default term dates");
        }

        SubjectProgressDto report = progressReportService.getSubjectProgressReport(
                studentId, subjectId, startDate, endDate);
        
        log.info("✅ Subject progress report generated: {} - {:.1f}% completion", 
                report.getSubjectName(), report.getCompletionRate());

        return ResponseEntity.ok(report);
    }

    /**
     * Get term completion report
     * Accessible by: STUDENT (own data), TEACHER, ADMIN
     */
    @GetMapping("/term/{studentId}/{termId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(
        summary = "Get Term Completion Report",
        description = "Retrieve comprehensive term completion report. " +
                     "Shows overall progress, subject breakdown, weekly summaries, achievements, and predictions."
    )
    public ResponseEntity<TermCompletionDto> getTermCompletion(
            @Parameter(description = "Student Profile ID", required = true)
            @PathVariable Long studentId,
            
            @Parameter(description = "Term ID", required = true)
            @PathVariable Long termId) {
        
        log.info("📈 GET /api/individual/progress-reports/term/{}/{} - Fetching term report", 
                studentId, termId);

        TermCompletionDto report = progressReportService.getTermCompletionReport(studentId, termId);
        
        log.info("✅ Term completion report generated: {} - {:.1f}% completion, Grade: {}", 
                report.getTermName(), report.getOverallCompletionRate(), report.getOverallGrade());

        return ResponseEntity.ok(report);
    }

    /**
     * Get current term completion report (convenience endpoint)
     */
    @GetMapping("/term/current/{studentId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(
        summary = "Get Current Term Report",
        description = "Retrieve completion report for the currently active term"
    )
    public ResponseEntity<TermCompletionDto> getCurrentTermCompletion(
            @Parameter(description = "Student Profile ID", required = true)
            @PathVariable Long studentId) {
        
        log.info("📈 GET /api/individual/progress-reports/term/current/{} - Fetching current term", 
                studentId);

        // Service should automatically use active term when termId is null
        TermCompletionDto report = progressReportService.getTermCompletionReport(studentId, null);

        return ResponseEntity.ok(report);
    }

    /**
     * Get progress summary (all reports combined)
     */
    @GetMapping("/summary/{studentId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(
        summary = "Get Progress Summary",
        description = "Retrieve a combined summary of all progress metrics for quick overview"
    )
    public ResponseEntity<ProgressSummaryDto> getProgressSummary(
            @Parameter(description = "Student Profile ID", required = true)
            @PathVariable Long studentId) {
        
        log.info("📊 GET /api/individual/progress-reports/summary/{} - Fetching summary", studentId);

        // Get current week and term reports
        WeeklyProgressDto weeklyProgress = progressReportService.getWeeklyProgressReport(studentId, null);
        TermCompletionDto termProgress = progressReportService.getTermCompletionReport(studentId, null);

        ProgressSummaryDto summary = ProgressSummaryDto.builder()
                .studentId(studentId)
                .studentName(weeklyProgress.getStudentName())
                .currentWeekNumber(weeklyProgress.getWeekNumber())
                .weeklyCompletionRate(weeklyProgress.getCompletionRate())
                .weeklyAverageScore(weeklyProgress.getAverageScore())
                .termCompletionRate(termProgress.getOverallCompletionRate())
                .termAverageScore(termProgress.getTermAverageScore())
                .overallGrade(termProgress.getOverallGrade())
                .performanceLevel(termProgress.getPerformanceLevel())
                .needsAttention(weeklyProgress.isNeedsAttention())
                .totalScheduledLessons(termProgress.getTotalScheduledLessons())
                .completedLessons(termProgress.getCompletedLessons())
                .incompleteLessons(termProgress.getIncompleteLessons())
                .build();

        log.info("✅ Progress summary generated: Week {:.1f}%, Term {:.1f}%", 
                summary.getWeeklyCompletionRate(), summary.getTermCompletionRate());

        return ResponseEntity.ok(summary);
    }

    /**
     * DTO for progress summary response
     */
    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class ProgressSummaryDto {
        private Long studentId;
        private String studentName;
        private Integer currentWeekNumber;
        private Double weeklyCompletionRate;
        private java.math.BigDecimal weeklyAverageScore;
        private Double termCompletionRate;
        private java.math.BigDecimal termAverageScore;
        private String overallGrade;
        private String performanceLevel;
        private Boolean needsAttention;
        private Integer totalScheduledLessons;
        private Integer completedLessons;
        private Integer incompleteLessons;
    }
}