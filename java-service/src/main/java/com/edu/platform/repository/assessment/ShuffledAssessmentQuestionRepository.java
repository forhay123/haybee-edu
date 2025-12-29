package com.edu.platform.repository.assessment;

import com.edu.platform.model.assessment.ShuffledAssessmentQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShuffledAssessmentQuestionRepository extends JpaRepository<ShuffledAssessmentQuestion, Long> {

    List<ShuffledAssessmentQuestion> findByAssessmentInstanceIdOrderByShuffledDisplayOrderAsc(Long instanceId);

    ShuffledAssessmentQuestion findByAssessmentInstanceIdAndShuffledDisplayOrder(
        Long instanceId, Integer displayOrder
    );

    long countByAssessmentInstanceId(Long instanceId);

    void deleteByAssessmentInstanceId(Long instanceId);

    List<ShuffledAssessmentQuestion> findByAssessmentInstanceIdAndIsActiveTrueOrderByShuffledDisplayOrderAsc(Long instanceId);
}