package com.edu.platform.dto.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for editing an existing message.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EditMessageRequest {
    
    @NotNull(message = "Message ID is required")
    private Long messageId;
    
    @NotBlank(message = "New content cannot be empty")
    @Size(max = 5000, message = "Message content cannot exceed 5000 characters")
    private String newContent;
}