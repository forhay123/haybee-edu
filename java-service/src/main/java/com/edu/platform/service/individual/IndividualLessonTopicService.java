package com.edu.platform.service.individual;

import com.edu.platform.dto.classdata.LessonTopicDto;
import com.edu.platform.dto.individual.IndividualLessonTopicDto;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.model.individual.IndividualLessonTopic;
import com.edu.platform.repository.StudentProfileRepository;
import com.edu.platform.repository.SubjectRepository;
import com.edu.platform.repository.individual.IndividualLessonTopicRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing INDIVIDUAL student lesson topics
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class IndividualLessonTopicService {
    
    private final IndividualLessonTopicRepository lessonTopicRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final SubjectRepository subjectRepository;
    
    /**
     * Get all lesson topics for an INDIVIDUAL student
     */
    public List<LessonTopicDto> getByStudentId(Long studentProfileId) {
        log.info("Fetching individual lesson topics for student: {}", studentProfileId);
        
        List<IndividualLessonTopic> topics = lessonTopicRepository
            .findByStudentProfileIdOrderByWeekNumberAsc(studentProfileId);
        
        return topics.stream()
            .map(this::convertToStandardDto)
            .collect(Collectors.toList());
    }
    
    /**
     * Get lesson topics for a student and subject
     */
    public List<LessonTopicDto> getByStudentAndSubject(
            Long studentProfileId, 
            Long subjectId) {
        
        log.info("Fetching individual lesson topics for student {} and subject {}", 
            studentProfileId, subjectId);
        
        List<IndividualLessonTopic> topics = lessonTopicRepository
            .findByStudentProfileIdAndSubjectIdOrderByWeekNumberAsc(
                studentProfileId, subjectId);
        
        return topics.stream()
            .map(this::convertToStandardDto)
            .collect(Collectors.toList());
    }
    
    /**
     * Get detailed individual lesson topics
     */
    public List<IndividualLessonTopicDto> getDetailedByStudentId(Long studentProfileId) {
        log.info("Fetching detailed individual lesson topics for student: {}", 
            studentProfileId);
        
        List<IndividualLessonTopic> topics = lessonTopicRepository
            .findByStudentProfileIdOrderByWeekNumberAsc(studentProfileId);
        
        return topics.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }
    
    /**
     * Get lesson topics by scheme ID
     */
    public List<IndividualLessonTopicDto> getBySchemeId(Long schemeId) {
        List<IndividualLessonTopic> topics = lessonTopicRepository
            .findBySchemeIdOrderByWeekNumberAsc(schemeId);
        
        return topics.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }
    
    /**
     * Count topics for a student
     */
    public long countByStudentId(Long studentProfileId) {
        return lessonTopicRepository.countByStudentProfileId(studentProfileId);
    }
    
    /**
     * Count topics for a student and subject
     */
    public long countByStudentAndSubject(Long studentProfileId, Long subjectId) {
        return lessonTopicRepository.countByStudentProfileIdAndSubjectId(
            studentProfileId, subjectId);
    }
    
    // ============================================================
    // HELPER METHODS
    // ============================================================
    
    /**
     * Convert IndividualLessonTopic to standard LessonTopicDto
     * This allows INDIVIDUAL topics to be used in existing UI components
     */
    private LessonTopicDto convertToStandardDto(IndividualLessonTopic topic) {
        LessonTopicDto dto = LessonTopicDto.builder()
            .id(topic.getId())
            .topicTitle(topic.getTopicTitle())  // ✅ FIXED: Use topicTitle
            .description(topic.getDescription())
            .subjectId(topic.getEffectiveSubject().getId())
            .subjectName(topic.getEffectiveSubject().getName())
            .weekNumber(topic.getWeekNumber())
            .termId(topic.getTerm() != null ? topic.getTerm().getId() : null)
            .termName(topic.getTerm() != null ? topic.getTerm().getName() : null)
            .fileUrl(topic.getFileUrl())
            .build();
        
        // ✅ Convert Instant to LocalDateTime if needed
        if (topic.getCreatedAt() != null) {
            dto.setCreatedAt(LocalDateTime.ofInstant(
                topic.getCreatedAt(), 
                ZoneId.systemDefault()
            ));
        }
        
        return dto;
    }
    
    /**
     * Convert to detailed DTO with mapping information
     */
    private IndividualLessonTopicDto mapToDto(IndividualLessonTopic topic) {
        return IndividualLessonTopicDto.builder()
            .id(topic.getId())
            .studentProfileId(topic.getStudentProfile().getId())
            .studentName(topic.getStudentProfile().getUser().getFullName())  // ✅ FIXED
            .schemeId(topic.getScheme().getId())
            .subjectId(topic.getSubject().getId())
            .subjectName(topic.getSubject().getName())
            .topicTitle(topic.getTopicTitle())
            .description(topic.getDescription())
            .weekNumber(topic.getWeekNumber())
            .mappedSubjectId(topic.getMappedSubject() != null ? 
                topic.getMappedSubject().getId() : null)
            .mappedSubjectName(topic.getMappedSubject() != null ? 
                topic.getMappedSubject().getName() : null)
            .mappingConfidence(topic.getMappingConfidence())
            .fileName(topic.getFileName())
            .fileUrl(topic.getFileUrl())
            .termId(topic.getTerm() != null ? topic.getTerm().getId() : null)
            .termName(topic.getTerm() != null ? topic.getTerm().getName() : null)
            .createdAt(topic.getCreatedAt())
            .updatedAt(topic.getUpdatedAt())
            .build();
    }
}