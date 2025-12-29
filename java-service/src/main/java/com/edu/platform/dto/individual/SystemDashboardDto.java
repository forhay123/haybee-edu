package com.edu.platform.dto.individual;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * DTO for admin system dashboard
 * SPRINT 12: Reporting & Analytics
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemDashboardDto {

    /**
     * Report metadata
     */
    private LocalDateTime generatedAt;
    private LocalDate reportDate;
    private String reportPeriod;

    /**
     * Term information
     */
    private Long termId;
    private String termName;
    private Integer currentWeekNumber;
    private Integer totalWeeks;
    private double termProgress;

    /**
     * Student statistics
     */
    private int totalIndividualStudents;
    private int activeIndividualStudents;
    private int inactiveIndividualStudents;
    private int studentsWithTimetables;
    private int studentsWithoutTimetables;

    /**
     * Schedule statistics
     */
    private int totalSchedulesGenerated;
    private int schedulesThisWeek;
    private int schedulesCompleted;
    private int schedulesIncomplete;
    private int schedulesPending;
    private double overallCompletionRate;

    /**
     * Assessment statistics
     */
    private int totalAssessments;
    private int assessmentsCompleted;
    private int assessmentsPending;
    private int assessmentsMissed;
    private double assessmentCompletionRate;
    private BigDecimal systemAverageScore;

    /**
     * Multi-period statistics
     */
    private int totalMultiPeriodTopics;
    private int completedMultiPeriodTopics;
    private int inProgressMultiPeriodTopics;
    private double multiPeriodCompletionRate;

    /**
     * Missing topics
     */
    private int totalMissingTopics;
    private int studentsAffectedByMissingTopics;
    @Builder.Default
    private List<MissingTopicAlert> missingTopicAlerts = new ArrayList<>();

    /**
     * Schedule conflicts
     */
    private int totalConflicts;
    private int resolvedConflicts;
    private int unresolvedConflicts;
    @Builder.Default
    private List<ConflictAlert> conflictAlerts = new ArrayList<>();

    /**
     * Archival statistics
     */
    private int schedulesArchivedThisWeek;
    private int progressRecordsArchived;
    private long totalArchivedRecords;

    /**
     * Weekly generation statistics
     */
    private LocalDateTime lastGenerationTime;
    private LocalDateTime nextGenerationTime;
    private boolean lastGenerationSuccessful;
    private String lastGenerationError;
    private int studentsinLastGeneration;
    private int schedulesInLastGeneration;

    /**
     * Subject-wise breakdown
     */
    @Builder.Default
    private List<SubjectStatistics> subjectStatistics = new ArrayList<>();

    /**
     * Weekly trends
     */
    @Builder.Default
    private List<WeeklySystemTrend> weeklyTrends = new ArrayList<>();

    /**
     * Performance distribution
     */
    @Builder.Default
    private Map<String, Integer> gradeDistribution = new HashMap<>();
    
    @Builder.Default
    private Map<String, Integer> performanceLevelDistribution = new HashMap<>();

    /**
     * Incomplete reasons
     */
    @Builder.Default
    private Map<String, Integer> incompleteReasons = new HashMap<>();

    /**
     * System health indicators
     */
    private SystemHealth systemHealth;

    /**
     * Alerts and warnings
     */
    @Builder.Default
    private List<SystemAlert> systemAlerts = new ArrayList<>();

    /**
     * Recent activities
     */
    @Builder.Default
    private List<RecentActivity> recentActivities = new ArrayList<>();

    /**
     * Inner class for missing topic alert
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MissingTopicAlert {
        private Long subjectId;
        private String subjectName;
        private Integer weekNumber;
        private int studentsAffected;
        private String severity; // "HIGH", "MEDIUM", "LOW"
        private LocalDateTime detectedAt;
    }

    /**
     * Inner class for conflict alert
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ConflictAlert {
        private Long studentId;
        private String studentName;
        private String conflictType;
        private LocalDate conflictDate;
        private String description;
        private boolean resolved;
        private LocalDateTime detectedAt;
    }

    /**
     * Inner class for subject statistics
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SubjectStatistics {
        private Long subjectId;
        private String subjectName;
        private int studentsEnrolled;
        private int lessonsScheduled;
        private int lessonsCompleted;
        private double completionRate;
        private BigDecimal averageScore;
        private int missingTopics;
    }

    /**
     * Inner class for weekly system trend
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WeeklySystemTrend {
        private Integer weekNumber;
        private LocalDate weekStartDate;
        private LocalDate weekEndDate;
        private int activeStudents;
        private int schedulesGenerated;
        private int schedulesCompleted;
        private double completionRate;
        private BigDecimal averageScore;
        private String trend;
    }

    /**
     * Inner class for system health
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SystemHealth {
        private String overallStatus; // "HEALTHY", "WARNING", "CRITICAL"
        private double systemUptime;
        private int criticalIssues;
        private int warnings;
        private LocalDateTime lastHealthCheck;
        
        @Builder.Default
        private List<String> healthIndicators = new ArrayList<>();
    }

    /**
     * Inner class for system alert
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SystemAlert {
        private String alertType; // "ERROR", "WARNING", "INFO"
        private String category; // "MISSING_TOPICS", "CONFLICTS", "GENERATION", "PERFORMANCE"
        private String message;
        private String description;
        private LocalDateTime timestamp;
        private boolean acknowledged;
        private String severity;
    }

    /**
     * Inner class for recent activity
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RecentActivity {
        private String activityType;
        private String description;
        private String performedBy;
        private LocalDateTime timestamp;
        private String icon;
    }

    /**
     * Calculate term progress
     */
    public void calculateTermProgress() {
        if (totalWeeks != null && totalWeeks > 0 && currentWeekNumber != null) {
            this.termProgress = (currentWeekNumber * 100.0) / totalWeeks;
        } else {
            this.termProgress = 0.0;
        }
    }

    /**
     * Calculate overall completion rate
     */
    public void calculateOverallCompletionRate() {
        if (totalSchedulesGenerated > 0) {
            this.overallCompletionRate = (schedulesCompleted * 100.0) / totalSchedulesGenerated;
        } else {
            this.overallCompletionRate = 0.0;
        }
    }

    /**
     * Calculate assessment completion rate
     */
    public void calculateAssessmentCompletionRate() {
        if (totalAssessments > 0) {
            this.assessmentCompletionRate = (assessmentsCompleted * 100.0) / totalAssessments;
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
     * Determine system health status
     */
    public void determineSystemHealth() {
        int issues = 0;
        int warnings = 0;
        List<String> indicators = new ArrayList<>();

        // Check completion rate
        if (overallCompletionRate < 50) {
            issues++;
            indicators.add("Low completion rate: " + String.format("%.1f%%", overallCompletionRate));
        } else if (overallCompletionRate < 75) {
            warnings++;
            indicators.add("Moderate completion rate: " + String.format("%.1f%%", overallCompletionRate));
        } else {
            indicators.add("Good completion rate: " + String.format("%.1f%%", overallCompletionRate));
        }

        // Check missing topics
        if (totalMissingTopics > 10) {
            issues++;
            indicators.add("High missing topics: " + totalMissingTopics);
        } else if (totalMissingTopics > 0) {
            warnings++;
            indicators.add("Missing topics: " + totalMissingTopics);
        }

        // Check conflicts
        if (unresolvedConflicts > 5) {
            issues++;
            indicators.add("Many unresolved conflicts: " + unresolvedConflicts);
        } else if (unresolvedConflicts > 0) {
            warnings++;
            indicators.add("Unresolved conflicts: " + unresolvedConflicts);
        }

        // Check last generation
        if (!lastGenerationSuccessful) {
            issues++;
            indicators.add("Last generation failed");
        }

        String status = issues > 0 ? "CRITICAL" : (warnings > 0 ? "WARNING" : "HEALTHY");

        this.systemHealth = SystemHealth.builder()
                .overallStatus(status)
                .criticalIssues(issues)
                .warnings(warnings)
                .lastHealthCheck(LocalDateTime.now())
                .healthIndicators(indicators)
                .build();
    }

    /**
     * Add system alert
     */
    public void addAlert(String type, String category, String message, String severity) {
        SystemAlert alert = SystemAlert.builder()
                .alertType(type)
                .category(category)
                .message(message)
                .severity(severity)
                .timestamp(LocalDateTime.now())
                .acknowledged(false)
                .build();
        this.systemAlerts.add(alert);
    }

    /**
     * Add recent activity
     */
    public void addActivity(String type, String description, String performedBy, String icon) {
        RecentActivity activity = RecentActivity.builder()
                .activityType(type)
                .description(description)
                .performedBy(performedBy)
                .timestamp(LocalDateTime.now())
                .icon(icon)
                .build();
        this.recentActivities.add(activity);
    }

    /**
     * Get high-priority alerts
     */
    public List<SystemAlert> getHighPriorityAlerts() {
        return systemAlerts.stream()
                .filter(a -> "ERROR".equals(a.getAlertType()) || "CRITICAL".equals(a.getSeverity()))
                .filter(a -> !a.isAcknowledged())
                .toList();
    }

    /**
     * Get summary text
     */
    public String getSummary() {
        return String.format("Week %d/%d: %d students, %d schedules, %.1f%% completion, Avg: %.1f%%",
                currentWeekNumber, totalWeeks, totalIndividualStudents, totalSchedulesGenerated,
                overallCompletionRate, systemAverageScore != null ? systemAverageScore.doubleValue() : 0.0);
    }
}