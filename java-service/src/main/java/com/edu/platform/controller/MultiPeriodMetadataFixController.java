package com.edu.platform.controller;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller to fix multi-period metadata for progress records
 */
@RestController
@RequestMapping("/admin/maintenance/multi-period")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
public class MultiPeriodMetadataFixController {

    private final JdbcTemplate jdbcTemplate;

    /**
     * Fix multi-period metadata for a specific week
     * POST /admin/maintenance/multi-period/fix-week/{weekNumber}
     */
    @PostMapping("/fix-week/{weekNumber}")
    public ResponseEntity<MultiPeriodFixResult> fixMultiPeriodMetadataForWeek(
            @PathVariable int weekNumber) {
        
        log.info("🔧 Fixing multi-period metadata for week {}", weekNumber);

        try {
            // Calculate week date range
            LocalDate weekStart = LocalDate.of(2025, 12, 1)
                    .plusWeeks(weekNumber - 1);
            LocalDate weekEnd = weekStart.plusDays(6);

            log.info("📅 Week {} range: {} to {}", weekNumber, weekStart, weekEnd);

            // Get statistics before fix
            Map<String, Object> beforeStats = getMultiPeriodStats(weekStart, weekEnd);
            
            // Execute the fix
            int recordsUpdated = fixMultiPeriodMetadata(weekStart, weekEnd);
            
            // Get statistics after fix
            Map<String, Object> afterStats = getMultiPeriodStats(weekStart, weekEnd);

            MultiPeriodFixResult result = new MultiPeriodFixResult(
                    true,
                    "Successfully fixed multi-period metadata for week " + weekNumber,
                    weekNumber,
                    weekStart.toString(),
                    weekEnd.toString(),
                    recordsUpdated,
                    beforeStats,
                    afterStats
            );

            log.info("✅ Fixed {} progress records with multi-period metadata", recordsUpdated);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("❌ Error fixing multi-period metadata: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(new MultiPeriodFixResult(
                            false,
                            "Failed to fix multi-period metadata: " + e.getMessage(),
                            weekNumber,
                            null,
                            null,
                            0,
                            null,
                            null
                    ));
        }
    }

    /**
     * Fix multi-period metadata for ALL weeks
     * POST /admin/maintenance/multi-period/fix-all
     */
    @PostMapping("/fix-all")
    public ResponseEntity<MultiPeriodFixResult> fixAllMultiPeriodMetadata() {
        
        log.info("🔧 Fixing multi-period metadata for ALL weeks");

        try {
            // Get all progress records with topics
            Map<String, Object> beforeStats = getAllMultiPeriodStats();
            
            // Execute the fix for all records
            int recordsUpdated = fixMultiPeriodMetadataAll();
            
            // Get statistics after fix
            Map<String, Object> afterStats = getAllMultiPeriodStats();

            MultiPeriodFixResult result = new MultiPeriodFixResult(
                    true,
                    "Successfully fixed multi-period metadata for all weeks",
                    null,
                    null,
                    null,
                    recordsUpdated,
                    beforeStats,
                    afterStats
            );

            log.info("✅ Fixed {} progress records with multi-period metadata", recordsUpdated);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("❌ Error fixing multi-period metadata: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(new MultiPeriodFixResult(
                            false,
                            "Failed to fix multi-period metadata: " + e.getMessage(),
                            null,
                            null,
                            null,
                            0,
                            null,
                            null
                    ));
        }
    }

    /**
     * Get multi-period statistics for a specific week
     * GET /admin/maintenance/multi-period/stats/week/{weekNumber}
     */
    @GetMapping("/stats/week/{weekNumber}")
    public ResponseEntity<Map<String, Object>> getWeekMultiPeriodStats(
            @PathVariable int weekNumber) {
        
        try {
            LocalDate weekStart = LocalDate.of(2025, 12, 1)
                    .plusWeeks(weekNumber - 1);
            LocalDate weekEnd = weekStart.plusDays(6);

            Map<String, Object> stats = getMultiPeriodStats(weekStart, weekEnd);
            stats.put("success", true);
            stats.put("weekNumber", weekNumber);
            stats.put("weekStart", weekStart.toString());
            stats.put("weekEnd", weekEnd.toString());

            return ResponseEntity.ok(stats);

        } catch (Exception e) {
            log.error("❌ Error getting multi-period stats: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }

    /**
     * Get multi-period statistics for ALL weeks
     * GET /admin/maintenance/multi-period/stats/all
     */
    @GetMapping("/stats/all")
    public ResponseEntity<Map<String, Object>> getAllMultiPeriodStatsEndpoint() {
        try {
            Map<String, Object> stats = getAllMultiPeriodStats();
            stats.put("success", true);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("❌ Error getting multi-period stats: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }

    // ============================================================
    // PRIVATE HELPER METHODS
    // ============================================================

    /**
     * Fix multi-period metadata for a specific date range
     * ✅ UPDATED: Recalculates sequences based on ACTUAL records, not expected records
     * Sets sequence even for single-period subjects (sequence=1, total=1)
     */
    private int fixMultiPeriodMetadata(LocalDate startDate, LocalDate endDate) {
        String sql = """
            WITH progress_with_sequence AS (
                SELECT 
                    p.id,
                    p.student_profile_id,
                    p.subject_id,
                    p.lesson_topic_id,
                    p.scheduled_date,
                    p.period_number,
                    p.period_sequence as old_sequence,
                    p.total_periods_in_sequence as old_total,
                    ROW_NUMBER() OVER (
                        PARTITION BY p.student_profile_id, p.subject_id, p.lesson_topic_id 
                        ORDER BY p.scheduled_date, p.period_number
                    ) as sequence_num,
                    COUNT(*) OVER (
                        PARTITION BY p.student_profile_id, p.subject_id, p.lesson_topic_id
                    ) as total_in_sequence
                FROM academic.student_lesson_progress p
                WHERE p.scheduled_date >= ?
                  AND p.scheduled_date <= ?
                  AND p.lesson_topic_id IS NOT NULL
            )
            UPDATE academic.student_lesson_progress slp
            SET 
                period_sequence = pws.sequence_num,
                total_periods_in_sequence = pws.total_in_sequence
            FROM progress_with_sequence pws
            WHERE slp.id = pws.id
              AND (
                slp.period_sequence IS DISTINCT FROM pws.sequence_num
                OR slp.total_periods_in_sequence IS DISTINCT FROM pws.total_in_sequence
              )
            """;

        return jdbcTemplate.update(sql, startDate, endDate);
    }

    /**
     * Fix multi-period metadata for ALL progress records
     * ✅ UPDATED: Recalculates sequences based on ACTUAL records
     * Sets sequence even for single-period subjects (sequence=1, total=1)
     */
    private int fixMultiPeriodMetadataAll() {
        String sql = """
            WITH progress_with_sequence AS (
                SELECT 
                    p.id,
                    p.student_profile_id,
                    p.subject_id,
                    p.lesson_topic_id,
                    p.scheduled_date,
                    p.period_number,
                    p.period_sequence as old_sequence,
                    p.total_periods_in_sequence as old_total,
                    ROW_NUMBER() OVER (
                        PARTITION BY p.student_profile_id, p.subject_id, p.lesson_topic_id 
                        ORDER BY p.scheduled_date, p.period_number
                    ) as sequence_num,
                    COUNT(*) OVER (
                        PARTITION BY p.student_profile_id, p.subject_id, p.lesson_topic_id
                    ) as total_in_sequence
                FROM academic.student_lesson_progress p
                WHERE p.lesson_topic_id IS NOT NULL
            )
            UPDATE academic.student_lesson_progress slp
            SET 
                period_sequence = pws.sequence_num,
                total_periods_in_sequence = pws.total_in_sequence
            FROM progress_with_sequence pws
            WHERE slp.id = pws.id
              AND (
                slp.period_sequence IS DISTINCT FROM pws.sequence_num
                OR slp.total_periods_in_sequence IS DISTINCT FROM pws.total_in_sequence
              )
            """;

        return jdbcTemplate.update(sql);
    }

    /**
     * Get multi-period statistics for a date range
     */
    private Map<String, Object> getMultiPeriodStats(LocalDate startDate, LocalDate endDate) {
        String sql = """
            SELECT 
                COUNT(*) as total_progress,
                COUNT(CASE WHEN period_sequence IS NOT NULL THEN 1 END) as with_sequence,
                COUNT(CASE WHEN total_periods_in_sequence > 1 THEN 1 END) as multi_period,
                COUNT(CASE WHEN total_periods_in_sequence = 1 THEN 1 END) as single_period,
                COUNT(*) - COUNT(period_sequence) as missing_metadata
            FROM academic.student_lesson_progress
            WHERE lesson_topic_id IS NOT NULL
              AND scheduled_date >= ?
              AND scheduled_date <= ?
            """;

        return jdbcTemplate.queryForMap(sql, startDate, endDate);
    }

    /**
     * Get multi-period statistics for ALL records
     */
    private Map<String, Object> getAllMultiPeriodStats() {
        String sql = """
            SELECT 
                COUNT(*) as total_progress,
                COUNT(CASE WHEN period_sequence IS NOT NULL THEN 1 END) as with_sequence,
                COUNT(CASE WHEN total_periods_in_sequence > 1 THEN 1 END) as multi_period,
                COUNT(CASE WHEN total_periods_in_sequence = 1 THEN 1 END) as single_period,
                COUNT(*) - COUNT(period_sequence) as missing_metadata
            FROM academic.student_lesson_progress
            WHERE lesson_topic_id IS NOT NULL
            """;

        return jdbcTemplate.queryForMap(sql);
    }

    /**
     * Get list of subjects with multiple periods
     */
    @GetMapping("/subjects-with-multiple-periods")
    public ResponseEntity<List<Map<String, Object>>> getSubjectsWithMultiplePeriods(
            @RequestParam(required = false) Integer weekNumber) {
        
        try {
            String sql;
            List<Map<String, Object>> results;

            if (weekNumber != null) {
                LocalDate weekStart = LocalDate.of(2025, 12, 1)
                        .plusWeeks(weekNumber - 1);
                LocalDate weekEnd = weekStart.plusDays(6);

                sql = """
                    SELECT 
                        p.student_profile_id,
                        p.subject_id,
                        s.name as subject_name,
                        p.lesson_topic_id,
                        lt.topic_title,
                        COUNT(*) as period_count,
                        MIN(p.scheduled_date) as first_date,
                        MAX(p.scheduled_date) as last_date
                    FROM academic.student_lesson_progress p
                    INNER JOIN academic.subjects s ON p.subject_id = s.id
                    LEFT JOIN academic.lesson_topics lt ON p.lesson_topic_id = lt.id
                    WHERE p.scheduled_date >= ?
                      AND p.scheduled_date <= ?
                      AND p.lesson_topic_id IS NOT NULL
                    GROUP BY p.student_profile_id, p.subject_id, s.name, p.lesson_topic_id, lt.topic_title
                    HAVING COUNT(*) > 1
                    ORDER BY p.student_profile_id, p.subject_id
                    """;

                results = jdbcTemplate.queryForList(sql, weekStart, weekEnd);
            } else {
                sql = """
                    SELECT 
                        p.student_profile_id,
                        p.subject_id,
                        s.name as subject_name,
                        p.lesson_topic_id,
                        lt.topic_title,
                        COUNT(*) as period_count,
                        MIN(p.scheduled_date) as first_date,
                        MAX(p.scheduled_date) as last_date
                    FROM academic.student_lesson_progress p
                    INNER JOIN academic.subjects s ON p.subject_id = s.id
                    LEFT JOIN academic.lesson_topics lt ON p.lesson_topic_id = lt.id
                    WHERE p.lesson_topic_id IS NOT NULL
                    GROUP BY p.student_profile_id, p.subject_id, s.name, p.lesson_topic_id, lt.topic_title
                    HAVING COUNT(*) > 1
                    ORDER BY p.student_profile_id, p.subject_id
                    """;

                results = jdbcTemplate.queryForList(sql);
            }

            return ResponseEntity.ok(results);

        } catch (Exception e) {
            log.error("❌ Error getting subjects with multiple periods: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(null);
        }
    }

    // ============================================================
    // DTO
    // ============================================================

    @Data
    @AllArgsConstructor
    public static class MultiPeriodFixResult {
        private boolean success;
        private String message;
        private Integer weekNumber;
        private String weekStart;
        private String weekEnd;
        private int recordsUpdated;
        private Map<String, Object> beforeStats;
        private Map<String, Object> afterStats;
    }
}