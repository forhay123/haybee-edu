package com.edu.platform.dto.notification;

import com.edu.platform.model.enums.NotificationPriority;
import com.edu.platform.model.enums.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for Notification entity.
 * Used to transfer notification data to the frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {
    
    private Long id;
    
    /**
     * Type of notification (ASSESSMENT_PUBLISHED, GRADE_RELEASED, etc.)
     */
    private NotificationType type;
    
    /**
     * Priority level (HIGH, MEDIUM, LOW)
     */
    private NotificationPriority priority;
    
    /**
     * Short title for the notification
     */
    private String title;
    
    /**
     * Full message content
     */
    private String message;
    
    /**
     * URL to navigate to when clicked
     */
    private String actionUrl;
    
    /**
     * ID of related entity (assessment ID, submission ID, etc.)
     */
    private Long relatedEntityId;
    
    /**
     * Type of related entity ("ASSESSMENT", "SUBMISSION", etc.)
     */
    private String relatedEntityType;
    
    /**
     * Whether the notification has been read
     */
    private boolean isRead;
    
    /**
     * When the notification was created
     */
    private LocalDateTime createdAt;
    
    /**
     * When the notification was marked as read (null if unread)
     */
    private LocalDateTime readAt;
    
    /**
     * When the notification expires (null if it doesn't expire)
     */
    private LocalDateTime expiresAt;
}