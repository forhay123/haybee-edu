// src/main/java/com/edu/platform/repository/assessment/AssessmentSubmissionRepository.java
package com.edu.platform.repository.assessment;

import com.edu.platform.model.assessment.AssessmentSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AssessmentSubmissionRepository extends JpaRepository<AssessmentSubmission, Long> {
    
    // ============================================================
    // BASIC QUERIES
    // ============================================================
    
    List<AssessmentSubmission> findByStudentId(Long studentId);
    
    List<AssessmentSubmission> findByAssessmentId(Long assessmentId);
    
    /**
     * Basic query - for backward compatibility
     * ⚠️ WARNING: May cause LazyInitializationException when accessing associations
     */
    Optional<AssessmentSubmission> findByAssessmentIdAndStudentId(Long assessmentId, Long studentId);
    
    boolean existsByAssessmentIdAndStudentId(Long assessmentId, Long studentId);
    
    List<AssessmentSubmission> findByStudentIdAndGradedTrue(Long studentId);
    
    // ============================================================
    // ✅ NEW: EAGER FETCHING QUERIES (RECOMMENDED)
    // ============================================================
    
    /**
     * ✅ RECOMMENDED: Find submission by assessment ID and student ID with eager fetching
     * Fetches all required associations to avoid LazyInitializationException
     */
    @Query("""
        SELECT s FROM AssessmentSubmission s
        JOIN FETCH s.assessment a
        JOIN FETCH s.student st
        JOIN FETCH st.user
        LEFT JOIN FETCH a.lessonTopic
        LEFT JOIN FETCH s.answers ans
        LEFT JOIN FETCH ans.question
        WHERE a.id = :assessmentId 
        AND st.id = :studentId
        """)
    Optional<AssessmentSubmission> findByAssessmentIdAndStudentIdWithDetails(
        @Param("assessmentId") Long assessmentId,
        @Param("studentId") Long studentId
    );
    
    /**
     * ✅ RECOMMENDED: Find by ID with all associations eagerly loaded
     * Use this instead of findById() when you need to access associations
     */
    @Query("""
        SELECT s FROM AssessmentSubmission s
        JOIN FETCH s.assessment a
        JOIN FETCH s.student st
        JOIN FETCH st.user
        LEFT JOIN FETCH a.lessonTopic
        LEFT JOIN FETCH s.answers ans
        LEFT JOIN FETCH ans.question
        WHERE s.id = :id
        """)
    Optional<AssessmentSubmission> findByIdWithDetails(@Param("id") Long id);
    
    // ============================================================
    // TEACHER QUERIES
    // ============================================================
    
    /**
     * ✅ FIND BY TEACHER (creator of assessment)
     */
    @Query("SELECT s FROM AssessmentSubmission s " +
           "WHERE s.assessment.createdBy.id = :teacherId")
    List<AssessmentSubmission> findByAssessment_CreatedBy_Id(@Param("teacherId") Long teacherId);
    
    /**
     * ✅ CORRECTED: Find submissions for subjects taught by teacher (through teacher_subjects table)
     */
    @Query("SELECT s FROM AssessmentSubmission s " +
           "WHERE s.assessment.subject.id IN " +
           "(SELECT sub.id FROM TeacherProfile tp " +
           "JOIN tp.subjects sub " +
           "WHERE tp.user.id = :teacherId)")
    List<AssessmentSubmission> findByAssessment_Subject_TeacherId(@Param("teacherId") Long teacherId);
    
    // ============================================================
    // SUBJECT & LESSON QUERIES
    // ============================================================
    
    /**
     * Find by student and subject (through assessment relationship)
     */
    @Query("SELECT s FROM AssessmentSubmission s " +
           "WHERE s.student.id = :studentId " +
           "AND s.assessment.subject.id = :subjectId")
    List<AssessmentSubmission> findByStudentIdAndAssessmentSubjectId(
        @Param("studentId") Long studentId,
        @Param("subjectId") Long subjectId
    );
    
    /**
     * Find by lesson topic (through assessment relationship)
     */
    @Query("SELECT s FROM AssessmentSubmission s " +
           "WHERE s.assessment.lessonTopic.id = :lessonTopicId")
    List<AssessmentSubmission> findByAssessmentLessonTopicId(@Param("lessonTopicId") Long lessonTopicId);
    
    /**
     * Find by subject
     */
    List<AssessmentSubmission> findByAssessmentSubjectId(Long subjectId);
    
    // ============================================================
    // GRADING QUERIES
    // ============================================================
    
    long countByGradedTrue();
    
    long countByGradedFalse();
    
    /**
     * Find ungraded submissions
     */
    List<AssessmentSubmission> findByGradedFalse();
    
    // ============================================================
    // COUNTING QUERIES
    // ============================================================
    
    long countByAssessmentId(Long assessmentId);
    
    /**
     * ✅ NEW: Count nullified submissions
     */
    long countByNullifiedAtIsNotNull();
    
    /**
     * ✅ NEW: Count nullified submissions for a student
     */
    long countByStudentIdAndNullifiedAtIsNotNull(Long studentId);
    
    // ============================================================
    // NULLIFICATION QUERIES (PHASE 1.4)
    // ============================================================
    
    /**
     * ✅ NEW: Find submissions that haven't been checked for nullification
     */
    List<AssessmentSubmission> findByNullifiedAtIsNull();
    
    /**
     * ✅ NEW: Find all nullified submissions
     */
    List<AssessmentSubmission> findByNullifiedAtIsNotNull();
    
	
	/**
	 * ✅ NEW: Check if any submissions exist for an assessment
	 * Used when deleting custom assessments
	 */
	boolean existsByAssessmentId(Long assessmentId);

	/**
	 * ✅ NEW: Find submissions by student and list of assessment IDs
	 * Used for gradebook calculations
	 */
	@Query("SELECT s FROM AssessmentSubmission s " +
	       "WHERE s.student.id = :studentId " +
	       "AND s.assessment.id IN :assessmentIds")
	List<AssessmentSubmission> findByStudentIdAndAssessmentIdIn(
	    @Param("studentId") Long studentId,
	    @Param("assessmentIds") List<Long> assessmentIds
	);
}