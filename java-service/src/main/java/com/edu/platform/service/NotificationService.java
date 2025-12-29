package com.edu.platform.service;

import com.edu.platform.dto.notification.NotificationDTO;
import com.edu.platform.model.Notification;
import com.edu.platform.model.User;
import com.edu.platform.model.enums.NotificationPriority;
import com.edu.platform.model.enums.NotificationType;
import com.edu.platform.repository.NotificationRepository;
import com.edu.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate; // ✅ For real-time WebSocket

    /**
     * ✅ ENHANCED: Create notification with real-time WebSocket broadcast
     */
    public Notification createNotification(
            Long userId,
            NotificationType type,
            NotificationPriority priority,
            String title,
            String message,
            String actionUrl,
            Long relatedEntityId,
            String relatedEntityType
    ) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .priority(priority)
                .title(title)
                .message(message)
                .actionUrl(actionUrl)
                .relatedEntityId(relatedEntityId)
                .relatedEntityType(relatedEntityType)
                .isRead(false)
                .build();

        notification = notificationRepository.save(notification);
        
        // ✅ Broadcast notification in real-time via WebSocket
        broadcastNotification(userId, notification);
        
        log.info("✅ Created and broadcasted notification {} for user {}", 
                notification.getId(), userId);
        
        return notification;
    }

    /**
     * ✅ ENHANCED: Create bulk notifications with real-time broadcast
     */
    public List<Notification> createBulkNotifications(
            List<Long> userIds,
            NotificationType type,
            NotificationPriority priority,
            String title,
            String message,
            String actionUrl,
            Long relatedEntityId,
            String relatedEntityType
    ) {
        List<Notification> notifications = new ArrayList<>();

        for (Long userId : userIds) {
            try {
                User user = userRepository.findById(userId)
                        .orElseThrow(() -> new RuntimeException("User not found: " + userId));

                Notification notification = Notification.builder()
                        .user(user)
                        .type(type)
                        .priority(priority)
                        .title(title)
                        .message(message)
                        .actionUrl(actionUrl)
                        .relatedEntityId(relatedEntityId)
                        .relatedEntityType(relatedEntityType)
                        .isRead(false)
                        .build();

                notifications.add(notification);
            } catch (Exception e) {
                log.error("❌ Failed to create notification for user {}: {}", 
                        userId, e.getMessage());
            }
        }

        List<Notification> savedNotifications = notificationRepository.saveAll(notifications);
        
        // ✅ Broadcast all notifications in real-time
        for (Notification notification : savedNotifications) {
            broadcastNotification(notification.getUser().getId(), notification);
        }
        
        log.info("✅ Created and broadcasted {} bulk notifications", savedNotifications.size());
        
        return savedNotifications;
    }

    /**
     * ✅ ENHANCED: Mark as read with real-time update
     */
    public Notification markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new RuntimeException("Notification not found or access denied"));

        if (!notification.isRead()) {
            notification.markAsRead();
            notification = notificationRepository.save(notification);
            
            // ✅ Broadcast read status update
            broadcastNotificationUpdate(userId, notification);
            
            // ✅ Broadcast updated unread count
            broadcastUnreadCount(userId);
        }
        return notification;
    }

    /**
     * ✅ ENHANCED: Mark all as read with real-time update
     */
    public int markAllAsRead(Long userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalse(userId);
        unread.forEach(Notification::markAsRead);
        notificationRepository.saveAll(unread);
        
        // ✅ Broadcast updated unread count
        broadcastUnreadCount(userId);
        
        log.info("✅ Marked {} notifications as read for user {}", unread.size(), userId);
        
        return unread.size();
    }

    /**
     * ✅ ENHANCED: Delete notification with real-time update
     */
    public void deleteNotification(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new RuntimeException("Notification not found or access denied"));

        notificationRepository.delete(notification);
        
        // ✅ Broadcast deletion
        broadcastNotificationDeletion(userId, notificationId);
        
        // ✅ Update unread count
        broadcastUnreadCount(userId);
        
        log.info("✅ Deleted notification {} for user {}", notificationId, userId);
    }

    /**
     * ✅ ENHANCED: Delete all with real-time update
     */
    public void deleteAllUserNotifications(Long userId) {
        notificationRepository.deleteByUserId(userId);
        broadcastUnreadCount(userId);
        log.info("✅ Deleted all notifications for user {}", userId);
    }

    // ==================== WEBSOCKET BROADCASTING ====================

    /**
     * ✅ Broadcast new notification to specific user
     */
    private void broadcastNotification(Long userId, Notification notification) {
        try {
            NotificationDTO dto = convertToDTO(notification);
            
            messagingTemplate.convertAndSend(
                "/topic/notifications.user." + userId,
                dto
            );
            
            // Also broadcast unread count update
            broadcastUnreadCount(userId);
            
            log.debug("📡 Broadcasted notification {} to user {}", notification.getId(), userId);
        } catch (Exception e) {
            log.error("❌ Failed to broadcast notification: {}", e.getMessage());
        }
    }

    /**
     * ✅ Broadcast notification update (e.g., marked as read)
     */
    private void broadcastNotificationUpdate(Long userId, Notification notification) {
        try {
            NotificationDTO dto = convertToDTO(notification);
            
            messagingTemplate.convertAndSend(
                "/topic/notifications.user." + userId + ".update",
                dto
            );
            
            log.debug("📡 Broadcasted notification update {} to user {}", 
                    notification.getId(), userId);
        } catch (Exception e) {
            log.error("❌ Failed to broadcast notification update: {}", e.getMessage());
        }
    }

    /**
     * ✅ Broadcast notification deletion
     */
    private void broadcastNotificationDeletion(Long userId, Long notificationId) {
        try {
            messagingTemplate.convertAndSend(
                "/topic/notifications.user." + userId + ".delete",
                notificationId
            );
            
            log.debug("📡 Broadcasted notification deletion {} to user {}", 
                    notificationId, userId);
        } catch (Exception e) {
            log.error("❌ Failed to broadcast notification deletion: {}", e.getMessage());
        }
    }

    /**
     * ✅ Broadcast updated unread count
     */
    private void broadcastUnreadCount(Long userId) {
        try {
            long unreadCount = notificationRepository.countByUserIdAndIsReadFalse(userId);
            
            messagingTemplate.convertAndSend(
                "/topic/notifications.user." + userId + ".count",
                unreadCount
            );
            
            log.debug("📡 Broadcasted unread count {} to user {}", unreadCount, userId);
        } catch (Exception e) {
            log.error("❌ Failed to broadcast unread count: {}", e.getMessage());
        }
    }

    /**
     * ✅ Convert notification to DTO
     */
    private NotificationDTO convertToDTO(Notification notification) {
        return NotificationDTO.builder()
                .id(notification.getId())
                .type(notification.getType())
                .priority(notification.getPriority())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .actionUrl(notification.getActionUrl())
                .relatedEntityId(notification.getRelatedEntityId())
                .relatedEntityType(notification.getRelatedEntityType())
                .isRead(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .readAt(notification.getReadAt())
                .expiresAt(notification.getExpiresAt())
                .build();
    }

    // ==================== EXISTING READ-ONLY METHODS ====================

    @Transactional(readOnly = true)
    public Page<Notification> getUserNotifications(Long userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional(readOnly = true)
    public List<Notification> getRecentNotifications(Long userId) {
        return notificationRepository.findTop10ByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public Notification getNotificationById(Long notificationId, Long userId) {
        return notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new RuntimeException("Notification not found or access denied"));
    }

    @Transactional(readOnly = true)
    public Page<Notification> getNotificationsByType(
            Long userId, NotificationType type, Pageable pageable) {
        return notificationRepository.findByUserIdAndTypeOrderByCreatedAtDesc(userId, type, pageable);
    }

    public void cleanupOldNotifications(int daysOld) {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(daysOld);
        notificationRepository.deleteOldReadNotifications(cutoff);
    }

    public void deleteExpiredNotifications() {
        notificationRepository.deleteExpiredNotifications(LocalDateTime.now());
    }

    @Transactional(readOnly = true)
    public NotificationStats getNotificationStats(Long userId) {
        long unreadCount = notificationRepository.countByUserIdAndIsReadFalse(userId);
        long totalCount = notificationRepository.countNotificationsSince(
                userId, LocalDateTime.now().minusDays(30));

        return new NotificationStats(unreadCount, totalCount);
    }

    public record NotificationStats(long unreadCount, long totalLast30Days) {}
}