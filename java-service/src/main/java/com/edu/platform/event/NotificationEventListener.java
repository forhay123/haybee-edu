package com.edu.platform.event;

import com.edu.platform.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * ✅ UPDATED: Listens for notification events and creates Notification entities.
 * All event handling is async to avoid blocking main business logic.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventListener {

    private final NotificationService notificationService;

    /**
     * Handle assessment published events.
     * Creates a notification for a SINGLE student.
     */
    @EventListener
    @Async
    public void handleAssessmentPublished(AssessmentPublishedEvent event) {
        try {
            log.debug("🔔 Processing assessment published event for user: {}", event.getUserId());

            notificationService.createNotification(
                event.getUserId(),
                event.getType(),
                event.getPriority(),
                event.getTitle(),
                event.getMessage(),
                event.getActionUrl(),
                event.getRelatedEntityId(),
                event.getRelatedEntityType()
            );

            log.debug("✅ Created notification for assessment published event");

        } catch (Exception e) {
            log.error("❌ Failed to create notification for AssessmentPublishedEvent (user: {}): {}",
                     event.getUserId(), e.getMessage(), e);
        }
    }

    /**
     * Handle assessment submitted events.
     */
    @EventListener
    @Async
    public void handleAssessmentSubmitted(AssessmentSubmittedEvent event) {
        try {
            log.debug("🔔 Processing assessment submitted event for teacher: {}", event.getUserId());
            
            notificationService.createNotification(
                event.getUserId(),
                event.getType(),
                event.getPriority(),
                event.getTitle(),
                event.getMessage(),
                event.getActionUrl(),
                event.getRelatedEntityId(),
                event.getRelatedEntityType()
            );
            
            log.debug("✅ Created notification for assessment submitted event");
        } catch (Exception e) {
            log.error("❌ Failed to create notification for AssessmentSubmittedEvent (teacher: {}): {}",
                     event.getUserId(), e.getMessage(), e);
        }
    }

    /**
     * Handle grade released events.
     */
    @EventListener
    @Async
    public void handleGradeReleased(GradeReleasedEvent event) {
        try {
            log.debug("🔔 Processing grade released event for user: {}", event.getUserId());

            notificationService.createNotification(
                event.getUserId(),
                event.getType(),
                event.getPriority(),
                event.getTitle(),
                event.getMessage(),
                event.getActionUrl(),
                event.getRelatedEntityId(),
                event.getRelatedEntityType()
            );

            log.debug("✅ Created notification for grade released event");

        } catch (Exception e) {
            log.error("❌ Failed to create notification for GradeReleasedEvent (user: {}): {}",
                     event.getUserId(), e.getMessage(), e);
        }
    }

    /**
     * Handle chat message events.
     */
    @EventListener
    @Async
    public void handleChatMessage(ChatMessageEvent event) {
        try {
            log.debug("🔔 Processing chat message event for user: {}", event.getUserId());
            
            notificationService.createNotification(
                event.getUserId(),
                event.getType(),
                event.getPriority(),
                event.getTitle(),
                event.getMessage(),
                event.getActionUrl(),
                event.getRelatedEntityId(),
                event.getRelatedEntityType()
            );
            
            log.debug("✅ Created notification for chat message event");
        } catch (Exception e) {
            log.error("❌ Failed to create notification for ChatMessageEvent (user: {}): {}",
                     event.getUserId(), e.getMessage(), e);
        }
    }

    /**
     * Handle announcement published events.
     */
    @EventListener
    @Async
    public void handleAnnouncementPublished(AnnouncementPublishedEvent event) {
        try {
            log.debug("📢 Processing announcement event for user: {}", event.getUserId());
            
            notificationService.createNotification(
                event.getUserId(),
                event.getType(),
                event.getPriority(),
                event.getTitle(),
                event.getMessage(),
                event.getActionUrl(),
                event.getRelatedEntityId(),
                event.getRelatedEntityType()
            );
            
            log.debug("✅ Created notification for announcement event");
        } catch (Exception e) {
            log.error("❌ Failed to create notification for AnnouncementPublishedEvent (user: {}): {}",
                     event.getUserId(), e.getMessage(), e);
        }
    }

    /**
     * Handle system alert events.
     */
    @EventListener
    @Async
    public void handleSystemAlert(SystemAlertEvent event) {
        try {
            log.debug("🚨 Processing system alert event for user: {}", event.getUserId());
            
            notificationService.createNotification(
                event.getUserId(),
                event.getType(),
                event.getPriority(),
                event.getTitle(),
                event.getMessage(),
                event.getActionUrl(),
                event.getRelatedEntityId(),
                event.getRelatedEntityType()
            );
            
            log.debug("✅ Created notification for system alert event");
        } catch (Exception e) {
            log.error("❌ Failed to create notification for SystemAlertEvent (user: {}): {}",
                     event.getUserId(), e.getMessage(), e);
        }
    }

    /**
     * ✅ SPRINT 5/6: Handle system notification events
     * Used for assessment lifecycle notifications (available, expired, etc.)
     */
    @EventListener
    @Async
    public void handleSystemNotification(SystemNotificationEvent event) {
        try {
            log.debug("🔔 Processing system notification event for user: {} (Type: {})", 
                     event.getUserId(), event.getType());
            
            notificationService.createNotification(
                event.getUserId(),
                event.getType(),
                event.getPriority(),
                event.getTitle(),
                event.getMessage(),
                event.getActionUrl(),
                event.getRelatedEntityId(),
                event.getRelatedEntityType()
            );
            
            log.debug("✅ Created notification for system notification event");
        } catch (Exception e) {
            log.error("❌ Failed to create notification for SystemNotificationEvent (user: {}): {}",
                     event.getUserId(), e.getMessage(), e);
        }
    }
    
	    
	
	/**
	 * ✅ NEW: Handle custom notification events
	 * Used for special notifications like custom assessment needed
	 */
	@EventListener
	@Async
	public void handleCustomNotification(CustomNotificationEvent event) {
	    try {
	        log.debug("🔔 Processing custom notification event for user: {} (Type: {})", 
	                 event.getUserId(), event.getCustomType());
	        
	        notificationService.createNotification(
	            event.getUserId(),
	            event.getType(),
	            event.getPriority(),
	            event.getTitle(),
	            event.getMessage(),
	            event.getActionUrl(),
	            event.getRelatedEntityId(),
	            event.getRelatedEntityType()
	        );
	        
	        log.debug("✅ Created notification for custom notification event");
	    } catch (Exception e) {
	        log.error("❌ Failed to create notification for CustomNotificationEvent (user: {}): {}",
	                 event.getUserId(), e.getMessage(), e);
	    }
	}
}