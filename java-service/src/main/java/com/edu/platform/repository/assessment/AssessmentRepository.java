package com.edu.platform.repository.assessment;

import com.edu.platform.model.LessonTopic;
import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.model.assessment.AssessmentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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
        
}