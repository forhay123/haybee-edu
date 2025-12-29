package com.edu.platform.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * ✅ EMERGENCY FIX: Link progress records to their daily schedules
 * CORRECTED: The relationship is student_lesson_progress.daily_schedule_id -> daily_schedules.id
 * NOT the other way around!
 */
@RestController
@RequestMapping("/admin/schedules")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
public class ScheduleLinkingController {

    private final JdbcTemplate jdbcTemplate;

    /**
     * ✅ Link progress records to their daily schedules
     * CORRECTED: Updates student_lesson_progress.daily_schedule_id
     */
    @PostMapping("/link-progress-to-schedules")
    public ResponseEntity<Map<String, Object>> linkProgressToSchedules() {
        log.info("🔗 Linking progress records to daily schedules");
        
        // CORRECTED: Update progress.daily_schedule_id, not schedule.progress_id
        String sql = """
            UPDATE academic.student_lesson_progress slp
            SET daily_schedule_id = ds.id
            FROM academic.daily_schedules ds
            WHERE slp.daily_schedule_id IS NULL
            AND slp.student_profile_id = ds.student_id
            AND slp.lesson_topic_id = ds.lesson_topic_id
            AND slp.scheduled_date = ds.scheduled_date
            AND slp.period_number = ds.period_number
            """;
        
        int linkedCount = jdbcTemplate.update(sql);
        
        log.info("✅ Linked {} progress records to daily schedules", linkedCount);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("linkedCount", linkedCount);
        response.put("message", String.format("Linked %d progress records to daily schedules", linkedCount));
        
        return ResponseEntity.ok(response);
    }

    /**
     * ✅ Link progress records to assessments
     */
    @PostMapping("/link-assessments")
    public ResponseEntity<Map<String, Object>> linkAssessments() {
        log.info("🔗 Linking progress records to assessments");
        
        String sql = """
            UPDATE academic.student_lesson_progress slp
            SET assessment_id = a.id
            FROM academic.assessments a
            WHERE slp.assessment_id IS NULL
            AND slp.lesson_topic_id = a.lesson_topic_id
            AND a.type = 'LESSON_TOPIC_ASSESSMENT'
            """;
        
        int linkedCount = jdbcTemplate.update(sql);
        
        log.info("✅ Linked {} progress records to assessments", linkedCount);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("linkedCount", linkedCount);
        response.put("message", String.format("Linked %d progress records to assessments", linkedCount));
        
        return ResponseEntity.ok(response);
    }

    /**
     * ✅ Complete fix: Create assessments + Link everything
     * CORRECTED VERSION
     */
    @PostMapping("/complete-fix")
    public ResponseEntity<Map<String, Object>> completeFix() {
        log.info("🔧 Running complete schedule/assessment fix");
        
        Map<String, Object> results = new HashMap<>();
        
        // Step 1: Create missing assessments
        try {
            String createAssessmentsSql = "SELECT * FROM create_missing_assessments()";
            int assessmentsCreated = jdbcTemplate.query(createAssessmentsSql, rs -> {
                int count = 0;
                while (rs.next()) {
                    count++;
                }
                return count;
            });
            
            results.put("assessmentsCreated", assessmentsCreated);
            log.info("✅ Step 1: Created {} assessments", assessmentsCreated);
        } catch (Exception e) {
            log.error("❌ Failed to create assessments: {}", e.getMessage());
            results.put("assessmentsCreated", 0);
            results.put("assessmentError", e.getMessage());
        }
        
        // Step 2: Link progress records to assessments
        try {
            String linkAssessmentsSql = """
                UPDATE academic.student_lesson_progress slp
                SET assessment_id = a.id
                FROM academic.assessments a
                WHERE slp.assessment_id IS NULL
                AND slp.lesson_topic_id = a.lesson_topic_id
                AND a.type = 'LESSON_TOPIC_ASSESSMENT'
                """;
            
            int progressLinked = jdbcTemplate.update(linkAssessmentsSql);
            results.put("progressLinked", progressLinked);
            log.info("✅ Step 2: Linked {} progress records to assessments", progressLinked);
        } catch (Exception e) {
            log.error("❌ Failed to link progress records: {}", e.getMessage());
            results.put("progressLinked", 0);
            results.put("progressError", e.getMessage());
        }
        
        // Step 3: Link progress records to daily schedules
        // CORRECTED: Update progress.daily_schedule_id
        try {
            String linkSchedulesSql = """
                UPDATE academic.student_lesson_progress slp
                SET daily_schedule_id = ds.id
                FROM academic.daily_schedules ds
                WHERE slp.daily_schedule_id IS NULL
                AND slp.student_profile_id = ds.student_id
                AND slp.lesson_topic_id = ds.lesson_topic_id
                AND slp.scheduled_date = ds.scheduled_date
                AND slp.period_number = ds.period_number
                """;
            
            int schedulesLinked = jdbcTemplate.update(linkSchedulesSql);
            results.put("schedulesLinked", schedulesLinked);
            log.info("✅ Step 3: Linked {} progress records to daily schedules", schedulesLinked);
        } catch (Exception e) {
            log.error("❌ Failed to link schedules: {}", e.getMessage(), e);
            results.put("schedulesLinked", 0);
            results.put("scheduleError", e.getMessage());
        }
        
        // Step 4: Enable assessment access
        try {
            String enableAccessSql = """
                UPDATE academic.student_lesson_progress
                SET assessment_accessible = true
                WHERE assessment_accessible = false
                AND assessment_id IS NOT NULL
                """;
            
            int accessEnabled = jdbcTemplate.update(enableAccessSql);
            results.put("accessEnabled", accessEnabled);
            log.info("✅ Step 4: Enabled assessment access for {} progress records", accessEnabled);
        } catch (Exception e) {
            log.error("❌ Failed to enable access: {}", e.getMessage());
            results.put("accessEnabled", 0);
            results.put("accessError", e.getMessage());
        }
        
        results.put("success", true);
        results.put("message", "Complete fix applied");
        
        log.info("🎉 Complete fix finished: {}", results);
        
        return ResponseEntity.ok(results);
    }

    /**
     * ✅ Get statistics about orphaned records
     * CORRECTED VERSION
     */
    @GetMapping("/orphan-stats")
    public ResponseEntity<Map<String, Object>> getOrphanStats() {
        log.info("📊 Getting orphan statistics");
        
        Map<String, Object> stats = new HashMap<>();
        
        // Count progress records without daily_schedule_id
        // CORRECTED: Check progress.daily_schedule_id
        String progressWithoutScheduleSql = """
            SELECT COUNT(*) FROM academic.student_lesson_progress
            WHERE daily_schedule_id IS NULL
            AND lesson_topic_id IS NOT NULL
            AND scheduled_date IS NOT NULL
            """;
        Integer progressWithoutSchedule = jdbcTemplate.queryForObject(progressWithoutScheduleSql, Integer.class);
        stats.put("progressWithoutSchedule", progressWithoutSchedule != null ? progressWithoutSchedule : 0);
        
        // Count progress records without assessments
        String progressSql = """
            SELECT COUNT(*) FROM academic.student_lesson_progress
            WHERE assessment_id IS NULL
            AND lesson_topic_id IS NOT NULL
            """;
        Integer progressOrphaned = jdbcTemplate.queryForObject(progressSql, Integer.class);
        stats.put("progressWithoutAssessment", progressOrphaned != null ? progressOrphaned : 0);
        
        // Count topics without assessments
        String topicSql = """
            SELECT COUNT(DISTINCT lt.id) 
            FROM academic.lesson_topics lt
            INNER JOIN ai.lesson_ai_results lar ON lar.lesson_topic_id = lt.id
            WHERE lar.status = 'done'
            AND NOT EXISTS (
                SELECT 1 FROM academic.assessments a
                WHERE a.lesson_topic_id = lt.id
                AND a.type = 'LESSON_TOPIC_ASSESSMENT'
            )
            """;
        Integer topicsOrphaned = jdbcTemplate.queryForObject(topicSql, Integer.class);
        stats.put("topicsWithoutAssessment", topicsOrphaned != null ? topicsOrphaned : 0);
        
        // Count progress records with disabled access
        String accessSql = """
            SELECT COUNT(*) FROM academic.student_lesson_progress
            WHERE assessment_accessible = false
            AND assessment_id IS NOT NULL
            """;
        Integer accessDisabled = jdbcTemplate.queryForObject(accessSql, Integer.class);
        stats.put("progressWithDisabledAccess", accessDisabled != null ? accessDisabled : 0);
        
        stats.put("needsFix", 
            (progressWithoutSchedule != null && progressWithoutSchedule > 0) ||
            (progressOrphaned != null && progressOrphaned > 0) ||
            (topicsOrphaned != null && topicsOrphaned > 0) ||
            (accessDisabled != null && accessDisabled > 0));
        
        log.info("📊 Orphan stats: {}", stats);
        
        return ResponseEntity.ok(stats);
    }
    
    /**
     * ✅ NEW: Check specific progress record linking
     */
    @GetMapping("/check-progress/{progressId}")
    public ResponseEntity<Map<String, Object>> checkProgressLinking(@PathVariable Long progressId) {
        log.info("🔍 Checking progress record {}", progressId);
        
        String sql = """
            SELECT 
                slp.id as progress_id,
                slp.daily_schedule_id,
                slp.student_profile_id,
                slp.lesson_topic_id,
                slp.scheduled_date,
                slp.period_number,
                ds.id as matching_schedule_id
            FROM academic.student_lesson_progress slp
            LEFT JOIN academic.daily_schedules ds ON 
                slp.student_profile_id = ds.student_id
                AND slp.lesson_topic_id = ds.lesson_topic_id
                AND slp.scheduled_date = ds.scheduled_date
                AND slp.period_number = ds.period_number
            WHERE slp.id = ?
            """;
        
        Map<String, Object> result = jdbcTemplate.queryForMap(sql, progressId);
        
        log.info("🔍 Progress linking check: {}", result);
        
        return ResponseEntity.ok(result);
    }
}