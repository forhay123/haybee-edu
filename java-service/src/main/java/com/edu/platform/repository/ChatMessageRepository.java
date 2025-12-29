package com.edu.platform.repository;

import com.edu.platform.model.chat.ChatMessage;
import com.edu.platform.model.chat.MessageStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for ChatMessage entity operations.
 * Uses proper entity relationships (room.id, sender.id) instead of raw IDs.
 */
@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    
    /**
     * Find messages by room ID (paginated, newest first)
     * FIXED: Uses proper entity navigation path
     */
    @Query("SELECT m FROM ChatMessage m WHERE m.room.id = :roomId ORDER BY m.createdAt DESC")
    Page<ChatMessage> findByRoomIdOrderByCreatedAtDesc(@Param("roomId") Long roomId, 
                                                       Pageable pageable);
    
    /**
     * Find all messages in a room (non-paginated)
     * FIXED: Uses proper entity navigation path
     */
    @Query("SELECT m FROM ChatMessage m WHERE m.room.id = :roomId ORDER BY m.createdAt DESC")
    List<ChatMessage> findByRoomIdOrderByCreatedAtDesc(@Param("roomId") Long roomId);
    
    /**
     * Find messages since a specific timestamp
     * FIXED: Uses proper entity navigation path
     */
    @Query("SELECT m FROM ChatMessage m WHERE m.room.id = :roomId " +
           "AND m.createdAt > :since ORDER BY m.createdAt ASC")
    List<ChatMessage> findMessagesSince(@Param("roomId") Long roomId, 
                                        @Param("since") LocalDateTime since);
    
    /**
     * Count unread messages in a room for a specific user
     * FIXED: Uses proper entity navigation paths
     */
    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.room.id = :roomId " +
           "AND m.sender.id != :userId AND m.status != 'READ'")
    Long countUnreadMessages(@Param("roomId") Long roomId, 
                            @Param("userId") Long userId);
    
    /**
     * Mark all messages in a room as read (except user's own messages)
     * FIXED: Uses proper entity navigation paths
     */
    @Modifying
    @Query("UPDATE ChatMessage m SET m.status = :status WHERE m.room.id = :roomId " +
           "AND m.sender.id != :userId AND m.status != 'READ'")
    void markMessagesAsRead(@Param("roomId") Long roomId, 
                           @Param("userId") Long userId, 
                           @Param("status") MessageStatus status);
    
    /**
     * Find latest messages for multiple rooms (for room list preview)
     * FIXED: Uses proper entity navigation path
     */
    @Query("SELECT m FROM ChatMessage m WHERE m.room.id IN :roomIds " +
           "ORDER BY m.createdAt DESC")
    List<ChatMessage> findLatestMessagesByRoomIds(@Param("roomIds") List<Long> roomIds);
    
    /**
     * Count total unread messages across all rooms for a user
     */
    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.room.id IN " +
           "(SELECT r.id FROM ChatRoom r WHERE r.user1.id = :userId OR r.user2.id = :userId " +
           "OR r.classEntity.id IN :classIds) " +
           "AND m.sender.id != :userId AND m.status != 'READ'")
    Long countTotalUnreadMessages(@Param("userId") Long userId, 
                                  @Param("classIds") List<Long> classIds);
}