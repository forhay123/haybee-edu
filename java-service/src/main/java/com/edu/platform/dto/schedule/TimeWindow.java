package com.edu.platform.dto.schedule;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO for time window calculations
 * Contains all time-related information for a lesson and its assessment
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimeWindow {
    
    /**
     * The date of the lesson
     */
    private LocalDate lessonDate;
    
    /**
     * Exact start date-time of the lesson
     */
    private LocalDateTime lessonStart;
    
    /**
     * Exact end date-time of the lesson
     */
    private LocalDateTime lessonEnd;
    
    /**
     * Grace period end time (lesson end + 30 minutes)
     */
    private LocalDateTime graceEnd;
    
    /**
     * When assessment becomes available
     * - SCHOOL: lesson start time
     * - HOME: 00:00 of lesson date
     */
    private LocalDateTime assessmentWindowStart;
    
    /**
     * When assessment expires
     * - SCHOOL: grace end time
     * - HOME: 23:59:59 of lesson date
     */
    private LocalDateTime assessmentWindowEnd;
    
    /**
     * Student type (for reference)
     */
    private String studentType;
    
    /**
     * Check if assessment is currently accessible
     */
    public boolean isAssessmentAccessible(LocalDateTime now) {
        return !now.isBefore(assessmentWindowStart) && !now.isAfter(assessmentWindowEnd);
    }
    
    /**
     * Check if grace period has expired
     */
    public boolean isGracePeriodExpired(LocalDateTime now) {
        return now.isAfter(graceEnd);
    }
    
    /**
     * Check if currently in grace period
     */
    public boolean isInGracePeriod(LocalDateTime now) {
        return now.isAfter(lessonEnd) && now.isBefore(graceEnd);
    }
}