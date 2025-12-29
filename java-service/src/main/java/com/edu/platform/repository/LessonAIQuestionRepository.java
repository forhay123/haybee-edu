package com.edu.platform.repository;

import com.edu.platform.model.LessonAIQuestion;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;

@Repository
public interface LessonAIQuestionRepository extends JpaRepository<LessonAIQuestion, Long> {

    /**
     * Fetch LessonAIQuestion along with LessonAIResult and LessonTopic in one query
     * to prevent N+1 and type mismatches.
     */
    @EntityGraph(attributePaths = {"lessonAIResult", "lessonAIResult.lessonTopic"})
    @Query("SELECT q FROM LessonAIQuestion q " +
           "JOIN q.lessonAIResult r " +
           "JOIN r.lessonTopic t " +
           "WHERE t.id IN :lessonTopicIds")
    List<LessonAIQuestion> findByLessonAIResultLessonTopicIdIn(@Param("lessonTopicIds") Set<Long> lessonTopicIds);
    
    /**
     * Find AI questions by lesson topic ID
     */
    @EntityGraph(attributePaths = {"lessonAIResult", "lessonAIResult.lessonTopic"})
    @Query("SELECT q FROM LessonAIQuestion q " +
           "JOIN q.lessonAIResult r " +
           "JOIN r.lessonTopic t " +
           "WHERE t.id = :lessonTopicId")
    List<LessonAIQuestion> findByLessonAIResult_LessonTopic_Id(@Param("lessonTopicId") Long lessonTopicId);
    

	
	 // ✅ ADD THIS METHOD IF NOT EXISTS:
	 @Query("SELECT q FROM LessonAIQuestion q " +
	        "WHERE q.lessonAIResult.lessonTopic.id = :lessonTopicId")
	 List<LessonAIQuestion> findByLessonAIResultLessonTopicId(@Param("lessonTopicId") Long lessonTopicId);

}
