package com.edu.platform.event;

import com.edu.platform.model.enums.NotificationPriority;
import com.edu.platform.model.enums.NotificationType;

import java.time.LocalDateTime;

/**
 * ✅ SPRINT 5: Generic system notification event
 * Used for assessment availability, expiry, and other system notifications
 */
public class SystemNotificationEvent extends NotificationEvent {

    /**
     * Create a system notification event
     */
    public SystemNotificationEvent(
            Long userId,
            NotificationType type,
            NotificationPriority priority,
            String title,
            String message,
            String actionUrl,
            Long relatedEntityId,
            String relatedEntityType,
            LocalDateTime expiresAt) {
        super(userId, type, priority, title, message, actionUrl, 
              relatedEntityId, relatedEntityType, expiresAt);
    }

    /**
     * Convenience constructor without expiration
     */
    public SystemNotificationEvent(
            Long userId,
            NotificationType type,
            NotificationPriority priority,
            String title,
            String message,
            String actionUrl,
            Long relatedEntityId,
            String relatedEntityType) {
        super(userId, type, priority, title, message, actionUrl, 
              relatedEntityId, relatedEntityType, null);
    }

    /**
     * Simplified constructor for basic notifications
     */
    public SystemNotificationEvent(
            Long userId,
            NotificationType type,
            NotificationPriority priority,
            String title,
            String message,
            String actionUrl) {
        super(userId, type, priority, title, message, actionUrl, null, null, null);
    }

    /**
     * Factory method: Assessment available notification
     */
    public static SystemNotificationEvent assessmentAvailable(
            Long userId,
            Long progressId,
            String title,
            String message,
            String actionUrl,
            LocalDateTime deadline) {
        return new SystemNotificationEvent(
                userId,
                NotificationType.SYSTEM_ALERT,
                NotificationPriority.HIGH,
                title,
                message,
                actionUrl,
                progressId,
                "PROGRESS",
                deadline
        );
    }

    /**
     * Factory method: Assessment expired notification
     */
    public static SystemNotificationEvent assessmentExpired(
            Long userId,
            Long progressId,
            String title,
            String message,
            String actionUrl) {
        return new SystemNotificationEvent(
                userId,
                NotificationType.SYSTEM_ALERT,
                NotificationPriority.MEDIUM,
                title,
                message,
                actionUrl,
                progressId,
                "PROGRESS"
        );
    }

    /**
     * Factory method: Student missed assessment (for teacher)
     */
    public static SystemNotificationEvent studentMissedAssessment(
            Long teacherUserId,
            Long studentProfileId,
            Long progressId,
            String title,
            String message,
            String actionUrl) {
        return new SystemNotificationEvent(
                teacherUserId,
                NotificationType.SYSTEM_ALERT,
                NotificationPriority.MEDIUM,
                title,
                message,
                actionUrl,
                progressId,
                "PROGRESS"
        );
    }
}