package com.edu.platform.service.assessment;

import com.edu.platform.dto.assessment.TeacherQuestionDto;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.model.LessonTopic;
import com.edu.platform.model.Subject;
import com.edu.platform.model.User;
import com.edu.platform.model.assessment.TeacherQuestionBank;
import com.edu.platform.repository.LessonTopicRepository;
import com.edu.platform.repository.SubjectRepository;
import com.edu.platform.repository.assessment.TeacherQuestionBankRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TeacherQuestionService {

    private final TeacherQuestionBankRepository questionBankRepository;
    private final SubjectRepository subjectRepository;
    private final LessonTopicRepository lessonTopicRepository;

    /**
     * Create a new teacher question
     * ✅ FIXED: Added null checks for subjectId
     */
    @Transactional
    public TeacherQuestionDto createQuestion(TeacherQuestionDto dto, User teacher) {
        log.info("Teacher {} creating question for subject {}", teacher.getId(), dto.getSubjectId());

        // ✅ VALIDATE: Check if subjectId is provided
        if (dto.getSubjectId() == null) {
            log.error("❌ Subject ID is required but was null for teacher {}", teacher.getId());
            throw new IllegalArgumentException("Subject ID is required");
        }

        Subject subject = subjectRepository.findById(dto.getSubjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with ID: " + dto.getSubjectId()));

        TeacherQuestionBank question = TeacherQuestionBank.builder()
                .teacher(teacher)
                .subject(subject)
                .questionText(dto.getQuestionText())
                .questionType(dto.getQuestionType())
                .optionA(dto.getOptionA())
                .optionB(dto.getOptionB())
                .optionC(dto.getOptionC())
                .optionD(dto.getOptionD())
                .correctAnswer(dto.getCorrectAnswer())
                .difficultyLevel(dto.getDifficultyLevel())
                .build();

        // ✅ NULL-SAFE: Only lookup lesson topic if ID is provided
        if (dto.getLessonTopicId() != null) {
            LessonTopic lessonTopic = lessonTopicRepository.findById(dto.getLessonTopicId())
                    .orElseThrow(() -> new ResourceNotFoundException("Lesson topic not found with ID: " + dto.getLessonTopicId()));
            question.setLessonTopic(lessonTopic);
            log.debug("Linked question to lesson topic {}", dto.getLessonTopicId());
        }

        question = questionBankRepository.save(question);
        log.info("✅ Successfully created question {} for teacher {}", question.getId(), teacher.getId());
        
        return convertToDto(question);
    }

    /**
     * Update teacher question
     * ✅ FIXED: Added validation for required fields
     */
    @Transactional
    public TeacherQuestionDto updateQuestion(Long id, TeacherQuestionDto dto, User teacher) {
        // ✅ VALIDATE: Check if question ID is provided
        if (id == null) {
            throw new IllegalArgumentException("Question ID is required");
        }

        TeacherQuestionBank question = questionBankRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Question not found with ID: " + id));

        // ✅ VERIFY OWNERSHIP: Same pattern as grading service
        if (!question.getTeacher().getId().equals(teacher.getId())) {
            log.warn("❌ Teacher {} attempted to update question {} owned by teacher {}", 
                    teacher.getId(), id, question.getTeacher().getId());
            throw new IllegalStateException("You can only update your own questions");
        }

        // ✅ UPDATE FIELDS: Only update if values are provided
        if (dto.getQuestionText() != null) {
            question.setQuestionText(dto.getQuestionText());
        }
        if (dto.getQuestionType() != null) {
            question.setQuestionType(dto.getQuestionType());
        }
        if (dto.getOptionA() != null) {
            question.setOptionA(dto.getOptionA());
        }
        if (dto.getOptionB() != null) {
            question.setOptionB(dto.getOptionB());
        }
        if (dto.getOptionC() != null) {
            question.setOptionC(dto.getOptionC());
        }
        if (dto.getOptionD() != null) {
            question.setOptionD(dto.getOptionD());
        }
        if (dto.getCorrectAnswer() != null) {
            question.setCorrectAnswer(dto.getCorrectAnswer());
        }
        if (dto.getDifficultyLevel() != null) {
            question.setDifficultyLevel(dto.getDifficultyLevel());
        }

        // ✅ NULL-SAFE: Only update lesson topic if ID is provided
        if (dto.getLessonTopicId() != null) {
            LessonTopic lessonTopic = lessonTopicRepository.findById(dto.getLessonTopicId())
                    .orElseThrow(() -> new ResourceNotFoundException("Lesson topic not found with ID: " + dto.getLessonTopicId()));
            question.setLessonTopic(lessonTopic);
        }

        question = questionBankRepository.save(question);
        log.info("✅ Successfully updated question {} by teacher {}", id, teacher.getId());
        
        return convertToDto(question);
    }

    /**
     * Delete teacher question
     * ✅ FIXED: Added validation
     */
    @Transactional
    public void deleteQuestion(Long id, User teacher) {
        // ✅ VALIDATE: Check if question ID is provided
        if (id == null) {
            throw new IllegalArgumentException("Question ID is required");
        }

        TeacherQuestionBank question = questionBankRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Question not found with ID: " + id));

        // ✅ VERIFY OWNERSHIP: Same pattern as grading service
        if (!question.getTeacher().getId().equals(teacher.getId())) {
            log.warn("❌ Teacher {} attempted to delete question {} owned by teacher {}", 
                    teacher.getId(), id, question.getTeacher().getId());
            throw new IllegalStateException("You can only delete your own questions");
        }

        questionBankRepository.delete(question);
        log.info("✅ Successfully deleted question {} by teacher {}", id, teacher.getId());
    }

    /**
     * Get all questions for a teacher
     * ✅ FIXED: Added validation
     */
    @Transactional(readOnly = true)
    public List<TeacherQuestionDto> getTeacherQuestions(Long teacherId) {
        // ✅ VALIDATE: Check if teacher ID is provided
        if (teacherId == null) {
            throw new IllegalArgumentException("Teacher ID is required");
        }

        List<TeacherQuestionBank> questions = questionBankRepository.findByTeacherId(teacherId);
        log.info("📋 Found {} questions for teacher {}", questions.size(), teacherId);
        
        return questions.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * Get questions by subject
     * ✅ FIXED: Added validation
     */
    @Transactional(readOnly = true)
    public List<TeacherQuestionDto> getQuestionsBySubject(Long subjectId) {
        // ✅ VALIDATE: Check if subject ID is provided
        if (subjectId == null) {
            throw new IllegalArgumentException("Subject ID is required");
        }

        List<TeacherQuestionBank> questions = questionBankRepository.findBySubjectId(subjectId);
        log.info("📋 Found {} questions for subject {}", questions.size(), subjectId);
        
        return questions.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * Get questions by lesson topic
     * ✅ FIXED: Added validation
     */
    @Transactional(readOnly = true)
    public List<TeacherQuestionDto> getQuestionsByLessonTopic(Long lessonTopicId) {
        // ✅ VALIDATE: Check if lesson topic ID is provided
        if (lessonTopicId == null) {
            throw new IllegalArgumentException("Lesson topic ID is required");
        }

        List<TeacherQuestionBank> questions = questionBankRepository.findByLessonTopicId(lessonTopicId);
        log.info("📋 Found {} questions for lesson topic {}", questions.size(), lessonTopicId);
        
        return questions.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * Get questions by teacher and subject
     * ✅ FIXED: Added validation
     */
    @Transactional(readOnly = true)
    public List<TeacherQuestionDto> getQuestionsByTeacherAndSubject(Long teacherId, Long subjectId) {
        // ✅ VALIDATE: Check if both IDs are provided
        if (teacherId == null) {
            throw new IllegalArgumentException("Teacher ID is required");
        }
        if (subjectId == null) {
            throw new IllegalArgumentException("Subject ID is required");
        }

        List<TeacherQuestionBank> questions = questionBankRepository.findByTeacherIdAndSubjectId(teacherId, subjectId);
        log.info("📋 Found {} questions for teacher {} and subject {}", questions.size(), teacherId, subjectId);
        
        return questions.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * ✅ NULL-SAFE: Convert entity to DTO with null checks
     */
    private TeacherQuestionDto convertToDto(TeacherQuestionBank question) {
        TeacherQuestionDto dto = TeacherQuestionDto.builder()
                .id(question.getId())
                .teacherId(question.getTeacher() != null ? question.getTeacher().getId() : null)
                .teacherName(question.getTeacher() != null ? question.getTeacher().getFullName() : null)
                .subjectId(question.getSubject() != null ? question.getSubject().getId() : null)
                .subjectName(question.getSubject() != null ? question.getSubject().getName() : null)
                .questionText(question.getQuestionText())
                .questionType(question.getQuestionType())
                .optionA(question.getOptionA())
                .optionB(question.getOptionB())
                .optionC(question.getOptionC())
                .optionD(question.getOptionD())
                .correctAnswer(question.getCorrectAnswer())
                .difficultyLevel(question.getDifficultyLevel())
                .createdAt(question.getCreatedAt())
                .build();

        // ✅ NULL-SAFE: Only set lesson topic fields if present
        if (question.getLessonTopic() != null) {
            dto.setLessonTopicId(question.getLessonTopic().getId());
            dto.setLessonTopicTitle(question.getLessonTopic().getTopicTitle());
        }

        return dto;
    }
}