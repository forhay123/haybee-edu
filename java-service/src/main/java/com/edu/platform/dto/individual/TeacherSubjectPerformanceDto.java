package com.edu.platform.dto.individual;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * DTO for teacher's subject performance report
 * SPRINT 12: Reporting & Analytics
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherSubjectPerformanceDto {

    /**
     * Teacher information
     */
    private Long teacherId;
    private String teacherName;
    private String teacherEmail;

    /**
     * Subject information
     */
    private Long subjectId;
    private String subjectName;
    private String subjectCode; // Maps to Subject.code field

    /**
     * Time period
     */
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer weekNumber;
    private String periodDescription;

    /**
     * Student statistics
     */
    private int totalStudents;
    private int activeStudents;
    private int inactiveStudents;
    private int studentsAtRisk; // Low completion or failing

    /**
     * Overall performance
     */
    private int totalLessonsScheduled;
    private int totalLessonsCompleted;
    private int totalLessonsIncomplete;
    private double overallCompletionRate;
    private BigDecimal classAverageScore;
    private BigDecimal highestStudentAverage;
    private BigDecimal lowestStudentAverage;

    /**
     * Assessment statistics
     */
    private int totalAssessmentsGiven;
    private int totalAssessmentsCompleted;
    private int totalAssessmentsMissed;
    private double assessmentCompletionRate;

    /**
     * Student performance breakdown
     */
    @Builder.Default
    private List<StudentPerformanceSummary> studentPerformances = new ArrayList<>();

    /**
     * Topic-wise analysis
     */
    @Builder.Default
    private List<TopicPerformanceAnalysis> topicAnalysis = new ArrayList<>();

    /**
     * Weekly trends
     */
    @Builder.Default
    private List<WeeklyPerformanceTrend> weeklyTrends = new ArrayList<>();

    /**
     * Grade distribution
     */
    @Builder.Default
    private Map<String, Integer> gradeDistribution = new HashMap<>();

    /**
     * Incomplete reasons breakdown
     */
    @Builder.Default
    private Map<String, Integer> incompleteReasons = new HashMap<>();

    /**
     * Multi-period topic statistics
     */
    private int totalMultiPeriodTopics;
    private int completedMultiPeriodTopics;
    private double multiPeriodCompletionRate;

    /**
     * Teaching effectiveness metrics
     */
    private double studentEngagementRate;
    private double contentCompletionRate;
    private double assessmentSuccessRate;

    /**
     * Comparison with school average
     */
    private SchoolComparison schoolComparison;

    /**
     * Insights and recommendations
     */
    @Builder.Default
    private List<String> insights = new ArrayList<>();
    
    @Builder.Default
    private List<String> recommendations = new ArrayList<>();

    /**
     * Alerts and concerns
     */
    @Builder.Default
    private List<String> alerts = new ArrayList<>();

    /**
     * Inner class for student performance summary
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StudentPerformanceSummary {
        private Long studentId;
        private String studentName;
        private String className;
        private int lessonsCompleted;
        private int lessonsIncomplete;
        private double completionRate;
        private BigDecimal averageScore;
        private String currentGrade;
        private String performanceLevel; // "EXCELLENT", "GOOD", "AVERAGE", "AT_RISK"
        private boolean needsAttention;
    }

    /**
     * Inner class for topic performance analysis
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TopicPerformanceAnalysis {
        private Long topicId;
        private String topicTitle;
        private Integer weekNumber;
        private int studentsAssigned;
        private int studentsCompleted;
        private int studentsIncomplete;
        private double completionRate;
        private BigDecimal averageScore;
        private String difficultyLevel; // "EASY", "MODERATE", "CHALLENGING"
        private boolean isMultiPeriod;
    }

    /**
     * Inner class for weekly performance trend
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WeeklyPerformanceTrend {
        private Integer weekNumber;
        private LocalDate weekStartDate;
        private LocalDate weekEndDate;
        private int studentsActive;
        private int lessonsCompleted;
        private int lessonsIncomplete;
        private double completionRate;
        private BigDecimal averageScore;
        private String trend; // "IMPROVING", "DECLINING", "STABLE"
    }

    /**
     * Inner class for school comparison
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SchoolComparison {
        private BigDecimal schoolAverageScore;
        private double schoolCompletionRate;
        private BigDecimal scoreDifference;
        private double completionRateDifference;
        private String performanceLevel; // "ABOVE_AVERAGE", "AVERAGE", "BELOW_AVERAGE"
    }

    /**
     * Calculate overall completion rate
     */
    public void calculateOverallCompletionRate() {
        if (totalLessonsScheduled > 0) {
            this.overallCompletionRate = (totalLessonsCompleted * 100.0) / totalLessonsScheduled;
        } else {
            this.overallCompletionRate = 0.0;
        }
    }

    /**
     * Calculate assessment completion rate
     */
    public void calculateAssessmentCompletionRate() {
        if (totalAssessmentsGiven > 0) {
            this.assessmentCompletionRate = (totalAssessmentsCompleted * 100.0) / totalAssessmentsGiven;
        } else {
            this.assessmentCompletionRate = 0.0;
        }
    }

    /**
     * Calculate multi-period completion rate
     */
    public void calculateMultiPeriodCompletionRate() {
        if (totalMultiPeriodTopics > 0) {
            this.multiPeriodCompletionRate = (completedMultiPeriodTopics * 100.0) / totalMultiPeriodTopics;
        } else {
            this.multiPeriodCompletionRate = 0.0;
        }
    }

    /**
     * Calculate teaching effectiveness metrics
     */
    public void calculateEffectivenessMetrics() {
        // Engagement = % of students actively participating
        if (totalStudents > 0) {
            this.studentEngagementRate = (activeStudents * 100.0) / totalStudents;
        }

        // Content completion = overall completion rate
        this.contentCompletionRate = overallCompletionRate;

        // Assessment success = % of assessments with passing scores
        if (classAverageScore != null) {
            this.assessmentSuccessRate = Math.min(100.0, classAverageScore.doubleValue());
        }
    }

    /**
     * Add insight
     */
    public void addInsight(String insight) {
        this.insights.add(insight);
    }

    /**
     * Add recommendation
     */
    public void addRecommendation(String recommendation) {
        this.recommendations.add(recommendation);
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
        return String.format("%s - %s: %d students, %.1f%% completion, Avg: %.1f%%",
                teacherName, subjectName, totalStudents, overallCompletionRate,
                classAverageScore != null ? classAverageScore.doubleValue() : 0.0);
    }

    /**
     * Identify at-risk students
     */
    public List<StudentPerformanceSummary> getAtRiskStudents() {
        return studentPerformances.stream()
                .filter(s -> "AT_RISK".equals(s.getPerformanceLevel()) || s.isNeedsAttention())
                .toList();
    }

    /**
     * Identify top performers
     */
    public List<StudentPerformanceSummary> getTopPerformers() {
        return studentPerformances.stream()
                .filter(s -> "EXCELLENT".equals(s.getPerformanceLevel()))
                .toList();
    }
}