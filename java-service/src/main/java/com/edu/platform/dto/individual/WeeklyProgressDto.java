package com.edu.platform.dto.individual;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * DTO for weekly progress summary
 * SPRINT 12: Reporting & Analytics
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WeeklyProgressDto {

    /**
     * Week information
     */
    private Integer weekNumber;
    private LocalDate weekStartDate;
    private LocalDate weekEndDate;
    private String termName;

    /**
     * Student information
     */
    private Long studentId;
    private String studentName;
    private String studentEmail;

    /**
     * Overall statistics
     */
    private int totalScheduledLessons;
    private int completedLessons;
    private int incompleteLessons;
    private int pendingLessons;
    private double completionRate;

    /**
     * Assessment statistics
     */
    private int totalAssessments;
    private int completedAssessments;
    private int pendingAssessments;
    private int missedAssessments;
    private BigDecimal averageScore;
    private BigDecimal highestScore;
    private BigDecimal lowestScore;

    /**
     * Subject-wise breakdown
     */
    @Builder.Default
    private Map<String, SubjectWeeklyProgress> subjectProgress = new HashMap<>();

    /**
     * Daily breakdown
     */
    @Builder.Default
    private List<DailyProgress> dailyProgress = new ArrayList<>();

    /**
     * Multi-period topic tracking
     */
    private int multiPeriodTopicsStarted;
    private int multiPeriodTopicsCompleted;
    private int multiPeriodTopicsPending;

    /**
     * Incomplete breakdown
     */
    @Builder.Default
    private Map<String, Integer> incompleteByReason = new HashMap<>();

    /**
     * Time tracking
     */
    private int totalScheduledHours;
    private int completedHours;

    /**
     * Performance indicators
     */
    private String performanceLevel; // "EXCELLENT", "GOOD", "AVERAGE", "NEEDS_IMPROVEMENT"
    private double attendanceRate;
    private double assessmentCompletionRate;

    /**
     * Comparison with previous week
     */
    private WeekComparison comparison;

    /**
     * Flags and alerts
     */
    private boolean hasIncompletes;
    private boolean hasMissedDeadlines;
    private boolean needsAttention;
    
    @Builder.Default
    private List<String> alerts = new ArrayList<>();

    /**
     * Inner class for subject weekly progress
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SubjectWeeklyProgress {
        private Long subjectId;
        private String subjectName;
        private int totalLessons;
        private int completedLessons;
        private int incompleteLessons;
        private BigDecimal averageScore;
        private double completionRate;
    }

    /**
     * Inner class for daily progress
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DailyProgress {
        private LocalDate date;
        private String dayOfWeek;
        private int scheduledLessons;
        private int completedLessons;
        private int incompleteLessons;
        private double completionRate;
    }

    /**
     * Inner class for week comparison
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WeekComparison {
        private Integer previousWeekNumber;
        private int completionRateChange;
        private BigDecimal averageScoreChange;
        private int completedLessonsChange;
        private String trend; // "IMPROVING", "DECLINING", "STABLE"
    }

    /**
     * Calculate completion rate
     */
    public void calculateCompletionRate() {
        if (totalScheduledLessons > 0) {
            this.completionRate = (completedLessons * 100.0) / totalScheduledLessons;
        } else {
            this.completionRate = 0.0;
        }
    }

    /**
     * Calculate assessment completion rate
     */
    public void calculateAssessmentCompletionRate() {
        if (totalAssessments > 0) {
            this.assessmentCompletionRate = (completedAssessments * 100.0) / totalAssessments;
        } else {
            this.assessmentCompletionRate = 0.0;
        }
    }

    /**
     * Determine performance level based on completion rate and average score
     */
    public void determinePerformanceLevel() {
        if (completionRate >= 90 && (averageScore != null && averageScore.doubleValue() >= 80)) {
            this.performanceLevel = "EXCELLENT";
        } else if (completionRate >= 75 && (averageScore != null && averageScore.doubleValue() >= 70)) {
            this.performanceLevel = "GOOD";
        } else if (completionRate >= 60) {
            this.performanceLevel = "AVERAGE";
        } else {
            this.performanceLevel = "NEEDS_IMPROVEMENT";
        }
    }

    /**
     * Check if needs attention
     */
    public void checkNeedsAttention() {
        this.needsAttention = completionRate < 70 || 
                              incompleteLessons > 3 || 
                              missedAssessments > 2 ||
                              (averageScore != null && averageScore.doubleValue() < 60);
    }

    /**
     * Add alert
     */
    public void addAlert(String alert) {
        this.alerts.add(alert);
    }

    /**
     * Get summary text
     */
    public String getSummary() {
        return String.format("Week %d: %d/%d lessons completed (%.1f%%), Average score: %.1f%%",
                weekNumber, completedLessons, totalScheduledLessons, completionRate,
                averageScore != null ? averageScore.doubleValue() : 0.0);
    }
}