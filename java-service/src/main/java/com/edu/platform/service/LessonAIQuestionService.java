package com.edu.platform.service;

import com.edu.platform.dto.classdata.LessonAiQuestionDto;
import com.edu.platform.dto.assessment.AssessmentRequest;
import com.edu.platform.dto.assessment.AssessmentDto;
import com.edu.platform.model.LessonAIQuestion;
import com.edu.platform.model.LessonTopic;
import com.edu.platform.model.User;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.model.assessment.AssessmentType;
import com.edu.platform.repository.LessonAIQuestionRepository;
import com.edu.platform.repository.LessonTopicRepository;
import com.edu.platform.repository.assessment.AssessmentRepository;
import com.edu.platform.service.assessment.AssessmentService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LessonAIQuestionService {

    private final LessonAIQuestionRepository questionRepository;
    private final LessonTopicRepository lessonTopicRepository;
    private final AssessmentRepository assessmentRepository;
    private final AssessmentService assessmentService;

    public List<LessonAIQuestion> getFilteredQuestions(StudentType studentType, Set<Long> chosenSubjectIds) {
        if (chosenSubjectIds == null || chosenSubjectIds.isEmpty()) {
            log.warn("No subjectIds provided");
            return Collections.emptyList();
        }

        List<LessonTopic> normalTopics =
                lessonTopicRepository.findBySubjectIdInAndIsAspirantMaterialFalse(chosenSubjectIds);
        Set<Long> topicIds = normalTopics.stream()
                .map(LessonTopic::getId)
                .collect(Collectors.toSet());

        if (studentType == StudentType.ASPIRANT) {
            List<LessonTopic> aspirantTopics =
                    lessonTopicRepository.findBySubjectIdInAndIsAspirantMaterialTrue(chosenSubjectIds);
            topicIds.addAll(aspirantTopics.stream().map(LessonTopic::getId).toList());
        }

        if (topicIds.isEmpty()) {
            return Collections.emptyList();
        }

        List<LessonAIQuestion> allQuestions =
                questionRepository.findByLessonAIResultLessonTopicIdIn(topicIds);

        return allQuestions.stream()
                .filter(q -> q.getStudentType() == null || q.getStudentType() == studentType)
                .collect(Collectors.toList());
    }

    public List<LessonAIQuestion> getQuestionsByLessonTopicIds(Set<Long> topicIds) {
        if (topicIds == null || topicIds.isEmpty()) return Collections.emptyList();
        return questionRepository.findByLessonAIResultLessonTopicIdIn(topicIds);
    }

    /** ✅ Convert entity list to DTO list */
    public List<LessonAiQuestionDto> toDtoList(List<LessonAIQuestion> questions) {
        return questions.stream().map(q -> LessonAiQuestionDto.builder()
                .id(q.getId())
                .lessonId(q.getLessonAIResult().getLessonTopic().getId())  // ✅ FIX: Use lesson_topic_id instead
                .questionText(q.getQuestionText())
                .answerText(q.getAnswerText())
                .difficulty(q.getDifficulty())
                .maxScore(q.getMaxScore())
                .optionA(q.getOptionA())
                .optionB(q.getOptionB())
                .optionC(q.getOptionC())
                .optionD(q.getOptionD())
                .correctOption(q.getCorrectOption())
                .workings(q.getWorkings())
                .studentType(q.getStudentType())
                .build()
        ).collect(Collectors.toList());
    }

    /**
     * ✅ AUTO-CREATE ASSESSMENT FOR LESSON TOPIC
     * 
     * This method should be called AFTER AI questions are successfully generated
     * It creates an Assessment entity that links to the lesson topic
     * 
     * @param lessonTopicId The ID of the lesson topic
     * @param creator The user creating the assessment (usually admin or system)
     */
    @Transactional
    public void autoCreateAssessmentForLesson(Long lessonTopicId, User creator) {
        try {
            // 1. Check if assessment already exists
            var existingAssessments = assessmentRepository.findByLessonTopicIdAndType(
                lessonTopicId, AssessmentType.LESSON_TOPIC_ASSESSMENT);
            
            if (!existingAssessments.isEmpty()) {
                log.info("⏭️ Assessment already exists for lesson topic {}", lessonTopicId);
                return;
            }

            // 2. Get lesson topic
            LessonTopic lessonTopic = lessonTopicRepository.findById(lessonTopicId)
                .orElseThrow(() -> new RuntimeException("Lesson topic not found: " + lessonTopicId));

            // 3. Get AI questions for this lesson
            List<LessonAIQuestion> aiQuestions = questionRepository
                .findByLessonAIResult_LessonTopic_Id(lessonTopicId);

            if (aiQuestions.isEmpty()) {
                log.warn("⚠️ No AI questions found for lesson topic {}", lessonTopicId);
                return;
            }

            // 4. Count question types
            long mcqCount = aiQuestions.stream()
                .filter(q -> q.getOptionA() != null && !q.getOptionA().trim().isEmpty())
                .count();
            long essayCount = aiQuestions.size() - mcqCount;

            // 5. Calculate marks (MCQ = 1 mark, Essay = 3 marks)
            int totalMarks = (int) (mcqCount + (essayCount * 3));

            // 6. Create assessment request
            AssessmentRequest request = new AssessmentRequest();
            request.setTitle(lessonTopic.getTopicTitle() + " Assessment");
            request.setDescription("Auto-generated assessment for " + lessonTopic.getTopicTitle());
            request.setType(AssessmentType.LESSON_TOPIC_ASSESSMENT);
            request.setSubjectId(lessonTopic.getSubject().getId());
            request.setLessonTopicId(lessonTopic.getId());
            request.setNumberOfAIQuestions(aiQuestions.size());
            request.setTotalMarks(totalMarks);
            request.setPassingMarks(Math.max(1, totalMarks / 2)); // 50% passing
            request.setDurationMinutes(45);
            request.setAutoGrade(true);
            request.setPublished(true);

            // 7. Create the assessment
            AssessmentDto assessment = assessmentService.createAssessment(request, creator);

            log.info("✅ Auto-created assessment {} for lesson topic {}: {} questions ({} MCQ, {} Essay), {} marks",
                     assessment.getId(), lessonTopicId, aiQuestions.size(), mcqCount, essayCount, totalMarks);

        } catch (Exception e) {
            log.error("❌ Failed to auto-create assessment for lesson topic {}: {}", 
                     lessonTopicId, e.getMessage(), e);
            // Don't throw - we don't want to break the lesson creation flow
        }
    }

    /**
     * ✅ BULK CREATE MISSING ASSESSMENTS
     * 
     * Use this to fix existing lesson topics that have AI questions but no assessments
     * Can be called from a controller endpoint or scheduled job
     * 
     * @param creator The user creating the assessments
     * @return Map with creation statistics
     */
    @Transactional
    public Map<String, Object> createMissingAssessments(User creator) {
        log.info("🔧 Creating missing assessments - initiated by {}", creator.getEmail());

        // Get all lesson topics
        List<LessonTopic> allTopics = lessonTopicRepository.findAll();

        int created = 0;
        int skipped = 0;
        List<Map<String, Object>> results = new ArrayList<>();

        for (LessonTopic topic : allTopics) {
            try {
                // Check if assessment exists
                var existing = assessmentRepository.findByLessonTopicIdAndType(
                    topic.getId(), AssessmentType.LESSON_TOPIC_ASSESSMENT);

                if (!existing.isEmpty()) {
                    skipped++;
                    continue;
                }

                // Check for AI questions
                List<LessonAIQuestion> aiQuestions = questionRepository
                    .findByLessonAIResult_LessonTopic_Id(topic.getId());

                if (aiQuestions.isEmpty()) {
                    log.debug("⏭️ Skipping topic {} - no AI questions", topic.getTopicTitle());
                    skipped++;
                    continue;
                }

                // Create assessment
                autoCreateAssessmentForLesson(topic.getId(), creator);
                created++;

                results.add(Map.of(
                    "topicId", topic.getId(),
                    "topicTitle", topic.getTopicTitle(),
                    "questionsCount", aiQuestions.size()
                ));

            } catch (Exception e) {
                log.error("❌ Failed for topic {}: {}", topic.getTopicTitle(), e.getMessage());
                skipped++;
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("totalTopics", allTopics.size());
        response.put("assessmentsCreated", created);
        response.put("skipped", skipped);
        response.put("details", results);

        log.info("✅ Missing assessments creation complete: {} created, {} skipped", created, skipped);

        return response;
    }
}