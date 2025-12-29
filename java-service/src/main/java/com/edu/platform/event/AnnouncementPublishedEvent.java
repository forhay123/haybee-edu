package com.edu.platform.event;

import com.edu.platform.model.Announcement;
import com.edu.platform.model.enums.NotificationType;

import java.util.List;

/**
 * Event fired when an announcement is published
 * Creates notifications for all target users
 */
public class AnnouncementPublishedEvent extends NotificationEvent {

    private final Announcement announcement;

    private AnnouncementPublishedEvent(
            Long userId,
            Announcement announcement) {
        super(
            userId,
            NotificationType.ANNOUNCEMENT,
            announcement.getPriority(),
            announcement.getTitle(),
            announcement.getMessage(),
            announcement.getActionUrl(),
            announcement.getId(),
            "ANNOUNCEMENT",
            announcement.getExpiresAt()
        );
        this.announcement = announcement;
    }

    public Announcement getAnnouncement() {
        return announcement;
    }

    /**
     * Factory method to create events for multiple users
     */
    public static List<AnnouncementPublishedEvent> forUsers(
            Announcement announcement,
            List<Long> userIds) {
        return userIds.stream()
                .map(userId -> new AnnouncementPublishedEvent(userId, announcement))
                .toList();
    }

    /**
     * Factory method to create event for a single user
     */
    public static AnnouncementPublishedEvent forUser(Announcement announcement, Long userId) {
        return new AnnouncementPublishedEvent(userId, announcement);
    }
}