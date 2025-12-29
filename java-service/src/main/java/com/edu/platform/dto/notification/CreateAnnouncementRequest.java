package com.edu.platform.dto.notification;

import com.edu.platform.model.Announcement;
import com.edu.platform.model.enums.NotificationPriority;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

/**
 * DTO for creating/updating announcements
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAnnouncementRequest {
    
    private String title;
    private String message;
    private NotificationPriority priority;
    private Announcement.TargetAudience targetAudience;
    private Set<Long> targetClassIds;
    private Set<Long> targetUserIds;
    private String actionUrl;
    private LocalDateTime expiresAt;
    private boolean publishImmediately; // If true, publishes on creation
    
    /**
     * Validate the request
     */
    public void validate() {
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Title is required");
        }
        if (message == null || message.trim().isEmpty()) {
            throw new IllegalArgumentException("Message is required");
        }
        if (targetAudience == null) {
            throw new IllegalArgumentException("Target audience is required");
        }
        
        // Validate target-specific fields
        if (targetAudience == Announcement.TargetAudience.SPECIFIC_CLASSES) {
            if (targetClassIds == null || targetClassIds.isEmpty()) {
                throw new IllegalArgumentException("Target class IDs required for CLASS audience");
            }
        }
        if (targetAudience == Announcement.TargetAudience.SPECIFIC_USERS) {
            if (targetUserIds == null || targetUserIds.isEmpty()) {
                throw new IllegalArgumentException("Target user IDs required for SPECIFIC_USERS audience");
            }
        }
    }
}