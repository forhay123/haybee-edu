package com.edu.platform.scheduler;

import com.edu.platform.service.individual.ScheduleMaintenanceService;
import com.edu.platform.service.individual.ScheduleMaintenanceService.MaintenanceStats;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled task to maintain schedule data integrity
 * Runs daily to fix any inconsistent missing_lesson_topic flags
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class ScheduleMaintenanceTask {

    private final ScheduleMaintenanceService maintenanceService;

    /**
     * Run daily at 2:00 AM to fix inconsistent schedule flags
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void runDailyMaintenance() {
        log.info("========================================");
        log.info("🔧 Starting daily schedule maintenance");
        log.info("========================================");

        try {
            // Get stats before fixing
            ScheduleMaintenanceService.MaintenanceStats beforeStats = 
                maintenanceService.getMaintenanceStats();
            
            log.info("📊 Pre-maintenance stats:");
            log.info("   Total schedules: {}", beforeStats.getTotalSchedules());
            log.info("   Missing topics: {}", beforeStats.getSchedulesWithMissingTopics());
            log.info("   Inconsistent: {}", beforeStats.getTotalInconsistent());

            // Fix inconsistencies
            int fixedCount = maintenanceService.fixInconsistentMissingTopicFlags();

            // Get stats after fixing
            ScheduleMaintenanceService.MaintenanceStats afterStats = 
                maintenanceService.getMaintenanceStats();

            log.info("========================================");
            log.info("✅ Daily maintenance complete");
            log.info("   Fixed {} schedules", fixedCount);
            log.info("   Remaining inconsistencies: {}", afterStats.getTotalInconsistent());
            log.info("========================================");

        } catch (Exception e) {
            log.error("❌ Daily maintenance failed: {}", e.getMessage(), e);
        }
    }

    /**
     * Optional: Run on startup to fix existing data
     * Comment out after initial fix
     */
    // @Scheduled(initialDelay = 5000, fixedDelay = Long.MAX_VALUE)
    // public void runOnStartup() {
    //     log.info("🚀 Running one-time maintenance on startup");
    //     runDailyMaintenance();
    // }
}