package com.edu.platform.event;

import com.edu.platform.model.enums.NotificationPriority;
import com.edu.platform.model.enums.NotificationType;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Base class for all notification events.
 * Events are published by services when actions occur that require user notification.
 * Event listeners create actual Notification entities from these events.
 */
@Getter
public abstract class NotificationEvent {

    /**
     * ID of the user who should receive the notification
     */
    private final Long userId;

    /**
     * Type of notification
     */
    private final NotificationType type;

    /**
     * Priority level
     */
    private final NotificationPriority priority;

    /**
     * Notification title (short, displayed in lists)
     */
    private final String title;

    /**
     * Full notification message
     */
    private final String message;

    /**
     * URL to navigate to when notification is clicked
     */
    private final String actionUrl;

    /**
     * ID of the related entity (assessment, submission, etc.)
     */
    private final Long relatedEntityId;

    /**
     * Type of the related entity
     */
    private final String relatedEntityType;

    /**
     * When the event was created
     */
    private final LocalDateTime timestamp;

    /**
     * Optional: When the notification should expire
     */
    private final LocalDateTime expiresAt;

    /**
     * Protected constructor - only subclasses can create events
     */
    protected NotificationEvent(
        Long userId,
        NotificationType type,
        NotificationPriority priority,
        String title,
        String message,
        String actionUrl,
        Long relatedEntityId,
        String relatedEntityType,
        LocalDateTime expiresAt
    ) {
        this.userId = userId;
        this.type = type;
        this.priority = priority;
        this.title = title;
        this.message = message;
        this.actionUrl = actionUrl;
        this.relatedEntityId = relatedEntityId;
        this.relatedEntityType = relatedEntityType;
        this.timestamp = LocalDateTime.now();
        this.expiresAt = expiresAt;
    }

    /**
     * Convenience constructor without expiration
     */
    protected NotificationEvent(
        Long userId,
        NotificationType type,
        NotificationPriority priority,
        String title,
        String message,
        String actionUrl,
        Long relatedEntityId,
        String relatedEntityType
    ) {
        this(userId, type, priority, title, message, actionUrl, relatedEntityId, relatedEntityType, null);
    }
}