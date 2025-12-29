package com.edu.platform.dto.progress;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * DTO for incomplete lessons report
 * Groups incomplete lessons by reason and provides detailed information
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncompleteLessonsReport {
    
    /**
     * Student profile ID
     */
    private Long studentId;
    
    /**
     * Student's full name
     */
    private String studentName;
    
    /**
     * Total number of incomplete lessons
     */
    private int totalIncomplete;
    
    /**
     * Incomplete lessons grouped by reason
     * Keys: "MISSED_GRACE_PERIOD", "LATE_SUBMISSION", "NO_SUBMISSION", etc.
     * Values: List of incomplete lesson details
     */
    private Map<String, List<IncompleteLessonDto>> incompleteByReason;
    
    /**
     * Start date of report range (optional)
     */
    private LocalDate fromDate;
    
    /**
     * End date of report range (optional)
     */
    private LocalDate toDate;
    
    /**
     * Individual incomplete lesson details
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IncompleteLessonDto {
        
        /**
         * Progress record ID
         */
        private Long progressId;
        
        /**
         * Lesson topic ID
         */
        private Long lessonTopicId;
        
        /**
         * Lesson topic title
         */
        private String lessonTopicTitle;
        
        /**
         * Subject name
         */
        private String subjectName;
        
        /**
         * Date lesson was scheduled
         */
        private LocalDate scheduledDate;
        
        /**
         * Period number
         */
        private Integer periodNumber;
        
        /**
         * Reason why marked incomplete
         * Values: "MISSED_GRACE_PERIOD", "LATE_SUBMISSION", "NO_SUBMISSION"
         */
        private String incompleteReason;
        
        /**
         * When automatically marked as incomplete
         */
        private LocalDateTime autoMarkedIncompleteAt;
        
        /**
         * When assessment window started
         */
        private LocalDateTime assessmentWindowStart;
        
        /**
         * When assessment window ended
         */
        private LocalDateTime assessmentWindowEnd;
        
        /**
         * Whether student can still complete this lesson
         * (Usually false after grace period expires)
         */
        private boolean canStillComplete;
    }
    
    /**
     * Summary statistics for incomplete reasons
     * (Optional - for future analytics)
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IncompleteReasonSummary {
        
        /**
         * Reason code
         */
        private String reason;
        
        /**
         * Count of lessons with this reason
         */
        private int count;
        
        /**
         * Percentage of total incomplete lessons
         */
        private double percentage;
    }
}