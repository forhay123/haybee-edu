package com.edu.platform.dto.chat;

import com.edu.platform.model.chat.MessageStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for message delivery status updates.
 * Used for real-time status synchronization (WebSocket events).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageDeliveryDTO {
    private Long messageId;
    private Long roomId;
    private MessageStatus status;
    private String readBy; // Comma-separated user IDs
    private LocalDateTime statusChangedAt; // ✅ Added: When status changed
}