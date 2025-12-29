package com.edu.platform.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.boot.context.event.ApplicationPreparedEvent;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.context.event.ApplicationStartedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class StartupEventLogger {

    @EventListener
    public void handleContextRefresh(ContextRefreshedEvent event) {
        log.info("========================================");
        log.info("✅ CONTEXT REFRESHED");
        log.info("========================================");
    }

    @EventListener
    public void handleApplicationStarted(ApplicationStartedEvent event) {
        log.info("========================================");
        log.info("✅ APPLICATION STARTED");
        log.info("========================================");
    }

    @EventListener
    public void handleApplicationReady(ApplicationReadyEvent event) {
        log.info("========================================");
        log.info("✅✅✅ APPLICATION READY - STARTUP COMPLETE! ✅✅✅");
        log.info("========================================");
    }
}