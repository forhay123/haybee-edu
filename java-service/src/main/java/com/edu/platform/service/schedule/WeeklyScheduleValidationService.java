package com.edu.platform.service.schedule;

import com.edu.platform.dto.classdata.WeeklyScheduleDto;
import com.edu.platform.dto.validation.ValidationResult;
import com.edu.platform.model.LessonTopic;
import com.edu.platform.model.LessonAIQuestion;
import com.edu.platform.model.Subject;
import com.edu.platform.model.assessment.TeacherQuestionBank;
import com.edu.platform.repository.LessonTopicRepository;
import com.edu.platform.repository.SubjectRepository;
import com.edu.platform.repository.LessonAIQuestionRepository;
import com.edu.platform.repository.assessment.TeacherQuestionBankRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Phase 2.1: Pre-Creation Validation Service
 * Validates that sufficient MCQ questions exist before creating a weekly schedule
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WeeklyScheduleValidationService {
    
    private final LessonAIQuestionRepository aiQuestionRepository;
    private final TeacherQuestionBankRepository teacherQuestionRepository;
    private final LessonTopicRepository lessonTopicRepository;
    private final SubjectRepository subjectRepository;
    
    /**
     * Minimum number of MCQs required to create a schedule
     */
    private static final int MINIMUM_MCQ_COUNT = 5;
    
    /**
     * ✅ FIXED: Accept WeeklyScheduleDto instead of separate IDs
     * Validate that a weekly schedule can be created
     * Checks if sufficient MCQ questions exist for auto-assessment
     * 
     * @param dto WeeklyScheduleDto containing subject and lesson topic IDs
     * @return ValidationResult indicating if schedule can be created
     */
    public ValidationResult validateScheduleCanBeCreated(WeeklyScheduleDto dto) {
        log.info("Validating weekly schedule creation: subject={}, lessonTopic={}", 
                 dto.subjectId(), dto.lessonTopicId());
        
        // Extract IDs from DTO
        Long subjectId = dto.subjectId();
        Long lessonTopicId = dto.lessonTopicId();
        
        // Validate that IDs are present
        if (subjectId == null || lessonTopicId == null) {
            return ValidationResult.failure(
                "Subject ID and Lesson Topic ID are required",
                0, 0, 0,
                "Unknown", "Unknown"
            );
        }
        
        // Get subject and lesson topic for context
        Subject subject = subjectRepository.findById(subjectId)
            .orElse(null);
        LessonTopic lessonTopic = lessonTopicRepository.findById(lessonTopicId)
            .orElse(null);
        
        String subjectName = subject != null ? subject.getName() : "Unknown";
        String topicTitle = lessonTopic != null ? lessonTopic.getTopicTitle() : "Unknown";
        
        // Count available AI questions
        int aiQuestionCount = countAvailableAIMCQs(lessonTopicId);
        log.debug("Found {} AI MCQs for lesson topic {}", aiQuestionCount, lessonTopicId);
        
        // Count available teacher questions
        int teacherQuestionCount = countAvailableTeacherMCQs(subjectId);
        log.debug("Found {} teacher MCQs for subject {}", teacherQuestionCount, subjectId);
        
        // Total available questions
        int totalQuestions = aiQuestionCount + teacherQuestionCount;
        
        // Validate minimum count
        if (totalQuestions < MINIMUM_MCQ_COUNT) {
            String reason = String.format(
                "Cannot create schedule: %s - %s has only %d MCQ question(s). Minimum %d MCQs required.",
                subjectName,
                topicTitle,
                totalQuestions,
                MINIMUM_MCQ_COUNT
            );
            
            log.warn("❌ Validation failed: {}", reason);
            
            return ValidationResult.failure(
                reason,
                totalQuestions,
                aiQuestionCount,
                teacherQuestionCount,
                subjectName,
                topicTitle
            );
        }
        
        log.info("✅ Validation passed: {} total MCQs available ({} AI + {} teacher)", 
                 totalQuestions, aiQuestionCount, teacherQuestionCount);
        
        return ValidationResult.success(
            totalQuestions,
            aiQuestionCount,
            teacherQuestionCount,
            subjectName,
            topicTitle
        );
    }
    
    /**
     * Get all available AI-generated MCQs for a lesson topic
     * Only returns questions with all 4 options populated
     * 
     * @param lessonTopicId The lesson topic ID
     * @return List of valid AI MCQ questions
     */
    public List<LessonAIQuestion> getAvailableAIQuestions(Long lessonTopicId) {
        // Get all AI questions for this lesson topic
        List<LessonAIQuestion> allQuestions = aiQuestionRepository
            .findByLessonAIResultLessonTopicId(lessonTopicId);
        
        // Filter for valid MCQs (all 4 options must be populated)
        return allQuestions.stream()
            .filter(this::hasAllOptionsFilled)
            .toList();
    }
    
    /**
     * Get all available teacher-created MCQs for a subject
     * 
     * @param subjectId The subject ID
     * @return List of teacher MCQ questions
     */
    public List<TeacherQuestionBank> getAvailableTeacherQuestions(Long subjectId) {
        return teacherQuestionRepository.findBySubjectId(subjectId);
    }
    
    /**
     * Count available AI MCQs for a lesson topic
     * 
     * @param lessonTopicId The lesson topic ID
     * @return Count of valid AI MCQs
     */
    public int countAvailableAIMCQs(Long lessonTopicId) {
        return getAvailableAIQuestions(lessonTopicId).size();
    }
    
    /**
     * Count available teacher MCQs for a subject
     * 
     * @param subjectId The subject ID
     * @return Count of teacher MCQs
     */
    public int countAvailableTeacherMCQs(Long subjectId) {
        return getAvailableTeacherQuestions(subjectId).size();
    }
    
    /**
     * Count total available MCQs (AI + Teacher)
     * 
     * @param lessonTopicId The lesson topic ID
     * @param subjectId The subject ID
     * @return Total count of available MCQs
     */
    public int countAvailableMCQs(Long lessonTopicId, Long subjectId) {
        int aiCount = countAvailableAIMCQs(lessonTopicId);
        int teacherCount = countAvailableTeacherMCQs(subjectId);
        return aiCount + teacherCount;
    }
    
    /**
     * Check if an AI question has all 4 options filled
     * Required for a valid MCQ
     */
    private boolean hasAllOptionsFilled(LessonAIQuestion question) {
        return question.getOptionA() != null && !question.getOptionA().isBlank() &&
               question.getOptionB() != null && !question.getOptionB().isBlank() &&
               question.getOptionC() != null && !question.getOptionC().isBlank() &&
               question.getOptionD() != null && !question.getOptionD().isBlank();
    }
}