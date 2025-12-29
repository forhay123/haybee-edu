package com.edu.platform.model.chat;

import com.edu.platform.model.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Represents an individual message within a chat room.
 */
@Entity
@Table(
    name = "chat_messages",
    schema = "core",
    indexes = {
        @Index(name = "idx_chat_message_room_id", columnList = "room_id"),
        @Index(name = "idx_chat_message_sender_id", columnList = "sender_id"),
        @Index(name = "idx_chat_message_created_at", columnList = "created_at"),
        @Index(name = "idx_chat_message_room_created", columnList = "room_id, created_at")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The chat room this message belongs to
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private ChatRoom room;

    /**
     * The user who sent this message
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    /**
     * Cached sender name for quick display (denormalized for performance)
     */
    @Column(name = "sender_name", length = 200)
    private String senderName;

    /**
     * The actual message content
     */
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    /**
     * Delivery status of the message
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private MessageStatus status = MessageStatus.SENT;

    /**
     * Whether this message has been edited
     */
    @Column(name = "is_edited", nullable = false)
    @Builder.Default
    private Boolean isEdited = false;

    /**
     * Reference to another message if this is a reply
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reply_to_id")
    private ChatMessage replyTo;

    /**
     * Cached content of the message being replied to (for performance)
     */
    @Column(name = "reply_to_content", columnDefinition = "TEXT")
    private String replyToContent;

    /**
     * Cached sender name of the message being replied to (for performance)
     */
    @Column(name = "reply_to_sender_name", length = 255)
    private String replyToSenderName;

    /**
     * URL to attached file (if any)
     */
    @Column(name = "attachment_url", length = 500)
    private String attachmentUrl;

    /**
     * MIME type of the attachment (e.g., "image/jpeg", "application/pdf")
     */
    @Column(name = "attachment_type", length = 50)
    private String attachmentType;

    /**
     * Comma-separated list of user IDs who have read this message
     * (For group chats, stored as: "123,456,789")
     */
    @Column(name = "read_by", columnDefinition = "TEXT")
    private String readBy;

    /**
     * Timestamp when the message was created
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Timestamp when the message was last updated (for edits)
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
        if (this.status == null) {
            this.status = MessageStatus.SENT;
        }
        if (this.isEdited == null) {
            this.isEdited = false;
        }
        // Cache sender name at creation
        if (this.senderName == null && this.sender != null) {
            this.senderName = this.sender.getFullName();
        }
        // Cache reply-to data at creation
        if (this.replyTo != null && this.replyToContent == null) {
            this.replyToContent = this.replyTo.getContent();
            this.replyToSenderName = this.replyTo.getSenderName();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Helper method to get room ID without loading the entire entity
     */
    public Long getRoomId() {
        return room != null ? room.getId() : null;
    }

    /**
     * Helper method to get sender ID without loading the entire entity
     */
    public Long getSenderId() {
        return sender != null ? sender.getId() : null;
    }

    /**
     * Helper method to get reply-to message ID without loading the entire entity
     */
    public Long getReplyToId() {
        return replyTo != null ? replyTo.getId() : null;
    }

    /**
     * Helper method to mark message as edited
     */
    public void markAsEdited() {
        this.isEdited = true;
        this.updatedAt = LocalDateTime.now();
    }
}