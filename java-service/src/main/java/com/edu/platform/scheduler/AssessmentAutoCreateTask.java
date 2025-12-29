package com.edu.platform.scheduler;

import com.edu.platform.service.IntegrationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * ✅ Scheduled task to automatically create missing assessments
 * Runs every hour to check for lesson topics with AI questions but no assessment
 * 
 * Configuration:
 * individual.tasks.assessment-auto-create.enabled=true (default)
 * individual.tasks.assessment-auto-create.interval-hours=1
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(
    prefix = "individual.tasks.assessment-auto-create",
    name = "enabled",
    havingValue = "true",
    matchIfMissing = true // Enabled by default
)
public class AssessmentAutoCreateTask {
    
    private final IntegrationService integrationService;
    
    /**
     * ✅ Auto-create missing assessments
     * Runs every hour at :00
     */
    @Scheduled(cron = "0 0 * * * *")
    public void autoCreateMissingAssessments() {
        log.info("🔄 [TASK] Starting auto-create missing assessments task...");
        
        try {
            Map<String, Object> result = integrationService.createMissingAssessmentsForAllLessons();
            
            int created = (int) result.getOrDefault("assessmentsCreated", 0);
            int skipped = (int) result.getOrDefault("skipped", 0);
            int total = (int) result.getOrDefault("totalTopics", 0);
            
            if (created > 0) {
                log.info("✅ [TASK] Created {} missing assessments out of {} total topics ({} skipped)", 
                        created, total, skipped);
            } else {
                log.debug("ℹ️ [TASK] No missing assessments found ({} topics checked)", total);
            }
            
        } catch (Exception e) {
            log.error("❌ [TASK] Auto-create assessments task failed: {}", e.getMessage(), e);
        }
        
        log.debug("🏁 [TASK] Auto-create assessments task completed");
    }
    
    /**
     * ✅ Health check - runs every 4 hours to verify task is working
     */
    @Scheduled(cron = "0 0 */4 * * *")
    public void healthCheck() {
        log.info("💚 [HEALTH] Assessment auto-create task is running");
    }
}