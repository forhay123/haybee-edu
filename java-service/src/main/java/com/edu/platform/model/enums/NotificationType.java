package com.edu.platform.model.enums;

/**
 * Types of notifications that can be sent to users.
 * Each type represents a different system event.
 */
public enum NotificationType {
    /**
     * Assessment has been published and is now available to students
     */
    ASSESSMENT_PUBLISHED,
    
    /**
     * Assessment is due within 24 hours
     */
    ASSESSMENT_DUE_SOON,
    
    /**
     * Student's submission has been graded
     */
    GRADE_RELEASED,
    
    /**
     * Teacher received a new submission from student
     */
    SUBMISSION_RECEIVED,
    
    /**
     * System-wide or class-wide announcement
     */
    ANNOUNCEMENT,
    
    /**
     * Live class has been scheduled
     */
    LIVE_CLASS_SCHEDULED,
    
    /**
     * Live class is starting in 10 minutes
     */
    LIVE_CLASS_STARTING,
    
    /**
     * New chat message received (for future use)
     */
    CHAT_MESSAGE,
    
    /**
     * General system alert or important notice
     */
    SYSTEM_ALERT
}