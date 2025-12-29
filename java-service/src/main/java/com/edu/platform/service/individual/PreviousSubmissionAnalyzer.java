package com.edu.platform.service.individual;

import com.edu.platform.model.assessment.AssessmentSubmission;
import com.edu.platform.model.assessment.AssessmentAnswer;
import com.edu.platform.repository.assessment.AssessmentSubmissionRepository;
import com.edu.platform.repository.assessment.AssessmentAnswerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service to analyze previous period submissions.
 * Provides detailed analysis for teachers to create targeted Period 2/3 assessments
 * based on student performance in Period 1.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class PreviousSubmissionAnalyzer {

    private final AssessmentSubmissionRepository submissionRepository;
    private final AssessmentAnswerRepository answerRepository;

    /**
     * Complete analysis result for a submission
     */
    public static class SubmissionAnalysis {
        private final Long submissionId;
        private final Long studentId;
        private final String studentName;
        private final Long assessmentId;
        private final String assessmentTitle;
        private final int totalQuestions;
        private final int correctAnswers;
        private final int incorrectAnswers;
        private final int unanswered;
        private final double scorePercentage;
        private final List<QuestionAnalysis> questionBreakdown;
        private final List<TopicPerformance> topicPerformance;
        private final List<String> weakAreas;
        private final List<Long> incorrectQuestionIds;
        private final Map<String, Integer> difficultyBreakdown;

        public SubmissionAnalysis(
                Long submissionId, Long studentId, String studentName,
                Long assessmentId, String assessmentTitle,
                int totalQuestions, int correctAnswers, int incorrectAnswers, int unanswered,
                double scorePercentage,
                List<QuestionAnalysis> questionBreakdown,
                List<TopicPerformance> topicPerformance,
                List<String> weakAreas,
                List<Long> incorrectQuestionIds,
                Map<String, Integer> difficultyBreakdown) {
            
            this.submissionId = submissionId;
            this.studentId = studentId;
            this.studentName = studentName;
            this.assessmentId = assessmentId;
            this.assessmentTitle = assessmentTitle;
            this.totalQuestions = totalQuestions;
            this.correctAnswers = correctAnswers;
            this.incorrectAnswers = incorrectAnswers;
            this.unanswered = unanswered;
            this.scorePercentage = scorePercentage;
            this.questionBreakdown = questionBreakdown;
            this.topicPerformance = topicPerformance;
            this.weakAreas = weakAreas;
            this.incorrectQuestionIds = incorrectQuestionIds;
            this.difficultyBreakdown = difficultyBreakdown;
        }

        // Getters
        public Long getSubmissionId() { return submissionId; }
        public Long getStudentId() { return studentId; }
        public String getStudentName() { return studentName; }
        public Long getAssessmentId() { return assessmentId; }
        public String getAssessmentTitle() { return assessmentTitle; }
        public int getTotalQuestions() { return totalQuestions; }
        public int getCorrectAnswers() { return correctAnswers; }
        public int getIncorrectAnswers() { return incorrectAnswers; }
        public int getUnanswered() { return unanswered; }
        public double getScorePercentage() { return scorePercentage; }
        public List<QuestionAnalysis> getQuestionBreakdown() { return questionBreakdown; }
        public List<TopicPerformance> getTopicPerformance() { return topicPerformance; }
        public List<String> getWeakAreas() { return weakAreas; }
        public List<Long> getIncorrectQuestionIds() { return incorrectQuestionIds; }
        public Map<String, Integer> getDifficultyBreakdown() { return difficultyBreakdown; }
    }

    /**
     * Analysis for a single question
     */
    public static class QuestionAnalysis {
        private final Long questionId;
        private final String questionText;
        private final String studentAnswer;
        private final String correctAnswer;
        private final boolean isCorrect;
        private final String topic;
        private final String difficulty;
        private final Double marksAwarded;
        private final Double maxMarks;

        public QuestionAnalysis(Long questionId, String questionText,
                              String studentAnswer, String correctAnswer,
                              boolean isCorrect, String topic, String difficulty,
                              Double marksAwarded, Double maxMarks) {
            this.questionId = questionId;
            this.questionText = questionText;
            this.studentAnswer = studentAnswer;
            this.correctAnswer = correctAnswer;
            this.isCorrect = isCorrect;
            this.topic = topic;
            this.difficulty = difficulty;
            this.marksAwarded = marksAwarded;
            this.maxMarks = maxMarks;
        }

        // Getters
        public Long getQuestionId() { return questionId; }
        public String getQuestionText() { return questionText; }
        public String getStudentAnswer() { return studentAnswer; }
        public String getCorrectAnswer() { return correctAnswer; }
        public boolean isCorrect() { return isCorrect; }
        public String getTopic() { return topic; }
        public String getDifficulty() { return difficulty; }
        public Double getMarksAwarded() { return marksAwarded; }
        public Double getMaxMarks() { return maxMarks; }
    }

    /**
     * Performance breakdown by topic
     */
    public static class TopicPerformance {
        private final String topicName;
        private final int totalQuestions;
        private final int correctAnswers;
        private final int incorrectAnswers;
        private final double successRate;
        private final List<Long> incorrectQuestionIds;

        public TopicPerformance(String topicName, int totalQuestions,
                              int correctAnswers, int incorrectAnswers,
                              List<Long> incorrectQuestionIds) {
            this.topicName = topicName;
            this.totalQuestions = totalQuestions;
            this.correctAnswers = correctAnswers;
            this.incorrectAnswers = incorrectAnswers;
            this.successRate = totalQuestions > 0 
                    ? (correctAnswers * 100.0 / totalQuestions) 
                    : 0.0;
            this.incorrectQuestionIds = incorrectQuestionIds;
        }

        // Getters
        public String getTopicName() { return topicName; }
        public int getTotalQuestions() { return totalQuestions; }
        public int getCorrectAnswers() { return correctAnswers; }
        public int getIncorrectAnswers() { return incorrectAnswers; }
        public double getSuccessRate() { return successRate; }
        public List<Long> getIncorrectQuestionIds() { return incorrectQuestionIds; }
        
        public boolean isWeakArea() {
            return successRate < 60.0; // Less than 60% correct
        }
    }

    /**
     * Analyze a submission in detail
     * @param submissionId Submission to analyze
     * @return Complete analysis
     */
    public SubmissionAnalysis analyzeSubmission(Long submissionId) {
        log.debug("Analyzing submission {}", submissionId);

        AssessmentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("Submission not found: " + submissionId));

        // Get answers for this submission
        List<AssessmentAnswer> answers = answerRepository.findBySubmissionId(submissionId);

        // Basic metrics
        int totalQuestions = answers.size();
        int correctAnswers = 0;
        int incorrectAnswers = 0;
        int unanswered = 0;
        List<Long> incorrectQuestionIds = new ArrayList<>();

        // Question-level analysis
        List<QuestionAnalysis> questionBreakdown = new ArrayList<>();
        Map<String, List<QuestionAnalysis>> questionsByTopic = new HashMap<>();
        Map<String, Integer> difficultyBreakdown = new HashMap<>();

        for (AssessmentAnswer answer : answers) {
            boolean isCorrect = Boolean.TRUE.equals(answer.getIsCorrect());
            
            if (answer.getStudentAnswer() == null || answer.getStudentAnswer().trim().isEmpty()) {
                unanswered++;
            } else if (isCorrect) {
                correctAnswers++;
            } else {
                incorrectAnswers++;
                incorrectQuestionIds.add(answer.getQuestion().getId());
            }

            // Create question analysis
            String topic = extractTopic(answer);
            String difficulty = extractDifficulty(answer);

            QuestionAnalysis qa = new QuestionAnalysis(
                    answer.getQuestion().getId(),
                    answer.getQuestion().getQuestionText(),
                    answer.getStudentAnswer(),
                    answer.getQuestion().getCorrectAnswer(),
                    isCorrect,
                    topic,
                    difficulty,
                    answer.getMarksObtained(),
                    answer.getQuestion().getMarks() != null
                            ? answer.getQuestion().getMarks().doubleValue()
                            : null
            );

            questionBreakdown.add(qa);

            // Group by topic
            questionsByTopic.computeIfAbsent(topic, k -> new ArrayList<>()).add(qa);

            // Count by difficulty
            difficultyBreakdown.merge(difficulty, 1, Integer::sum);
        }

        // Topic performance analysis
        List<TopicPerformance> topicPerformance = analyzeTopicPerformance(questionsByTopic);

        // Identify weak areas
        List<String> weakAreas = topicPerformance.stream()
                .filter(TopicPerformance::isWeakArea)
                .map(TopicPerformance::getTopicName)
                .collect(Collectors.toList());

        // Calculate score percentage
        double scorePercentage = submission.getPercentage() != null 
                ? submission.getPercentage() 
                : (totalQuestions > 0 ? (correctAnswers * 100.0 / totalQuestions) : 0.0);

        return new SubmissionAnalysis(
                submissionId,
                submission.getStudent().getId(),
                submission.getStudent().getUser().getFullName(),
                submission.getAssessment().getId(),
                submission.getAssessment().getTitle(),
                totalQuestions,
                correctAnswers,
                incorrectAnswers,
                unanswered,
                scorePercentage,
                questionBreakdown,
                topicPerformance,
                weakAreas,
                incorrectQuestionIds,
                difficultyBreakdown
        );
    }

    /**
     * Get only incorrect questions from a submission
     * @param submissionId Submission ID
     * @return List of question analyses for incorrect answers
     */
    public List<QuestionAnalysis> getIncorrectQuestions(Long submissionId) {
        SubmissionAnalysis analysis = analyzeSubmission(submissionId);
        
        return analysis.getQuestionBreakdown().stream()
                .filter(qa -> !qa.isCorrect())
                .collect(Collectors.toList());
    }

    /**
     * Get weak topics from a submission
     * @param submissionId Submission ID
     * @return List of topics where student scored < 60%
     */
    public List<TopicPerformance> getWeakTopics(Long submissionId) {
        SubmissionAnalysis analysis = analyzeSubmission(submissionId);
        
        return analysis.getTopicPerformance().stream()
                .filter(TopicPerformance::isWeakArea)
                .sorted((a, b) -> Double.compare(a.getSuccessRate(), b.getSuccessRate()))
                .collect(Collectors.toList());
    }

    /**
     * Get recommended question types for next assessment
     * Based on what student struggled with
     * @param submissionId Previous submission ID
     * @return Map of difficulty level to recommended count
     */
    public Map<String, Integer> getRecommendedQuestionMix(Long submissionId) {
        SubmissionAnalysis analysis = analyzeSubmission(submissionId);
        Map<String, Integer> recommended = new HashMap<>();

        // Analyze difficulty breakdown from incorrect answers
        List<QuestionAnalysis> incorrect = analysis.getQuestionBreakdown().stream()
                .filter(qa -> !qa.isCorrect())
                .collect(Collectors.toList());

        Map<String, Long> incorrectByDifficulty = incorrect.stream()
                .collect(Collectors.groupingBy(
                        QuestionAnalysis::getDifficulty,
                        Collectors.counting()
                ));

        // Recommend more practice on difficulties they struggled with
        incorrectByDifficulty.forEach((difficulty, count) -> {
            int recommendedCount = (int) Math.min(count * 2, 10); // Double but max 10
            recommended.put(difficulty, recommendedCount);
        });

        return recommended;
    }

    /**
     * Compare performance across multiple submissions (for trend analysis)
     * @param submissionIds List of submission IDs (chronological order)
     * @return Performance trend data
     */
    public List<SubmissionAnalysis> compareSubmissions(List<Long> submissionIds) {
        return submissionIds.stream()
                .map(this::analyzeSubmission)
                .collect(Collectors.toList());
    }

    // ============================================================
    // PRIVATE HELPER METHODS
    // ============================================================

    /**
     * Analyze performance by topic
     */
    private List<TopicPerformance> analyzeTopicPerformance(
            Map<String, List<QuestionAnalysis>> questionsByTopic) {
        
        List<TopicPerformance> result = new ArrayList<>();

        for (Map.Entry<String, List<QuestionAnalysis>> entry : questionsByTopic.entrySet()) {
            String topicName = entry.getKey();
            List<QuestionAnalysis> questions = entry.getValue();

            int total = questions.size();
            int correct = (int) questions.stream().filter(QuestionAnalysis::isCorrect).count();
            int incorrect = total - correct;
            
            List<Long> incorrectIds = questions.stream()
                    .filter(qa -> !qa.isCorrect())
                    .map(QuestionAnalysis::getQuestionId)
                    .collect(Collectors.toList());

            result.add(new TopicPerformance(topicName, total, correct, incorrect, incorrectIds));
        }

        // Sort by success rate (weakest first)
        result.sort((a, b) -> Double.compare(a.getSuccessRate(), b.getSuccessRate()));

        return result;
    }

    /**
     * Extract topic from submission answer
     * Override this method based on your actual data structure
     */
    private String extractTopic(AssessmentAnswer answer) {
        // TODO: Implement based on your question structure
        // Option 1: If question has topic field
        // return answer.getQuestion().getTopic();
        
        // Option 2: If question has category
        // return answer.getQuestion().getCategory();
        
        // Placeholder
        return "General";
    }

    /**
     * Extract difficulty from submission answer
     * Override this method based on your actual data structure
     */
    private String extractDifficulty(AssessmentAnswer answer) {
        // TODO: Implement based on your question structure
        // Option 1: If question has difficulty field
        // return answer.getQuestion().getDifficulty();
        
        // Option 2: If question has difficultyLevel
        // return answer.getQuestion().getDifficultyLevel();
        
        // Placeholder
        return "Medium";
    }
}