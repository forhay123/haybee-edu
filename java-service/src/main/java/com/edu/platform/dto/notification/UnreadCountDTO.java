package com.edu.platform.dto.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for unread notification count.
 * Used by the notification bell badge to show the count.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnreadCountDTO {
    
    /**
     * Number of unread notifications
     */
    private long count;
    
    /**
     * User ID (for reference)
     */
    private Long userId;
}