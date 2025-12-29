package com.edu.platform.model;

import com.edu.platform.model.enums.NotificationPriority;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Announcement entity for system-wide or targeted announcements
 * Created by admins, sent as notifications to users
 */
@Entity
@Table(name = "announcements", schema = "core")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Announcement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Announcement title (required)
     */
    @Column(nullable = false, length = 200)
    private String title;

    /**
     * Full announcement message (required)
     */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    /**
     * Priority level of the announcement
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private NotificationPriority priority = NotificationPriority.MEDIUM;

    /**
     * Target audience type
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TargetAudience targetAudience;

    /**
     * Specific class IDs if targetAudience is CLASS
     */
    @ElementCollection
    @CollectionTable(
        name = "announcement_target_classes",
        schema = "core",
        joinColumns = @JoinColumn(name = "announcement_id")
    )
    @Column(name = "class_id")
    @Builder.Default
    private Set<Long> targetClassIds = new HashSet<>();

    /**
     * Specific user IDs if targetAudience is SPECIFIC_USERS
     */
    @ElementCollection
    @CollectionTable(
        name = "announcement_target_users",
        schema = "core",
        joinColumns = @JoinColumn(name = "announcement_id")
    )
    @Column(name = "user_id")
    @Builder.Default
    private Set<Long> targetUserIds = new HashSet<>();

    /**
     * Optional action URL (e.g., link to important page)
     */
    @Column(length = 500)
    private String actionUrl;

    /**
     * When the announcement expires (optional)
     */
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    /**
     * Whether the announcement has been published
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean published = false;

    /**
     * When the announcement was published
     */
    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    /**
     * Admin who created the announcement
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private User createdBy;

    /**
     * Timestamp when created
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    /**
     * Timestamp when last updated
     */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    protected void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    @PrePersist
    protected void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    /**
     * Mark announcement as published
     */
    public void publish() {
        this.published = true;
        this.publishedAt = LocalDateTime.now();
    }

    /**
     * Check if announcement is expired
     */
    public boolean isExpired() {
        return expiresAt != null && LocalDateTime.now().isAfter(expiresAt);
    }

    /**
     * Target audience types for announcements
     */
    public enum TargetAudience {
        ALL_USERS,           // Everyone in the system
        ALL_STUDENTS,        // All students
        ALL_TEACHERS,        // All teachers
        SPECIFIC_CLASSES,    // Students in specific classes
        SPECIFIC_USERS       // Specific user IDs
    }
}