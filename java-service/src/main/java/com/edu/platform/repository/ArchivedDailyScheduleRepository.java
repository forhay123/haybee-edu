package com.edu.platform.repository;

import com.edu.platform.model.ArchivedDailySchedule;
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
 * Repository for archived daily schedules
 * Used for historical progress analysis and reporting
 */
@Repository
public interface ArchivedDailyScheduleRepository extends JpaRepository<ArchivedDailySchedule, Long> {

    // ============================================================
    // BASIC QUERIES - BY STUDENT
    // ============================================================
    
    /**
     * Find all archived schedules for a student
     */
    List<ArchivedDailySchedule> findByStudentIdOrderByScheduledDateDesc(Long studentId);
    
    /**
     * Find archived schedules for a student in date range
     */
    List<ArchivedDailySchedule> findByStudentIdAndScheduledDateBetweenOrderByScheduledDateDesc(
            Long studentId, 
            LocalDate fromDate, 
            LocalDate toDate
    );
    
    /**
     * Find archived schedules for a student by term
     */
    List<ArchivedDailySchedule> findByStudentIdAndTermOrderByTermWeekNumberAscScheduledDateAsc(
            Long studentId, 
            Term term
    );
    
    /**
     * Find archived schedules for a student by term and week
     */
    List<ArchivedDailySchedule> findByStudentIdAndTermAndTermWeekNumberOrderByScheduledDateAsc(
            Long studentId, 
            Term term, 
            Integer weekNumber
    );

    // ============================================================
    // QUERIES - BY TERM AND WEEK
    // ============================================================
    
    /**
     * Find all archived schedules for a specific term week
     */
    List<ArchivedDailySchedule> findByTermAndTermWeekNumber(Term term, Integer weekNumber);
    
    /**
     * Find archived schedules by academic year
     */
    List<ArchivedDailySchedule> findByAcademicYearOrderByScheduledDateDesc(String academicYear);
    
    /**
     * Find archived schedules by term
     */
    List<ArchivedDailySchedule> findByTermOrderByTermWeekNumberAscScheduledDateAsc(Term term);

    // ============================================================
    // QUERIES - BY SUBJECT
    // ============================================================
    
    /**
     * Find archived schedules for student and subject
     */
    List<ArchivedDailySchedule> findByStudentIdAndSubjectIdOrderByScheduledDateDesc(
            Long studentId, 
            Long subjectId
    );
    
    /**
     * Find archived schedules for subject in term
     */
    List<ArchivedDailySchedule> findBySubjectIdAndTermOrderByScheduledDateDesc(
            Long subjectId, 
            Term term
    );

    // ============================================================
    // QUERIES - BY COMPLETION STATUS
    // ============================================================
    
    /**
     * Find completed archived schedules for student
     */
    List<ArchivedDailySchedule> findByStudentIdAndCompletionStatusOrderByScheduledDateDesc(
            Long studentId, 
            String completionStatus
    );
    
    /**
     * Find incomplete/missed schedules for student in term
     */
    List<ArchivedDailySchedule> findByStudentIdAndTermAndCompletionStatusInOrderByScheduledDateDesc(
            Long studentId, 
            Term term, 
            List<String> statuses
    );

    // ============================================================
    // STATISTICS QUERIES
    // ============================================================
    
    /**
     * Count archived schedules by student and term
     */
    long countByStudentIdAndTerm(Long studentId, Term term);
    
    /**
     * Count completed schedules by student and term
     */
    @Query("SELECT COUNT(a) FROM ArchivedDailySchedule a " +
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
           "FROM ArchivedDailySchedule a " +
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
           "FROM ArchivedDailySchedule a " +
           "WHERE a.studentId = :studentId " +
           "AND a.term = :term " +
           "AND a.assessmentScore IS NOT NULL")
    Double calculateAverageScoreByStudentAndTerm(
            @Param("studentId") Long studentId, 
            @Param("term") Term term
    );

    // ============================================================
    // WEEKLY PROGRESS QUERIES
    // ============================================================
    
    /**
     * Get week-by-week completion statistics for student in term
     */
    @Query("SELECT a.termWeekNumber, " +
           "COUNT(*) as totalSchedules, " +
           "SUM(CASE WHEN a.completionStatus = 'COMPLETED' THEN 1 ELSE 0 END) as completedCount, " +
           "AVG(a.assessmentScore) as averageScore " +
           "FROM ArchivedDailySchedule a " +
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
           "COUNT(*) as totalSchedules, " +
           "SUM(CASE WHEN a.completionStatus = 'COMPLETED' THEN 1 ELSE 0 END) as completedCount, " +
           "AVG(a.assessmentScore) as averageScore " +
           "FROM ArchivedDailySchedule a " +
           "WHERE a.studentId = :studentId " +
           "AND a.term = :term " +
           "GROUP BY a.subjectName " +
           "ORDER BY a.subjectName")
    List<Object[]> getSubjectProgressStatsByStudentAndTerm(
            @Param("studentId") Long studentId, 
            @Param("term") Term term
    );

    // ============================================================
    // QUERIES - BY SCHEDULE SOURCE (CLASS vs INDIVIDUAL)
    // ============================================================
    
    /**
     * Find archived schedules by schedule source
     */
    List<ArchivedDailySchedule> findByStudentIdAndScheduleSourceOrderByScheduledDateDesc(
            Long studentId, 
            String scheduleSource
    );
    
    /**
     * Find archived INDIVIDUAL schedules for student in term
     */
    List<ArchivedDailySchedule> findByStudentIdAndTermAndScheduleSourceOrderByScheduledDateDesc(
            Long studentId, 
            Term term, 
            String scheduleSource
    );

    // ============================================================
    // CLEANUP QUERIES
    // ============================================================
    
    /**
     * Find archived schedules older than retention period
     */
    List<ArchivedDailySchedule> findByArchivedAtBefore(LocalDateTime beforeDate);
    
    /**
     * Count archived schedules older than retention period
     */
    long countByArchivedAtBefore(LocalDateTime beforeDate);
    


    // ============================================================
    // TREND ANALYSIS QUERIES
    // ============================================================
    
    @Query("SELECT a.term.id, a.term.name, " +
    	       "COUNT(*) as totalSchedules, " +
    	       "SUM(CASE WHEN a.completionStatus = 'COMPLETED' THEN 1 ELSE 0 END) as completedCount, " +
    	       "AVG(a.assessmentScore) as averageScore " +
    	       "FROM ArchivedDailySchedule a " +
    	       "WHERE a.studentId = :studentId " +
    	       "AND a.term.session.name = :academicYear " +
    	       "GROUP BY a.term.id, a.term.name " +
    	       "ORDER BY a.term.startDate")
    	List<Object[]> getTermlyProgressTrend(
    	        @Param("studentId") Long studentId,
    	        @Param("academicYear") String academicYear
    	);


    
    /**
     * Get attendance pattern (which days student most engaged)
     */
    @Query("SELECT a.dayOfWeek, " +
           "COUNT(*) as totalSchedules, " +
           "SUM(CASE WHEN a.completionStatus = 'COMPLETED' THEN 1 ELSE 0 END) as completedCount " +
           "FROM ArchivedDailySchedule a " +
           "WHERE a.studentId = :studentId " +
           "AND a.term = :term " +
           "GROUP BY a.dayOfWeek " +
           "ORDER BY a.dayOfWeek")
    List<Object[]> getAttendancePatternByStudentAndTerm(
            @Param("studentId") Long studentId, 
            @Param("term") Term term
    );
    
    
    /**
     * Delete archived schedules older than cutoff date
     * Returns count of deleted records
     */
    @Transactional
    @Modifying
    @Query("DELETE FROM ArchivedDailySchedule ads WHERE ads.archivedAt < :cutoffDate")
    int deleteByArchivedAtBefore(@Param("cutoffDate") LocalDateTime cutoffDate);
}