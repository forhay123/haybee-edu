package com.edu.platform.model;

import com.edu.platform.model.enums.NotificationPriority;
import com.edu.platform.model.enums.NotificationType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Represents a notification sent to a user.
 * Notifications are created when system events occur (assessments published, grades released, etc.)
 */
@Entity
@Table(
    name = "notifications",
    schema = "core",
    indexes = {
        @Index(name = "idx_notification_user_read_created", columnList = "user_id, is_read, created_at"),
        @Index(name = "idx_notification_created_at", columnList = "created_at"),
        @Index(name = "idx_notification_user_type", columnList = "user_id, type")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The user who will receive this notification
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Type of notification (ASSESSMENT_PUBLISHED, GRADE_RELEASED, etc.)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 50)
    private NotificationType type;

    /**
     * Priority level (HIGH, MEDIUM, LOW)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 20)
    @Builder.Default
    private NotificationPriority priority = NotificationPriority.MEDIUM;

    /**
     * Short, concise title (displayed in list view)
     */
    @Column(name = "title", nullable = false, length = 200)
    private String title;

    /**
     * Full notification message (displayed when expanded)
     */
    @Column(name = "message", nullable = false, columnDefinition = "TEXT")
    private String message;

    /**
     * URL to navigate to when user clicks notification
     * Example: "/student/assessments/123" or "/teacher/submissions/456"
     */
    @Column(name = "action_url", length = 500)
    private String actionUrl;

    /**
     * ID of the related entity (assessment ID, submission ID, etc.)
     */
    @Column(name = "related_entity_id")
    private Long relatedEntityId;

    /**
     * Type of the related entity ("ASSESSMENT", "SUBMISSION", "LIVE_CLASS", etc.)
     */
    @Column(name = "related_entity_type", length = 50)
    private String relatedEntityType;

    /**
     * Whether the user has read this notification
     */
    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean isRead = false;

    /**
     * Timestamp when the notification was marked as read
     */
    @Column(name = "read_at")
    private LocalDateTime readAt;

    /**
     * Timestamp when the notification was created
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Optional: Timestamp when notification should be automatically deleted
     * Useful for time-sensitive notifications like "Class starting in 10 minutes"
     */
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    /**
     * Set creation timestamp before persisting
     */
    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.priority == null) {
            this.priority = NotificationPriority.MEDIUM;
        }
    }

    /**
     * Helper method to get user ID without loading the entire User entity
     */
    public Long getUserId() {
        return user != null ? user.getId() : null;
    }

    /**
     * Helper method to check if notification is expired
     */
    public boolean isExpired() {
        return expiresAt != null && LocalDateTime.now().isAfter(expiresAt);
    }

    /**
     * Helper method to mark as read
     */
    public void markAsRead() {
        this.isRead = true;
        this.readAt = LocalDateTime.now();
    }
}