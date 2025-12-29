package com.edu.platform.dto.individual;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * DTO for term completion report
 * SPRINT 12: Reporting & Analytics
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TermCompletionDto {

    /**
     * Term information
     */
    private Long termId;
    private String termName;
    private LocalDate termStartDate;
    private LocalDate termEndDate;
    private int totalWeeks;
    private int completedWeeks;
    private int remainingWeeks;
    private boolean isActive;

    /**
     * Student information
     */
    private Long studentId;
    private String studentName;
    private String studentEmail;

    /**
     * Overall completion statistics
     */
    private int totalScheduledLessons;
    private int completedLessons;
    private int incompleteLessons;
    private int pendingLessons;
    private double overallCompletionRate;
    private double progressPercentage;

    /**
     * Assessment statistics
     */
    private int totalAssessments;
    private int completedAssessments;
    private int pendingAssessments;
    private int missedAssessments;
    private BigDecimal termAverageScore;
    private BigDecimal highestScore;
    private BigDecimal lowestScore;

    /**
     * Subject-wise completion
     */
    @Builder.Default
    private Map<String, SubjectCompletion> subjectCompletion = new HashMap<>();

    /**
     * Weekly progress summary
     */
    @Builder.Default
    private List<WeekSummary> weeklyProgress = new ArrayList<>();

    /**
     * Monthly breakdown
     */
    @Builder.Default
    private List<MonthlyBreakdown> monthlyBreakdown = new ArrayList<>();

    /**
     * Performance metrics
     */
    private String overallGrade;
    private String performanceLevel;
    private double attendanceRate;
    private double assessmentCompletionRate;
    private double timeEfficiency;

    /**
     * Incomplete analysis
     */
    private int totalIncomplete;
    
    @Builder.Default
    private Map<String, Integer> incompleteByReason = new HashMap<>();
    
    @Builder.Default
    private Map<String, Integer> incompleteBySubject = new HashMap<>();

    /**
     * Milestones and achievements
     */
    @Builder.Default
    private List<Milestone> milestones = new ArrayList<>();
    
    @Builder.Default
    private List<String> achievements = new ArrayList<>();

    /**
     * Areas needing improvement
     */
    @Builder.Default
    private List<String> areasForImprovement = new ArrayList<>();

    /**
     * Predictions and projections
     */
    private ProjectedCompletion projection;

    /**
     * Comparison with term goals
     */
    private TermGoalsComparison goalsComparison;

    /**
     * Inner class for subject completion
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SubjectCompletion {
        private Long subjectId;
        private String subjectName;
        private int totalLessons;
        private int completedLessons;
        private int incompleteLessons;
        private double completionRate;
        private BigDecimal averageScore;
        private String grade;
        private boolean onTrack;
    }

    /**
     * Inner class for week summary
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WeekSummary {
        private Integer weekNumber;
        private LocalDate weekStartDate;
        private LocalDate weekEndDate;
        private int lessonsCompleted;
        private int lessonsIncomplete;
        private BigDecimal weeklyAverageScore;
        private double completionRate;
        private String status; // "COMPLETED", "IN_PROGRESS", "PENDING"
    }

    /**
     * Inner class for monthly breakdown
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MonthlyBreakdown {
        private String month;
        private int year;
        private int totalLessons;
        private int completedLessons;
        private int incompleteLessons;
        private double completionRate;
        private BigDecimal averageScore;
    }

    /**
     * Inner class for milestones
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Milestone {
        private String title;
        private String description;
        private LocalDate achievedDate;
        private String category; // "COMPLETION", "PERFORMANCE", "CONSISTENCY"
    }

    /**
     * Inner class for projected completion
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProjectedCompletion {
        private double projectedCompletionRate;
        private BigDecimal projectedAverageScore;
        private int estimatedIncompleteLessons;
        private boolean likelyToMeetGoals;
        private String recommendation;
    }

    /**
     * Inner class for term goals comparison
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TermGoalsComparison {
        private double targetCompletionRate;
        private double actualCompletionRate;
        private double completionRateDifference;
        private BigDecimal targetAverageScore;
        private BigDecimal actualAverageScore;
        private BigDecimal scoreDifference;
        private boolean metCompletionGoal;
        private boolean metScoreGoal;
    }

    /**
     * Calculate overall completion rate
     */
    public void calculateOverallCompletionRate() {
        if (totalScheduledLessons > 0) {
            this.overallCompletionRate = (completedLessons * 100.0) / totalScheduledLessons;
        } else {
            this.overallCompletionRate = 0.0;
        }
    }

    /**
     * Calculate progress percentage (how far through term)
     */
    public void calculateProgressPercentage() {
        if (totalWeeks > 0) {
            this.progressPercentage = (completedWeeks * 100.0) / totalWeeks;
        } else {
            this.progressPercentage = 0.0;
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
     * Determine overall grade
     */
    public void determineOverallGrade() {
        if (termAverageScore == null) {
            this.overallGrade = "N/A";
            return;
        }
        
        double score = termAverageScore.doubleValue();
        if (score >= 95) this.overallGrade = "A+";
        else if (score >= 90) this.overallGrade = "A";
        else if (score >= 85) this.overallGrade = "B+";
        else if (score >= 80) this.overallGrade = "B";
        else if (score >= 75) this.overallGrade = "C+";
        else if (score >= 70) this.overallGrade = "C";
        else if (score >= 60) this.overallGrade = "D";
        else this.overallGrade = "F";
    }

    /**
     * Determine performance level
     */
    public void determinePerformanceLevel() {
        if (overallCompletionRate >= 90 && 
            (termAverageScore != null && termAverageScore.doubleValue() >= 85)) {
            this.performanceLevel = "EXCELLENT";
        } else if (overallCompletionRate >= 80 && 
                   (termAverageScore != null && termAverageScore.doubleValue() >= 75)) {
            this.performanceLevel = "GOOD";
        } else if (overallCompletionRate >= 70 && 
                   (termAverageScore != null && termAverageScore.doubleValue() >= 65)) {
            this.performanceLevel = "AVERAGE";
        } else if (overallCompletionRate >= 50) {
            this.performanceLevel = "NEEDS_IMPROVEMENT";
        } else {
            this.performanceLevel = "FAILING";
        }
    }

    /**
     * Add milestone
     */
    public void addMilestone(String title, String description, LocalDate date, String category) {
        Milestone milestone = Milestone.builder()
                .title(title)
                .description(description)
                .achievedDate(date)
                .category(category)
                .build();
        this.milestones.add(milestone);
    }

    /**
     * Add achievement
     */
    public void addAchievement(String achievement) {
        this.achievements.add(achievement);
    }

    /**
     * Add area for improvement
     */
    public void addAreaForImprovement(String area) {
        this.areasForImprovement.add(area);
    }

    /**
     * Get summary text
     */
    public String getSummary() {
        return String.format("Term: %s | Completion: %.1f%% | Grade: %s | Score: %.1f%%",
                termName, overallCompletionRate, overallGrade,
                termAverageScore != null ? termAverageScore.doubleValue() : 0.0);
    }

    /**
     * Check if student is on track to complete term successfully
     */
    public boolean isOnTrack() {
        return overallCompletionRate >= 75 && 
               (termAverageScore != null && termAverageScore.doubleValue() >= 65) &&
               missedAssessments <= 5;
    }
}