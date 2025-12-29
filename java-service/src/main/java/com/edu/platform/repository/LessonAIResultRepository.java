package com.edu.platform.repository;

import com.edu.platform.model.LessonAIResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LessonAIResultRepository extends JpaRepository<LessonAIResult, Long> {
    // Add custom query methods if needed
}
