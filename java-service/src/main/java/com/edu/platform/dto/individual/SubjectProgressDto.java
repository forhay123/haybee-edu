package com.edu.platform.dto.individual;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * DTO for subject-specific progress tracking
 * SPRINT 12: Reporting & Analytics
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubjectProgressDto {

    /**
     * Subject information
     */
    private Long subjectId;
    private String subjectName;
    private String subjectCode; // Maps to Subject.code field
    private String teacherName;
    private Long teacherId;

    /**
     * Student information
     */
    private Long studentId;
    private String studentName;
    private String studentEmail;

    /**
     * Time period
     */
    private LocalDate startDate;
    private LocalDate endDate;
    private String periodDescription;

    /**
     * Overall statistics
     */
    private int totalLessonsScheduled;
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
    private String currentGrade;

    /**
     * Topic-wise breakdown
     */
    @Builder.Default
    private List<TopicProgress> topicProgress = new ArrayList<>();

    /**
     * Weekly breakdown
     */
    @Builder.Default
    private List<WeeklySubjectProgress> weeklyBreakdown = new ArrayList<>();

    /**
     * Performance trends
     */
    private String performanceTrend; // "IMPROVING", "DECLINING", "STABLE"
    private double trendPercentage;
    
    /**
     * Multi-period topic statistics
     */
    private int multiPeriodTopics;
    private int multiPeriodTopicsCompleted;
    private int multiPeriodTopicsInProgress;
    private double multiPeriodCompletionRate;

    /**
     * Time tracking
     */
    private int totalScheduledHours;
    private int completedHours;
    private double timeEfficiency;

    /**
     * Incomplete breakdown
     */
    @Builder.Default
    private Map<String, Integer> incompleteByReason = new HashMap<>();

    /**
     * Attendance and engagement
     */
    private double attendanceRate;
    private int consecutiveLessonsCompleted;
    private int longestCompletionStreak;
    private LocalDate lastLessonDate;
    private LocalDate nextLessonDate;

    /**
     * Comparison with class average (if available)
     */
    private ClassComparison classComparison;

    /**
     * Areas of strength and improvement
     */
    @Builder.Default
    private List<String> strengths = new ArrayList<>();
    
    @Builder.Default
    private List<String> areasForImprovement = new ArrayList<>();

    /**
     * Predictions
     */
    private String projectedGrade;
    private double projectedFinalScore;
    private boolean onTrackForSuccess;

    /**
     * Alerts and warnings
     */
    @Builder.Default
    private List<String> alerts = new ArrayList<>();

    /**
     * Inner class for topic progress
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TopicProgress {
        private Long topicId;
        private String topicTitle;
        private Integer weekNumber;
        private LocalDate scheduledDate;
        private int totalPeriods;
        private int completedPeriods;
        private boolean fullyCompleted;
        private BigDecimal averageScore;
        private String status; // "COMPLETED", "IN_PROGRESS", "PENDING", "INCOMPLETE"
        private String incompleteReason;
    }

    /**
     * Inner class for weekly subject progress
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WeeklySubjectProgress {
        private Integer weekNumber;
        private LocalDate weekStartDate;
        private LocalDate weekEndDate;
        private int lessonsScheduled;
        private int lessonsCompleted;
        private int lessonsIncomplete;
        private double completionRate;
        private BigDecimal averageScore;
        private String status;
    }

    /**
     * Inner class for class comparison
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ClassComparison {
        private BigDecimal classAverageScore;
        private double classCompletionRate;
        private BigDecimal scoreDifference;
        private double completionRateDifference;
        private String performanceLevel; // "ABOVE_AVERAGE", "AVERAGE", "BELOW_AVERAGE"
        private int classRank;
        private int totalStudents;
    }

    /**
     * Calculate completion rate
     */
    public void calculateCompletionRate() {
        if (totalLessonsScheduled > 0) {
            this.completionRate = (completedLessons * 100.0) / totalLessonsScheduled;
        } else {
            this.completionRate = 0.0;
        }
    }

    /**
     * Calculate multi-period completion rate
     */
    public void calculateMultiPeriodCompletionRate() {
        if (multiPeriodTopics > 0) {
            this.multiPeriodCompletionRate = (multiPeriodTopicsCompleted * 100.0) / multiPeriodTopics;
        } else {
            this.multiPeriodCompletionRate = 0.0;
        }
    }

    /**
     * Determine grade from average score
     */
    public void determineGrade() {
        if (averageScore == null) {
            this.currentGrade = "N/A";
            return;
        }
        
        double score = averageScore.doubleValue();
        if (score >= 95) this.currentGrade = "A+";
        else if (score >= 90) this.currentGrade = "A";
        else if (score >= 85) this.currentGrade = "B+";
        else if (score >= 80) this.currentGrade = "B";
        else if (score >= 75) this.currentGrade = "C+";
        else if (score >= 70) this.currentGrade = "C";
        else if (score >= 60) this.currentGrade = "D";
        else this.currentGrade = "F";
    }

    /**
     * Determine performance trend
     */
    public void determinePerformanceTrend() {
        if (weeklyBreakdown.size() < 2) {
            this.performanceTrend = "INSUFFICIENT_DATA";
            this.trendPercentage = 0.0;
            return;
        }

        // Compare last week vs previous week
        WeeklySubjectProgress lastWeek = weeklyBreakdown.get(weeklyBreakdown.size() - 1);
        WeeklySubjectProgress previousWeek = weeklyBreakdown.get(weeklyBreakdown.size() - 2);

        double lastScore = lastWeek.getAverageScore() != null ? lastWeek.getAverageScore().doubleValue() : 0.0;
        double prevScore = previousWeek.getAverageScore() != null ? previousWeek.getAverageScore().doubleValue() : 0.0;

        double difference = lastScore - prevScore;
        this.trendPercentage = difference;

        if (difference > 5) {
            this.performanceTrend = "IMPROVING";
        } else if (difference < -5) {
            this.performanceTrend = "DECLINING";
        } else {
            this.performanceTrend = "STABLE";
        }
    }

    /**
     * Check if on track for success
     */
    public void checkOnTrack() {
        this.onTrackForSuccess = completionRate >= 75 && 
                                 (averageScore != null && averageScore.doubleValue() >= 65) &&
                                 missedAssessments <= 3;
    }

    /**
     * Add strength
     */
    public void addStrength(String strength) {
        this.strengths.add(strength);
    }

    /**
     * Add area for improvement
     */
    public void addAreaForImprovement(String area) {
        this.areasForImprovement.add(area);
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
        return String.format("%s: %d/%d lessons (%.1f%%), Grade: %s, Score: %.1f%%",
                subjectName, completedLessons, totalLessonsScheduled, completionRate,
                currentGrade, averageScore != null ? averageScore.doubleValue() : 0.0);
    }
}