package com.edu.platform.repository;

import com.edu.platform.model.LessonTopic;
import com.edu.platform.model.Subject;
import com.edu.platform.model.Term;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface LessonTopicRepository extends JpaRepository<LessonTopic, Long> {
    
    @EntityGraph(attributePaths = {"subject", "term"})
    List<LessonTopic> findAll();
    
    @EntityGraph(attributePaths = {"subject", "term"})
    List<LessonTopic> findBySubjectId(Long subjectId);
    
    // ✅ NEW: Find lessons by multiple subject IDs (for teachers)
    @EntityGraph(attributePaths = {"subject", "term"})
    List<LessonTopic> findBySubjectIdIn(Set<Long> subjectIds);
    
    @EntityGraph(attributePaths = {"subject", "term"})
    List<LessonTopic> findBySubjectIdAndTermId(Long subjectId, Long termId);
    
    @EntityGraph(attributePaths = {"subject", "term"})
    List<LessonTopic> findByTermIdAndWeekNumber(Long termId, int weekNumber);
    
    @EntityGraph(attributePaths = {"subject", "term"})
    List<LessonTopic> findBySubjectIdInAndIsAspirantMaterialFalse(Set<Long> subjectIds);
    
    @EntityGraph(attributePaths = {"subject", "term"})
    List<LessonTopic> findBySubjectIdInAndIsAspirantMaterialTrue(Set<Long> subjectIds);
    
    List<LessonTopic> findBySubjectIdAndIsAspirantMaterialFalse(Long subjectId);
    
    // ============================================================
    // SPRINT 1: WEEKLY SCHEDULE GENERATION QUERIES
    // ============================================================
    
    /**
     * ✅ NEW: Find lesson topic by subject, week number, and term
     * Used for automatic weekly topic assignment
     */
    @EntityGraph(attributePaths = {"subject", "term"})
    Optional<LessonTopic> findBySubjectAndWeekNumberAndTerm(
            Subject subject, 
            Integer weekNumber, 
            Term term
    );
    
    /**
     * ✅ NEW: Find lesson topic by subject ID, week number, and term ID
     * Alternative method using IDs
     */
    @EntityGraph(attributePaths = {"subject", "term"})
    Optional<LessonTopic> findBySubjectIdAndWeekNumberAndTermId(
            Long subjectId, 
            Integer weekNumber, 
            Long termId
    );
    
    /**
     * ✅ NEW: Find all lesson topics for a subject in a term
     * Ordered by week number
     */
    @EntityGraph(attributePaths = {"subject", "term"})
    List<LessonTopic> findBySubjectAndTermOrderByWeekNumberAsc(Subject subject, Term term);
    
    /**
     * ✅ NEW: Find all lesson topics for a term and week
     * Used to check which subjects have topics assigned
     */
    @EntityGraph(attributePaths = {"subject", "term"})
    List<LessonTopic> findByTermAndWeekNumber(Term term, Integer weekNumber);
    
    /**
     * ✅ NEW: Check if lesson topic exists for subject, week, and term
     */
    boolean existsBySubjectAndWeekNumberAndTerm(Subject subject, Integer weekNumber, Term term);
    
    /**
     * ✅ NEW: Check by IDs
     */
    boolean existsBySubjectIdAndWeekNumberAndTermId(Long subjectId, Integer weekNumber, Long termId);
    
    /**
     * ✅ NEW: Count lesson topics for a subject in a term
     */
    long countBySubjectAndTerm(Subject subject, Term term);
    
    /**
     * ✅ NEW: Find lesson topics by subject and term with week range
     */
    @EntityGraph(attributePaths = {"subject", "term"})
    @Query("SELECT lt FROM LessonTopic lt " +
           "WHERE lt.subject = :subject " +
           "AND lt.term = :term " +
           "AND lt.weekNumber BETWEEN :startWeek AND :endWeek " +
           "ORDER BY lt.weekNumber ASC")
    List<LessonTopic> findBySubjectAndTermAndWeekRange(
            @Param("subject") Subject subject,
            @Param("term") Term term,
            @Param("startWeek") Integer startWeek,
            @Param("endWeek") Integer endWeek
    );
    
    /**
     * ✅ NEW: Find subjects missing topics for a specific week in a term
     * Returns subjects that DON'T have a topic assigned for the given week
     */
    @Query("SELECT DISTINCT s FROM Subject s " +
           "WHERE s.id NOT IN (" +
           "  SELECT lt.subject.id FROM LessonTopic lt " +
           "  WHERE lt.term = :term AND lt.weekNumber = :weekNumber" +
           ")")
    List<Subject> findSubjectsMissingTopicsForWeek(
            @Param("term") Term term,
            @Param("weekNumber") Integer weekNumber
    );
    
    /**
     * ✅ NEW: Get all subjects that have topics in a specific term
     */
    @Query("SELECT DISTINCT lt.subject FROM LessonTopic lt WHERE lt.term = :term")
    List<Subject> findSubjectsWithTopicsInTerm(@Param("term") Term term);
    
    /**
     * ✅ SPRINT 7: Find all lesson topics for a subject (for suggestions)
     */
    @EntityGraph(attributePaths = {"subject", "term"})
    List<LessonTopic> findBySubject(Subject subject);
}