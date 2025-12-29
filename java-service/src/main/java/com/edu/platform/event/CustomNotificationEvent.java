package com.edu.platform.event;

import com.edu.platform.model.enums.NotificationPriority;
import com.edu.platform.model.enums.NotificationType;
import lombok.Builder;
import lombok.Getter;

import java.util.Map;

/**
 * ✅ NEW: Custom notification event for notifications that don't fit standard types
 * Used for special cases like custom assessment notifications
 */
@Getter
public class CustomNotificationEvent extends NotificationEvent {
    
    /**
     * The custom type string (e.g., "CUSTOM_ASSESSMENT_NEEDED")
     */
    private final String customType;
    
    /**
     * Additional metadata for the notification
     */
    private final Map<String, Object> data;
    
    @Builder
    private CustomNotificationEvent(
            Long userId,
            String type,
            String title,
            String message,
            NotificationPriority priority,
            String actionUrl,
            Long relatedEntityId,
            String relatedEntityType,
            Map<String, Object> data) {
        
        // Map to SYSTEM_ALERT notification type for custom notifications
        // Later can extend NotificationType enum if specific types are needed
        super(
            userId,
            NotificationType.SYSTEM_ALERT,
            priority != null ? priority : NotificationPriority.MEDIUM,
            title,
            message,
            actionUrl,
            relatedEntityId,
            relatedEntityType != null ? relatedEntityType : "CUSTOM"
        );
        
        this.customType = type;
        this.data = data;
    }
    
    /**
     * Get a data value by key
     */
    public Object getData(String key) {
        return data != null ? data.get(key) : null;
    }
    
    /**
     * Get a typed data value
     */
    @SuppressWarnings("unchecked")
    public <T> T getData(String key, Class<T> type) {
        Object value = getData(key);
        if (value != null && type.isInstance(value)) {
            return (T) value;
        }
        return null;
    }
}