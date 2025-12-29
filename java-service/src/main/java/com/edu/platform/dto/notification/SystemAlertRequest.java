
package com.edu.platform.dto.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for system alerts (simpler, always high priority)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemAlertRequest {
    
    private String title;
    private String message;
    private String actionUrl;
    private LocalDateTime expiresAt;
    
    /**
     * Validate the request
     */
    public void validate() {
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Title is required");
        }
        if (message == null || message.trim().isEmpty()) {
            throw new IllegalArgumentException("Message is required");
        }
    }
}