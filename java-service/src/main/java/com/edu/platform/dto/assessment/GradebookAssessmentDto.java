// src/main/java/com/edu/platform/dto/assessment/GradebookAssessmentDto.java

package com.edu.platform.dto.assessment;

import com.edu.platform.model.assessment.AssessmentType;
import lombok.*;
import java.time.LocalDateTime;

/**
 * DTO for gradebook assessments (QUIZ, CLASSWORK, TEST1, TEST2, ASSIGNMENT, EXAM)
 * Includes access status based on due date
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GradebookAssessmentDto {
    
    // ========================================
    // BASIC ASSESSMENT INFO
    // ========================================
    
    private Long id;
    private String title;
    private String description;
    private AssessmentType type;
    
    private Long subjectId;
    private String subjectName;
    private String subjectCode;
    
    private Long termId;
    private String termName;
    
    private Long createdById;
    private String createdByName;
    
    private Integer totalMarks;
    private Integer passingMarks;
    private Integer durationMinutes;
    private Integer questionCount;
    
    private Boolean autoGrade;
    private Boolean published;
    
    private LocalDateTime dueDate;
    private LocalDateTime createdAt;
    
    // ========================================
    // SUBMISSION STATUS
    // ========================================
    
    private Boolean hasSubmitted;
    private Long submissionId;
    private Double score;
    private Double percentage;
    private Boolean passed;
    private LocalDateTime submittedAt;
    private Boolean graded;
    
    // ========================================
    // ACCESS STATUS (Due Date Based)
    // ========================================
    
    /**
     * Access status: OPEN, DUE_SOON, OVERDUE, COMPLETED
     */
    private AccessStatus accessStatus;
    
    /**
     * How many hours until due date (negative if overdue)
     */
    private Long hoursUntilDue;
    
    /**
     * How many days until due date (negative if overdue)
     */
    private Long daysUntilDue;
    
    /**
     * Is the assessment currently accessible?
     */
    private Boolean isAccessible;
    
    /**
     * Human-readable time remaining/overdue message
     */
    private String timeMessage;
    
    /**
     * Weight percentage for gradebook (QUIZ=20%, EXAM=40%, etc.)
     */
    private Integer gradebookWeight;
    
    // ========================================
    // ENUMS
    // ========================================
    
    public enum AccessStatus {
        OPEN,          // More than 24 hours until due date
        DUE_SOON,      // Less than 24 hours until due date
        OVERDUE,       // Past due date and not submitted
        COMPLETED      // Already submitted
    }
    
    // ========================================
    // HELPER METHODS
    // ========================================
    
    /**
     * Get gradebook weight based on assessment type
     */
    public static Integer getGradebookWeight(AssessmentType type) {
        return switch (type) {
            case QUIZ -> 20;
            case CLASSWORK -> 10;
            case TEST1 -> 10;
            case TEST2 -> 10;
            case ASSIGNMENT -> 10;
            case EXAM -> 40;
            default -> 0;
        };
    }
    
    /**
     * Calculate access status based on due date and submission
     */
    public static AccessStatus calculateAccessStatus(
            LocalDateTime dueDate, 
            Boolean hasSubmitted, 
            LocalDateTime now) {
        
        if (hasSubmitted != null && hasSubmitted) {
            return AccessStatus.COMPLETED;
        }
        
        if (dueDate == null) {
            return AccessStatus.OPEN;
        }
        
        if (now.isAfter(dueDate)) {
            return AccessStatus.OVERDUE;
        }
        
        long hoursUntil = java.time.Duration.between(now, dueDate).toHours();
        if (hoursUntil < 24) {
            return AccessStatus.DUE_SOON;
        }
        
        return AccessStatus.OPEN;
    }
    
    /**
     * Generate time message
     */
    public static String generateTimeMessage(
            LocalDateTime dueDate, 
            Boolean hasSubmitted, 
            LocalDateTime now) {
        
        if (hasSubmitted != null && hasSubmitted) {
            return "Completed";
        }
        
        if (dueDate == null) {
            return "No due date";
        }
        
        long days = java.time.Duration.between(now, dueDate).toDays();
        long hours = java.time.Duration.between(now, dueDate).toHours();
        
        if (days > 1) {
            return "Due in " + days + " days";
        } else if (days == 1) {
            return "Due tomorrow";
        } else if (hours > 0) {
            return "Due in " + hours + " hours";
        } else if (hours == 0) {
            return "Due now";
        } else {
            long overdueDays = Math.abs(days);
            if (overdueDays > 1) {
                return overdueDays + " days overdue";
            } else {
                long overdueHours = Math.abs(hours);
                return overdueHours + " hours overdue";
            }
        }
    }
}