package com.edu.platform.repository.assessment;

import com.edu.platform.model.assessment.AssessmentQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssessmentQuestionRepository extends JpaRepository<AssessmentQuestion, Long> {
    
    /**
     * Find all questions for an assessment, ordered by order_number
     * ✅ FIXED: Changed from findByAssessmentIdOrderByDisplayOrderAsc
     */
    List<AssessmentQuestion> findByAssessmentIdOrderByOrderNumberAsc(Long assessmentId);
    
    /**
     * Count questions for an assessment
     */
    long countByAssessmentId(Long assessmentId);
    
    /**
     * Find questions by assessment and type
     */
    List<AssessmentQuestion> findByAssessmentIdAndQuestionType(
        Long assessmentId, 
        AssessmentQuestion.QuestionType questionType
    );
    
    /**
     * Delete all questions for an assessment
     * ✅ ADDED: Missing delete method
     */
    void deleteByAssessmentId(Long assessmentId);
    
    /**
     * Find a specific question by ID
     */
    AssessmentQuestion findByIdAndAssessmentId(Long questionId, Long assessmentId);

}