package com.edu.platform.repository.assessment;

import com.edu.platform.model.assessment.AssessmentAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssessmentAnswerRepository extends JpaRepository<AssessmentAnswer, Long> {
    
    List<AssessmentAnswer> findBySubmissionId(Long submissionId);
    
    List<AssessmentAnswer> findByQuestionId(Long questionId);
}