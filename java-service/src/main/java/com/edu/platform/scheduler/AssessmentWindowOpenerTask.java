package com.edu.platform.scheduler;

import com.edu.platform.service.individual.AssessmentAccessibilityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * ✅ SPRINT 5: Assessment Window Opener Task
 * Runs every 10 minutes to open assessments that have reached their window start time
 * 
 * (every 10 minutes)
 * 
 * Configuration:
 * individual.tasks.assessment-opener.enabled=true
 * individual.tasks.assessment-opener.interval-minutes=10
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(
    prefix = "individual.tasks.assessment-opener",
    name = "enabled",
    havingValue = "true",
    matchIfMissing = true
)
public class AssessmentWindowOpenerTask {

    private final AssessmentAccessibilityService accessibilityService;

    /**
     * ✅ Open available assessments
     * Runs every 10 minutes at :00, :10, :20, :30, :40, :50
     */
    @Scheduled(cron = "0 */10 * * * *")
    public void openAvailableAssessments() {
        log.info("🔓 [TASK] Starting assessment window opener task...");
        
        try {
            int opened = accessibilityService.openAvailableAssessments();
            
            if (opened > 0) {
                log.info("✅ [TASK] Opened {} assessment(s)", opened);
            } else {
                log.debug("ℹ️ [TASK] No assessments to open at this time");
            }
            
        } catch (Exception e) {
            log.error("❌ [TASK] Assessment window opener task failed: {}", e.getMessage(), e);
        }
        
        log.debug("🏁 [TASK] Assessment window opener task completed");
    }

    /**
     * ✅ Health check - runs every hour to verify task is working
     */
    @Scheduled(cron = "0 0 * * * *")
    public void healthCheck() {
        log.info("💚 [HEALTH] Assessment window opener task is running");
    }
}