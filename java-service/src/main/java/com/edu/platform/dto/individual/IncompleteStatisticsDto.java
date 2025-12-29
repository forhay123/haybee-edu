package com.edu.platform.dto.individual;

import lombok.*;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

/**
 * DTO for incomplete lesson statistics
 * SPRINT 11: Incomplete Tracking
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IncompleteStatisticsDto {

    /**
     * Date range for statistics
     */
    private LocalDate startDate;
    private LocalDate endDate;

    /**
     * Overall statistics
     */
    private long totalLessons;
    private long totalIncomplete;
    private long totalCompleted;
    private double incompletePercentage;
    private double completionRate;

    /**
     * Incomplete by reason
     */
    @Builder.Default
    private Map<String, Long> incompleteByReason = new HashMap<>();

    /**
     * Incomplete by urgency level
     */
    private long lowUrgency;      // 0 days overdue
    private long mediumUrgency;   // 1-3 days overdue
    private long highUrgency;     // 4-7 days overdue
    private long criticalUrgency; // 8+ days overdue

    /**
     * Multi-period statistics
     */
    private long multiPeriodIncomplete;
    private long singlePeriodIncomplete;

    /**
     * Assessment-related statistics
     */
    private long missedAssessmentDeadlines;
    private long noSubmissions;
    private long topicNotAssigned;

    /**
     * Subject breakdown
     */
    private long affectedSubjectsCount;
    private long affectedStudentsCount;
    private long affectedWeeksCount;

    /**
     * Trend data (comparison with previous period)
     */
    private TrendData trend;

    /**
     * Inner class for trend comparison
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TrendData {
        private long previousPeriodIncomplete;
        private long currentPeriodIncomplete;
        private long change;
        private double changePercentage;
        private String trendDirection; // "UP", "DOWN", "STABLE"
    }

    /**
     * Calculate incomplete percentage
     */
    public void calculatePercentages() {
        if (totalLessons > 0) {
            incompletePercentage = (totalIncomplete * 100.0) / totalLessons;
            completionRate = (totalCompleted * 100.0) / totalLessons;
        } else {
            incompletePercentage = 0.0;
            completionRate = 0.0;
        }
    }

    /**
     * Get urgency summary
     */
    public String getUrgencySummary() {
        return String.format("Low: %d, Medium: %d, High: %d, Critical: %d",
            lowUrgency, mediumUrgency, highUrgency, criticalUrgency);
    }

    /**
     * Get most common incomplete reason
     */
    public String getMostCommonReason() {
        if (incompleteByReason.isEmpty()) {
            return "None";
        }
        return incompleteByReason.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse("Unknown");
    }
}