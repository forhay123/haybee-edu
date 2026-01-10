package com.edu.platform.repository.assessment;

import com.edu.platform.model.LessonTopic;
import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.model.assessment.AssessmentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Repository
public interface AssessmentRepository extends JpaRepository<Assessment, Long> {
    
    List<Assessment> findBySubjectId(Long subjectId);
    
    List<Assessment> findByLessonTopicId(Long lessonTopicId);
    
    List<Assessment> findByType(AssessmentType type);
    
    List<Assessment> findBySubjectIdAndType(Long subjectId, AssessmentType type);
    
    List<Assessment> findByPublishedTrue();
    
    List<Assessment> findBySubjectIdAndPublishedTrue(Long subjectId);
    
    /**
     * Find by lesson topic and type
     */
    List<Assessment> findByLessonTopicIdAndType(Long lessonTopicId, AssessmentType type);
    
    long countByPublishedTrue();
    
    List<Assessment> findByCreatedBy_Id(Long teacherId);
    
    /**
     * Find all published assessments for the given subject IDs
     * Used to get assessments available to a student based on their enrollments
     */
    List<Assessment> findBySubject_IdInAndPublishedTrue(List<Long> subjectIds);
    
    /**
     * ✅ NEW: Count questions for an assessment
     * Used to display question count in suggested topics
     */
    @Query("SELECT COUNT(q) FROM AssessmentQuestion q WHERE q.assessment.id = :assessmentId")
    long countQuestionsByAssessmentId(@Param("assessmentId") Long assessmentId);
    
    /**
     * ✅ NEW: Check if assessment has any submissions
     * Useful for validation before deleting/modifying assessments
     */
    @Query("SELECT COUNT(s) > 0 FROM AssessmentSubmission s WHERE s.assessment.id = :assessmentId")
    boolean hasSubmissions(@Param("assessmentId") Long assessmentId);
   
    Optional<Assessment> findByLessonTopicAndType(
            LessonTopic lessonTopic, 
            AssessmentType type
        );
    
	
	/**
	 * ✅ FIXED: Find all gradebook assessments for a student
	 * Gets subjects through Enrollment relationship
	 */
	@Query("SELECT DISTINCT a FROM Assessment a " +
	       "JOIN Enrollment e ON e.classEntity.id = a.subject.classEntity.id " +
	       "WHERE e.studentProfile.id = :studentId " +
	       "AND a.type IN :gradebookTypes " +
	       "AND a.published = true " +
	       "ORDER BY a.subject.name, a.type")
	List<Assessment> findGradebookAssessmentsByStudentId(
	    @Param("studentId") Long studentId,
	    @Param("gradebookTypes") List<AssessmentType> gradebookTypes
	);
	
	// Convenience method with default types
	default List<Assessment> findGradebookAssessmentsByStudentId(Long studentId) {
	    List<AssessmentType> gradebookTypes = Arrays.asList(
	        AssessmentType.QUIZ,
	        AssessmentType.CLASSWORK,
	        AssessmentType.TEST1,
	        AssessmentType.TEST2,
	        AssessmentType.ASSIGNMENT,
	        AssessmentType.EXAM
	    );
	    return findGradebookAssessmentsByStudentId(studentId, gradebookTypes);
	}
	
	/**
	 * ✅ FIXED: Find all gradebook assessments for a student in ONE subject
	 * Simplified - doesn't need enrollment check since we already have subjectId
	 */
	@Query("SELECT a FROM Assessment a " +
	       "WHERE a.type IN :gradebookTypes " +
	       "AND a.subject.id = :subjectId " +
	       "AND a.published = true " +
	       "ORDER BY a.type")
	List<Assessment> findGradebookAssessmentsByStudentIdAndSubjectId(
	    @Param("studentId") Long studentId,
	    @Param("subjectId") Long subjectId,
	    @Param("gradebookTypes") List<AssessmentType> gradebookTypes
	);
	
	// Convenience method with default types
	default List<Assessment> findGradebookAssessmentsByStudentIdAndSubjectId(
	        Long studentId, 
	        Long subjectId) {
	    List<AssessmentType> gradebookTypes = Arrays.asList(
	        AssessmentType.QUIZ,
	        AssessmentType.CLASSWORK,
	        AssessmentType.TEST1,
	        AssessmentType.TEST2,
	        AssessmentType.ASSIGNMENT,
	        AssessmentType.EXAM
	    );
	    return findGradebookAssessmentsByStudentIdAndSubjectId(
	        studentId, 
	        subjectId, 
	        gradebookTypes
	    );
	}

}