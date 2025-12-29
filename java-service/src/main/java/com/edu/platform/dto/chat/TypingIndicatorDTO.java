package com.edu.platform.dto.chat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for real-time typing indicator (WebSocket events).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TypingIndicatorDTO {
    private Long roomId;
    private Long userId;
    private String userName;
    private Boolean isTyping; // true = started typing, false = stopped typing
}