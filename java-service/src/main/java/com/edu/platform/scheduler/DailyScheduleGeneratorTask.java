package com.edu.platform.scheduler;

import com.edu.platform.model.Term;
import com.edu.platform.service.DailyScheduleService;
import com.edu.platform.service.individual.TermWeekCalculator;
import com.edu.platform.service.individual.WeeklyGenerationOrchestrator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Optional;

/**
 * SPRINT 3: Enhanced Scheduled Task with Weekly Generation Orchestrator
 * 
 * CLASS students: Daily generation (existing logic)
 * INDIVIDUAL students: Weekly generation every Sunday at 11:59 PM
 * 
 * Disable in application.properties with: scheduling.enabled=false
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "scheduling.enabled", havingValue = "true", matchIfMissing = true)
public class DailyScheduleGeneratorTask {
    
    private final DailyScheduleService dailyScheduleService;
    private final WeeklyGenerationOrchestrator weeklyGenerationOrchestrator;
    private final TermWeekCalculator termWeekCalculator;
    
    @Value("${individual.schedule.generation.enabled:true}")
    private boolean weeklyGenerationEnabled;
    
    // ============================================================
    // CLASS STUDENT SCHEDULES (DAILY) - EXISTING LOGIC
    // ============================================================
    
    /**
     * Generate schedules for tomorrow at midnight
     * Runs every day at 00:01 AM
     */
    @Scheduled(cron = "0 1 0 * * *")
    public void generateTomorrowSchedules() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        log.info("🕐 Scheduled task: Generating daily schedules for {}", tomorrow);
        
        try {
            dailyScheduleService.generateDailySchedulesForAllStudents(tomorrow);
            log.info("✅ Successfully generated CLASS schedules for {}", tomorrow);
        } catch (Exception e) {
            log.error("❌ Failed to generate schedules for {}: {}", tomorrow, e.getMessage(), e);
        }
    }
    
    /**
     * Generate schedules for today (in case of system restart)
     * Runs at 6:00 AM
     */
    @Scheduled(cron = "0 0 6 * * *")
    public void ensureTodaySchedules() {
        LocalDate today = LocalDate.now();
        log.info("🕐 Scheduled task: Ensuring schedules exist for {}", today);
        
        try {
            dailyScheduleService.generateDailySchedulesForAllStudents(today);
            log.info("✅ Verified CLASS schedules for {}", today);
        } catch (Exception e) {
            log.error("❌ Failed to verify schedules for {}: {}", today, e.getMessage(), e);
        }
    }
    
    /**
     * Clean up old schedules (keep last 30 days)
     * Runs at 2:00 AM every Sunday
     */
    @Scheduled(cron = "0 0 2 * * SUN")
    public void cleanupOldSchedules() {
        LocalDate cutoffDate = LocalDate.now().minusDays(30);
        log.info("🧹 Scheduled task: Cleaning up schedules before {}", cutoffDate);
        
        try {
            dailyScheduleService.deleteOldSchedules(cutoffDate);
            log.info("✅ Successfully cleaned up old schedules");
        } catch (Exception e) {
            log.error("❌ Failed to cleanup old schedules: {}", e.getMessage(), e);
        }
    }
    
    // ============================================================
    // INDIVIDUAL STUDENT SCHEDULES (WEEKLY) - SPRINT 3 ORCHESTRATOR
    // ============================================================
    
    /**
     * SPRINT 3: Weekly schedule generation for INDIVIDUAL students
     * Runs every Sunday at 11:59 PM
     * 
     * Uses WeeklyGenerationOrchestrator for complete workflow:
     * 1. Archives previous week
     * 2. Generates new schedules
     * 3. Creates shuffled assessments
     * 4. Initializes progress records
     * 5. Links everything together
     */
    @Scheduled(cron = "${individual.schedule.generation.cron:0 59 23 * * SUN}")
    public void generateWeeklyIndividualSchedules() {
        if (!weeklyGenerationEnabled) {
            log.debug("Weekly generation is disabled");
            return;
        }
        
        log.info("========================================");
        log.info("🕐 SUNDAY 11:59 PM: Starting weekly INDIVIDUAL schedule generation");
        log.info("========================================");
        
        try {
            // Validate active term
            Optional<Term> termOpt = termWeekCalculator.getActiveTerm();
            if (termOpt.isEmpty()) {
                log.warn("No active term found. Skipping weekly generation.");
                return;
            }
            
            Term term = termOpt.get();
            log.info("Active term: {} (ID: {})", term.getName(), term.getId());
            
            // Calculate next week number
            Integer nextWeek = termWeekCalculator.getNextWeekNumber();
            if (nextWeek == null) {
                log.info("Term has ended. No more weeks to generate.");
                return;
            }
            
            log.info("Generating schedules for Week {}", nextWeek);
            
            // Trigger orchestrator
            WeeklyGenerationOrchestrator.WeeklyGenerationResult result = 
                weeklyGenerationOrchestrator.generateWeeklySchedules(nextWeek);
            
            // Log results
            logGenerationResult(result);
            
        } catch (Exception e) {
            log.error("========================================");
            log.error("❌ CRITICAL ERROR in weekly generation: {}", e.getMessage(), e);
            log.error("========================================");
        }
    }
    
    /**
     * Log generation result summary
     */
    private void logGenerationResult(WeeklyGenerationOrchestrator.WeeklyGenerationResult result) {
        if (result.isSuccess()) {
            log.info("========================================");
            log.info("✅ WEEKLY GENERATION SUCCESSFUL");
            log.info("Week: {}", result.getWeekNumber());
            log.info("Term: {} ({})", result.getTermName(), result.getTermId());
            log.info("Date Range: {} to {}", result.getWeekStartDate(), result.getWeekEndDate());
            log.info("Students Processed: {}", result.getStudentsProcessed());
            log.info("Schedules Created: {}", result.getSchedulesCreated());
            log.info("Progress Records: {}", result.getProgressRecordsCreated());
            log.info("Assessment Instances: {}", result.getAssessmentInstancesCreated());
            log.info("Schedules Archived: {}", result.getSchedulesArchived());
            log.info("Progress Archived: {}", result.getProgressRecordsArchived());
            log.info("Missing Topics: {}", result.getMissingTopicsCount());
            log.info("Failed Students: {}", result.getFailedStudents().size());
            
            if (result.isSaturdayHoliday()) {
                log.info("Saturday Holiday: {}", result.getHolidayName());
            }
            
            log.info("Duration: {} seconds", result.getDurationSeconds());
            log.info("========================================");
        } else {
            log.error("========================================");
            log.error("❌ WEEKLY GENERATION FAILED");
            log.error("Week: {}", result.getWeekNumber());
            log.error("Error: {}", result.getErrorMessage());
            log.error("========================================");
        }
    }
    
    // ============================================================
    // MANUAL TRIGGER METHODS (for testing/admin endpoints)
    // ============================================================
    
    /**
     * Manual trigger for weekly generation
     * Can be called by admin endpoint
     */
    public WeeklyGenerationOrchestrator.WeeklyGenerationResult manualGenerateWeek(Integer weekNumber) {
        log.info("========================================");
        log.info("🔧 MANUAL GENERATION: Week {}", weekNumber);
        log.info("========================================");
        
        if (!weeklyGenerationEnabled) {
            throw new IllegalStateException("Weekly generation is disabled");
        }
        
        if (!termWeekCalculator.isValidWeekNumber(weekNumber)) {
            throw new IllegalArgumentException("Invalid week number: " + weekNumber);
        }
        
        return weeklyGenerationOrchestrator.generateWeeklySchedules(weekNumber);
    }
    
    /**
     * Regenerate current week (emergency use)
     */
    public WeeklyGenerationOrchestrator.WeeklyGenerationResult regenerateCurrentWeek() {
        Integer currentWeek = termWeekCalculator.getCurrentTermWeek();
        if (currentWeek == null) {
            throw new IllegalStateException("No active term or week");
        }
        
        log.warn("⚠️ REGENERATING CURRENT WEEK: {}", currentWeek);
        return manualGenerateWeek(currentWeek);
    }
    
    /**
     * Get next scheduled weekly generation time
     */
    public String getNextWeeklyGenerationTime() {
        LocalDate today = LocalDate.now();
        int daysUntilSunday = 7 - today.getDayOfWeek().getValue();
        if (daysUntilSunday == 0) {
            daysUntilSunday = 7;
        }
        LocalDate nextSunday = today.plusDays(daysUntilSunday);
        
        return nextSunday + " 23:59:00";
    }
    
    /**
     * Check if weekly generation is enabled
     */
    public boolean isWeeklyGenerationEnabled() {
        return weeklyGenerationEnabled;
    }
}