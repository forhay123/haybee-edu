package com.edu.platform.model.enums;

/**
 * Priority levels for notifications.
 * Determines visual styling and user attention level.
 */
public enum NotificationPriority {
    /**
     * Requires immediate attention.
     * Examples: Grade released, live class starting soon
     */
    HIGH,
    
    /**
     * Important but not urgent.
     * Examples: Assessment published, assignment due tomorrow
     */
    MEDIUM,
    
    /**
     * Informational only.
     * Examples: Submission received confirmation, system announcements
     */
    LOW
}