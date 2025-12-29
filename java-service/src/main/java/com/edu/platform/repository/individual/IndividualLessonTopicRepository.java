package com.edu.platform.repository.individual;

import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.model.individual.IndividualLessonTopic;
import com.edu.platform.model.individual.IndividualStudentScheme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IndividualLessonTopicRepository extends JpaRepository<IndividualLessonTopic, Long> {
    
    /**
     * Find all topics for a student
     */
    List<IndividualLessonTopic> findByStudentProfileOrderByWeekNumberAsc(StudentProfile studentProfile);
    
    /**
     * ✅ NEW: Find all topics for a student by ID (used by service layer)
     */
    List<IndividualLessonTopic> findByStudentProfileIdOrderByWeekNumberAsc(Long studentProfileId);
    
    /**
     * Find topics for a student and subject
     */
    List<IndividualLessonTopic> findByStudentProfileAndSubjectOrderByWeekNumberAsc(
        StudentProfile studentProfile, Subject subject);
    
    /**
     * ✅ NEW: Find topics for a student and subject by IDs
     */
    List<IndividualLessonTopic> findByStudentProfileIdAndSubjectIdOrderByWeekNumberAsc(
        Long studentProfileId, Long subjectId);
    
    /**
     * Find topics for a scheme
     */
    List<IndividualLessonTopic> findBySchemeOrderByWeekNumberAsc(IndividualStudentScheme scheme);
    
    /**
     * ✅ NEW: Find topics for a scheme by ID
     */
    List<IndividualLessonTopic> findBySchemeIdOrderByWeekNumberAsc(Long schemeId);
    
    /**
     * Find topics for a student and term
     */
    List<IndividualLessonTopic> findByStudentProfileAndTermIdOrderByWeekNumberAsc(
        StudentProfile studentProfile, Long termId);
    
    /**
     * Find topics for a student, subject, and term
     */
    List<IndividualLessonTopic> findByStudentProfileAndSubjectAndTermIdOrderByWeekNumberAsc(
        StudentProfile studentProfile, Subject subject, Long termId);
    
    /**
     * Find topics for a student and week
     */
    List<IndividualLessonTopic> findByStudentProfileAndWeekNumber(
        StudentProfile studentProfile, Integer weekNumber);
    
    /**
     * ✅ NEW: Count topics by student ID
     */
    long countByStudentProfileId(Long studentProfileId);
    
    /**
     * Count topics by student
     */
    long countByStudentProfile(StudentProfile studentProfile);
    
    /**
     * ✅ NEW: Count topics by student and subject IDs
     */
    long countByStudentProfileIdAndSubjectId(Long studentProfileId, Long subjectId);
    
    /**
     * Count topics by student and subject
     */
    long countByStudentProfileAndSubject(StudentProfile studentProfile, Subject subject);
    
    /**
     * Count topics by scheme
     */
    long countByScheme(IndividualStudentScheme scheme);
    
    /**
     * ✅ NEW: Check if scheme has topics
     */
    boolean existsBySchemeId(Long schemeId);
    
    /**
     * Find topics with low mapping confidence (< 80%)
     */
    @Query("SELECT t FROM IndividualLessonTopic t " +
           "WHERE t.studentProfile = :studentProfile " +
           "AND (t.mappingConfidence IS NULL OR t.mappingConfidence < 80.0) " +
           "ORDER BY t.weekNumber ASC")
    List<IndividualLessonTopic> findTopicsNeedingReview(@Param("studentProfile") StudentProfile studentProfile);
    
    /**
     * Find topics with high mapping confidence
     */
    @Query("SELECT t FROM IndividualLessonTopic t " +
           "WHERE t.studentProfile = :studentProfile " +
           "AND t.mappingConfidence >= 80.0 " +
           "ORDER BY t.weekNumber ASC")
    List<IndividualLessonTopic> findConfidentlyMappedTopics(@Param("studentProfile") StudentProfile studentProfile);
    
    /**
     * Delete all topics for a scheme
     */
    void deleteByScheme(IndividualStudentScheme scheme);
    
    /**
     * Delete all topics for a scheme by ID
     */
    void deleteBySchemeId(Long schemeId);
}