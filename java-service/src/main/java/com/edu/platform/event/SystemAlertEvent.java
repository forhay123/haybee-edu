
package com.edu.platform.event;

import com.edu.platform.model.enums.NotificationPriority;
import com.edu.platform.model.enums.NotificationType;

import java.util.List;

/**
 * Event fired when a system alert is sent
 * System alerts are always HIGH priority and go to all users
 */
public class SystemAlertEvent extends NotificationEvent {

    private final String alertMessage;

    private SystemAlertEvent(
            Long userId,
            String title,
            String message,
            String actionUrl,
            Long alertId) {
        super(
            userId,
            NotificationType.SYSTEM_ALERT,
            NotificationPriority.HIGH, // System alerts are always HIGH priority
            title,
            message,
            actionUrl,
            alertId,
            "SYSTEM_ALERT"
        );
        this.alertMessage = message;
    }

    public String getAlertMessage() {
        return alertMessage;
    }

    /**
     * Factory method to create events for multiple users
     */
    public static List<SystemAlertEvent> forUsers(
            String title,
            String message,
            String actionUrl,
            Long alertId,
            List<Long> userIds) {
        return userIds.stream()
                .map(userId -> new SystemAlertEvent(userId, title, message, actionUrl, alertId))
                .toList();
    }
}