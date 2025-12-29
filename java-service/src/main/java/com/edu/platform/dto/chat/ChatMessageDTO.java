package com.edu.platform.dto.chat;

import com.edu.platform.model.chat.MessageStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for chat message information.
 * Contains message details plus metadata for UI rendering.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageDTO {
    private Long id;
    private Long roomId;
    private Long senderId;
    private String senderName;
    private String content;
    private MessageStatus status;
    private Boolean isEdited;
    private Long replyToId;
    private String replyToContent; // ✅ Added: Preview of replied message
    private String replyToSenderName; // ✅ Added: Who sent the replied message
    private String attachmentUrl;
    private String attachmentType; // ✅ Added: "image", "document", "video", etc.
    private String readBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // For display
    private Boolean isOwnMessage;
}