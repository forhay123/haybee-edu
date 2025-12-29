package com.edu.platform.repository;

import com.edu.platform.model.chat.ChatRoom;
import com.edu.platform.model.chat.ChatRoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for ChatRoom entity operations.
 * Uses proper entity relationships (user.id, classEntity.id) instead of raw IDs.
 */
@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {
    
    /**
     * Find all chat rooms accessible by a user (direct messages + class group chats)
     * FIXED: Uses proper entity navigation paths
     */
    @Query("SELECT r FROM ChatRoom r WHERE " +
           "(r.user1.id = :userId OR r.user2.id = :userId) " +
           "OR (r.type = 'CLASS' AND r.classEntity.id IN :classIds) " +
           "ORDER BY r.lastMessageAt DESC NULLS LAST")
    List<ChatRoom> findAllRoomsForUser(@Param("userId") Long userId, 
                                       @Param("classIds") List<Long> classIds);
    
    /**
     * Find direct message room between two users (bidirectional check)
     * FIXED: Uses proper entity navigation paths
     */
    @Query("SELECT r FROM ChatRoom r WHERE r.type = 'DIRECT' AND " +
           "((r.user1.id = :user1Id AND r.user2.id = :user2Id) OR " +
           "(r.user1.id = :user2Id AND r.user2.id = :user1Id))")
    Optional<ChatRoom> findDirectRoomBetweenUsers(@Param("user1Id") Long user1Id, 
                                                   @Param("user2Id") Long user2Id);
    
    /**
     * Find class group chat room by type and class ID
     * FIXED: Uses proper entity navigation path
     */
    @Query("SELECT r FROM ChatRoom r WHERE r.type = :type AND r.classEntity.id = :classId")
    Optional<ChatRoom> findByTypeAndClassId(@Param("type") ChatRoomType type, 
                                           @Param("classId") Long classId);
    
    /**
     * Find all active rooms for a user
     * FIXED: Uses proper entity navigation paths
     */
    @Query("SELECT r FROM ChatRoom r WHERE r.isActive = true AND " +
           "((r.user1.id = :userId OR r.user2.id = :userId) " +
           "OR (r.type = 'CLASS' AND r.classEntity.id IN :classIds)) " +
           "ORDER BY r.lastMessageAt DESC NULLS LAST")
    List<ChatRoom> findActiveRoomsForUser(@Param("userId") Long userId, 
                                          @Param("classIds") List<Long> classIds);
    
    /**
     * Find class group chat rooms by class IDs
     * FIXED: Uses proper entity navigation path
     */
    @Query("SELECT r FROM ChatRoom r WHERE r.type = :type AND r.classEntity.id IN :classIds")
    List<ChatRoom> findByTypeAndClassIdIn(@Param("type") ChatRoomType type, 
                                         @Param("classIds") List<Long> classIds);
}