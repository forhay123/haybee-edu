package com.edu.platform.dto.chat;

import com.edu.platform.model.chat.ChatRoomType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Lightweight DTO for chat room lists (sidebar/overview).
 * Contains only essential information to minimize data transfer.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRoomSummaryDTO {
    private Long id;
    private ChatRoomType type;
    private String displayName; // Either className, otherUserName, or custom name
    private String lastMessage;
    private LocalDateTime lastMessageAt;
    private Long unreadCount;
    private Boolean isActive;
}