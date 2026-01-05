// ============================================================
// 2. AUTO ASSESSMENT SERVICE (Business Logic Layer) - HIGH PRIORITY
// ============================================================
package com.edu.platform.service.assessment;

import com.edu.platform.exception.InsufficientQuestionsException;
import com.edu.platform.model.LessonAIQuestion;
import com.edu.platform.model.LessonTopic;
import com.edu.platform.model.Subject;
import com.edu.platform.model.WeeklySchedule;
import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.model.assessment.AssessmentQuestion;
import com.edu.platform.model.assessment.AssessmentType;
import com.edu.platform.model.assessment.TeacherQuestionBank;
import com.edu.platform.repository.LessonAIQuestionRepository;
import com.edu.platform.repository.LessonTopicRepository;
import com.edu.platform.repository.SubjectRepository;
import com.edu.platform.repository.assessment.AssessmentQuestionRepository;
import com.edu.platform.repository.assessment.AssessmentRepository;
import com.edu.platform.repository.assessment.TeacherQuestionBankRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Phase 2.3: Auto-Assessment Service
 * ✅ PRODUCTION-READY: Proper collection initialization and error handling
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AutoAssessmentService {
    
    private final AssessmentRepository assessmentRepository;
    private final AssessmentQuestionRepository assessmentQuestionRepository;
    private final LessonAIQuestionRepository aiQuestionRepository;
    private final TeacherQuestionBankRepository teacherQuestionRepository;
    private final LessonTopicRepository lessonTopicRepository;
    private final SubjectRepository subjectRepository;
    
    private static final int MINIMUM_QUESTIONS = 5;
    private static final int MAXIMUM_QUESTIONS = 50;
    private static final int MINUTES_PER_QUESTION = 2;
    private static final double PASS_PERCENTAGE = 0.5; // 50%
    
    /**
     * ✅ PRODUCTION-READY: Create mandatory assessment with proper initialization
     */
    @Transactional
    public Assessment createMandatoryAssessment(WeeklySchedule weeklySchedule) {
        log.info("Creating mandatory assessment for schedule: {}", weeklySchedule.getId());
        
        LessonTopic lessonTopic = weeklySchedule.getLessonTopic();
        Subject subject = weeklySchedule.getSubject();
        
        // Gather MCQ questions
        List<QuestionData> questionDataList = gatherMCQQuestions(lessonTopic.getId(), subject.getId());
        
        if (questionDataList.size() < MINIMUM_QUESTIONS) {
            throw new InsufficientQuestionsException(
                String.format("Need %d MCQs, found %d for lesson topic '%s'", 
                    MINIMUM_QUESTIONS, questionDataList.size(), lessonTopic.getTopicTitle())
            );
        }
        
        // ✅ STEP 1: Build assessment with initialized questions list
        Assessment assessment = Assessment.builder()
            .title("Lesson Assessment: " + lessonTopic.getTopicTitle())
            .type(AssessmentType.LESSON_TOPIC_ASSESSMENT)
            .subject(subject)
            .lessonTopic(lessonTopic)
            .autoGrade(true)
            .published(true)
            .totalMarks(questionDataList.size()) // 1 mark per MCQ
            .passingMarks((int) Math.ceil(questionDataList.size() * PASS_PERCENTAGE))
            .durationMinutes(questionDataList.size() * MINUTES_PER_QUESTION)
            .questions(new ArrayList<>()) // ✅ CRITICAL: Initialize collection explicitly
            .build();
        
        // ✅ STEP 2: Save assessment first to get ID
        Assessment savedAssessment = assessmentRepository.save(assessment);
        log.debug("Created assessment entity with ID: {}", savedAssessment.getId());
        
        // ✅ STEP 3: Add questions using the helper method
        int addedCount = addQuestionsToAssessment(savedAssessment, questionDataList);
        
        // ✅ STEP 4: Flush changes to database
        assessmentRepository.flush();
        
        log.info("✅ Created assessment {} with {} questions (AI-generated)", 
            savedAssessment.getId(), addedCount);
        
        return savedAssessment;
    }
    
    /**
     * Gather MCQ questions from AI and teacher sources
     */
    private List<QuestionData> gatherMCQQuestions(Long lessonTopicId, Long subjectId) {
        List<QuestionData> questions = new ArrayList<>();
        
        // Get AI questions (only valid MCQs)
        List<LessonAIQuestion> aiQuestions = getValidAIMCQs(lessonTopicId);
        for (LessonAIQuestion aiQ : aiQuestions) {
            questions.add(QuestionData.fromAIQuestion(aiQ));
        }
        
        log.debug("Found {} valid AI MCQs for lesson topic {}", aiQuestions.size(), lessonTopicId);
        
        // Get teacher questions (only MCQs)
        List<TeacherQuestionBank> teacherQuestions = getTeacherMCQs(subjectId);
        for (TeacherQuestionBank tq : teacherQuestions) {
            questions.add(QuestionData.fromTeacherQuestion(tq));
        }
        
        log.debug("Found {} teacher MCQs for subject {}", teacherQuestions.size(), subjectId);
        
        // Shuffle and limit to max questions
        Collections.shuffle(questions);
        List<QuestionData> selectedQuestions = questions.stream()
            .limit(MAXIMUM_QUESTIONS)
            .toList();
        
        log.debug("Selected {} questions (from {} total available)", 
            selectedQuestions.size(), questions.size());
        
        return selectedQuestions;
    }
    
    /**
     * Get valid AI-generated MCQs
     */
    private List<LessonAIQuestion> getValidAIMCQs(Long lessonTopicId) {
        List<LessonAIQuestion> allQuestions = aiQuestionRepository
            .findByLessonAIResultLessonTopicId(lessonTopicId);
        
        return allQuestions.stream()
            .filter(this::hasAllOptionsFilled)
            .toList();
    }
    
    /**
     * Get teacher-created MCQs
     */
    private List<TeacherQuestionBank> getTeacherMCQs(Long subjectId) {
        return teacherQuestionRepository.findBySubjectId(subjectId);
    }
    
    /**
     * Check if AI question has all 4 options filled
     */
    private boolean hasAllOptionsFilled(LessonAIQuestion question) {
        return question.getOptionA() != null && !question.getOptionA().isBlank() &&
               question.getOptionB() != null && !question.getOptionB().isBlank() &&
               question.getOptionC() != null && !question.getOptionC().isBlank() &&
               question.getOptionD() != null && !question.getOptionD().isBlank() &&
               question.getCorrectOption() != null && !question.getCorrectOption().isBlank();
    }
    
    /**
     * ✅ PRODUCTION-READY: Add questions to assessment using helper methods
     * Returns the count of questions added
     */
    private int addQuestionsToAssessment(Assessment assessment, List<QuestionData> questionDataList) {
        int addedCount = 0;
        
        for (int i = 0; i < questionDataList.size(); i++) {
            QuestionData qData = questionDataList.get(i);
            
            // ✅ Build question entity
            AssessmentQuestion aq = AssessmentQuestion.builder()
                .assessment(assessment) // Set relationship
                .orderNumber(i + 1) // Order starting from 1
                .questionText(qData.questionText)
                .questionType(AssessmentQuestion.QuestionType.MULTIPLE_CHOICE)
                .optionA(qData.optionA)
                .optionB(qData.optionB)
                .optionC(qData.optionC)
                .optionD(qData.optionD)
                .correctAnswer(qData.correctAnswer)
                .marks(1) // 1 mark per question
                .aiGenerated(true)
                .build();
            
            // ✅ Use helper method to maintain bidirectional consistency
            assessment.addQuestion(aq);
            
            // ✅ Save to database
            assessmentQuestionRepository.save(aq);
            addedCount++;
        }
        
        log.debug("Added {} questions to assessment {}", addedCount, assessment.getId());
        return addedCount;
    }
    
    /**
     * Internal class to hold question data
     */
    @lombok.Data
    @lombok.Builder
    private static class QuestionData {
        private String questionText;
        private String optionA;
        private String optionB;
        private String optionC;
        private String optionD;
        private String correctAnswer;
        
        static QuestionData fromAIQuestion(LessonAIQuestion aiQ) {
            return QuestionData.builder()
                .questionText(aiQ.getQuestionText())
                .optionA(aiQ.getOptionA())
                .optionB(aiQ.getOptionB())
                .optionC(aiQ.getOptionC())
                .optionD(aiQ.getOptionD())
                .correctAnswer(aiQ.getCorrectOption())
                .build();
        }
        
        static QuestionData fromTeacherQuestion(TeacherQuestionBank tq) {
            return QuestionData.builder()
                .questionText(tq.getQuestionText())
                .optionA(tq.getOptionA())
                .optionB(tq.getOptionB())
                .optionC(tq.getOptionC())
                .optionD(tq.getOptionD())
                .correctAnswer(tq.getCorrectAnswer())
                .build();
        }
    }
}