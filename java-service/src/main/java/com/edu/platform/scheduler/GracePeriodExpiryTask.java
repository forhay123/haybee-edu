package com.edu.platform.scheduler;

import com.edu.platform.service.individual.GracePeriodExpiryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * ✅ SPRINT 5: Grace Period Expiry Task
 * Runs every 15 minutes to mark assessments as incomplete after grace period expires
 * 
 *(every 15 minutes)
 * 
 * Configuration:
 * individual.tasks.grace-expiry.enabled=true
 * individual.tasks.grace-expiry.interval-minutes=15
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(
    prefix = "individual.tasks.grace-expiry",
    name = "enabled",
    havingValue = "true",
    matchIfMissing = true
)
public class GracePeriodExpiryTask {

    private final GracePeriodExpiryService expiryService;

    /**
     * ✅ Process expired assessments
     * Runs every 15 minutes at :00, :15, :30, :45
     */
    @Scheduled(cron = "0 */15 * * * *")
    public void processExpiredAssessments() {
        log.info("⏰ [TASK] Starting grace period expiry task...");
        
        try {
            int processed = expiryService.processExpiredAssessments();
            
            if (processed > 0) {
                log.warn("⚠️ [TASK] Marked {} assessment(s) as incomplete (grace period expired)", processed);
            } else {
                log.debug("ℹ️ [TASK] No expired assessments at this time");
            }
            
        } catch (Exception e) {
            log.error("❌ [TASK] Grace period expiry task failed: {}", e.getMessage(), e);
        }
        
        log.debug("🏁 [TASK] Grace period expiry task completed");
    }

    /**
     * ✅ Health check - runs every hour to verify task is working
     */
    @Scheduled(cron = "0 5 * * * *")
    public void healthCheck() {
        log.info("💚 [HEALTH] Grace period expiry task is running");
    }
}