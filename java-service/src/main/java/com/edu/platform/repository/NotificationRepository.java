package com.edu.platform.repository;

import com.edu.platform.model.Notification;
import com.edu.platform.model.enums.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for Notification entity operations.
 * CORRECTED: Uses 'user.id' instead of 'userId' in method names.
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // ==================== READ OPERATIONS ====================

    /**
     * Get all notifications for a user, ordered by newest first (paginated)
     * FIXED: user_id → user.id in query derivation
     */
    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId ORDER BY n.createdAt DESC")
    Page<Notification> findByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId, Pageable pageable);

    /**
     * Get unread notification count for a user
     * FIXED: Uses explicit query instead of method name derivation
     */
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.user.id = :userId AND n.isRead = false")
    long countByUserIdAndIsReadFalse(@Param("userId") Long userId);

    /**
     * Get all unread notifications for a user
     * FIXED: Uses explicit query
     */
    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId AND n.isRead = false")
    List<Notification> findByUserIdAndIsReadFalse(@Param("userId") Long userId);

    /**
     * Get recent notifications (limited, for dropdown preview)
     * FIXED: Uses explicit query with LIMIT
     */
    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId ORDER BY n.createdAt DESC LIMIT 10")
    List<Notification> findTop10ByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId);

    /**
     * Get notification by ID and user ID (security check)
     * FIXED: Uses explicit query
     */
    @Query("SELECT n FROM Notification n WHERE n.id = :id AND n.user.id = :userId")
    Optional<Notification> findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    /**
     * Get notifications by type for a user (paginated)
     * FIXED: Uses explicit query
     */
    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId AND n.type = :type ORDER BY n.createdAt DESC")
    Page<Notification> findByUserIdAndTypeOrderByCreatedAtDesc(
        @Param("userId") Long userId, 
        @Param("type") NotificationType type, 
        Pageable pageable
    );

    /**
     * Get unread high-priority notifications
     */
    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId " +
           "AND n.isRead = false " +
           "AND n.priority = 'HIGH' " +
           "ORDER BY n.createdAt DESC")
    List<Notification> findUnreadHighPriorityNotifications(@Param("userId") Long userId);

    // ==================== DELETE OPERATIONS ====================

    /**
     * Delete old read notifications (cleanup job)
     */
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.isRead = true AND n.createdAt < :cutoffDate")
    void deleteOldReadNotifications(@Param("cutoffDate") LocalDateTime cutoffDate);

    /**
     * Delete expired notifications
     */
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.expiresAt IS NOT NULL AND n.expiresAt < :now")
    void deleteExpiredNotifications(@Param("now") LocalDateTime now);

    /**
     * Delete all notifications for a user
     * FIXED: Uses explicit query
     */
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);

    // ==================== STATISTICS ====================

    /**
     * Count notifications by type for a user
     */
    @Query("SELECT n.type, COUNT(n) FROM Notification n WHERE n.user.id = :userId GROUP BY n.type")
    List<Object[]> countNotificationsByType(@Param("userId") Long userId);

    /**
     * Get notification count for last N days
     */
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.user.id = :userId " +
           "AND n.createdAt >= :startDate")
    long countNotificationsSince(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate);
}