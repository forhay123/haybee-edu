package com.edu.platform.repository;

import com.edu.platform.model.ArchivedStudentLessonProgress;
import com.edu.platform.model.Term;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

/**
 * Repository for archived student lesson progress
 * Used for historical analysis and progress tracking
 */
@Repository
public interface ArchivedStudentLessonProgressRepository extends JpaRepository<ArchivedStudentLessonProgress, Long> {

    // ============================================================
    // BASIC QUERIES - BY STUDENT
    // ============================================================
    
    /**
     * Find all archived progress for a student
     */
    List<ArchivedStudentLessonProgress> findByStudentIdOrderByScheduledDateDesc(Long studentId);
    
    /**
     * Find archived progress for a student in date range
     */
    List<ArchivedStudentLessonProgress> findByStudentIdAndScheduledDateBetweenOrderByScheduledDateDesc(
            Long studentId, 
            LocalDate fromDate, 
            LocalDate toDate
    );
    
    /**
     * Find archived progress for a student by term
     */
    List<ArchivedStudentLessonProgress> findByStudentIdAndTermOrderByTermWeekNumberAscScheduledDateAsc(
            Long studentId, 
            Term term
    );
    
    /**
     * Find archived progress for a student by term and week
     */
    List<ArchivedStudentLessonProgress> findByStudentIdAndTermAndTermWeekNumberOrderByScheduledDateAsc(
            Long studentId, 
            Term term, 
            Integer weekNumber
    );

    // ============================================================
    // QUERIES - BY TERM AND WEEK
    // ============================================================
    
    /**
     * Find all archived progress for a specific term week
     */
    List<ArchivedStudentLessonProgress> findByTermAndTermWeekNumber(Term term, Integer weekNumber);
    
    /**
     * Find archived progress by academic year
     */
    List<ArchivedStudentLessonProgress> findByAcademicYearOrderByScheduledDateDesc(String academicYear);
    
    /**
     * Find archived progress by term
     */
    List<ArchivedStudentLessonProgress> findByTermOrderByTermWeekNumberAscScheduledDateAsc(Term term);

    // ============================================================
    // QUERIES - BY SUBJECT AND LESSON TOPIC
    // ============================================================
    
    /**
     * Find archived progress for student and subject
     */
    List<ArchivedStudentLessonProgress> findByStudentIdAndSubjectIdOrderByScheduledDateDesc(
            Long studentId, 
            Long subjectId
    );
    
    /**
     * Find archived progress for student and lesson topic
     */
    List<ArchivedStudentLessonProgress> findByStudentIdAndLessonTopicIdOrderByScheduledDateDesc(
            Long studentId, 
            Long lessonTopicId
    );
    
    /**
     * Find archived progress for subject in term
     */
    List<ArchivedStudentLessonProgress> findBySubjectIdAndTermOrderByScheduledDateDesc(
            Long subjectId, 
            Term term
    );

    // ============================================================
    // QUERIES - BY COMPLETION STATUS
    // ============================================================
    
    /**
     * Find completed archived progress for student
     */
    List<ArchivedStudentLessonProgress> findByStudentIdAndCompletionStatusOrderByScheduledDateDesc(
            Long studentId, 
            String completionStatus
    );
    
    /**
     * Find incomplete/missed progress for student in term
     */
    List<ArchivedStudentLessonProgress> findByStudentIdAndTermAndCompletionStatusInOrderByScheduledDateDesc(
            Long studentId, 
            Term term, 
            List<String> statuses
    );
    
    /**
     * Find all completed progress for student
     */
    List<ArchivedStudentLessonProgress> findByStudentIdAndCompletedTrueOrderByScheduledDateDesc(
            Long studentId
    );
    
    /**
     * Find all incomplete progress for student
     */
    List<ArchivedStudentLessonProgress> findByStudentIdAndCompletedFalseOrderByScheduledDateDesc(
            Long studentId
    );

    // ============================================================
    // STATISTICS QUERIES
    // ============================================================
    
    /**
     * Count archived progress by student and term
     */
    long countByStudentIdAndTerm(Long studentId, Term term);
    
    /**
     * Count completed progress by student and term
     */
    @Query("SELECT COUNT(a) FROM ArchivedStudentLessonProgress a " +
           "WHERE a.studentId = :studentId " +
           "AND a.term = :term " +
           "AND a.completionStatus = 'COMPLETED'")
    long countCompletedByStudentAndTerm(
            @Param("studentId") Long studentId, 
            @Param("term") Term term
    );
    
    /**
     * Calculate completion rate for student in term
     */
    @Query("SELECT " +
           "CAST(COUNT(CASE WHEN a.completionStatus = 'COMPLETED' THEN 1 END) AS double) / " +
           "CAST(COUNT(*) AS double) * 100.0 " +
           "FROM ArchivedStudentLessonProgress a " +
           "WHERE a.studentId = :studentId " +
           "AND a.term = :term")
    Double calculateCompletionRateByStudentAndTerm(
            @Param("studentId") Long studentId, 
            @Param("term") Term term
    );
    
    /**
     * Get average assessment score for student in term
     */
    @Query("SELECT AVG(a.assessmentScore) " +
           "FROM ArchivedStudentLessonProgress a " +
           "WHERE a.studentId = :studentId " +
           "AND a.term = :term " +
           "AND a.assessmentScore IS NOT NULL")
    Double calculateAverageScoreByStudentAndTerm(
            @Param("studentId") Long studentId, 
            @Param("term") Term term
    );
    
    /**
     * Get average score by subject for student in term
     */
    @Query("SELECT AVG(a.assessmentScore) " +
           "FROM ArchivedStudentLessonProgress a " +
           "WHERE a.studentId = :studentId " +
           "AND a.term = :term " +
           "AND a.subjectId = :subjectId " +
           "AND a.assessmentScore IS NOT NULL")
    Double calculateAverageScoreBySubjectAndTerm(
            @Param("studentId") Long studentId, 
            @Param("term") Term term,
            @Param("subjectId") Long subjectId
    );

    // ============================================================
    // WEEKLY PROGRESS QUERIES
    // ============================================================
    
    /**
     * Get week-by-week completion statistics for student in term
     */
    @Query("SELECT a.termWeekNumber, " +
           "COUNT(*) as totalProgress, " +
           "SUM(CASE WHEN a.completionStatus = 'COMPLETED' THEN 1 ELSE 0 END) as completedCount, " +
           "AVG(a.assessmentScore) as averageScore " +
           "FROM ArchivedStudentLessonProgress a " +
           "WHERE a.studentId = :studentId " +
           "AND a.term = :term " +
           "GROUP BY a.termWeekNumber " +
           "ORDER BY a.termWeekNumber")
    List<Object[]> getWeeklyProgressStatsByStudentAndTerm(
            @Param("studentId") Long studentId, 
            @Param("term") Term term
    );
    
    /**
     * Get subject-wise completion for student in term
     */
    @Query("SELECT a.subjectName, " +
           "COUNT(*) as totalProgress, " +
           "SUM(CASE WHEN a.completionStatus = 'COMPLETED' THEN 1 ELSE 0 END) as completedCount, " +
           "AVG(a.assessmentScore) as averageScore " +
           "FROM ArchivedStudentLessonProgress a " +
           "WHERE a.studentId = :studentId " +
           "AND a.term = :term " +
           "GROUP BY a.subjectName " +
           "ORDER BY a.subjectName")
    List<Object[]> getSubjectProgressStatsByStudentAndTerm(
            @Param("studentId") Long studentId, 
            @Param("term") Term term
    );

    // ============================================================
    // MULTI-PERIOD ASSESSMENT QUERIES
    // ============================================================
    
    /**
     * Find archived progress for a lesson topic (all periods)
     */
    List<ArchivedStudentLessonProgress> findByStudentIdAndLessonTopicIdAndTermAndTermWeekNumberOrderByPeriodSequence(
            Long studentId,
            Long lessonTopicId,
            Term term,
            Integer weekNumber
    );
    
    /**
     * Check if all periods for a topic were completed
     */
    @Query("SELECT CASE WHEN COUNT(*) = COUNT(CASE WHEN a.completed = true THEN 1 END) " +
           "THEN true ELSE false END " +
           "FROM ArchivedStudentLessonProgress a " +
           "WHERE a.studentId = :studentId " +
           "AND a.lessonTopicId = :topicId " +
           "AND a.term = :term " +
           "AND a.termWeekNumber = :weekNumber")
    boolean wereAllPeriodsCompletedForTopic(
            @Param("studentId") Long studentId,
            @Param("topicId") Long lessonTopicId,
            @Param("term") Term term,
            @Param("weekNumber") Integer weekNumber
    );
    
    /**
     * Get topic average score across all periods
     */
    @Query("SELECT AVG(a.assessmentScore) " +
           "FROM ArchivedStudentLessonProgress a " +
           "WHERE a.studentId = :studentId " +
           "AND a.lessonTopicId = :topicId " +
           "AND a.term = :term " +
           "AND a.termWeekNumber = :weekNumber " +
           "AND a.assessmentScore IS NOT NULL")
    Double calculateTopicAverageScore(
            @Param("studentId") Long studentId,
            @Param("topicId") Long lessonTopicId,
            @Param("term") Term term,
            @Param("weekNumber") Integer weekNumber
    );

    // ============================================================
    // CLEANUP QUERIES
    // ============================================================
    
    /**
     * Find archived progress older than retention period
     */
    List<ArchivedStudentLessonProgress> findByArchivedAtBefore(LocalDateTime beforeDate);
    
    /**
     * Count archived progress older than retention period
     */
    long countByArchivedAtBefore(LocalDateTime beforeDate);
    

    // ============================================================
    // TREND ANALYSIS QUERIES
    // ============================================================
    
    /**
     * Get student's performance trend across multiple terms
     */
    @Query("SELECT a.term.id, a.term.name, " +  // ✅ Changed to 'name'
    	       "COUNT(*) as totalProgress, " +
    	       "SUM(CASE WHEN a.completionStatus = 'COMPLETED' THEN 1 ELSE 0 END) as completedCount, " +
    	       "AVG(a.assessmentScore) as averageScore " +
    	       "FROM ArchivedStudentLessonProgress a " +
    	       "WHERE a.studentId = :studentId " +
    	       "AND a.term.session.name = :academicYear " +  // ✅ Changed to 'session.name'
    	       "GROUP BY a.term.id, a.term.name " +  // ✅ Changed to 'name'
    	       "ORDER BY a.term.startDate")
    	List<Object[]> getTermlyProgressTrend(
    	        @Param("studentId") Long studentId, 
    	        @Param("academicYear") String academicYear
    	);
    
    /**
     * Get streak tracking - consecutive weeks of full completion
     */
    @Query("SELECT a.termWeekNumber, " +
           "COUNT(*) as totalLessons, " +
           "SUM(CASE WHEN a.completed = true THEN 1 ELSE 0 END) as completedLessons " +
           "FROM ArchivedStudentLessonProgress a " +
           "WHERE a.studentId = :studentId " +
           "AND a.term = :term " +
           "GROUP BY a.termWeekNumber " +
           "ORDER BY a.termWeekNumber")
    List<Object[]> getWeeklyCompletionStreak(
            @Param("studentId") Long studentId, 
            @Param("term") Term term
    );

    // ============================================================
    // INCOMPLETE REASON ANALYSIS
    // ============================================================
    
    /**
     * Get breakdown of incomplete reasons for student
     */
    @Query("SELECT a.incompleteReason, COUNT(*) as count " +
           "FROM ArchivedStudentLessonProgress a " +
           "WHERE a.studentId = :studentId " +
           "AND a.term = :term " +
           "AND a.incompleteReason IS NOT NULL " +
           "GROUP BY a.incompleteReason")
    List<Object[]> getIncompleteReasonBreakdown(
            @Param("studentId") Long studentId, 
            @Param("term") Term term
    );
    
    /**
     * Find all missed assessments (grace period expired)
     */
    List<ArchivedStudentLessonProgress> findByStudentIdAndIncompleteReasonOrderByScheduledDateDesc(
            Long studentId,
            String incompleteReason
    );
    
    /**
     * Delete archived progress older than cutoff date
     * Returns count of deleted records
     */
    @Transactional
    @Modifying
    @Query("DELETE FROM ArchivedStudentLessonProgress aslp WHERE aslp.archivedAt < :cutoffDate")
    int deleteByArchivedAtBefore(@Param("cutoffDate") LocalDateTime cutoffDate);
}