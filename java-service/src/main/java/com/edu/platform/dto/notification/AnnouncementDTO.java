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
 * DTO for announcement responses
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnnouncementDTO {
    
    private Long id;
    private String title;
    private String message;
    private NotificationPriority priority;
    private Announcement.TargetAudience targetAudience;
    private Set<Long> targetClassIds;
    private Set<Long> targetUserIds;
    private String actionUrl;
    private LocalDateTime expiresAt;
    private boolean published;
    private LocalDateTime publishedAt;
    private Long createdByUserId;
    private String createdByUserName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private boolean expired;
    
    /**
     * Convert entity to DTO
     */
    public static AnnouncementDTO fromEntity(Announcement announcement) {
        return AnnouncementDTO.builder()
                .id(announcement.getId())
                .title(announcement.getTitle())
                .message(announcement.getMessage())
                .priority(announcement.getPriority())
                .targetAudience(announcement.getTargetAudience())
                .targetClassIds(announcement.getTargetClassIds())
                .targetUserIds(announcement.getTargetUserIds())
                .actionUrl(announcement.getActionUrl())
                .expiresAt(announcement.getExpiresAt())
                .published(announcement.isPublished())
                .publishedAt(announcement.getPublishedAt())
                .createdByUserId(announcement.getCreatedBy().getId())
                .createdByUserName(announcement.getCreatedBy().getFullName())
                .createdAt(announcement.getCreatedAt())
                .updatedAt(announcement.getUpdatedAt())
                .expired(announcement.isExpired())
                .build();
    }
}