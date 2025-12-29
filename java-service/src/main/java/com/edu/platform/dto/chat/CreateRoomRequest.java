package com.edu.platform.dto.chat;

import com.edu.platform.model.chat.ChatRoomType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for creating or retrieving a chat room.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateRoomRequest {
    
    @NotNull(message = "Room type is required")
    private ChatRoomType type;
    
    private String name; // Optional: custom name for group chats
    
    // For CLASS type rooms
    private Long classId;
    
    // For DIRECT type rooms
    private Long otherUserId;
    
    /**
     * Validates that required fields are present based on room type
     */
    public void validate() {
        if (type == ChatRoomType.DIRECT && otherUserId == null) {
            throw new IllegalArgumentException("otherUserId is required for DIRECT room type");
        }
        if (type == ChatRoomType.CLASS && classId == null) {
            throw new IllegalArgumentException("classId is required for CLASS room type");
        }
    }
}