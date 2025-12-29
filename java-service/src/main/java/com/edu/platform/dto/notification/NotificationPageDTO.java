package com.edu.platform.dto.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for paginated notification response.
 * Contains a list of notifications plus pagination metadata.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPageDTO {
    
    /**
     * List of notifications for the current page
     */
    private List<NotificationDTO> notifications;
    
    /**
     * Current page number (0-indexed)
     */
    private int currentPage;
    
    /**
     * Total number of pages
     */
    private int totalPages;
    
    /**
     * Total number of notifications across all pages
     */
    private long totalItems;
    
    /**
     * Number of items per page
     */
    private int pageSize;
    
    /**
     * Whether there is a next page
     */
    private boolean hasNext;
    
    /**
     * Whether there is a previous page
     */
    private boolean hasPrevious;
}