package com.edu.platform.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.edu.platform.repository.individual.IndividualTimetableRepository;
import com.edu.platform.service.individual.IndividualScheduleService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * ✅ EMERGENCY FIX: Link progress records to schedules after regeneration
 * 
 * This controller fixes the issue where:
 * 1. Schedule regeneration orphans progress records
 * 2. Progress records with submissions are unlinked
 * 3. New schedules have no progress records
 */
@RestController
@RequestMapping("/admin/maintenance/progress")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
public class ProgressRecordFixerController {

    private final JdbcTemplate jdbcTemplate;
    private final IndividualScheduleService individualScheduleService;
    
    

	
	/**
	 * STEP 0: Clear Period 2+ assessments FIRST
	 * This prevents the bug where Period 2+ get assessments copied from schedules
	 */
	private int step0_clearPeriod2PlusAssessments(LocalDate weekStart, LocalDate weekEnd) {
	    try {
	        log.info("🧹 STEP 0: Clearing Period 2+ assessments BEFORE fixes...");
	        
	        String sql = """
	            UPDATE academic.student_lesson_progress
	            SET 
	                assessment_id = NULL,
	                assessment_accessible = FALSE,
	                requires_custom_assessment = TRUE
	            WHERE scheduled_date BETWEEN ? AND ?
	              AND period_sequence >= 2
	              AND requires_custom_assessment = true
	              AND assessment_id IS NOT NULL
	            """;
	        
	        int cleared = jdbcTemplate.update(sql, weekStart, weekEnd);
	        log.info("✅ STEP 0 Complete: Cleared {} Period 2+ assessments", cleared);
	        return cleared;
	        
	    } catch (Exception e) {
	        log.error("Step 0 failed: {}", e.getMessage(), e);
	        return -1;
	    }
	}
    
    
    /**
     * ✅ MASTER FIX: Complete fix workflow for a week
     * This runs all fix operations in the correct order with validation
     * 
     * Execution Order:
     * 1. Link orphaned progress to schedules
     * 2. Link assessments to schedules and progress
     * 3. Create missing progress records (with all fields)
     * 4. Link submissions and mark as completed
     * 5. Fix assessment windows from schedules
     * 6. Set multi-period metadata
     * 7. Validate final state
     */
    @PostMapping("/complete-fix/week/{weekNumber}")
    @Transactional
    public ResponseEntity<Map<String, Object>> completeFixForWeek(
            @PathVariable Integer weekNumber) {
        
        log.info("========================================");
        log.info("🔧 MASTER FIX: Starting complete fix for Week {}", weekNumber);
        log.info("========================================");
        
        Map<String, Object> result = new HashMap<>();
        result.put("weekNumber", weekNumber);
        result.put("startTime", LocalDateTime.now().toString());
        
        try {
            // Get week date range
            LocalDate[] weekRange = getWeekDateRange(weekNumber);
            if (weekRange == null) {
                result.put("success", false);
                result.put("error", "Invalid week number or no active term found");
                return ResponseEntity.badRequest().body(result);
            }
            
            LocalDate weekStart = weekRange[0];
            LocalDate weekEnd = weekRange[1];
            
            log.info("📅 Week {} date range: {} to {}", weekNumber, weekStart, weekEnd);
            result.put("weekStart", weekStart.toString());
            result.put("weekEnd", weekEnd.toString());
            
            // Get initial health check
            Map<String, Object> initialHealth = getWeekProgressStats(weekStart, weekEnd);
            result.put("initialHealth", initialHealth);
            log.info("📊 Initial health: {}", initialHealth);
            
            // ============================================================
            // ✅ STEP 0: Clear Period 2+ Assessments FIRST
            // ============================================================
            log.info("🧹 STEP 0: Clearing Period 2+ assessments...");
            int step0_assessmentsCleared = step0_clearPeriod2PlusAssessments(weekStart, weekEnd);
            result.put("step0_assessmentsCleared", step0_assessmentsCleared);
            
            if (step0_assessmentsCleared < 0) {
                result.put("success", false);
                result.put("failedAtStep", 0);
                result.put("error", "Failed to clear Period 2+ assessments");
                log.error("❌ STEP 0 FAILED");
                return ResponseEntity.status(500).body(result);
            }
            
            log.info("✅ STEP 0 Complete: {} Period 2+ assessments cleared", step0_assessmentsCleared);
            jdbcTemplate.execute("COMMIT");
            
            // ============================================================
            // STEP 1: Link Orphaned Progress to Schedules
            // ============================================================
            log.info("🔗 STEP 1: Linking orphaned progress to schedules...");
            int step1_orphanedLinked = step1_linkOrphanedProgress(weekStart, weekEnd);
            result.put("step1_orphanedLinked", step1_orphanedLinked);
            
            if (step1_orphanedLinked < 0) {
                result.put("success", false);
                result.put("failedAtStep", 1);
                result.put("error", "Failed to link orphaned progress");
                log.error("❌ STEP 1 FAILED");
                return ResponseEntity.status(500).body(result);
            }
            
            log.info("✅ STEP 1 Complete: {} orphaned progress linked", step1_orphanedLinked);
            jdbcTemplate.execute("COMMIT"); // Commit step 1
            
            // ============================================================
            // STEP 2: Link Assessments to Schedules and Progress
            // ============================================================
            log.info("🎯 STEP 2: Linking assessments to schedules and progress...");
            Map<String, Integer> step2_result = step2_linkAssessments(weekStart, weekEnd);
            result.put("step2_schedulesLinked", step2_result.get("schedulesLinked"));
            result.put("step2_progressLinked", step2_result.get("progressLinked"));
            result.put("step2_accessibilitySet", step2_result.get("accessibilitySet"));
            
            if (step2_result.get("schedulesLinked") < 0 || step2_result.get("progressLinked") < 0) {
                result.put("success", false);
                result.put("failedAtStep", 2);
                result.put("error", "Failed to link assessments");
                log.error("❌ STEP 2 FAILED");
                return ResponseEntity.status(500).body(result);
            }
            
            log.info("✅ STEP 2 Complete: {} schedules, {} progress, {} accessibility set", 
                    step2_result.get("schedulesLinked"), 
                    step2_result.get("progressLinked"),
                    step2_result.get("accessibilitySet"));
            jdbcTemplate.execute("COMMIT"); // Commit step 2
            
            // ============================================================
            // STEP 3: Create Missing Progress Records (with ALL fields)
            // ============================================================
            log.info("📝 STEP 3: Creating missing progress records...");
            int step3_progressCreated = step3_createMissingProgress(weekStart, weekEnd);
            result.put("step3_progressCreated", step3_progressCreated);
            
            if (step3_progressCreated < 0) {
                result.put("success", false);
                result.put("failedAtStep", 3);
                result.put("error", "Failed to create missing progress");
                log.error("❌ STEP 3 FAILED");
                return ResponseEntity.status(500).body(result);
            }
            
            log.info("✅ STEP 3 Complete: {} progress records created", step3_progressCreated);
            jdbcTemplate.execute("COMMIT"); // Commit step 3
            
            // ============================================================
            // STEP 4: Link Submissions and Mark as Completed
            // ============================================================
            log.info("📊 STEP 4: Linking submissions and calculating scores...");
            Map<String, Integer> step4_result = step4_linkSubmissions(weekStart, weekEnd);
            result.put("step4_submissionsLinked", step4_result.get("submissionsLinked"));
            result.put("step4_scoresCalculated", step4_result.get("scoresCalculated"));
            
            if (step4_result.get("submissionsLinked") < 0) {
                result.put("success", false);
                result.put("failedAtStep", 4);
                result.put("error", "Failed to link submissions");
                log.error("❌ STEP 4 FAILED");
                return ResponseEntity.status(500).body(result);
            }
            
            log.info("✅ STEP 4 Complete: {} submissions linked, {} scores calculated", 
                    step4_result.get("submissionsLinked"),
                    step4_result.get("scoresCalculated"));
            jdbcTemplate.execute("COMMIT"); // Commit step 4
            
            // ============================================================
            // STEP 5: Fix Assessment Windows from Schedules
            // ============================================================
            log.info("⏰ STEP 5: Fixing assessment windows...");
            Map<String, Integer> step5_result = step5_fixAssessmentWindows(weekStart, weekEnd);
            result.put("step5_windowsFixed", step5_result.get("windowsFixed"));
            result.put("step5_accessibilityUpdated", step5_result.get("accessibilityUpdated"));
            
            if (step5_result.get("windowsFixed") < 0) {
                result.put("success", false);
                result.put("failedAtStep", 5);
                result.put("error", "Failed to fix assessment windows");
                log.error("❌ STEP 5 FAILED");
                return ResponseEntity.status(500).body(result);
            }
            
            log.info("✅ STEP 5 Complete: {} windows fixed, {} accessibility updated", 
                    step5_result.get("windowsFixed"),
                    step5_result.get("accessibilityUpdated"));
            jdbcTemplate.execute("COMMIT"); // Commit step 5
            
            // ============================================================
            // STEP 6: Set Multi-Period Metadata
            // ============================================================
            log.info("🔢 STEP 6: Setting multi-period metadata...");
            int step6_metadataSet = step6_setMultiPeriodMetadata(weekStart, weekEnd);
            result.put("step6_metadataSet", step6_metadataSet);
            
            if (step6_metadataSet < 0) {
                result.put("success", false);
                result.put("failedAtStep", 6);
                result.put("error", "Failed to set multi-period metadata");
                log.error("❌ STEP 6 FAILED");
                return ResponseEntity.status(500).body(result);
            }
            
            log.info("✅ STEP 6 Complete: {} records updated with metadata", step6_metadataSet);
            jdbcTemplate.execute("COMMIT"); // Commit step 6
            
            // ============================================================
            // STEP 7: Validate Final State
            // ============================================================
            log.info("✓ STEP 7: Validating final state...");
            Map<String, Object> finalHealth = getWeekProgressStats(weekStart, weekEnd);
            result.put("finalHealth", finalHealth);
            
            Map<String, Object> validation = step7_validateFinalState(weekStart, weekEnd);
            result.put("validation", validation);
            
            boolean allGood = (boolean) validation.getOrDefault("allGood", false);
            result.put("success", true);
            result.put("fullyFixed", allGood);
            result.put("endTime", LocalDateTime.now().toString());
            
            if (!allGood) {
                log.warn("⚠️ Fix completed but some issues remain:");
                validation.forEach((key, value) -> {
                    if (key.startsWith("remaining") && (int) value > 0) {
                        log.warn("   - {}: {}", key, value);
                    }
                });
            } else {
                log.info("✅ All issues resolved!");
            }
            
            // Create summary message
            String summary = String.format(
                "Week %d complete fix: %d orphaned linked, %d assessments linked, " +
                "%d progress created, %d submissions linked, %d windows fixed, %d metadata set",
                weekNumber,
                step1_orphanedLinked,
                step2_result.get("progressLinked"),
                step3_progressCreated,
                step4_result.get("submissionsLinked"),
                step5_result.get("windowsFixed"),
                step6_metadataSet
            );
            
            result.put("message", summary);
            
            log.info("========================================");
            log.info("✅ MASTER FIX COMPLETE for Week {}", weekNumber);
            log.info("========================================");
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("❌ Master fix failed for week {}: {}", weekNumber, e.getMessage(), e);
            result.put("success", false);
            result.put("error", e.getMessage());
            result.put("endTime", LocalDateTime.now().toString());
            return ResponseEntity.status(500).body(result);
        }
    }

    // ============================================================
    // STEP IMPLEMENTATIONS
    // ============================================================

    /**
     * STEP 1: Link orphaned progress to schedules
     * Matches by: student, date, period, topic
     */
    private int step1_linkOrphanedProgress(LocalDate weekStart, LocalDate weekEnd) {
        try {
            String sql = """
                UPDATE academic.student_lesson_progress slp
                SET daily_schedule_id = ds.id
                FROM academic.daily_schedules ds
                WHERE slp.daily_schedule_id IS NULL
                AND slp.scheduled_date BETWEEN ? AND ?
                AND slp.student_profile_id = ds.student_id
                AND slp.scheduled_date = ds.scheduled_date
                AND slp.period_number = ds.period_number
                AND slp.lesson_topic_id = ds.lesson_topic_id
                AND slp.lesson_topic_id IS NOT NULL
                """;
            
            return jdbcTemplate.update(sql, weekStart, weekEnd);
        } catch (Exception e) {
            log.error("Step 1 failed: {}", e.getMessage(), e);
            return -1;
        }
    }

    /**
     * STEP 2: Link assessments to both schedules and progress
     * Also sets assessment_accessible based on current time
     */
    private Map<String, Integer> step2_linkAssessments(LocalDate weekStart, LocalDate weekEnd) {
        Map<String, Integer> result = new HashMap<>();
        
        try {
            // 2a. Link assessments to schedules
            String scheduleSql = """
                UPDATE academic.daily_schedules ds
                SET assessment_id = a.id
                FROM academic.assessments a
                WHERE ds.lesson_topic_id = a.lesson_topic_id
                  AND a.type = 'LESSON_TOPIC_ASSESSMENT'
                  AND ds.scheduled_date BETWEEN ? AND ?
                  AND ds.schedule_source = 'INDIVIDUAL'
                  AND ds.lesson_topic_id IS NOT NULL
                  AND ds.assessment_id IS NULL
                """;
            
            int schedulesLinked = jdbcTemplate.update(scheduleSql, weekStart, weekEnd);
            result.put("schedulesLinked", schedulesLinked);
            
            // 2b. Link assessments to progress (via schedule link)
            String progressSql = """
                UPDATE academic.student_lesson_progress p
                SET assessment_id = ds.assessment_id
                FROM academic.daily_schedules ds
                WHERE p.daily_schedule_id = ds.id
                  AND p.scheduled_date BETWEEN ? AND ?
                  AND p.assessment_id IS NULL
                  AND ds.assessment_id IS NOT NULL
                """;
            
            int progressLinked = jdbcTemplate.update(progressSql, weekStart, weekEnd);
            result.put("progressLinked", progressLinked);
            
            // 2c. Set assessment_accessible based on current time vs windows
            String accessSql = """
                UPDATE academic.student_lesson_progress p
                SET assessment_accessible = CASE 
                    WHEN p.assessment_window_start IS NOT NULL 
                     AND p.assessment_window_end IS NOT NULL
                     AND CURRENT_TIMESTAMP BETWEEN p.assessment_window_start 
                         AND (COALESCE(p.grace_period_end, p.assessment_window_end))
                    THEN true
                    ELSE false
                END
                WHERE p.scheduled_date BETWEEN ? AND ?
                  AND p.assessment_id IS NOT NULL
                  AND p.completed = false
                """;
            
            int accessibilitySet = jdbcTemplate.update(accessSql, weekStart, weekEnd);
            result.put("accessibilitySet", accessibilitySet);
            
            return result;
            
        } catch (Exception e) {
            log.error("Step 2 failed: {}", e.getMessage(), e);
            result.put("schedulesLinked", -1);
            result.put("progressLinked", -1);
            result.put("accessibilitySet", -1);
            return result;
        }
    }

    /**
     * STEP 3: Create missing progress records with ALL required fields
     * Uses ON CONFLICT DO NOTHING to avoid overwriting existing progress
     */
    private int step3_createMissingProgress(LocalDate weekStart, LocalDate weekEnd) {
        try {
            String sql = """
                INSERT INTO academic.student_lesson_progress (
                    student_profile_id,
                    scheduled_date,
                    period_number,
                    lesson_topic_id,
                    subject_id,
                    date,
                    completed,
                    daily_schedule_id,
                    assessment_id,
                    assessment_accessible,
                    lesson_content_accessible,
                    created_at,
                    assessment_window_start,
                    assessment_window_end,
                    grace_period_end,
                    priority,
                    weight
                )
                SELECT 
                    ds.student_id,
                    ds.scheduled_date,
                    ds.period_number,
                    ds.lesson_topic_id,
                    ds.subject_id,
                    ds.scheduled_date, -- date = scheduled_date
                    false,
                    ds.id, -- CRITICAL: Link to schedule
                    ds.assessment_id, -- Copy assessment link
                    CASE 
                        WHEN ds.assessment_id IS NOT NULL
                         AND ds.assessment_window_start IS NOT NULL
                         AND ds.assessment_window_end IS NOT NULL
                         AND CURRENT_TIMESTAMP BETWEEN ds.assessment_window_start 
                             AND COALESCE(ds.grace_end_datetime, ds.assessment_window_end)
                        THEN true 
                        ELSE false 
                    END,
                    true,
                    CURRENT_TIMESTAMP,
                    ds.assessment_window_start,
                    ds.assessment_window_end,
                    ds.grace_end_datetime,
                    COALESCE(ds.priority, 3),
                    COALESCE(ds.weight, 1.0)
                FROM academic.daily_schedules ds
                WHERE ds.scheduled_date BETWEEN ? AND ?
                AND ds.lesson_topic_id IS NOT NULL
                AND NOT EXISTS (
                    SELECT 1 
                    FROM academic.student_lesson_progress slp2
                    WHERE slp2.student_profile_id = ds.student_id
                    AND slp2.scheduled_date = ds.scheduled_date
                    AND slp2.period_number = ds.period_number
                    AND slp2.lesson_topic_id = ds.lesson_topic_id
                )
                ON CONFLICT (student_profile_id, lesson_topic_id, scheduled_date, period_number) 
                DO NOTHING
                """;
            
            return jdbcTemplate.update(sql, weekStart, weekEnd);
            
        } catch (Exception e) {
            log.error("Step 3 failed: {}", e.getMessage(), e);
            return -1;
        }
    }

    /**
     * STEP 4: Link submissions to progress and calculate scores
     * ✅ FIXED: Only links to Period 1 (period_sequence = 1)
     * Sets: assessment_submission_id, completed=true, completed_at, assessment_score
     */
    private Map<String, Integer> step4_linkSubmissions(LocalDate weekStart, LocalDate weekEnd) {
        Map<String, Integer> result = new HashMap<>();
        
        try {
            // Link submissions ONLY to Period 1 (period_sequence = 1)
            String sql = """
                UPDATE academic.student_lesson_progress slp
                SET 
                    assessment_submission_id = sub.id,
                    completed = true,
                    completed_at = sub.submitted_at,
                    assessment_score = CASE 
                        WHEN sub.total_marks > 0 
                        THEN (sub.score::numeric / sub.total_marks * 100)
                        ELSE NULL
                    END
                FROM academic.assessment_submissions sub
                JOIN academic.assessments a ON sub.assessment_id = a.id
                WHERE slp.assessment_submission_id IS NULL
                AND slp.scheduled_date BETWEEN ? AND ?
                AND slp.student_profile_id = sub.student_id
                AND slp.lesson_topic_id = a.lesson_topic_id
                AND a.lesson_topic_id IS NOT NULL
                AND sub.nullified_at IS NULL
                AND (slp.period_sequence = 1 OR slp.period_sequence IS NULL)
                """;
            
            int linked = jdbcTemplate.update(sql, weekStart, weekEnd);
            result.put("submissionsLinked", linked);
            result.put("scoresCalculated", linked);
            
            return result;
            
        } catch (Exception e) {
            log.error("Step 4 failed: {}", e.getMessage(), e);
            result.put("submissionsLinked", -1);
            result.put("scoresCalculated", -1);
            return result;
        }
    }
    
    
    /**
     * STEP 5: Fix assessment windows from schedules
     * Only updates records that need fixing (not already completed)
     */
    private Map<String, Integer> step5_fixAssessmentWindows(LocalDate weekStart, LocalDate weekEnd) {
        Map<String, Integer> result = new HashMap<>();
        
        try {
            // Fix windows from schedules
            String windowSql = """
                UPDATE academic.student_lesson_progress p
                SET 
                    assessment_window_start = ds.scheduled_date + ds.start_time,
                    assessment_window_end = ds.scheduled_date + ds.end_time,
                    grace_period_end = ds.scheduled_date + ds.end_time + INTERVAL '15 minutes'
                FROM academic.daily_schedules ds
                WHERE p.daily_schedule_id = ds.id
                  AND p.scheduled_date BETWEEN ? AND ?
                  AND p.assessment_id IS NOT NULL
                  AND p.completed = false
                  AND (
                      p.assessment_window_start IS NULL 
                      OR p.assessment_window_end IS NULL
                      OR p.assessment_window_start IS DISTINCT FROM (ds.scheduled_date + ds.start_time)
                      OR p.assessment_window_end IS DISTINCT FROM (ds.scheduled_date + ds.end_time)
                  )
                """;
            
            int windowsFixed = jdbcTemplate.update(windowSql, weekStart, weekEnd);
            result.put("windowsFixed", windowsFixed);
            
            // Update accessibility based on new windows
            String accessSql = """
                UPDATE academic.student_lesson_progress p
                SET assessment_accessible = CASE 
                    WHEN p.assessment_window_start IS NOT NULL 
                     AND p.assessment_window_end IS NOT NULL
                     AND CURRENT_TIMESTAMP BETWEEN p.assessment_window_start 
                         AND COALESCE(p.grace_period_end, p.assessment_window_end)
                    THEN true
                    ELSE false
                END
                WHERE p.scheduled_date BETWEEN ? AND ?
                  AND p.assessment_id IS NOT NULL
                  AND p.completed = false
                """;
            
            int accessibilityUpdated = jdbcTemplate.update(accessSql, weekStart, weekEnd);
            result.put("accessibilityUpdated", accessibilityUpdated);
            
            return result;
            
        } catch (Exception e) {
            log.error("Step 5 failed: {}", e.getMessage(), e);
            result.put("windowsFixed", -1);
            result.put("accessibilityUpdated", -1);
            return result;
        }
    }

    /**
     * STEP 6: Set multi-period metadata
     * Groups by student+subject+topic, orders by date+period, assigns sequences
     */
    private int step6_setMultiPeriodMetadata(LocalDate weekStart, LocalDate weekEnd) {
        try {
            String sql = """
                WITH progress_with_sequence AS (
                    SELECT 
                        p.id,
                        ROW_NUMBER() OVER (
                            PARTITION BY p.student_profile_id, p.subject_id, p.lesson_topic_id 
                            ORDER BY p.scheduled_date, p.period_number, p.created_at
                        ) as sequence_num,
                        COUNT(*) OVER (
                            PARTITION BY p.student_profile_id, p.subject_id, p.lesson_topic_id
                        ) as total_in_sequence
                    FROM academic.student_lesson_progress p
                    WHERE p.scheduled_date BETWEEN ? AND ?
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
            
            return jdbcTemplate.update(sql, weekStart, weekEnd);
            
        } catch (Exception e) {
            log.error("Step 6 failed: {}", e.getMessage(), e);
            return -1;
        }
    }

    /**
     * STEP 7: Validate final state
     * Checks for remaining issues
     */
    private Map<String, Object> step7_validateFinalState(LocalDate weekStart, LocalDate weekEnd) {
        Map<String, Object> validation = new HashMap<>();
        
        try {
            // Count remaining orphaned progress
            String orphanedSql = """
                SELECT COUNT(*) FROM academic.student_lesson_progress
                WHERE scheduled_date BETWEEN ? AND ?
                AND daily_schedule_id IS NULL
                AND lesson_topic_id IS NOT NULL
                """;
            Integer remainingOrphaned = jdbcTemplate.queryForObject(
                orphanedSql, Integer.class, weekStart, weekEnd);
            validation.put("remainingOrphaned", remainingOrphaned != null ? remainingOrphaned : 0);
            
            // Count progress without assessments (that should have them)
            String noAssessmentSql = """
                SELECT COUNT(*) FROM academic.student_lesson_progress p
                WHERE p.scheduled_date BETWEEN ? AND ?
                AND p.lesson_topic_id IS NOT NULL
                AND p.assessment_id IS NULL
                AND EXISTS (
                    SELECT 1 FROM academic.assessments a
                    WHERE a.lesson_topic_id = p.lesson_topic_id
                    AND a.type = 'LESSON_TOPIC_ASSESSMENT'
                )
                """;
            Integer remainingNoAssessment = jdbcTemplate.queryForObject(
                noAssessmentSql, Integer.class, weekStart, weekEnd);
            validation.put("remainingNoAssessment", remainingNoAssessment != null ? remainingNoAssessment : 0);
            
            // Count assessments without windows
            String noWindowsSql = """
                SELECT COUNT(*) FROM academic.student_lesson_progress
                WHERE scheduled_date BETWEEN ? AND ?
                AND assessment_id IS NOT NULL
                AND completed = false
                AND (assessment_window_start IS NULL OR assessment_window_end IS NULL)
                """;
            Integer remainingNoWindows = jdbcTemplate.queryForObject(
                noWindowsSql, Integer.class, weekStart, weekEnd);
            validation.put("remainingNoWindows", remainingNoWindows != null ? remainingNoWindows : 0);
            
            // Count multi-period without metadata
            String noMetadataSql = """
                SELECT COUNT(*) FROM academic.student_lesson_progress
                WHERE scheduled_date BETWEEN ? AND ?
                AND lesson_topic_id IS NOT NULL
                AND (period_sequence IS NULL OR total_periods_in_sequence IS NULL)
                """;
            Integer remainingNoMetadata = jdbcTemplate.queryForObject(
                noMetadataSql, Integer.class, weekStart, weekEnd);
            validation.put("remainingNoMetadata", remainingNoMetadata != null ? remainingNoMetadata : 0);
            
            // Count unlinked submissions
            String unlinkedSubmissionsSql = """
                SELECT COUNT(*) 
                FROM academic.assessment_submissions sub
                JOIN academic.assessments a ON sub.assessment_id = a.id
                WHERE sub.submitted_at::date BETWEEN ? AND ?
                AND sub.nullified_at IS NULL
                AND NOT EXISTS (
                    SELECT 1 FROM academic.student_lesson_progress p
                    WHERE p.assessment_submission_id = sub.id
                )
                """;
            Integer remainingUnlinkedSubmissions = jdbcTemplate.queryForObject(
                unlinkedSubmissionsSql, Integer.class, weekStart, weekEnd);
            validation.put("remainingUnlinkedSubmissions", 
                          remainingUnlinkedSubmissions != null ? remainingUnlinkedSubmissions : 0);
            
            // Determine if all good
            boolean allGood = 
                (remainingOrphaned == null || remainingOrphaned == 0) &&
                (remainingNoAssessment == null || remainingNoAssessment == 0) &&
                (remainingNoWindows == null || remainingNoWindows == 0) &&
                (remainingNoMetadata == null || remainingNoMetadata == 0) &&
                (remainingUnlinkedSubmissions == null || remainingUnlinkedSubmissions == 0);
            
            validation.put("allGood", allGood);
            
            return validation;
            
        } catch (Exception e) {
            log.error("Step 7 validation failed: {}", e.getMessage(), e);
            validation.put("error", e.getMessage());
            validation.put("allGood", false);
            return validation;
        }
    }
    
    

    /**
     * ✅ FIX ALL: Fix progress records for a specific week
     * 
     * This does three things:
     * 1. Links orphaned progress (with submissions) to matching schedules
     * 2. Creates missing progress for schedules that have none
     * 3. Updates assessment windows to match schedules
     */
    @PostMapping("/fix-week/{weekNumber}")
    public ResponseEntity<Map<String, Object>> fixWeekProgress(
            @PathVariable Integer weekNumber) {
        
        log.info("========================================");
        log.info("🔧 ADMIN: Fixing progress records for Week {}", weekNumber);
        log.info("========================================");

        Map<String, Object> result = new HashMap<>();
        
        try {
            // Step 1: Get week date range
            LocalDate[] weekRange = getWeekDateRange(weekNumber);
            if (weekRange == null) {
                result.put("success", false);
                result.put("error", "Invalid week number or no active term found");
                return ResponseEntity.badRequest().body(result);
            }
            
            LocalDate weekStart = weekRange[0];
            LocalDate weekEnd = weekRange[1];
            
            log.info("📅 Week {} date range: {} to {}", weekNumber, weekStart, weekEnd);
            
            // Step 2: Link orphaned progress records to schedules
            int linked = linkOrphanedProgress(weekStart, weekEnd);
            result.put("orphanedLinked", linked);
            log.info("✅ Step 1: Linked {} orphaned progress records", linked);
            
            // Step 3: Create missing progress records
            int created = createMissingProgress(weekStart, weekEnd);
            result.put("progressCreated", created);
            log.info("✅ Step 2: Created {} missing progress records", created);
            
            // Step 4: Update assessment windows
            int updated = updateAssessmentWindows(weekStart, weekEnd);
            result.put("windowsUpdated", updated);
            log.info("✅ Step 3: Updated {} assessment windows", updated);
            
            // Step 5: Get final statistics
            Map<String, Object> stats = getWeekProgressStats(weekStart, weekEnd);
            result.put("finalStats", stats);
            
            result.put("success", true);
            result.put("weekNumber", weekNumber);
            result.put("weekStart", weekStart);
            result.put("weekEnd", weekEnd);
            result.put("message", String.format(
                "Fixed Week %d: %d orphaned linked, %d created, %d windows updated",
                weekNumber, linked, created, updated
            ));
            
            log.info("========================================");
            log.info("✅ Progress fix complete for Week {}", weekNumber);
            log.info("========================================");
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("❌ Failed to fix progress for week {}: {}", weekNumber, e.getMessage(), e);
            result.put("success", false);
            result.put("error", e.getMessage());
            return ResponseEntity.status(500).body(result);
        }
    }

    /**
     * ✅ STEP 1: Link orphaned progress records to matching schedules
     * Especially important for progress records with submissions
     */
    private int linkOrphanedProgress(LocalDate weekStart, LocalDate weekEnd) {
        String sql = """
            UPDATE academic.student_lesson_progress slp
            SET daily_schedule_id = ds.id
            FROM academic.daily_schedules ds
            WHERE slp.daily_schedule_id IS NULL
            AND slp.scheduled_date BETWEEN ? AND ?
            AND slp.student_profile_id = ds.student_id
            AND slp.scheduled_date = ds.scheduled_date
            AND slp.period_number = ds.period_number
            AND slp.lesson_topic_id = ds.lesson_topic_id
            """;
        
        return jdbcTemplate.update(sql, weekStart, weekEnd);
    }

    /**
     * ✅ STEP 2: Create missing progress records for schedules
     * Only creates progress if no existing progress matches (student + date + period + topic)
     */
    private int createMissingProgress(LocalDate weekStart, LocalDate weekEnd) {
        String sql = """
            INSERT INTO academic.student_lesson_progress (
                student_profile_id,
                scheduled_date,
                period_number,
                lesson_topic_id,
                subject_id,
                date,
                completed,
                daily_schedule_id,
                assessment_accessible,
                lesson_content_accessible,
                created_at,
                assessment_window_start,
                assessment_window_end,
                grace_period_end,
                priority,
                weight
            )
            SELECT 
                ds.student_id,
                ds.scheduled_date,
                ds.period_number,
                ds.lesson_topic_id,
                ds.subject_id,
                ds.scheduled_date,
                false,
                ds.id,
                CASE 
                    WHEN ds.assessment_window_start <= CURRENT_TIMESTAMP 
                    AND ds.assessment_window_end >= CURRENT_TIMESTAMP 
                    THEN true 
                    ELSE false 
                END,
                true,
                CURRENT_TIMESTAMP,
                ds.assessment_window_start,
                ds.assessment_window_end,
                ds.grace_end_datetime,
                COALESCE(ds.priority, 3),
                COALESCE(ds.weight, 1.0)
            FROM academic.daily_schedules ds
            WHERE ds.scheduled_date BETWEEN ? AND ?
            AND ds.lesson_topic_id IS NOT NULL
            AND NOT EXISTS (
                SELECT 1 
                FROM academic.student_lesson_progress slp2
                WHERE slp2.student_profile_id = ds.student_id
                AND slp2.scheduled_date = ds.scheduled_date
                AND slp2.period_number = ds.period_number
                AND slp2.lesson_topic_id = ds.lesson_topic_id
            )
            ON CONFLICT (student_profile_id, lesson_topic_id, scheduled_date, period_number) 
            DO UPDATE SET
                daily_schedule_id = EXCLUDED.daily_schedule_id,
                assessment_window_start = EXCLUDED.assessment_window_start,
                assessment_window_end = EXCLUDED.assessment_window_end,
                grace_period_end = EXCLUDED.grace_period_end
            """;
        
        return jdbcTemplate.update(sql, weekStart, weekEnd);
    }

    /**
     * ✅ STEP 3: Update assessment windows from schedules
     * Ensures progress windows match schedule windows
     */
    private int updateAssessmentWindows(LocalDate weekStart, LocalDate weekEnd) {
        String sql = """
            UPDATE academic.student_lesson_progress slp
            SET 
                assessment_window_start = ds.assessment_window_start,
                assessment_window_end = ds.assessment_window_end,
                grace_period_end = ds.grace_end_datetime
            FROM academic.daily_schedules ds
            WHERE slp.daily_schedule_id = ds.id
            AND slp.scheduled_date BETWEEN ? AND ?
            AND (
                slp.assessment_window_start IS DISTINCT FROM ds.assessment_window_start
                OR slp.assessment_window_end IS DISTINCT FROM ds.assessment_window_end
                OR slp.grace_period_end IS DISTINCT FROM ds.grace_end_datetime
            )
            """;
        
        return jdbcTemplate.update(sql, weekStart, weekEnd);
    }

    /**
     * ✅ Get statistics about progress records for a week
     */
    @GetMapping("/stats/week/{weekNumber}")
    public ResponseEntity<Map<String, Object>> getWeekStats(@PathVariable Integer weekNumber) {
        log.info("📊 Getting progress statistics for Week {}", weekNumber);
        
        try {
            LocalDate[] weekRange = getWeekDateRange(weekNumber);
            if (weekRange == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Invalid week number or no active term found"
                ));
            }
            
            Map<String, Object> stats = getWeekProgressStats(weekRange[0], weekRange[1]);
            stats.put("success", true);
            stats.put("weekNumber", weekNumber);
            stats.put("weekStart", weekRange[0]);
            stats.put("weekEnd", weekRange[1]);
            
            return ResponseEntity.ok(stats);
            
        } catch (Exception e) {
            log.error("❌ Failed to get stats: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * ✅ Get detailed progress statistics for date range
     */
    private Map<String, Object> getWeekProgressStats(LocalDate weekStart, LocalDate weekEnd) {
        Map<String, Object> stats = new HashMap<>();
        
        // Total schedules
        String scheduleSql = """
            SELECT COUNT(*) FROM academic.daily_schedules
            WHERE scheduled_date BETWEEN ? AND ?
            """;
        Integer totalSchedules = jdbcTemplate.queryForObject(scheduleSql, Integer.class, weekStart, weekEnd);
        stats.put("totalSchedules", totalSchedules != null ? totalSchedules : 0);
        
        // Total progress records
        String progressSql = """
            SELECT COUNT(*) FROM academic.student_lesson_progress
            WHERE scheduled_date BETWEEN ? AND ?
            """;
        Integer totalProgress = jdbcTemplate.queryForObject(progressSql, Integer.class, weekStart, weekEnd);
        stats.put("totalProgress", totalProgress != null ? totalProgress : 0);
        
        // Progress with schedule links
        String linkedSql = """
            SELECT COUNT(*) FROM academic.student_lesson_progress
            WHERE scheduled_date BETWEEN ? AND ?
            AND daily_schedule_id IS NOT NULL
            """;
        Integer linked = jdbcTemplate.queryForObject(linkedSql, Integer.class, weekStart, weekEnd);
        stats.put("linkedProgress", linked != null ? linked : 0);
        
        // Orphaned progress (no schedule link)
        String orphanedSql = """
            SELECT COUNT(*) FROM academic.student_lesson_progress
            WHERE scheduled_date BETWEEN ? AND ?
            AND daily_schedule_id IS NULL
            """;
        Integer orphaned = jdbcTemplate.queryForObject(orphanedSql, Integer.class, weekStart, weekEnd);
        stats.put("orphanedProgress", orphaned != null ? orphaned : 0);
        
        // Progress with submissions
        String submissionsSql = """
            SELECT COUNT(*) FROM academic.student_lesson_progress
            WHERE scheduled_date BETWEEN ? AND ?
            AND assessment_submission_id IS NOT NULL
            """;
        Integer withSubmissions = jdbcTemplate.queryForObject(submissionsSql, Integer.class, weekStart, weekEnd);
        stats.put("progressWithSubmissions", withSubmissions != null ? withSubmissions : 0);
        
        // Schedules without progress
        String noProgressSql = """
            SELECT COUNT(*) FROM academic.daily_schedules ds
            WHERE ds.scheduled_date BETWEEN ? AND ?
            AND ds.lesson_topic_id IS NOT NULL
            AND NOT EXISTS (
                SELECT 1 FROM academic.student_lesson_progress slp
                WHERE slp.daily_schedule_id = ds.id
            )
            """;
        Integer noProgress = jdbcTemplate.queryForObject(noProgressSql, Integer.class, weekStart, weekEnd);
        stats.put("schedulesWithoutProgress", noProgress != null ? noProgress : 0);
        
        // Calculate health score
        int healthScore = 100;
        if (orphaned != null && orphaned > 0) healthScore -= 30;
        if (noProgress != null && noProgress > 0) healthScore -= 30;
        stats.put("healthScore", healthScore);
        stats.put("needsFix", healthScore < 100);
        
        return stats;
    }

    /**
     * ✅ Helper: Get week date range from the active term
     * Fixed to use is_active column and handle TIMESTAMP casting
     */
    private LocalDate[] getWeekDateRange(Integer weekNumber) {
        try {
            // Query to get the active term's week dates - cast to DATE explicitly
            String sql = """
                SELECT 
                    (t.start_date + ((? - 1) * INTERVAL '7 days'))::date as week_start,
                    (t.start_date + (? * INTERVAL '7 days') - INTERVAL '1 day')::date as week_end
                FROM academic.terms t
                WHERE t.is_active = true
                AND ? <= t.week_count
                LIMIT 1
                """;
            
            List<Map<String, Object>> results = jdbcTemplate.queryForList(
                sql, weekNumber, weekNumber, weekNumber
            );
            
            if (results.isEmpty()) {
                log.warn("No active term found or week {} exceeds term week_count", weekNumber);
                return null;
            }
            
            Map<String, Object> row = results.get(0);
            
            // Handle both java.sql.Date and java.sql.Timestamp
            Object weekStartObj = row.get("week_start");
            Object weekEndObj = row.get("week_end");
            
            LocalDate weekStart;
            LocalDate weekEnd;
            
            if (weekStartObj instanceof java.sql.Date) {
                weekStart = ((java.sql.Date) weekStartObj).toLocalDate();
            } else if (weekStartObj instanceof java.sql.Timestamp) {
                weekStart = ((java.sql.Timestamp) weekStartObj).toLocalDateTime().toLocalDate();
            } else {
                log.error("Unexpected type for week_start: {}", weekStartObj.getClass());
                return null;
            }
            
            if (weekEndObj instanceof java.sql.Date) {
                weekEnd = ((java.sql.Date) weekEndObj).toLocalDate();
            } else if (weekEndObj instanceof java.sql.Timestamp) {
                weekEnd = ((java.sql.Timestamp) weekEndObj).toLocalDateTime().toLocalDate();
            } else {
                log.error("Unexpected type for week_end: {}", weekEndObj.getClass());
                return null;
            }
            
            return new LocalDate[] { weekStart, weekEnd };
            
        } catch (Exception e) {
            log.error("Failed to calculate week range: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * ✅ NEW: Link ALL unlinked submissions to their progress records
     * This automatically connects existing submissions to progress records
     */
    @PostMapping("/link-submissions/week/{weekNumber}")
    public ResponseEntity<Map<String, Object>> linkSubmissionsToProgress(
            @PathVariable Integer weekNumber) {
        
        log.info("========================================");
        log.info("🔗 ADMIN: Linking submissions to progress for Week {}", weekNumber);
        log.info("========================================");

        Map<String, Object> result = new HashMap<>();
        
        try {
            LocalDate[] weekRange = getWeekDateRange(weekNumber);
            if (weekRange == null) {
                result.put("success", false);
                result.put("error", "Invalid week number or no active term found");
                return ResponseEntity.badRequest().body(result);
            }
            
            LocalDate weekStart = weekRange[0];
            LocalDate weekEnd = weekRange[1];
            
            log.info("📅 Week {} date range: {} to {}", weekNumber, weekStart, weekEnd);
            
            // Link submissions to progress records
            String sql = """
                UPDATE academic.student_lesson_progress slp
                SET 
                    assessment_submission_id = sub.id,
                    completed = true,
                    completed_at = sub.submitted_at
                FROM academic.assessment_submissions sub
                JOIN academic.assessments a ON sub.assessment_id = a.id
                WHERE slp.assessment_submission_id IS NULL
                AND slp.scheduled_date BETWEEN ? AND ?
                AND slp.student_profile_id = sub.student_id
                AND slp.lesson_topic_id = a.lesson_topic_id
                AND sub.nullified_at IS NULL
                """;
            
            int linked = jdbcTemplate.update(sql, weekStart, weekEnd);
            
            log.info("✅ Linked {} submissions to progress records", linked);
            
            // Get updated stats
            Map<String, Object> stats = getWeekProgressStats(weekStart, weekEnd);
            
            result.put("success", true);
            result.put("weekNumber", weekNumber);
            result.put("weekStart", weekStart);
            result.put("weekEnd", weekEnd);
            result.put("submissionsLinked", linked);
            result.put("finalStats", stats);
            result.put("message", String.format(
                "Successfully linked %d submissions to progress records for Week %d",
                linked, weekNumber
            ));
            
            log.info("========================================");
            log.info("✅ Submission linking complete for Week {}", weekNumber);
            log.info("========================================");
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("❌ Failed to link submissions: {}", e.getMessage(), e);
            result.put("success", false);
            result.put("error", e.getMessage());
            return ResponseEntity.status(500).body(result);
        }
    }

    /**
     * ✅ Health check
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of(
            "status", "OK",
            "service", "ProgressRecordFixer",
            "message", "Service is ready to fix progress records"
        ));
    }

    /**
     * ✅ DIAGNOSTIC: Check specific student's progress for a date
     */
    @GetMapping("/check-student/{studentId}/date/{date}")
    public ResponseEntity<Map<String, Object>> checkStudentProgress(
            @PathVariable Long studentId,
            @PathVariable String date) {
        
        log.info("🔍 Checking progress for student {} on {}", studentId, date);
        
        String sql = """
            SELECT 
                ds.id as schedule_id,
                ds.period_number,
                ds.subject_id,
                s.name as subject_name,
                ds.lesson_topic_id,
                lt.topic_title,
                slp.id as progress_id,
                slp.daily_schedule_id as progress_schedule_link,
                slp.assessment_submission_id,
                CASE 
                    WHEN slp.id IS NOT NULL THEN '✅ Has Progress'
                    ELSE '❌ Missing Progress'
                END as progress_status,
                CASE 
                    WHEN slp.daily_schedule_id IS NOT NULL THEN '✅ Linked'
                    WHEN slp.id IS NOT NULL THEN '⚠️ Orphaned'
                    ELSE '❌ No Progress'
                END as link_status
            FROM academic.daily_schedules ds
            LEFT JOIN academic.student_lesson_progress slp ON slp.daily_schedule_id = ds.id
            LEFT JOIN academic.subjects s ON ds.subject_id = s.id
            LEFT JOIN academic.lesson_topics lt ON ds.lesson_topic_id = lt.id
            WHERE ds.student_id = ?
            AND ds.scheduled_date = ?::date
            ORDER BY ds.period_number
            """;
        
        try {
            List<Map<String, Object>> results = jdbcTemplate.queryForList(sql, studentId, date);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "studentId", studentId,
                "date", date,
                "periods", results,
                "totalPeriods", results.size(),
                "missingProgress", results.stream()
                    .filter(r -> r.get("progress_id") == null)
                    .count()
            ));
            
        } catch (Exception e) {
            log.error("❌ Check failed: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }
    
	    
	
	/**
	 * ✅ NEW: Fix assessment window times for ALL progress records
	 * This fixes the issue where assessments exist but window times are null
	 */
	@PostMapping("/fix-all-assessment-windows")
	public ResponseEntity<Map<String, Object>> fixAllAssessmentWindows() {
	    log.info("========================================");
	    log.info("🔧 ADMIN: Fixing assessment windows for ALL progress records");
	    log.info("========================================");
	    
	    Map<String, Object> result = new HashMap<>();
	    
	    try {
	        // Count records needing fix
	        String countSql = """
	            SELECT COUNT(*) 
	            FROM academic.student_lesson_progress p
	            INNER JOIN academic.daily_schedules ds ON p.daily_schedule_id = ds.id
	            WHERE p.assessment_id IS NOT NULL
	              AND (p.assessment_window_start IS NULL OR p.assessment_window_end IS NULL)
	            """;
	        
	        Integer needsFixCount = jdbcTemplate.queryForObject(countSql, Integer.class);
	        
	        if (needsFixCount == null || needsFixCount == 0) {
	            result.put("success", true);
	            result.put("message", "No progress records need fixing");
	            result.put("recordsFixed", 0);
	            
	            log.info("✅ No records need fixing");
	            return ResponseEntity.ok(result);
	        }
	        
	        log.info("📊 Found {} progress records needing window times", needsFixCount);
	        
	        // Fix them all - using schedule start/end times
	        String updateSql = """
	            UPDATE academic.student_lesson_progress p
	            SET 
	                assessment_window_start = ds.scheduled_date + ds.start_time,
	                assessment_window_end = ds.scheduled_date + ds.end_time,
	                grace_period_end = ds.scheduled_date + ds.end_time + INTERVAL '15 minutes',
	                assessment_accessible = CASE 
	                    WHEN NOW() >= (ds.scheduled_date + ds.start_time) 
	                     AND NOW() <= (ds.scheduled_date + ds.end_time + INTERVAL '15 minutes')
	                    THEN true
	                    ELSE false
	                END
	            FROM academic.daily_schedules ds
	            WHERE p.daily_schedule_id = ds.id
	              AND p.assessment_id IS NOT NULL
	              AND (p.assessment_window_start IS NULL OR p.assessment_window_end IS NULL)
	            """;
	        
	        int updated = jdbcTemplate.update(updateSql);
	        
	        log.info("✅ Fixed {} progress records with assessment windows", updated);
	        
	        // Get final stats
	        String statsSql = """
	            SELECT 
	                COUNT(*) as total_with_assessment,
	                COUNT(assessment_window_start) as with_start_time,
	                COUNT(assessment_window_end) as with_end_time,
	                COUNT(*) - COUNT(assessment_window_start) as still_missing
	            FROM academic.student_lesson_progress
	            WHERE assessment_id IS NOT NULL
	            """;
	        
	        Map<String, Object> stats = jdbcTemplate.queryForMap(statsSql);
	        
	        result.put("success", true);
	        result.put("message", "Fixed " + updated + " progress records");
	        result.put("recordsFixed", updated);
	        result.put("stats", stats);
	        
	        log.info("========================================");
	        log.info("✅ Assessment window fix complete");
	        log.info("========================================");
	        
	        return ResponseEntity.ok(result);
	        
	    } catch (Exception e) {
	        log.error("❌ Failed to fix assessment windows: {}", e.getMessage(), e);
	        result.put("success", false);
	        result.put("error", e.getMessage());
	        return ResponseEntity.status(500).body(result);
	    }
	}
	
	/**
	 * ✅ NEW: Fix assessment window times for a specific week
	 */
	@PostMapping("/fix-assessment-windows/week/{weekNumber}")
	public ResponseEntity<Map<String, Object>> fixAssessmentWindowsForWeek(
	        @PathVariable Integer weekNumber) {
	    
	    log.info("========================================");
	    log.info("🔧 ADMIN: Fixing assessment windows for Week {}", weekNumber);
	    log.info("========================================");
	    
	    Map<String, Object> result = new HashMap<>();
	    
	    try {
	        LocalDate[] weekRange = getWeekDateRange(weekNumber);
	        if (weekRange == null) {
	            result.put("success", false);
	            result.put("error", "Invalid week number or no active term found");
	            return ResponseEntity.badRequest().body(result);
	        }
	        
	        LocalDate weekStart = weekRange[0];
	        LocalDate weekEnd = weekRange[1];
	        
	        log.info("📅 Week {} date range: {} to {}", weekNumber, weekStart, weekEnd);
	        
	        // Fix assessment windows for this week
	        String updateSql = """
	            UPDATE academic.student_lesson_progress p
	            SET 
	                assessment_window_start = ds.scheduled_date + ds.start_time,
	                assessment_window_end = ds.scheduled_date + ds.end_time,
	                grace_period_end = ds.scheduled_date + ds.end_time + INTERVAL '15 minutes',
	                assessment_accessible = CASE 
	                    WHEN NOW() >= (ds.scheduled_date + ds.start_time) 
	                     AND NOW() <= (ds.scheduled_date + ds.end_time + INTERVAL '15 minutes')
	                    THEN true
	                    ELSE false
	                END
	            FROM academic.daily_schedules ds
	            WHERE p.daily_schedule_id = ds.id
	              AND p.assessment_id IS NOT NULL
	              AND p.scheduled_date BETWEEN ? AND ?
	              AND (p.assessment_window_start IS NULL OR p.assessment_window_end IS NULL)
	            """;
	        
	        int updated = jdbcTemplate.update(updateSql, weekStart, weekEnd);
	        
	        log.info("✅ Fixed {} progress records for Week {}", updated, weekNumber);
	        
	        result.put("success", true);
	        result.put("message", "Fixed " + updated + " progress records for Week " + weekNumber);
	        result.put("weekNumber", weekNumber);
	        result.put("weekStart", weekStart);
	        result.put("weekEnd", weekEnd);
	        result.put("recordsFixed", updated);
	        
	        log.info("========================================");
	        log.info("✅ Assessment window fix complete for Week {}", weekNumber);
	        log.info("========================================");
	        
	        return ResponseEntity.ok(result);
	        
	    } catch (Exception e) {
	        log.error("❌ Failed to fix assessment windows for week {}: {}", weekNumber, e.getMessage(), e);
	        result.put("success", false);
	        result.put("error", e.getMessage());
	        return ResponseEntity.status(500).body(result);
	    }
	}
	
	/**
	 * ✅ NEW: Get statistics about assessment window coverage
	 */
	@GetMapping("/assessment-window-stats")
	public ResponseEntity<Map<String, Object>> getAssessmentWindowStats() {
	    log.info("📊 Admin: Fetching assessment window statistics");
	    
	    try {
	        String sql = """
	            SELECT 
	                COUNT(*) as total_progress,
	                COUNT(assessment_id) as with_assessment,
	                COUNT(assessment_window_start) as with_start_time,
	                COUNT(assessment_window_end) as with_end_time,
	                COUNT(assessment_id) - COUNT(assessment_window_start) as missing_windows,
	                COUNT(CASE WHEN assessment_accessible = true THEN 1 END) as currently_accessible,
	                COUNT(CASE WHEN assessment_id IS NOT NULL AND assessment_window_start IS NULL THEN 1 END) as needs_fix
	            FROM academic.student_lesson_progress
	            """;
	        
	        Map<String, Object> stats = jdbcTemplate.queryForMap(sql);
	        
	        // Calculate health percentage
	        Integer totalWithAssessment = (Integer) stats.get("with_assessment");
	        Integer missingWindows = (Integer) stats.get("missing_windows");
	        
	        if (totalWithAssessment != null && totalWithAssessment > 0) {
	            double healthPercent = ((totalWithAssessment - (missingWindows != null ? missingWindows : 0)) * 100.0) / totalWithAssessment;
	            stats.put("healthPercent", Math.round(healthPercent * 10) / 10.0);
	        } else {
	            stats.put("healthPercent", 100.0);
	        }
	        
	        return ResponseEntity.ok(Map.of(
	            "success", true,
	            "stats", stats
	        ));
	        
	    } catch (Exception e) {
	        log.error("❌ Failed to get stats: {}", e.getMessage(), e);
	        return ResponseEntity.status(500).body(Map.of(
	            "success", false,
	            "error", e.getMessage()
	        ));
	    }
	}
	
	
	/**
	 * ✅ NEW: Link assessments to schedules and progress records
	 * This fixes the issue where assessments are created but not linked
	 */
	@PostMapping("/link-assessments")
	public ResponseEntity<Map<String, Object>> linkAssessmentsToRecords() {
	    log.info("========================================");
	    log.info("🔗 ADMIN: Linking assessments to schedules and progress");
	    log.info("========================================");
	    
	    Map<String, Object> result = new HashMap<>();
	    
	    try {
	        // Step 1: Link assessments to schedules
	        String schedulesSql = """
	            UPDATE academic.daily_schedules ds
	            SET assessment_id = a.id
	            FROM academic.assessments a
	            WHERE ds.lesson_topic_id = a.lesson_topic_id
	              AND a.type = 'LESSON_TOPIC_ASSESSMENT'
	              AND ds.assessment_id IS NULL
	              AND ds.lesson_topic_id IS NOT NULL
	            """;
	        
	        int schedulesLinked = jdbcTemplate.update(schedulesSql);
	        log.info("✅ Linked {} schedules to assessments", schedulesLinked);
	        
	        // Step 2: Link assessments to progress records
	        String progressSql = """
	            UPDATE academic.student_lesson_progress p
	            SET assessment_id = a.id
	            FROM academic.assessments a
	            WHERE p.lesson_topic_id = a.lesson_topic_id
	              AND a.type = 'LESSON_TOPIC_ASSESSMENT'
	              AND p.assessment_id IS NULL
	              AND p.lesson_topic_id IS NOT NULL
	            """;
	        
	        int progressLinked = jdbcTemplate.update(progressSql);
	        log.info("✅ Linked {} progress records to assessments", progressLinked);
	        
	        // Step 3: Get final statistics
	        String statsSql = """
	            SELECT 
	                (SELECT COUNT(*) FROM academic.assessments WHERE type = 'LESSON_TOPIC_ASSESSMENT') as total_assessments,
	                (SELECT COUNT(*) FROM academic.daily_schedules WHERE assessment_id IS NOT NULL AND lesson_topic_id IS NOT NULL) as schedules_with_assessment,
	                (SELECT COUNT(*) FROM academic.student_lesson_progress WHERE assessment_id IS NOT NULL AND lesson_topic_id IS NOT NULL) as progress_with_assessment,
	                (SELECT COUNT(*) FROM academic.daily_schedules WHERE lesson_topic_id IS NOT NULL AND assessment_id IS NULL) as schedules_still_missing,
	                (SELECT COUNT(*) FROM academic.student_lesson_progress WHERE lesson_topic_id IS NOT NULL AND assessment_id IS NULL) as progress_still_missing
	            """;
	        
	        Map<String, Object> stats = jdbcTemplate.queryForMap(statsSql);
	        
	        result.put("success", true);
	        result.put("schedulesLinked", schedulesLinked);
	        result.put("progressLinked", progressLinked);
	        result.put("stats", stats);
	        result.put("message", String.format(
	            "Successfully linked %d schedules and %d progress records to assessments",
	            schedulesLinked, progressLinked
	        ));
	        
	        log.info("========================================");
	        log.info("✅ Assessment linking complete");
	        log.info("   Schedules linked: {}", schedulesLinked);
	        log.info("   Progress linked: {}", progressLinked);
	        log.info("========================================");
	        
	        return ResponseEntity.ok(result);
	        
	    } catch (Exception e) {
	        log.error("❌ Failed to link assessments: {}", e.getMessage(), e);
	        result.put("success", false);
	        result.put("error", e.getMessage());
	        return ResponseEntity.status(500).body(result);
	    }
	}
	
	/**
	 * ✅ NEW: Complete fix workflow - Link assessments AND fix windows
	 * This is a convenience method that does both steps in one call
	 */
	@PostMapping("/complete-assessment-fix")
	public ResponseEntity<Map<String, Object>> completeAssessmentFix() {
	    log.info("========================================");
	    log.info("🔧 ADMIN: Running COMPLETE assessment fix");
	    log.info("========================================");
	    
	    Map<String, Object> result = new HashMap<>();
	    
	    try {
	        // Step 1: Link assessments to schedules and progress
	        ResponseEntity<Map<String, Object>> linkResult = linkAssessmentsToRecords();
	        Map<String, Object> linkData = linkResult.getBody();
	        
	        if (linkData == null || !Boolean.TRUE.equals(linkData.get("success"))) {
	            result.put("success", false);
	            result.put("error", "Failed to link assessments");
	            return ResponseEntity.status(500).body(result);
	        }
	        
	        log.info("✅ Step 1 complete: Assessments linked");
	        
	        // Step 2: Fix assessment windows
	        ResponseEntity<Map<String, Object>> windowResult = fixAllAssessmentWindows();
	        Map<String, Object> windowData = windowResult.getBody();
	        
	        if (windowData == null || !Boolean.TRUE.equals(windowData.get("success"))) {
	            result.put("success", false);
	            result.put("error", "Failed to fix assessment windows");
	            result.put("linkingResult", linkData);
	            return ResponseEntity.status(500).body(result);
	        }
	        
	        log.info("✅ Step 2 complete: Windows fixed");
	        
	        // Combine results
	        result.put("success", true);
	        result.put("linkingResult", linkData);
	        result.put("windowFixResult", windowData);
	        result.put("message", "Complete assessment fix successful");
	        
	        log.info("========================================");
	        log.info("✅ COMPLETE assessment fix finished");
	        log.info("========================================");
	        
	        return ResponseEntity.ok(result);
	        
	    } catch (Exception e) {
	        log.error("❌ Complete fix failed: {}", e.getMessage(), e);
	        result.put("success", false);
	        result.put("error", e.getMessage());
	        return ResponseEntity.status(500).body(result);
	    }
	}

	
	
	/**
	 * ✅ NEW: Link assessments to schedules based on lesson topics
	 */
	@PostMapping("/link-assessments/week/{weekNumber}")
	public ResponseEntity<Map<String, Object>> linkAssessmentsForWeek(
	        @PathVariable Integer weekNumber) {
	    
	    log.info("========================================");
	    log.info("🔗 ADMIN: Linking assessments to schedules for Week {}", weekNumber);
	    log.info("========================================");
	    
	    Map<String, Object> result = new HashMap<>();
	    
	    try {
	        LocalDate[] weekRange = getWeekDateRange(weekNumber);
	        if (weekRange == null) {
	            result.put("success", false);
	            result.put("error", "Invalid week number or no active term found");
	            return ResponseEntity.badRequest().body(result);
	        }
	        
	        LocalDate weekStart = weekRange[0];
	        LocalDate weekEnd = weekRange[1];
	        
	        log.info("📅 Week {} date range: {} to {}", weekNumber, weekStart, weekEnd);
	        
	        // Link assessments to schedules
	        String scheduleSql = """
	            UPDATE academic.daily_schedules ds
	            SET assessment_id = a.id
	            FROM academic.assessments a
	            WHERE ds.lesson_topic_id = a.lesson_topic_id
	              AND a.type = 'LESSON_TOPIC_ASSESSMENT'
	              AND ds.scheduled_date BETWEEN ? AND ?
	              AND ds.schedule_source = 'INDIVIDUAL'
	              AND ds.lesson_topic_id IS NOT NULL
	              AND ds.assessment_id IS NULL
	            """;
	        
	        int schedulesLinked = jdbcTemplate.update(scheduleSql, weekStart, weekEnd);
	        log.info("✅ Linked {} schedules to assessments", schedulesLinked);
	        
	        // Link assessments to progress records
	        String progressSql = """
	            UPDATE academic.student_lesson_progress p
	            SET assessment_id = ds.assessment_id
	            FROM academic.daily_schedules ds
	            WHERE p.daily_schedule_id = ds.id
	              AND p.scheduled_date BETWEEN ? AND ?
	              AND p.assessment_id IS NULL
	              AND ds.assessment_id IS NOT NULL
	            """;
	        
	        int progressLinked = jdbcTemplate.update(progressSql, weekStart, weekEnd);
	        log.info("✅ Linked {} progress records to assessments", progressLinked);
	        
	        result.put("success", true);
	        result.put("weekNumber", weekNumber);
	        result.put("weekStart", weekStart);
	        result.put("weekEnd", weekEnd);
	        result.put("schedulesLinked", schedulesLinked);
	        result.put("progressLinked", progressLinked);
	        result.put("message", String.format(
	            "Linked %d schedules and %d progress records to assessments for Week %d",
	            schedulesLinked, progressLinked, weekNumber
	        ));
	        
	        log.info("========================================");
	        log.info("✅ Assessment linking complete for Week {}", weekNumber);
	        log.info("========================================");
	        
	        return ResponseEntity.ok(result);
	        
	    } catch (Exception e) {
	        log.error("❌ Failed to link assessments: {}", e.getMessage(), e);
	        result.put("success", false);
	        result.put("error", e.getMessage());
	        return ResponseEntity.status(500).body(result);
	    }
	}
	
	
	// ✅ ADD THIS TO ProgressRecordFixerController.java

	/**
	 * ✅ EMERGENCY FIX: Clear assessments from Period 2+ multi-period subjects
	 * This fixes the recurring issue where Period 2 and 3 incorrectly have assessments assigned
	 * 
	 * This should be run:
	 * - After schedule regeneration
	 * - Whenever "Create Assessment" button doesn't appear for Period 2+
	 * - As part of weekly maintenance
	 */
	@PostMapping("/clear-period2plus-assessments/week/{weekNumber}")
	@Transactional
	public ResponseEntity<Map<String, Object>> clearPeriod2PlusAssessments(
	        @PathVariable Integer weekNumber) {
	    
	    log.info("========================================");
	    log.info("🧹 EMERGENCY: Clearing Period 2+ assessments for Week {}", weekNumber);
	    log.info("========================================");
	    
	    Map<String, Object> result = new HashMap<>();
	    result.put("weekNumber", weekNumber);
	    result.put("startTime", LocalDateTime.now().toString());
	    
	    try {
	        LocalDate[] weekRange = getWeekDateRange(weekNumber);
	        if (weekRange == null) {
	            result.put("success", false);
	            result.put("error", "Invalid week number or no active term found");
	            return ResponseEntity.badRequest().body(result);
	        }
	        
	        LocalDate weekStart = weekRange[0];
	        LocalDate weekEnd = weekRange[1];
	        
	        log.info("📅 Week {} date range: {} to {}", weekNumber, weekStart, weekEnd);
	        result.put("weekStart", weekStart.toString());
	        result.put("weekEnd", weekEnd.toString());
	        
	        // Count records that need fixing
	        String countSql = """
	            SELECT COUNT(*) 
	            FROM academic.student_lesson_progress
	            WHERE scheduled_date BETWEEN ? AND ?
	              AND period_sequence >= 2
	              AND requires_custom_assessment = true
	              AND assessment_id IS NOT NULL
	            """;
	        
	        Integer needsFixCount = jdbcTemplate.queryForObject(countSql, Integer.class, weekStart, weekEnd);
	        result.put("recordsNeedingFix", needsFixCount != null ? needsFixCount : 0);
	        
	        if (needsFixCount == null || needsFixCount == 0) {
	            result.put("success", true);
	            result.put("message", "No Period 2+ records need fixing");
	            result.put("recordsFixed", 0);
	            log.info("✅ No records need fixing");
	            return ResponseEntity.ok(result);
	        }
	        
	        log.info("📊 Found {} Period 2+ records with incorrect assessments", needsFixCount);
	        
	        // Clear assessments and set correct flags
	        String fixSql = """
	            UPDATE academic.student_lesson_progress
	            SET 
	                assessment_id = NULL,
	                assessment_accessible = FALSE,
	                requires_custom_assessment = TRUE
	            WHERE scheduled_date BETWEEN ? AND ?
	              AND period_sequence >= 2
	              AND requires_custom_assessment = true
	              AND assessment_id IS NOT NULL
	            """;
	        
	        int updated = jdbcTemplate.update(fixSql, weekStart, weekEnd);
	        
	        log.info("✅ Cleared assessments from {} Period 2+ records", updated);
	        
	        // Verify the fix
	        String verifySql = """
	            SELECT COUNT(*) 
	            FROM academic.student_lesson_progress
	            WHERE scheduled_date BETWEEN ? AND ?
	              AND period_sequence >= 2
	              AND requires_custom_assessment = true
	              AND assessment_id IS NOT NULL
	            """;
	        
	        Integer remaining = jdbcTemplate.queryForObject(verifySql, Integer.class, weekStart, weekEnd);
	        
	        result.put("success", true);
	        result.put("recordsFixed", updated);
	        result.put("remainingIssues", remaining != null ? remaining : 0);
	        result.put("message", String.format(
	            "Successfully cleared %d Period 2+ assessments for Week %d",
	            updated, weekNumber
	        ));
	        result.put("endTime", LocalDateTime.now().toString());
	        
	        if (remaining != null && remaining > 0) {
	            log.warn("⚠️ {} records still have issues after fix", remaining);
	            result.put("warning", String.format("%d records still have issues", remaining));
	        } else {
	            log.info("✅ All Period 2+ records fixed successfully!");
	        }
	        
	        log.info("========================================");
	        log.info("✅ Period 2+ assessment cleanup complete");
	        log.info("========================================");
	        
	        return ResponseEntity.ok(result);
	        
	    } catch (Exception e) {
	        log.error("❌ Failed to clear Period 2+ assessments: {}", e.getMessage(), e);
	        result.put("success", false);
	        result.put("error", e.getMessage());
	        result.put("endTime", LocalDateTime.now().toString());
	        return ResponseEntity.status(500).body(result);
	    }
	}

	/**
	 * ✅ CLEAR ALL WEEKS: Clear Period 2+ assessments for ALL weeks
	 * Use this if the issue affects multiple weeks
	 */
	@PostMapping("/clear-period2plus-assessments/all")
	@Transactional
	public ResponseEntity<Map<String, Object>> clearAllPeriod2PlusAssessments() {
	    
	    log.info("========================================");
	    log.info("🧹 EMERGENCY: Clearing Period 2+ assessments for ALL WEEKS");
	    log.info("========================================");
	    
	    Map<String, Object> result = new HashMap<>();
	    result.put("startTime", LocalDateTime.now().toString());
	    
	    try {
	        // Count records that need fixing
	        String countSql = """
	            SELECT COUNT(*) 
	            FROM academic.student_lesson_progress
	            WHERE period_sequence >= 2
	              AND requires_custom_assessment = true
	              AND assessment_id IS NOT NULL
	            """;
	        
	        Integer needsFixCount = jdbcTemplate.queryForObject(countSql, Integer.class);
	        result.put("recordsNeedingFix", needsFixCount != null ? needsFixCount : 0);
	        
	        if (needsFixCount == null || needsFixCount == 0) {
	            result.put("success", true);
	            result.put("message", "No Period 2+ records need fixing across all weeks");
	            result.put("recordsFixed", 0);
	            log.info("✅ No records need fixing");
	            return ResponseEntity.ok(result);
	        }
	        
	        log.info("📊 Found {} Period 2+ records with incorrect assessments across all weeks", needsFixCount);
	        
	        // Clear assessments and set correct flags
	        String fixSql = """
	            UPDATE academic.student_lesson_progress
	            SET 
	                assessment_id = NULL,
	                assessment_accessible = FALSE,
	                requires_custom_assessment = TRUE
	            WHERE period_sequence >= 2
	              AND requires_custom_assessment = true
	              AND assessment_id IS NOT NULL
	            """;
	        
	        int updated = jdbcTemplate.update(fixSql);
	        
	        log.info("✅ Cleared assessments from {} Period 2+ records across all weeks", updated);
	        
	        // Verify the fix
	        String verifySql = """
	            SELECT COUNT(*) 
	            FROM academic.student_lesson_progress
	            WHERE period_sequence >= 2
	              AND requires_custom_assessment = true
	              AND assessment_id IS NOT NULL
	            """;
	        
	        Integer remaining = jdbcTemplate.queryForObject(verifySql, Integer.class);
	        
	        result.put("success", true);
	        result.put("recordsFixed", updated);
	        result.put("remainingIssues", remaining != null ? remaining : 0);
	        result.put("message", String.format(
	            "Successfully cleared %d Period 2+ assessments across all weeks",
	            updated
	        ));
	        result.put("endTime", LocalDateTime.now().toString());
	        
	        if (remaining != null && remaining > 0) {
	            log.warn("⚠️ {} records still have issues after fix", remaining);
	            result.put("warning", String.format("%d records still have issues", remaining));
	        } else {
	            log.info("✅ All Period 2+ records fixed successfully!");
	        }
	        
	        log.info("========================================");
	        log.info("✅ Period 2+ assessment cleanup complete for all weeks");
	        log.info("========================================");
	        
	        return ResponseEntity.ok(result);
	        
	    } catch (Exception e) {
	        log.error("❌ Failed to clear Period 2+ assessments: {}", e.getMessage(), e);
	        result.put("success", false);
	        result.put("error", e.getMessage());
	        result.put("endTime", LocalDateTime.now().toString());
	        return ResponseEntity.status(500).body(result);
	    }
	}
	
	
	/**
	 * ✅ Regenerate schedules for a single student for a specific week
	 */
	@PostMapping("/regenerate/student/{studentId}/week/{weekNumber}")
	@Transactional
	public ResponseEntity<Map<String, Object>> regenerateStudentWeek(
	        @PathVariable Long studentId,
	        @PathVariable Integer weekNumber) {
	    
	    log.info("========================================");
	    log.info("🔄 API: Regenerating week {} for student {}", weekNumber, studentId);
	    log.info("========================================");
	    
	    try {
	        Map<String, Object> result = individualScheduleService.regenerateStudentWeek(studentId, weekNumber);
	        
	        if (Boolean.TRUE.equals(result.get("success"))) {
	            return ResponseEntity.ok(result);
	        } else {
	            return ResponseEntity.status(500).body(result);
	        }
	        
	    } catch (Exception e) {
	        log.error("❌ Regeneration API failed: {}", e.getMessage(), e);
	        return ResponseEntity.status(500).body(Map.of(
	            "success", false,
	            "error", e.getMessage()
	        ));
	    }
	}
	
	
	/**
	 * ✅ STUDENT-SPECIFIC FIX: Complete fix for ONE student across ALL their weeks
	 * This repairs all schedule/progress issues for a specific student without affecting others
	 */
	@PostMapping("/complete-fix/student/{studentId}")
	@Transactional
	public ResponseEntity<Map<String, Object>> completeFixForStudent(
	        @PathVariable Long studentId) {
	    
	    log.info("========================================");
	    log.info("🔧 STUDENT FIX: Starting complete fix for Student ID {}", studentId);
	    log.info("========================================");
	    
	    Map<String, Object> result = new HashMap<>();
	    result.put("studentId", studentId);
	    result.put("startTime", LocalDateTime.now().toString());
	    
	    try {
	        // Get student name for logging
	    	String studentNameSql = """
	    		    SELECT u.full_name 
	    		    FROM academic.student_profiles sp
	    		    JOIN core.users u ON sp.user_id = u.id
	    		    WHERE sp.id = ?
	    		    """;
	    	String studentName = jdbcTemplate.queryForObject(studentNameSql, String.class, studentId);
	        result.put("studentName", studentName);
	        log.info("👤 Student: {}", studentName);
	        
	        // Find all weeks where this student has schedules
	        String weeksSql = """
	            SELECT DISTINCT 
	                DATE_TRUNC('week', scheduled_date)::date as week_start,
	                (DATE_TRUNC('week', scheduled_date) + INTERVAL '6 days')::date as week_end
	            FROM academic.daily_schedules
	            WHERE student_id = ?
	            ORDER BY week_start
	            """;
	        
	        List<Map<String, Object>> weeks = jdbcTemplate.queryForList(weeksSql, studentId);
	        
	        if (weeks.isEmpty()) {
	            result.put("success", false);
	            result.put("error", "No schedules found for this student");
	            return ResponseEntity.badRequest().body(result);
	        }
	        
	        log.info("📅 Found {} weeks with schedules for student {}", weeks.size(), studentId);
	        result.put("weeksProcessed", weeks.size());
	        
	        // Initialize counters
	        int totalTopicsAssigned = 0;
	        int totalOrphanedLinked = 0;
	        int totalSchedulesLinked = 0;
	        int totalProgressLinked = 0;
	        int totalAccessibilitySet = 0;
	        int totalProgressCreated = 0;
	        int totalSubmissionsLinked = 0;
	        int totalScoresCalculated = 0;
	        int totalWindowsFixed = 0;
	        int totalAccessibilityUpdated = 0;
	        int totalMetadataSet = 0;
	        int totalAssessmentsCleared = 0;
	        
	        // Process each week
	        for (Map<String, Object> week : weeks) {
	            LocalDate weekStart = convertToLocalDate(week.get("week_start"));
	            LocalDate weekEnd = convertToLocalDate(week.get("week_end"));
	            
	            log.info("📝 Processing week: {} to {}", weekStart, weekEnd);
	            
	            // ============================================================
	            // STEP -1: Assign Lesson Topics to Schedules (Student-Specific) ✅ NEW
	            // ============================================================
	            Map<String, Integer> stepMinus1 = studentStepMinus1_assignLessonTopics(studentId, weekStart, weekEnd);
	            int topicsAssigned = stepMinus1.get("topicsAssigned");
	            log.info("  ✅ Step -1: Assigned {} lesson topics to schedules", topicsAssigned);

	            totalTopicsAssigned += topicsAssigned;
	            
	            // ============================================================
	            // STEP 0: Clear Period 2+ Assessments (Student-Specific)
	            // ============================================================
	            int step0 = studentStep0_clearPeriod2Plus(studentId, weekStart, weekEnd);
	            totalAssessmentsCleared += step0;
	            log.info("  ✅ Step 0: Cleared {} Period 2+ assessments", step0);
	            
	            // ============================================================
	            // STEP 1: Link Orphaned Progress (Student-Specific)
	            // ============================================================
	            int step1 = studentStep1_linkOrphanedProgress(studentId, weekStart, weekEnd);
	            totalOrphanedLinked += step1;
	            log.info("  ✅ Step 1: Linked {} orphaned progress", step1);
	            
	            // ============================================================
	            // STEP 2: Link Assessments (Student-Specific)
	            // ============================================================
	            Map<String, Integer> step2 = studentStep2_linkAssessments(studentId, weekStart, weekEnd);
	            totalSchedulesLinked += step2.get("schedulesLinked");
	            totalProgressLinked += step2.get("progressLinked");
	            totalAccessibilitySet += step2.get("accessibilitySet");
	            log.info("  ✅ Step 2: Linked {} schedules, {} progress", 
	                    step2.get("schedulesLinked"), step2.get("progressLinked"));
	            
	            // ============================================================
	            // STEP 3: Create Missing Progress (Student-Specific)
	            // ============================================================
	            int step3 = studentStep3_createMissingProgress(studentId, weekStart, weekEnd);
	            totalProgressCreated += step3;
	            log.info("  ✅ Step 3: Created {} progress records", step3);
	            
	            // ============================================================
	            // STEP 4: Link Submissions (Student-Specific)
	            // ============================================================
	            Map<String, Integer> step4 = studentStep4_linkSubmissions(studentId, weekStart, weekEnd);
	            totalSubmissionsLinked += step4.get("submissionsLinked");
	            totalScoresCalculated += step4.get("scoresCalculated");
	            log.info("  ✅ Step 4: Linked {} submissions", step4.get("submissionsLinked"));
	            
	            // ============================================================
	            // STEP 5: Fix Assessment Windows (Student-Specific)
	            // ============================================================
	            Map<String, Integer> step5 = studentStep5_fixAssessmentWindows(studentId, weekStart, weekEnd);
	            totalWindowsFixed += step5.get("windowsFixed");
	            totalAccessibilityUpdated += step5.get("accessibilityUpdated");
	            log.info("  ✅ Step 5: Fixed {} windows", step5.get("windowsFixed"));
	            
	            // ============================================================
	            // STEP 6: Set Multi-Period Metadata (Student-Specific)
	            // ============================================================
	            int step6 = studentStep6_setMultiPeriodMetadata(studentId, weekStart, weekEnd);
	            totalMetadataSet += step6;
	            log.info("  ✅ Step 6: Set {} metadata records", step6);
	            
	            jdbcTemplate.execute("COMMIT");
	        }
	        
	        // ============================================================
	        // STEP 7: Validate Final State (Student-Specific)
	        // ============================================================
	        Map<String, Object> validation = studentStep7_validateFinalState(studentId);
	        boolean allGood = (boolean) validation.getOrDefault("allGood", false);
	        
	        // Build result
	        result.put("success", true);
	        result.put("fullyFixed", allGood);
	        result.put("endTime", LocalDateTime.now().toString());

	        result.put("stepMinus1_topicsAssigned", totalTopicsAssigned);
	        result.put("step0_assessmentsCleared", totalAssessmentsCleared);
	        result.put("step1_orphanedLinked", totalOrphanedLinked);
	        result.put("step2_schedulesLinked", totalSchedulesLinked);
	        result.put("step2_progressLinked", totalProgressLinked);
	        result.put("step2_accessibilitySet", totalAccessibilitySet);
	        result.put("step3_progressCreated", totalProgressCreated);
	        result.put("step4_submissionsLinked", totalSubmissionsLinked);
	        result.put("step4_scoresCalculated", totalScoresCalculated);
	        result.put("step5_windowsFixed", totalWindowsFixed);
	        result.put("step5_accessibilityUpdated", totalAccessibilityUpdated);
	        result.put("step6_metadataSet", totalMetadataSet);
	        result.put("validation", validation);
	        
	        String message = String.format(
	            "Complete fix for %s: %d orphaned linked, %d assessments linked, " +
	            "%d progress created, %d submissions linked, %d windows fixed, %d metadata set",
	            studentName,
	            totalTopicsAssigned,
	            totalOrphanedLinked,
	            totalProgressLinked,
	            totalProgressCreated,
	            totalSubmissionsLinked,
	            totalWindowsFixed,
	            totalMetadataSet
	        );
	        
	        result.put("message", message);
	        
	        log.info("========================================");
	        log.info("✅ STUDENT FIX COMPLETE for {}", studentName);
	        log.info("========================================");
	        
	        return ResponseEntity.ok(result);
	        
	    } catch (Exception e) {
	        log.error("❌ Student fix failed: {}", e.getMessage(), e);
	        result.put("success", false);
	        result.put("error", e.getMessage());
	        result.put("endTime", LocalDateTime.now().toString());
	        return ResponseEntity.status(500).body(result);
	    }
	}

	// ============================================================
	// STUDENT-SPECIFIC STEP IMPLEMENTATIONS
	// ============================================================

	// ✅ NEW: Step -1 - Assign lesson topics to schedules that don't have them
	private Map<String, Integer> studentStepMinus1_assignLessonTopics(Long studentId, LocalDate weekStart, LocalDate weekEnd) {
	    Map<String, Integer> result = new HashMap<>();
	    
	    try {
	        // Check if student has individual lesson topics configured
	        String checkTopicsSql = """
	            SELECT COUNT(*) FROM academic.individual_lesson_topics
	            WHERE student_profile_id = ?
	            """;
	        Integer hasTopics = jdbcTemplate.queryForObject(checkTopicsSql, Integer.class, studentId);
	        
	        if (hasTopics == null || hasTopics == 0) {
	            log.warn("⚠️ Student {} has no individual lesson topics configured - cannot assign topics to schedules", studentId);
	            result.put("topicsAssigned", 0);
	            return result;
	        }
	        
	        log.info("  📚 Student has {} individual lesson topics available", hasTopics);
	        
	        // Assign the first available lesson topic for each subject to schedules without topics
	        String assignTopicsSql = """
	            UPDATE academic.daily_schedules ds
	            SET lesson_topic_id = (
	                SELECT ilt.id 
	                FROM academic.individual_lesson_topics ilt
	                WHERE ilt.student_profile_id = ds.student_id
	                  AND ilt.subject_id = ds.subject_id
	                ORDER BY ilt.week_number, ilt.id
	                LIMIT 1
	            )
	            WHERE ds.student_id = ?
	              AND ds.scheduled_date BETWEEN ? AND ?
	              AND ds.lesson_topic_id IS NULL
	              AND ds.schedule_source = 'INDIVIDUAL'
	              AND EXISTS (
	                  SELECT 1 FROM academic.individual_lesson_topics ilt
	                  WHERE ilt.student_profile_id = ds.student_id
	                    AND ilt.subject_id = ds.subject_id
	              )
	            """;
	        
	        int topicsAssigned = jdbcTemplate.update(assignTopicsSql, studentId, weekStart, weekEnd);
	        result.put("topicsAssigned", topicsAssigned);
	        
	        return result;
	        
	    } catch (Exception e) {
	        log.error("Student Step -1 failed: {}", e.getMessage(), e);
	        result.put("topicsAssigned", 0);
	        return result;
	    }
	}


	private int studentStep0_clearPeriod2Plus(Long studentId, LocalDate weekStart, LocalDate weekEnd) {
	    try {
	        String sql = """
	            UPDATE academic.student_lesson_progress
	            SET 
	                assessment_id = NULL,
	                assessment_accessible = FALSE,
	                requires_custom_assessment = TRUE
	            WHERE student_profile_id = ?
	              AND scheduled_date BETWEEN ? AND ?
	              AND period_sequence >= 2
	              AND requires_custom_assessment = true
	              AND assessment_id IS NOT NULL
	            """;
	        
	        return jdbcTemplate.update(sql, studentId, weekStart, weekEnd);
	    } catch (Exception e) {
	        log.error("Student Step 0 failed: {}", e.getMessage(), e);
	        return 0;
	    }
	}

	private int studentStep1_linkOrphanedProgress(Long studentId, LocalDate weekStart, LocalDate weekEnd) {
	    try {
	        String sql = """
	            UPDATE academic.student_lesson_progress slp
	            SET daily_schedule_id = ds.id
	            FROM academic.daily_schedules ds
	            WHERE slp.student_profile_id = ?
	              AND slp.daily_schedule_id IS NULL
	              AND slp.scheduled_date BETWEEN ? AND ?
	              AND slp.student_profile_id = ds.student_id
	              AND slp.scheduled_date = ds.scheduled_date
	              AND slp.period_number = ds.period_number
	              AND slp.lesson_topic_id = ds.lesson_topic_id
	              AND slp.lesson_topic_id IS NOT NULL
	            """;
	        
	        return jdbcTemplate.update(sql, studentId, weekStart, weekEnd);
	    } catch (Exception e) {
	        log.error("Student Step 1 failed: {}", e.getMessage(), e);
	        return 0;
	    }
	}

	private Map<String, Integer> studentStep2_linkAssessments(Long studentId, LocalDate weekStart, LocalDate weekEnd) {
	    Map<String, Integer> result = new HashMap<>();
	    
	    try {
	        // Link assessments to schedules
	        String scheduleSql = """
	            UPDATE academic.daily_schedules ds
	            SET assessment_id = a.id
	            FROM academic.assessments a
	            WHERE ds.student_id = ?
	              AND ds.lesson_topic_id = a.lesson_topic_id
	              AND a.type = 'LESSON_TOPIC_ASSESSMENT'
	              AND ds.scheduled_date BETWEEN ? AND ?
	              AND ds.schedule_source = 'INDIVIDUAL'
	              AND ds.lesson_topic_id IS NOT NULL
	              AND ds.assessment_id IS NULL
	            """;
	        
	        int schedulesLinked = jdbcTemplate.update(scheduleSql, studentId, weekStart, weekEnd);
	        result.put("schedulesLinked", schedulesLinked);
	        
	        // Link assessments to progress
	        String progressSql = """
	            UPDATE academic.student_lesson_progress p
	            SET assessment_id = ds.assessment_id
	            FROM academic.daily_schedules ds
	            WHERE p.student_profile_id = ?
	              AND p.daily_schedule_id = ds.id
	              AND p.scheduled_date BETWEEN ? AND ?
	              AND p.assessment_id IS NULL
	              AND ds.assessment_id IS NOT NULL
	            """;
	        
	        int progressLinked = jdbcTemplate.update(progressSql, studentId, weekStart, weekEnd);
	        result.put("progressLinked", progressLinked);
	        
	        // Set accessibility
	        String accessSql = """
	            UPDATE academic.student_lesson_progress p
	            SET assessment_accessible = CASE 
	                WHEN p.assessment_window_start IS NOT NULL 
	                 AND p.assessment_window_end IS NOT NULL
	                 AND CURRENT_TIMESTAMP BETWEEN p.assessment_window_start 
	                     AND COALESCE(p.grace_period_end, p.assessment_window_end)
	                THEN true
	                ELSE false
	            END
	            WHERE p.student_profile_id = ?
	              AND p.scheduled_date BETWEEN ? AND ?
	              AND p.assessment_id IS NOT NULL
	              AND p.completed = false
	            """;
	        
	        int accessibilitySet = jdbcTemplate.update(accessSql, studentId, weekStart, weekEnd);
	        result.put("accessibilitySet", accessibilitySet);
	        
	        return result;
	        
	    } catch (Exception e) {
	        log.error("Student Step 2 failed: {}", e.getMessage(), e);
	        result.put("schedulesLinked", 0);
	        result.put("progressLinked", 0);
	        result.put("accessibilitySet", 0);
	        return result;
	    }
	}

	private int studentStep3_createMissingProgress(Long studentId, LocalDate weekStart, LocalDate weekEnd) {
	    try {
	        String sql = """
	            INSERT INTO academic.student_lesson_progress (
	                student_profile_id,
	                scheduled_date,
	                period_number,
	                lesson_topic_id,
	                subject_id,
	                date,
	                completed,
	                daily_schedule_id,
	                assessment_id,
	                assessment_accessible,
	                lesson_content_accessible,
	                created_at,
	                assessment_window_start,
	                assessment_window_end,
	                grace_period_end,
	                priority,
	                weight
	            )
	            SELECT 
	                ds.student_id,
	                ds.scheduled_date,
	                ds.period_number,
	                ds.lesson_topic_id,
	                ds.subject_id,
	                ds.scheduled_date,
	                false,
	                ds.id,
	                ds.assessment_id,
	                CASE 
	                    WHEN ds.assessment_id IS NOT NULL
	                     AND ds.assessment_window_start IS NOT NULL
	                     AND ds.assessment_window_end IS NOT NULL
	                     AND CURRENT_TIMESTAMP BETWEEN ds.assessment_window_start 
	                         AND COALESCE(ds.grace_end_datetime, ds.assessment_window_end)
	                    THEN true 
	                    ELSE false 
	                END,
	                true,
	                CURRENT_TIMESTAMP,
	                ds.assessment_window_start,
	                ds.assessment_window_end,
	                ds.grace_end_datetime,
	                COALESCE(ds.priority, 3),
	                COALESCE(ds.weight, 1.0)
	            FROM academic.daily_schedules ds
	            WHERE ds.student_id = ?
	              AND ds.scheduled_date BETWEEN ? AND ?
	              AND ds.lesson_topic_id IS NOT NULL
	              AND NOT EXISTS (
	                  SELECT 1 
	                  FROM academic.student_lesson_progress slp2
	                  WHERE slp2.student_profile_id = ds.student_id
	                    AND slp2.scheduled_date = ds.scheduled_date
	                    AND slp2.period_number = ds.period_number
	                    AND slp2.lesson_topic_id = ds.lesson_topic_id
	              )
	            ON CONFLICT (student_profile_id, lesson_topic_id, scheduled_date, period_number) 
	            DO NOTHING
	            """;
	        
	        return jdbcTemplate.update(sql, studentId, weekStart, weekEnd);
	        
	    } catch (Exception e) {
	        log.error("Student Step 3 failed: {}", e.getMessage(), e);
	        return 0;
	    }
	}

	private Map<String, Integer> studentStep4_linkSubmissions(Long studentId, LocalDate weekStart, LocalDate weekEnd) {
	    Map<String, Integer> result = new HashMap<>();
	    
	    try {
	        String sql = """
	            UPDATE academic.student_lesson_progress slp
	            SET 
	                assessment_submission_id = sub.id,
	                completed = true,
	                completed_at = sub.submitted_at,
	                assessment_score = CASE 
	                    WHEN sub.total_marks > 0 
	                    THEN (sub.score::numeric / sub.total_marks * 100)
	                    ELSE NULL
	                END
	            FROM academic.assessment_submissions sub
	            JOIN academic.assessments a ON sub.assessment_id = a.id
	            WHERE slp.student_profile_id = ?
	              AND slp.assessment_submission_id IS NULL
	              AND slp.scheduled_date BETWEEN ? AND ?
	              AND slp.student_profile_id = sub.student_id
	              AND slp.lesson_topic_id = a.lesson_topic_id
	              AND a.lesson_topic_id IS NOT NULL
	              AND sub.nullified_at IS NULL
	              AND (slp.period_sequence = 1 OR slp.period_sequence IS NULL)
	            """;
	        
	        int linked = jdbcTemplate.update(sql, studentId, weekStart, weekEnd);
	        result.put("submissionsLinked", linked);
	        result.put("scoresCalculated", linked);
	        
	        return result;
	        
	    } catch (Exception e) {
	        log.error("Student Step 4 failed: {}", e.getMessage(), e);
	        result.put("submissionsLinked", 0);
	        result.put("scoresCalculated", 0);
	        return result;
	    }
	}

	private Map<String, Integer> studentStep5_fixAssessmentWindows(Long studentId, LocalDate weekStart, LocalDate weekEnd) {
	    Map<String, Integer> result = new HashMap<>();
	    
	    try {
	        String windowSql = """
	            UPDATE academic.student_lesson_progress p
	            SET 
	                assessment_window_start = ds.scheduled_date + ds.start_time,
	                assessment_window_end = ds.scheduled_date + ds.end_time,
	                grace_period_end = ds.scheduled_date + ds.end_time + INTERVAL '15 minutes'
	            FROM academic.daily_schedules ds
	            WHERE p.student_profile_id = ?
	              AND p.daily_schedule_id = ds.id
	              AND p.scheduled_date BETWEEN ? AND ?
	              AND p.assessment_id IS NOT NULL
	              AND p.completed = false
	              AND (
	                  p.assessment_window_start IS NULL 
	                  OR p.assessment_window_end IS NULL
	                  OR p.assessment_window_start IS DISTINCT FROM (ds.scheduled_date + ds.start_time)
	                  OR p.assessment_window_end IS DISTINCT FROM (ds.scheduled_date + ds.end_time)
	              )
	            """;
	        
	        int windowsFixed = jdbcTemplate.update(windowSql, studentId, weekStart, weekEnd);
	        result.put("windowsFixed", windowsFixed);
	        
	        String accessSql = """
	            UPDATE academic.student_lesson_progress p
	            SET assessment_accessible = CASE 
	                WHEN p.assessment_window_start IS NOT NULL 
	                 AND p.assessment_window_end IS NOT NULL
	                 AND CURRENT_TIMESTAMP BETWEEN p.assessment_window_start 
	                     AND COALESCE(p.grace_period_end, p.assessment_window_end)
	                THEN true
	                ELSE false
	            END
	            WHERE p.student_profile_id = ?
	              AND p.scheduled_date BETWEEN ? AND ?
	              AND p.assessment_id IS NOT NULL
	              AND p.completed = false
	            """;
	        
	        int accessibilityUpdated = jdbcTemplate.update(accessSql, studentId, weekStart, weekEnd);
	        result.put("accessibilityUpdated", accessibilityUpdated);
	        
	        return result;
	        
	    } catch (Exception e) {
	        log.error("Student Step 5 failed: {}", e.getMessage(), e);
	        result.put("windowsFixed", 0);
	        result.put("accessibilityUpdated", 0);
	        return result;
	    }
	}

	private int studentStep6_setMultiPeriodMetadata(Long studentId, LocalDate weekStart, LocalDate weekEnd) {
	    try {
	        String sql = """
	            WITH progress_with_sequence AS (
	                SELECT 
	                    p.id,
	                    ROW_NUMBER() OVER (
	                        PARTITION BY p.student_profile_id, p.subject_id, p.lesson_topic_id 
	                        ORDER BY p.scheduled_date, p.period_number, p.created_at
	                    ) as sequence_num,
	                    COUNT(*) OVER (
	                        PARTITION BY p.student_profile_id, p.subject_id, p.lesson_topic_id
	                    ) as total_in_sequence
	                FROM academic.student_lesson_progress p
	                WHERE p.student_profile_id = ?
	                  AND p.scheduled_date BETWEEN ? AND ?
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
	        
	        return jdbcTemplate.update(sql, studentId, weekStart, weekEnd);
	        
	    } catch (Exception e) {
	        log.error("Student Step 6 failed: {}", e.getMessage(), e);
	        return 0;
	    }
	}

	private Map<String, Object> studentStep7_validateFinalState(Long studentId) {
	    Map<String, Object> validation = new HashMap<>();
	    
	    try {
	        // Remaining orphaned
	        String orphanedSql = """
	            SELECT COUNT(*) FROM academic.student_lesson_progress
	            WHERE student_profile_id = ?
	              AND daily_schedule_id IS NULL
	              AND lesson_topic_id IS NOT NULL
	            """;
	        Integer remainingOrphaned = jdbcTemplate.queryForObject(orphanedSql, Integer.class, studentId);
	        validation.put("remainingOrphaned", remainingOrphaned != null ? remainingOrphaned : 0);
	        
	        // Remaining no assessment
	        String noAssessmentSql = """
	            SELECT COUNT(*) FROM academic.student_lesson_progress p
	            WHERE p.student_profile_id = ?
	              AND p.lesson_topic_id IS NOT NULL
	              AND p.assessment_id IS NULL
	              AND EXISTS (
	                  SELECT 1 FROM academic.assessments a
	                  WHERE a.lesson_topic_id = p.lesson_topic_id
	                    AND a.type = 'LESSON_TOPIC_ASSESSMENT'
	              )
	            """;
	        Integer remainingNoAssessment = jdbcTemplate.queryForObject(noAssessmentSql, Integer.class, studentId);
	        validation.put("remainingNoAssessment", remainingNoAssessment != null ? remainingNoAssessment : 0);
	        
	        // Remaining no windows
	        String noWindowsSql = """
	            SELECT COUNT(*) FROM academic.student_lesson_progress
	            WHERE student_profile_id = ?
	              AND assessment_id IS NOT NULL
	              AND completed = false
	              AND (assessment_window_start IS NULL OR assessment_window_end IS NULL)
	            """;
	        Integer remainingNoWindows = jdbcTemplate.queryForObject(noWindowsSql, Integer.class, studentId);
	        validation.put("remainingNoWindows", remainingNoWindows != null ? remainingNoWindows : 0);
	        
	        // Remaining no metadata
	        String noMetadataSql = """
	            SELECT COUNT(*) FROM academic.student_lesson_progress
	            WHERE student_profile_id = ?
	              AND lesson_topic_id IS NOT NULL
	              AND (period_sequence IS NULL OR total_periods_in_sequence IS NULL)
	            """;
	        Integer remainingNoMetadata = jdbcTemplate.queryForObject(noMetadataSql, Integer.class, studentId);
	        validation.put("remainingNoMetadata", remainingNoMetadata != null ? remainingNoMetadata : 0);
	        
	        // Unlinked submissions
	        String unlinkedSubmissionsSql = """
	            SELECT COUNT(*) 
	            FROM academic.assessment_submissions sub
	            JOIN academic.assessments a ON sub.assessment_id = a.id
	            WHERE sub.student_id = ?
	              AND sub.nullified_at IS NULL
	              AND NOT EXISTS (
	                  SELECT 1 FROM academic.student_lesson_progress p
	                  WHERE p.assessment_submission_id = sub.id
	              )
	            """;
	        Integer remainingUnlinkedSubmissions = jdbcTemplate.queryForObject(unlinkedSubmissionsSql, Integer.class, studentId);
	        validation.put("remainingUnlinkedSubmissions", remainingUnlinkedSubmissions != null ? remainingUnlinkedSubmissions : 0);
	        
	        boolean allGood = 
	            (remainingOrphaned == null || remainingOrphaned == 0) &&
	            (remainingNoAssessment == null || remainingNoAssessment == 0) &&
	            (remainingNoWindows == null || remainingNoWindows == 0) &&
	            (remainingNoMetadata == null || remainingNoMetadata == 0) &&
	            (remainingUnlinkedSubmissions == null || remainingUnlinkedSubmissions == 0);
	        
	        validation.put("allGood", allGood);
	        
	        return validation;
	        
	    } catch (Exception e) {
	        log.error("Student Step 7 validation failed: {}", e.getMessage(), e);
	        validation.put("error", e.getMessage());
	        validation.put("allGood", false);
	        return validation;
	    }
	}

	/**
	 * Helper to convert various date types to LocalDate
	 */
	private LocalDate convertToLocalDate(Object obj) {
	    if (obj instanceof java.sql.Date) {
	        return ((java.sql.Date) obj).toLocalDate();
	    } else if (obj instanceof java.sql.Timestamp) {
	        return ((java.sql.Timestamp) obj).toLocalDateTime().toLocalDate();
	    } else if (obj instanceof LocalDate) {
	        return (LocalDate) obj;
	    }
	    throw new IllegalArgumentException("Cannot convert " + obj.getClass() + " to LocalDate");
	}
	
	
	/**
	 * ✅ Check if a specific student needs schedule repair
	 * Returns health status for the student
	 */
	@GetMapping("/student/{studentId}/health")
	public ResponseEntity<Map<String, Object>> checkStudentHealth(
	        @PathVariable Long studentId) {

	    log.info("🔍 Checking schedule health for student {}", studentId);

	    Map<String, Object> health = new HashMap<>();
	    health.put("studentId", studentId);

	    try {
	        // ✅ Check if student has a completed timetable
	        String timetableSql = """
	            SELECT COUNT(*) FROM academic.individual_student_timetables
	            WHERE student_profile_id = ?
	              AND processing_status = 'COMPLETED'
	            """;
	        Integer hasTimetable = jdbcTemplate.queryForObject(timetableSql, Integer.class, studentId);
	        
	        // ✅ Check if student has any schedules
	        String scheduleCountSql = """
	            SELECT COUNT(*) FROM academic.daily_schedules
	            WHERE student_id = ?
	            """;
	        Integer scheduleCount = jdbcTemplate.queryForObject(scheduleCountSql, Integer.class, studentId);
	        
	        // ✅ If timetable exists but no schedules, that's an issue!
	        boolean schedulesNeedGeneration = (hasTimetable != null && hasTimetable > 0) && 
	                                          (scheduleCount == null || scheduleCount == 0);
	        
	        health.put("hasTimetable", hasTimetable != null ? hasTimetable : 0);
	        health.put("hasSchedules", scheduleCount != null ? scheduleCount : 0);
	        health.put("schedulesNeedGeneration", schedulesNeedGeneration);
	        
	        // Check for orphaned progress
	        String orphanedSql = """
	            SELECT COUNT(*) FROM academic.student_lesson_progress
	            WHERE student_profile_id = ?
	              AND daily_schedule_id IS NULL
	              AND lesson_topic_id IS NOT NULL
	            """;
	        Integer orphaned = jdbcTemplate.queryForObject(orphanedSql, Integer.class, studentId);
	        health.put("orphanedProgress", orphaned != null ? orphaned : 0);

	        // Check for schedules without progress (but WITH lesson topics)
	        String noProgressSql = """
	            SELECT COUNT(*) FROM academic.daily_schedules ds
	            WHERE ds.student_id = ?
	              AND ds.lesson_topic_id IS NOT NULL
	              AND NOT EXISTS (
	                  SELECT 1 FROM academic.student_lesson_progress slp
	                  WHERE slp.daily_schedule_id = ds.id
	              )
	            """;
	        Integer noProgress = jdbcTemplate.queryForObject(noProgressSql, Integer.class, studentId);
	        health.put("schedulesWithoutProgress", noProgress != null ? noProgress : 0);

	        // ✅ NEW: Check for schedules WITHOUT lesson topics
	        String noLessonTopicsSql = """
	            SELECT COUNT(*) FROM academic.daily_schedules ds
	            WHERE ds.student_id = ?
	              AND ds.lesson_topic_id IS NULL
	            """;
	        Integer noLessonTopics = jdbcTemplate.queryForObject(noLessonTopicsSql, Integer.class, studentId);
	        health.put("schedulesWithoutLessonTopics", noLessonTopics != null ? noLessonTopics : 0);

	        // Check for progress without assessments (where they should exist)
	        String noAssessmentSql = """
	            SELECT COUNT(*) FROM academic.student_lesson_progress p
	            WHERE p.student_profile_id = ?
	              AND p.lesson_topic_id IS NOT NULL
	              AND p.assessment_id IS NULL
	              AND EXISTS (
	                  SELECT 1 FROM academic.assessments a
	                  WHERE a.lesson_topic_id = p.lesson_topic_id
	                    AND a.type = 'LESSON_TOPIC_ASSESSMENT'
	              )
	            """;
	        Integer noAssessment = jdbcTemplate.queryForObject(noAssessmentSql, Integer.class, studentId);
	        health.put("missingAssessments", noAssessment != null ? noAssessment : 0);

	        // Check for missing assessment windows
	        String noWindowsSql = """
	            SELECT COUNT(*) FROM academic.student_lesson_progress
	            WHERE student_profile_id = ?
	              AND assessment_id IS NOT NULL
	              AND completed = false
	              AND (assessment_window_start IS NULL OR assessment_window_end IS NULL)
	            """;
	        Integer noWindows = jdbcTemplate.queryForObject(noWindowsSql, Integer.class, studentId);
	        health.put("missingWindows", noWindows != null ? noWindows : 0);

	        // ✅ UPDATED: Calculate if needs repair (including lesson topics check)
	        boolean needsRepair =
	            schedulesNeedGeneration ||
	            (orphaned != null && orphaned > 0) ||
	            (noProgress != null && noProgress > 0) ||
	            (noLessonTopics != null && noLessonTopics > 0) || // ✅ NEW
	            (noAssessment != null && noAssessment > 0) ||
	            (noWindows != null && noWindows > 0);

	        health.put("needsRepair", needsRepair);
	        health.put("isHealthy", !needsRepair);

	        // ✅ UPDATED: Calculate total issues (including lesson topics)
	        int totalIssues =
	            (schedulesNeedGeneration ? 1 : 0) +
	            (orphaned != null ? orphaned : 0) +
	            (noProgress != null ? noProgress : 0) +
	            (noLessonTopics != null ? noLessonTopics : 0) + // ✅ NEW
	            (noAssessment != null ? noAssessment : 0) +
	            (noWindows != null ? noWindows : 0);

	        health.put("totalIssues", totalIssues);
	        health.put("success", true);

	        return ResponseEntity.ok(health);

	    } catch (Exception e) {
	        log.error("Failed to check student health: {}", e.getMessage(), e);
	        health.put("success", false);
	        health.put("error", e.getMessage());
	        return ResponseEntity.status(500).body(health);
	    }
	}
}