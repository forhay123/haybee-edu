package com.edu.platform.repository.assessment;

import com.edu.platform.model.assessment.AssessmentQuestion;
import com.edu.platform.model.assessment.TeacherQuestionBank;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeacherQuestionBankRepository extends JpaRepository<TeacherQuestionBank, Long> {
    
    List<TeacherQuestionBank> findByTeacherId(Long teacherId);
    
    List<TeacherQuestionBank> findBySubjectId(Long subjectId);
    
    List<TeacherQuestionBank> findByLessonTopicId(Long lessonTopicId);
    
    List<TeacherQuestionBank> findByTeacherIdAndSubjectId(Long teacherId, Long subjectId);
    
    List<TeacherQuestionBank> findBySubjectIdAndLessonTopicId(Long subjectId, Long lessonTopicId);
    
    List<TeacherQuestionBank> findByDifficultyLevel(String difficultyLevel);
    
    /**
     * ✅ FIXED: Changed from findBySubjectIdAndCreatedById to findBySubjectIdAndTeacher_Id
     */
    List<TeacherQuestionBank> findBySubjectIdAndTeacher_Id(Long subjectId, Long teacherId);
    
    /**
     * ✅ FIXED: Use exact enum matching instead of ContainingIgnoreCase
     * Find questions by subject and question type (for MCQs, etc.)
     */
    List<TeacherQuestionBank> findBySubjectIdAndQuestionType(
        Long subjectId, 
        AssessmentQuestion.QuestionType questionType
    );
    
    /**
     * Find MCQ questions by subject
     */
    @Query("SELECT q FROM TeacherQuestionBank q " +
           "WHERE q.subject.id = :subjectId " +
           "AND q.questionType = 'MULTIPLE_CHOICE'")
    List<TeacherQuestionBank> findMCQsBySubjectId(@Param("subjectId") Long subjectId);
    
    /**
     * Count questions by subject
     */
    long countBySubjectId(Long subjectId);
    
    /**
     * Find questions by multiple subject IDs
     */
    List<TeacherQuestionBank> findBySubjectIdIn(List<Long> subjectIds);
}