package com.edu.platform.dto.individual;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * DTO for detailed submission analysis.
 * Used by teachers to understand student performance and create targeted assessments.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmissionAnalysisDto {

    /**
     * Submission identification
     */
    private Long submissionId;
    private Long assessmentId;
    private String assessmentTitle;
    private LocalDateTime submittedAt;

    /**
     * Student information
     */
    private Long studentId;
    private String studentName;

    /**
     * Overall performance metrics
     */
    private Integer totalQuestions;
    private Integer correctCount;
    private Integer incorrectCount;
    private Integer unansweredCount;
    private Double scorePercentage;
    private Double totalScore;
    private Double maxScore;

    /**
     * Performance by topic
     */
    private List<TopicPerformance> topicPerformance;

    /**
     * Performance by difficulty
     */
    private Map<String, DifficultyPerformance> difficultyPerformance;

    /**
     * Weak areas (topics with <60% correct)
     */
    private List<String> weakTopics;

    /**
     * Strong areas (topics with >80% correct)
     */
    private List<String> strongTopics;

    /**
     * Question-level breakdown
     */
    private List<QuestionPerformance> questionBreakdown;

    /**
     * Questions grouped by topic
     */
    private Map<String, List<QuestionPerformance>> questionsGroupedByTopic;

    /**
     * Time analysis
     */
    private TimeAnalysis timeAnalysis;

    /**
     * Recommended focus areas for next assessment
     */
    private List<RecommendedFocusArea> recommendedFocusAreas;

    /**
     * Comparison with class average (if available)
     */
    private ClassComparison classComparison;

    /**
     * Topic performance details
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopicPerformance {
        private String topicName;
        private Integer totalQuestions;
        private Integer correctAnswers;
        private Integer incorrectAnswers;
        private Double successRate;
        private Boolean isWeakArea;
        private List<Long> incorrectQuestionIds;
    }

    /**
     * Performance by difficulty level
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DifficultyPerformance {
        private String difficultyLevel;
        private Integer totalQuestions;
        private Integer correctAnswers;
        private Double successRate;
    }

    /**
     * Individual question performance
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionPerformance {
        private Long questionId;
        private String questionText;
        private String topic;
        private String difficulty;
        private String studentAnswer;
        private String correctAnswer;
        private Boolean isCorrect;
        private Double marksAwarded;
        private Double maxMarks;
        private Long timeSpentSeconds;
    }

    /**
     * Time analysis
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TimeAnalysis {
        private Long totalTimeSpentSeconds;
        private Long averageTimePerQuestionSeconds;
        private Long longestQuestionTimeSeconds;
        private Long shortestQuestionTimeSeconds;
        private List<QuestionTimeDetail> timePerQuestion;
    }

    /**
     * Time spent on individual question
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionTimeDetail {
        private Long questionId;
        private String questionText;
        private Long timeSpentSeconds;
        private Boolean wasCorrect;
        private String topic;
    }

    /**
     * Recommended focus area for next assessment
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecommendedFocusArea {
        private String topicName;
        private String reason;
        private Integer suggestedQuestionCount;
        private String difficulty;
        private Integer priority; // 1 = highest priority
    }

    /**
     * Comparison with class performance
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClassComparison {
        private Double classAverageScore;
        private Double studentScore;
        private String performanceLevel; // "Above Average", "Average", "Below Average"
        private Integer studentRank;
        private Integer totalStudents;
    }

    /**
     * Helper method to determine if student needs remedial work
     */
    public boolean needsRemedialWork() {
        return scorePercentage != null && scorePercentage < 60.0;
    }

    /**
     * Helper method to determine if performance is excellent
     */
    public boolean isExcellentPerformance() {
        return scorePercentage != null && scorePercentage >= 90.0;
    }

    /**
     * Helper method to get priority topics for remediation
     */
    public List<String> getPriorityRemediationTopics() {
        return weakTopics != null ? weakTopics : List.of();
    }
}
