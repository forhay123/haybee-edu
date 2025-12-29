package com.edu.platform.dto.chat;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for deleting a message.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeleteMessageRequest {
    
    @NotNull(message = "Message ID is required")
    private Long messageId;
    
    private Boolean deleteForEveryone; // true = delete for all, false = delete for self only
}