package com.edu.platform.model.chat;

import com.edu.platform.model.ClassEntity;
import com.edu.platform.model.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Represents a chat room for communication between users.
 * Can be either a direct message (1-on-1) or a class group chat.
 */
@Entity
@Table(
    name = "chat_rooms",
    schema = "core",
    indexes = {
        @Index(name = "idx_chat_room_type", columnList = "type"),
        @Index(name = "idx_chat_room_class_id", columnList = "class_id"),
        @Index(name = "idx_chat_room_users", columnList = "user1_id, user2_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Type of chat room (DIRECT, CLASS_GROUP)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private ChatRoomType type;

    /**
     * Optional name for the chat room (mainly for group chats)
     */
    @Column(name = "name", length = 200)
    private String name;

    /**
     * Reference to class if this is a class group chat
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id")
    private ClassEntity classEntity;

    /**
     * First user in direct message (ignored for group chats)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user1_id")
    private User user1;

    /**
     * Second user in direct message (ignored for group chats)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user2_id")
    private User user2;

    /**
     * Preview of the last message sent in this room
     */
    @Column(name = "last_message", columnDefinition = "TEXT")
    private String lastMessage;

    /**
     * Timestamp of the last message
     */
    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;

    /**
     * Whether this chat room is active
     */
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    /**
     * Timestamp when the chat room was created
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Timestamp when the chat room was last updated
     */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.updatedAt == null) {
            this.updatedAt = LocalDateTime.now();
        }
        if (this.isActive == null) {
            this.isActive = true;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Helper method to get class ID without loading the entire entity
     */
    public Long getClassId() {
        return classEntity != null ? classEntity.getId() : null;
    }

    /**
     * Helper method to get user1 ID without loading the entire entity
     */
    public Long getUser1Id() {
        return user1 != null ? user1.getId() : null;
    }

    /**
     * Helper method to get user2 ID without loading the entire entity
     */
    public Long getUser2Id() {
        return user2 != null ? user2.getId() : null;
    }
}
