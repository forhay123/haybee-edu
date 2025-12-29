package com.edu.platform.service.individual;

import com.edu.platform.model.LessonTopic;
import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.model.assessment.AssessmentInstance;
import com.edu.platform.model.assessment.AssessmentQuestion;
import com.edu.platform.repository.AssessmentInstanceRepository;
import com.edu.platform.repository.assessment.AssessmentQuestionRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for creating shuffled assessment instances.
 * When a subject appears multiple times in a week,
 * each period gets the same assessment but with questions in different order.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class AssessmentShufflingService {

    private final AssessmentInstanceRepository assessmentInstanceRepository;
    private final AssessmentQuestionRepository assessmentQuestionRepository;
    private final ObjectMapper objectMapper;

    private static final String[] INSTANCE_SUFFIXES =
            {"A", "B", "C", "D", "E", "F", "G", "H", "I", "J"};

    /**
     * Create shuffled assessment instances for multi-period topics.
     */
    @Transactional
    public List<AssessmentInstance> createShuffledInstances(
            Assessment baseAssessment,
            LessonTopic lessonTopic,
            int periodCount,
            Integer weekNumber
    ) {
        log.info("Creating {} shuffled instances for assessment {} (topic: {})",
                periodCount, baseAssessment.getId(), lessonTopic.getTitle());

        // Get all questions for this assessment
        List<AssessmentQuestion> questions = assessmentQuestionRepository
        	    .findByAssessmentIdOrderByOrderNumberAsc(baseAssessment.getId());

        if (questions.isEmpty()) {
            log.error("Assessment {} has no questions, cannot create instances", baseAssessment.getId());
            throw new IllegalStateException("Assessment must have questions to create instances");
        }

        // Optional: warn if fewer questions than periods
        if (questions.size() < periodCount) {
            log.warn("Assessment {} has only {} questions but appears {} times. "
                            + "Will create best possible shuffles.",
                    baseAssessment.getId(), questions.size(), periodCount);
        }

        List<AssessmentInstance> instances = new ArrayList<>();

        // Create one instance per period
        for (int i = 0; i < periodCount; i++) {

            String suffix = getSuffix(i);
            int sequence = i + 1;

            // Check if instance already exists
            Optional<AssessmentInstance> existingOpt =
                    assessmentInstanceRepository.findByBaseAssessmentIdAndInstanceSuffix(
                            baseAssessment.getId(), suffix
                    );

            if (existingOpt.isPresent()) {
                log.info("Instance {} already exists for assessment {}", suffix, baseAssessment.getId());
                instances.add(existingOpt.get());
                continue;
            }

            // Shuffle questions for this instance
            List<Long> shuffledIds = shuffleQuestions(questions, i);

            // Create new instance
            AssessmentInstance instance = AssessmentInstance.builder()
                    .baseAssessment(baseAssessment)
                    .lessonTopic(lessonTopic)
                    .instanceSuffix(suffix)
                    .periodSequence(sequence)
                    .totalPeriods(periodCount)
                    .shuffledQuestionOrder(toJson(shuffledIds))
                    .isActive(true)
                    .weekNumber(weekNumber)
                    .build();

            AssessmentInstance saved = assessmentInstanceRepository.save(instance);
            instances.add(saved);

            log.debug("Created instance {} with {} questions: {}",
                    suffix, shuffledIds.size(), shuffledIds);
        }

        log.info("Successfully created {} assessment instances", instances.size());
        return instances;
    }

    /**
     * Shuffle questions for reproducibility.
     */
    private List<Long> shuffleQuestions(List<AssessmentQuestion> questions, int seed) {

        List<Long> ids = questions.stream()
                .map(AssessmentQuestion::getId)
                .collect(Collectors.toList());

        Collections.shuffle(ids, new Random(seed * 1000L));
        return ids;
    }

    /**
     * Get suffix (A, B, C, etc.).
     */
    private String getSuffix(int index) {
        if (index < INSTANCE_SUFFIXES.length) {
            return INSTANCE_SUFFIXES[index];
        }
        return String.valueOf(index + 1);
    }

    /**
     * Convert list to JSON.
     */
    private String toJson(List<Long> list) {
        try {
            return objectMapper.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize list to JSON: {}", e.getMessage());
            return "[]";
        }
    }

    /**
     * Parse JSON → list of IDs.
     */
    public List<Long> fromJson(String json) {
        try {
            return objectMapper.readValue(
                    json,
                    objectMapper.getTypeFactory()
                            .constructCollectionType(List.class, Long.class)
            );
        } catch (JsonProcessingException e) {
            log.error("Failed to parse JSON: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * Retrieve instance for a specific period.
     */
    public Optional<AssessmentInstance> getInstanceForPeriod(Long baseAssessmentId, int periodSequence) {
        return assessmentInstanceRepository
                .findByBaseAssessmentIdAndPeriodSequence(baseAssessmentId, periodSequence);
    }

    /**
     * Get all shuffled instances for a base assessment.
     */
    public List<AssessmentInstance> getAllInstances(Long baseAssessmentId) {
        return assessmentInstanceRepository
                .findByBaseAssessmentIdOrderByPeriodSequenceAsc(baseAssessmentId);
    }

    /**
     * Delete all instances (for regeneration).
     */
    @Transactional
    public int deleteInstancesForAssessment(Long baseAssessmentId) {
        List<AssessmentInstance> instances =
                assessmentInstanceRepository.findByBaseAssessmentIdOrderByPeriodSequenceAsc(baseAssessmentId);

        assessmentInstanceRepository.deleteAll(instances);

        log.info("Deleted {} instances for assessment {}", instances.size(), baseAssessmentId);
        return instances.size();
    }

    /**
     * Validate that an assessment has enough questions for shuffling.
     */
    public ShufflingValidation validateAssessmentForShuffling(Long assessmentId, int periodCount) {

        List<AssessmentQuestion> questions =
                assessmentQuestionRepository.findByAssessmentIdOrderByOrderNumberAsc(assessmentId);

        int questionCount = questions.size();

        ShufflingValidation validation = new ShufflingValidation();
        validation.setAssessmentId(assessmentId);
        validation.setQuestionCount(questionCount);
        validation.setPeriodCount(periodCount);

        // recommended: 2× number of periods
        validation.setSufficient(questionCount >= periodCount * 2);

        if (questionCount == 0) {
            validation.setWarningMessage("Assessment has no questions.");
        } else if (questionCount < periodCount) {
            validation.setWarningMessage(String.format(
                    "Assessment has only %d questions but appears %d times. "
                            + "Add more questions for better shuffling.",
                    questionCount, periodCount
            ));
        } else if (questionCount < periodCount * 2) {
            validation.setWarningMessage(String.format(
                    "Assessment has %d questions. Recommended at least %d questions "
                            + "for optimal shuffling.",
                    questionCount, periodCount * 2
            ));
        }

        return validation;
    }

    // ============================================================
    // DTO CLASSES
    // ============================================================

    /**
     * Validation result for shuffling.
     */
    public static class ShufflingValidation {

        private Long assessmentId;
        private int questionCount;
        private int periodCount;
        private boolean sufficient;
        private String warningMessage;

        public Long getAssessmentId() {
            return assessmentId;
        }

        public void setAssessmentId(Long assessmentId) {
            this.assessmentId = assessmentId;
        }

        public int getQuestionCount() {
            return questionCount;
        }

        public void setQuestionCount(int questionCount) {
            this.questionCount = questionCount;
        }

        public int getPeriodCount() {
            return periodCount;
        }

        public void setPeriodCount(int periodCount) {
            this.periodCount = periodCount;
        }

        public boolean isSufficient() {
            return sufficient;
        }

        public void setSufficient(boolean sufficient) {
            this.sufficient = sufficient;
        }

        public String getWarningMessage() {
            return warningMessage;
        }

        public void setWarningMessage(String warningMessage) {
            this.warningMessage = warningMessage;
        }
    }
}
