package com.edu.platform.dto.chat;

import com.edu.platform.model.chat.ChatRoomType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for chat room information.
 * Contains all room details plus computed fields for UI display.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRoomDTO {
    private Long id;
    private ChatRoomType type;
    private String name;
    private Long classId;
    private String className; // ✅ Added for convenience
    private Long user1Id;
    private Long user2Id;
    private String lastMessage;
    private LocalDateTime lastMessageAt;
    private Long unreadCount;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // For display purposes (direct chats)
    private String otherUserName;
    private String otherUserEmail; // ✅ Added for convenience
    private String otherUserAvatar; // Note: User entity doesn't have this field yet
}