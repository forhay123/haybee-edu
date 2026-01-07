package com.edu.platform.repository.progress;

import com.edu.platform.model.LessonTopic;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.model.progress.StudentLessonProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface StudentLessonProgressRepository extends JpaRepository<StudentLessonProgress, Long> {

    // ============================================================
    // BASIC QUERIES - BY STUDENT PROFILE ENTITY
    // ============================================================
    
    /**
     * Find progress by student and lesson topic
     */
    List<StudentLessonProgress> findByStudentProfileAndLessonTopic(
            StudentProfile studentProfile,
            LessonTopic lessonTopic
    );

    /**
     * Find progress by student and scheduledDate
     */
    List<StudentLessonProgress> findByStudentProfileAndScheduledDate(
            StudentProfile studentProfile,
            LocalDate scheduledDate
    );

    /**
     * Find progress by student between scheduledDates
     */
    List<StudentLessonProgress> findByStudentProfileAndScheduledDateBetween(
            StudentProfile studentProfile,
            LocalDate fromDate,
            LocalDate toDate
    );

    /**
     * ✅ Find specific progress record by all identifying fields
     */
    Optional<StudentLessonProgress> findByStudentProfileAndLessonTopicAndScheduledDateAndPeriodNumber(
            StudentProfile studentProfile,
            LessonTopic lessonTopic,
            LocalDate scheduledDate,
            Integer periodNumber
    );

    /**
     * Check if progress exists
     */
    boolean existsByStudentProfileAndLessonTopicAndScheduledDateAndPeriodNumber(
            StudentProfile studentProfile,
            LessonTopic lessonTopic,
            LocalDate scheduledDate,
            Integer periodNumber
    );

    /**
     * Find all completed lessons for a student
     */
    List<StudentLessonProgress> findByStudentProfileAndCompletedTrue(StudentProfile studentProfile);

    /**
     * Find incomplete lessons for a student
     */
    List<StudentLessonProgress> findByStudentProfileAndCompletedFalse(StudentProfile studentProfile);

    /**
     * Find lessons by priority
     */
    List<StudentLessonProgress> findByStudentProfileAndPriority(
            StudentProfile studentProfile,
            Integer priority
    );

    /**
     * Count completed lessons for a student
     */
    long countByStudentProfileAndCompletedTrue(StudentProfile studentProfile);

    /**
     * Count total lessons for a student
     */
    long countByStudentProfile(StudentProfile studentProfile);
    
    List<StudentLessonProgress> findByStudentProfileAndLessonTopicAndScheduledDate(
            StudentProfile studentProfile, 
            LessonTopic lessonTopic, 
            LocalDate scheduledDate
    );
    
    /**
     * Find all progress records for a student and subject
     * Used for determining which lessons have already been assigned
     */
    List<StudentLessonProgress> findByStudentProfileAndSubject(
        StudentProfile studentProfile, 
        Subject subject
    );

    // ============================================================
    // QUERIES BY STUDENT PROFILE ID
    // ============================================================
    
    /**
     * ✅ NEW: Find all progress records for a specific student by ID
     * Used for maintenance and bulk operations
     */
    List<StudentLessonProgress> findByStudentProfileId(Long studentId);
    
    /**
     * ✅ NEW: Count incomplete lessons for a student
     */
    long countByStudentProfileIdAndCompletedFalseAndIncompleteReasonIsNotNull(Long studentId);

    /**
     * ✅ NEW: Find incomplete lessons for a student
     */
    List<StudentLessonProgress> findByStudentProfileIdAndCompletedFalseAndIncompleteReasonIsNotNull(
        Long studentId
    );

    /**
     * ✅ NEW: Find incomplete lessons by reason
     */
    List<StudentLessonProgress> findByStudentProfileIdAndIncompleteReason(
        Long studentId, 
        String reason
    );

    // ============================================================
    // ADVANCED QUERIES WITH JOIN FETCH
    // ============================================================
    
    /**
     * Find by student ID and assessment ID
     */
    @Query("SELECT slp FROM StudentLessonProgress slp " +
           "WHERE slp.studentProfile.id = :studentId " +
           "AND slp.assessment.id = :assessmentId")
    Optional<StudentLessonProgress> findByStudentProfileIdAndAssessmentId(
        @Param("studentId") Long studentId,
        @Param("assessmentId") Long assessmentId
    );
    
    /**
     * Find progress by student ID, lesson topic ID, and scheduled date
     */
    @Query("SELECT slp FROM StudentLessonProgress slp " +
           "WHERE slp.studentProfile.id = :studentId " +
           "AND slp.lessonTopic.id = :lessonTopicId " +
           "AND slp.scheduledDate = :date")
    Optional<StudentLessonProgress> findByStudentIdAndLessonTopicIdAndScheduledDate(
        @Param("studentId") Long studentId,
        @Param("lessonTopicId") Long lessonTopicId,
        @Param("date") LocalDate date
    );

    // ============================================================
    // INCOMPLETE LESSONS TRACKING
    // ============================================================
    
    /**
     * ✅ NEW: Find incomplete progress where grace period has expired
     */
    List<StudentLessonProgress> findByCompletedFalseAndAssessmentWindowEndBeforeAndIncompleteReasonIsNull(
        LocalDateTime now
    );

    /**
     * ✅ NEW: Find all incomplete lessons
     */
    List<StudentLessonProgress> findByCompletedFalseAndIncompleteReasonIsNotNull();
    
    /**
     * Find progress by student and scheduled date range with subject eagerly loaded
     * Note: Using lessonTopic and subject relationships from StudentLessonProgress entity
     */
    @Query("SELECT DISTINCT p FROM StudentLessonProgress p " +
           "LEFT JOIN FETCH p.lessonTopic lt " +
           "LEFT JOIN FETCH p.subject s " +
           "WHERE p.studentProfile = :student " +
           "AND p.scheduledDate BETWEEN :fromDate AND :toDate " +
           "ORDER BY p.scheduledDate ASC")
    List<StudentLessonProgress> findByStudentProfileAndScheduledDateBetweenWithSubject(
            @Param("student") StudentProfile student,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    /**
     * Find progress by student
     */
    List<StudentLessonProgress> findByStudentProfile(StudentProfile student);

    /**
     * Find by schedule ID (if you have this relationship)
     */
    @Query("SELECT p FROM StudentLessonProgress p WHERE p.id = :scheduleId")
    Optional<StudentLessonProgress> findByLessonScheduleId(@Param("scheduleId") Long scheduleId);

    // ============================================================
    // ROLE-BASED FILTERED QUERIES (CLASS, SUBJECT, TEACHER, ADMIN)
    // ============================================================

    /**
     * ✅ FIXED: Find all progress records by class ID and date range
     * Accesses class through StudentProfile.classLevel relationship
     * Returns all lessons for students enrolled in the specified class
     */
    @Query("SELECT DISTINCT p FROM StudentLessonProgress p " +
           "LEFT JOIN FETCH p.lessonTopic lt " +
           "LEFT JOIN FETCH p.subject s " +
           "LEFT JOIN FETCH p.studentProfile sp " +
           "LEFT JOIN FETCH sp.user u " +
           "WHERE sp.classLevel.id = :classId " +
           "AND p.scheduledDate BETWEEN :fromDate AND :toDate " +
           "ORDER BY p.scheduledDate DESC")
    List<StudentLessonProgress> findByClassIdAndScheduledDateBetween(
            @Param("classId") Long classId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    /**
     * ✅ FIXED: Find all progress records by subject ID and date range
     * Returns all lesson progress for a specific subject
     */
    @Query("SELECT DISTINCT p FROM StudentLessonProgress p " +
           "LEFT JOIN FETCH p.lessonTopic lt " +
           "LEFT JOIN FETCH p.subject s " +
           "LEFT JOIN FETCH p.studentProfile sp " +
           "LEFT JOIN FETCH sp.user u " +
           "WHERE p.subject.id = :subjectId " +
           "AND p.scheduledDate BETWEEN :fromDate AND :toDate " +
           "ORDER BY p.scheduledDate DESC")
    List<StudentLessonProgress> findBySubjectIdAndScheduledDateBetween(
            @Param("subjectId") Long subjectId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    /**
     * ✅ FIXED: Find all progress records by teacher ID and date range
     * 
     * This query retrieves lessons for all subjects taught by a specific teacher.
     * Uses EXISTS with a subquery to check if the subject belongs to the teacher.
     * 
     * The query structure:
     * 1. Main query fetches StudentLessonProgress with all related entities
     * 2. EXISTS subquery checks if subject is in teacher's subjects set
     * 3. Filters by date range and orders by scheduled date
     */
    @Query("SELECT DISTINCT p FROM StudentLessonProgress p " +
           "LEFT JOIN FETCH p.lessonTopic lt " +
           "LEFT JOIN FETCH p.subject s " +
           "LEFT JOIN FETCH p.studentProfile sp " +
           "LEFT JOIN FETCH sp.user u " +
           "WHERE EXISTS (" +
           "  SELECT 1 FROM TeacherProfile tp " +
           "  JOIN tp.subjects sub " +
           "  WHERE tp.id = :teacherId " +
           "  AND sub.id = p.subject.id" +
           ") " +
           "AND p.scheduledDate BETWEEN :fromDate AND :toDate " +
           "ORDER BY p.scheduledDate DESC")
    List<StudentLessonProgress> findByTeacherIdAndScheduledDateBetween(
            @Param("teacherId") Long teacherId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    /**
     * ✅ FIXED: Find all progress records in date range (ADMIN)
     * Returns all lesson progress across the entire system for the specified date range
     */
    @Query("SELECT DISTINCT p FROM StudentLessonProgress p " +
           "LEFT JOIN FETCH p.lessonTopic lt " +
           "LEFT JOIN FETCH p.subject s " +
           "LEFT JOIN FETCH p.studentProfile sp " +
           "LEFT JOIN FETCH sp.user u " +
           "WHERE p.scheduledDate BETWEEN :fromDate AND :toDate " +
           "ORDER BY p.scheduledDate DESC")
    List<StudentLessonProgress> findByScheduledDateBetween(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    // ================================================================
    // 📌 ADDITIONAL UTILITY METHODS
    // ================================================================

    /**
     * Count completed lessons for a student
     */
    @Query("SELECT COUNT(p) FROM StudentLessonProgress p " +
           "WHERE p.studentProfile = :student " +
           "AND p.completed = true")
    long countCompletedByStudent(@Param("student") StudentProfile student);

    /**
     * Find incomplete lessons before a date
     */
    @Query("SELECT p FROM StudentLessonProgress p " +
           "WHERE p.studentProfile = :student " +
           "AND p.completed = false " +
           "AND p.scheduledDate < :date")
    List<StudentLessonProgress> findIncompleteBeforeDate(
            @Param("student") StudentProfile student,
            @Param("date") LocalDate date);
    
    
    /**
     * ✅ NEW: Find incomplete lessons without incomplete reason
     */
    List<StudentLessonProgress> findByStudentProfileAndCompletedFalseAndIncompleteReasonIsNull(
        StudentProfile studentProfile
    );
    

    // ============================================================
    // PHASE 1: MULTI-PERIOD ASSESSMENT QUERIES
    // ============================================================
    
    /**
     * Find all progress records for a lesson topic in a week (for multi-period linking)
     */
    List<StudentLessonProgress> findByStudentProfileAndLessonTopicAndScheduledDateBetweenOrderByPeriodSequenceAsc(
            StudentProfile studentProfile,
            LessonTopic lessonTopic,
            LocalDate startDate,
            LocalDate endDate
    );
    
    /**
     * Find progress by lesson topic and week range
     */
    @Query("SELECT slp FROM StudentLessonProgress slp " +
           "WHERE slp.lessonTopic = :lessonTopic " +
           "AND slp.scheduledDate BETWEEN :startDate AND :endDate " +
           "ORDER BY slp.scheduledDate ASC, slp.periodNumber ASC")
    List<StudentLessonProgress> findByLessonTopicAndWeekRange(
            @Param("lessonTopic") LessonTopic lessonTopic,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
    
    /**
     * Find all progress records for a student, lesson topic, and week
     * Used to track completion across multiple periods
     */
    @Query("SELECT slp FROM StudentLessonProgress slp " +
           "WHERE slp.studentProfile = :student " +
           "AND slp.lessonTopic = :topic " +
           "AND slp.scheduledDate BETWEEN :weekStart AND :weekEnd " +
           "ORDER BY slp.periodSequence ASC")
    List<StudentLessonProgress> findAllPeriodsForTopicInWeek(
            @Param("student") StudentProfile student,
            @Param("topic") LessonTopic topic,
            @Param("weekStart") LocalDate weekStart,
            @Param("weekEnd") LocalDate weekEnd
    );
    
    /**
     * Count total periods for a lesson topic in a week
     */
    @Query("SELECT COUNT(slp) FROM StudentLessonProgress slp " +
           "WHERE slp.studentProfile = :student " +
           "AND slp.lessonTopic = :topic " +
           "AND slp.scheduledDate BETWEEN :weekStart AND :weekEnd")
    long countPeriodsForTopicInWeek(
            @Param("student") StudentProfile student,
            @Param("topic") LessonTopic topic,
            @Param("weekStart") LocalDate weekStart,
            @Param("weekEnd") LocalDate weekEnd
    );
    
    /**
     * Count completed periods for a lesson topic in a week
     */
    @Query("SELECT COUNT(slp) FROM StudentLessonProgress slp " +
           "WHERE slp.studentProfile = :student " +
           "AND slp.lessonTopic = :topic " +
           "AND slp.scheduledDate BETWEEN :weekStart AND :weekEnd " +
           "AND slp.completed = true")
    long countCompletedPeriodsForTopicInWeek(
            @Param("student") StudentProfile student,
            @Param("topic") LessonTopic topic,
            @Param("weekStart") LocalDate weekStart,
            @Param("weekEnd") LocalDate weekEnd
    );
    
    /**
     * Check if all periods for a topic are completed
     */
    @Query("SELECT CASE WHEN COUNT(slp) = COUNT(CASE WHEN slp.completed = true THEN 1 END) " +
           "THEN true ELSE false END " +
           "FROM StudentLessonProgress slp " +
           "WHERE slp.studentProfile = :student " +
           "AND slp.lessonTopic = :topic " +
           "AND slp.scheduledDate BETWEEN :weekStart AND :weekEnd")
    boolean areAllPeriodsCompletedForTopic(
            @Param("student") StudentProfile student,
            @Param("topic") LessonTopic topic,
            @Param("weekStart") LocalDate weekStart,
            @Param("weekEnd") LocalDate weekEnd
    );

    // ============================================================
    // LINKED PROGRESS QUERIES (MULTI-PERIOD)
    // ============================================================
    
    /**
     * Find progress by period sequence
     */
    List<StudentLessonProgress> findByStudentProfileAndLessonTopicAndPeriodSequence(
            StudentProfile studentProfile,
            LessonTopic lessonTopic,
            Integer periodSequence
    );
    
    /**
     * Find progress records with all periods completed flag
     */
    @Query("SELECT slp FROM StudentLessonProgress slp " +
           "WHERE slp.studentProfile = :student " +
           "AND slp.allPeriodsCompleted = true " +
           "AND slp.scheduledDate BETWEEN :startDate AND :endDate")
    List<StudentLessonProgress> findCompletedTopicsInWeek(
            @Param("student") StudentProfile student,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
    
    /**
     * Find progress records with incomplete periods
     */
    @Query("SELECT slp FROM StudentLessonProgress slp " +
           "WHERE slp.studentProfile = :student " +
           "AND slp.allPeriodsCompleted = false " +
           "AND slp.totalPeriodsInSequence > 1 " +
           "AND slp.scheduledDate BETWEEN :startDate AND :endDate")
    List<StudentLessonProgress> findIncompleteMultiPeriodTopicsInWeek(
            @Param("student") StudentProfile student,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // ============================================================
    // ASSESSMENT WINDOW QUERIES (PHASE 5 PREPARATION)
    // ============================================================
    
    /**
     * Find progress where assessment is accessible
     */
    @Query("SELECT slp FROM StudentLessonProgress slp " +
           "WHERE slp.studentProfile = :student " +
           "AND slp.assessmentAccessible = true " +
           "AND slp.completed = false " +
           "ORDER BY slp.assessmentWindowEnd ASC")
    List<StudentLessonProgress> findAccessibleAssessments(@Param("student") StudentProfile student);
    
    /**
     * Find progress where assessment window is open
     */
    @Query("SELECT slp FROM StudentLessonProgress slp " +
           "WHERE slp.assessmentAccessible = true " +
           "AND slp.completed = false " +
           "AND slp.assessmentWindowStart <= :now " +
           "AND slp.assessmentWindowEnd >= :now")
    List<StudentLessonProgress> findCurrentlyOpenAssessments(@Param("now") LocalDateTime now);
    
    /**
     * Find progress where assessment window will open soon
     */
    @Query("SELECT slp FROM StudentLessonProgress slp " +
           "WHERE slp.assessmentAccessible = false " +
           "AND slp.completed = false " +
           "AND slp.assessmentWindowStart BETWEEN :now AND :soon")
    List<StudentLessonProgress> findUpcomingAssessments(
            @Param("now") LocalDateTime now,
            @Param("soon") LocalDateTime soon
    );
    
    /**
     * Count accessible assessments for a student
     */
    @Query("SELECT COUNT(slp) FROM StudentLessonProgress slp " +
           "WHERE slp.studentProfile = :student " +
           "AND slp.assessmentAccessible = true " +
           "AND slp.completed = false")
    long countAccessibleAssessments(@Param("student") StudentProfile student);

    // ============================================================
    // INCOMPLETE REASON QUERIES (EXPANDED)
    // ============================================================
    
    /**
     * Find progress by incomplete reason and date range
     */
    @Query("SELECT slp FROM StudentLessonProgress slp " +
           "WHERE slp.studentProfile = :student " +
           "AND slp.incompleteReason = :reason " +
           "AND slp.scheduledDate BETWEEN :startDate AND :endDate")
    List<StudentLessonProgress> findByStudentAndIncompleteReasonAndDateRange(
            @Param("student") StudentProfile student,
            @Param("reason") String reason,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
    
    /**
     * Count incomplete by reason
     */
    @Query("SELECT COUNT(slp) FROM StudentLessonProgress slp " +
           "WHERE slp.studentProfile = :student " +
           "AND slp.incompleteReason = :reason")
    long countByStudentAndIncompleteReason(
            @Param("student") StudentProfile student,
            @Param("reason") String reason
    );
    
    /**
     * Find all progress with specific incomplete reason
     */
    List<StudentLessonProgress> findByIncompleteReasonAndScheduledDateBetween(
            String incompleteReason,
            LocalDate startDate,
            LocalDate endDate
    );
    
    /**
     * Get incomplete reason breakdown for a student
     */
    @Query("SELECT slp.incompleteReason, COUNT(slp) " +
           "FROM StudentLessonProgress slp " +
           "WHERE slp.studentProfile = :student " +
           "AND slp.incompleteReason IS NOT NULL " +
           "GROUP BY slp.incompleteReason")
    List<Object[]> getIncompleteReasonBreakdown(@Param("student") StudentProfile student);

    // ============================================================
    // ARCHIVAL SUPPORT QUERIES
    // ============================================================
    
    /**
     * Find progress to archive (old week's progress)
     */
    @Query("SELECT slp FROM StudentLessonProgress slp " +
           "WHERE slp.scheduledDate BETWEEN :startDate AND :endDate")
    List<StudentLessonProgress> findProgressToArchive(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
    
    /**
     * Find progress by student for archival
     */
    @Query("SELECT slp FROM StudentLessonProgress slp " +
           "WHERE slp.studentProfile = :student " +
           "AND slp.scheduledDate BETWEEN :startDate AND :endDate")
    List<StudentLessonProgress> findProgressToArchiveForStudent(
            @Param("student") StudentProfile student,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
    
    /**
     * Delete progress records for a week (after archival)
     */
    @Transactional
    @Modifying
    @Query("DELETE FROM StudentLessonProgress slp " +
           "WHERE slp.scheduledDate BETWEEN :startDate AND :endDate")
    void deleteProgressForWeek(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
    
    /**
     * Delete progress for a student in a week (after archival)
     */
    @Transactional
    @Modifying
    @Query("DELETE FROM StudentLessonProgress slp " +
           "WHERE slp.studentProfile = :student " +
           "AND slp.scheduledDate BETWEEN :startDate AND :endDate")
    void deleteProgressForStudentInWeek(
            @Param("student") StudentProfile student,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // ============================================================
    // WEEKLY STATISTICS QUERIES
    // ============================================================
    
    /**
     * Get completion statistics for a student in a week
     */
    @Query("SELECT " +
           "COUNT(slp), " +
           "SUM(CASE WHEN slp.completed = true THEN 1 ELSE 0 END), " +
           "AVG(CASE WHEN slp.completed = true AND slp.assessment IS NOT NULL THEN 100.0 ELSE 0 END) " +
           "FROM StudentLessonProgress slp " +
           "WHERE slp.studentProfile = :student " +
           "AND slp.scheduledDate BETWEEN :startDate AND :endDate")
    Object[] getWeeklyStatistics(
            @Param("student") StudentProfile student,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
    
    /**
     * Count progress records for a week
     */
    @Query("SELECT COUNT(slp) FROM StudentLessonProgress slp " +
           "WHERE slp.scheduledDate BETWEEN :startDate AND :endDate")
    long countProgressForWeek(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
    
    /**
     * Find all students with progress in a week
     */
    @Query("SELECT DISTINCT slp.studentProfile FROM StudentLessonProgress slp " +
           "WHERE slp.scheduledDate BETWEEN :startDate AND :endDate")
    List<StudentProfile> findStudentsWithProgressInWeek(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // ============================================================
    // TOPIC AVERAGE SCORE QUERIES
    // ============================================================
    
    /**
     * Calculate average score for a lesson topic across all periods
     */
    @Query("SELECT AVG(slp.topicAverageScore) " +
           "FROM StudentLessonProgress slp " +
           "WHERE slp.studentProfile = :student " +
           "AND slp.lessonTopic = :topic " +
           "AND slp.topicAverageScore IS NOT NULL")
    Double calculateAverageScoreForTopic(
            @Param("student") StudentProfile student,
            @Param("topic") LessonTopic topic
    );
    
    /**
     * Find progress records with topic average score calculated
     */
    @Query("SELECT slp FROM StudentLessonProgress slp " +
           "WHERE slp.studentProfile = :student " +
           "AND slp.topicAverageScore IS NOT NULL " +
           "AND slp.scheduledDate BETWEEN :startDate AND :endDate " +
           "ORDER BY slp.topicAverageScore DESC")
    List<StudentLessonProgress> findProgressWithScoresInWeek(
            @Param("student") StudentProfile student,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
    
    @Transactional
    @Modifying
    @Query("DELETE FROM StudentLessonProgress slp WHERE slp.studentProfile = :student " +
           "AND slp.scheduledDate BETWEEN :startDate AND :endDate " +
           "AND slp.completed = false")
    int deleteIncompleteProgressForStudent(
        @Param("student") StudentProfile student,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );

    @Query("SELECT COUNT(slp) FROM StudentLessonProgress slp " +
           "WHERE slp.studentProfile = :student " +
           "AND slp.scheduledDate BETWEEN :startDate AND :endDate " +
           "AND slp.completed = true")
    int countCompletedProgressForStudent(
        @Param("student") StudentProfile student,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );

    @Query("SELECT COUNT(slp) FROM StudentLessonProgress slp " +
           "WHERE slp.studentProfile = :student " +
           "AND slp.scheduledDate BETWEEN :startDate AND :endDate " +
           "AND slp.completed = false")
    int countIncompleteProgressForStudent(
        @Param("student") StudentProfile student,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    

    // ===================================================================
    // ✅ NEW METHODS FOR SPRINT 5: Assessment Windows & Accessibility
    // ===================================================================

    /**
     * Find progress records that should become accessible now
     * Used by AssessmentWindowOpenerTask
     */
    @Query("SELECT p FROM StudentLessonProgress p WHERE " +
           "p.assessmentAccessible = false AND " +
           "p.assessmentWindowStart <= :now AND " +
           "p.scheduledDate BETWEEN :startDate AND :endDate AND " +
           "p.completed = false AND " +
           "p.incompleteReason IS NULL")
    List<StudentLessonProgress> findByAssessmentAccessibleFalseAndAssessmentWindowStartBeforeAndScheduledDateBetween(
            @Param("now") LocalDateTime now,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    @Query("SELECT p FROM StudentLessonProgress p WHERE " +
    	   "p.completed = false AND " +
    	   "p.incompleteReason IS NULL AND " +
    	   "p.assessmentSubmissionId IS NULL AND " +
    	   "p.gracePeriodEnd < :graceBuffer")
    List<StudentLessonProgress> findExpiredAssessments(
    	    @Param("graceBuffer") LocalDateTime graceBuffer
    );

    /**
     * Count expired assessments since a specific date
     * Used for reporting
     */
    @Query("SELECT COUNT(p) FROM StudentLessonProgress p WHERE " +
           "p.incompleteReason = 'MISSED_GRACE_PERIOD' AND " +
           "p.autoMarkedIncompleteAt >= :since")
    long countExpiredAssessmentsSince(@Param("since") LocalDateTime since);

    /**
     * Get expired assessments for a specific student
     * Used for student progress reports
     */
    @Query("SELECT p FROM StudentLessonProgress p WHERE " +
           "p.studentProfile.id = :studentProfileId AND " +
           "p.incompleteReason = 'MISSED_GRACE_PERIOD' " +
           "ORDER BY p.autoMarkedIncompleteAt DESC")
    List<StudentLessonProgress> findExpiredAssessmentsForStudent(
            @Param("studentProfileId") Long studentProfileId
    );

    /**
     * Find all progress records in grace period
     * (past windowEnd but before grace deadline)
     */
    @Query("SELECT p FROM StudentLessonProgress p WHERE " +
           "p.completed = false AND " +
           "p.incompleteReason IS NULL AND " +
           "p.assessmentWindowEnd < :now AND " +
           "p.assessmentWindowEnd > :graceBuffer")
    List<StudentLessonProgress> findInGracePeriod(
            @Param("now") LocalDateTime now,
            @Param("graceBuffer") LocalDateTime graceBuffer
    );

    /**
     * Find assessments accessible to a student today
     */
    @Query("SELECT p FROM StudentLessonProgress p WHERE " +
           "p.studentProfile.id = :studentProfileId AND " +
           "p.scheduledDate = :date AND " +
           "p.assessmentAccessible = true AND " +
           "p.completed = false AND " +
           "p.incompleteReason IS NULL")
    List<StudentLessonProgress> findAccessibleAssessmentsForStudentToday(
            @Param("studentProfileId") Long studentProfileId,
            @Param("date") LocalDate date
    );

    /**
     * Find upcoming assessments (not yet accessible)
     */
    @Query("SELECT p FROM StudentLessonProgress p WHERE " +
           "p.studentProfile.id = :studentProfileId AND " +
           "p.assessmentWindowStart > :now AND " +
           "p.completed = false AND " +
           "p.incompleteReason IS NULL " +
           "ORDER BY p.assessmentWindowStart ASC")
    List<StudentLessonProgress> findUpcomingAssessmentsForStudent(
            @Param("studentProfileId") Long studentProfileId,
            @Param("now") LocalDateTime now
    );

    /**
     * Find specific progress record by student, date, and period number
     */
    Optional<StudentLessonProgress> findByStudentProfileAndScheduledDateAndPeriodNumber(
        StudentProfile studentProfile,
        LocalDate scheduledDate,
        Integer periodNumber
    );
    
    @Transactional
    @Modifying
    @Query("""
        UPDATE StudentLessonProgress p
        SET p.completed = false,
            p.completedAt = null,
            p.incompleteReason = 'MISSED_LESSON'
        WHERE p.studentProfile.id = :studentId
          AND p.scheduledDate BETWEEN :start AND :end
    """)
    int markPastLessonsAsIncomplete(
            @Param("studentId") Long studentId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end
    );
    

    /**
     * Check if progress exists for student, date, and period
     */
    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END " +
           "FROM StudentLessonProgress p " +
           "WHERE p.studentProfile.id = :studentProfileId " +
           "AND p.scheduledDate = :scheduledDate " +
           "AND p.periodNumber = :periodNumber")
    boolean existsByStudentProfileIdAndScheduledDateAndPeriodNumber(
        @Param("studentProfileId") Long studentProfileId,
        @Param("scheduledDate") LocalDate scheduledDate,
        @Param("periodNumber") Integer periodNumber
    );
    
    
    @Modifying
    @Query("DELETE FROM StudentLessonProgress slp WHERE slp.scheduledDate BETWEEN :startDate AND :endDate")
    long deleteByScheduledDateBetween(@Param("startDate") LocalDate startDate, 
                                       @Param("endDate") LocalDate endDate);
    
    

    
    /**
     * ✅ NEW: Find progress by student, date, and lesson topic
     * Used during regeneration to preserve existing submissions
     */
    Optional<StudentLessonProgress> findByStudentProfileAndScheduledDateAndLessonTopic(
        StudentProfile studentProfile, 
        LocalDate scheduledDate, 
        LessonTopic lessonTopic
    );
    
    /**
     * ✅ NEW: Find all progress records with submissions for a student and date range
     * Used to preserve submissions during regeneration
     */
    List<StudentLessonProgress> findByStudentProfileAndScheduledDateBetweenAndAssessmentSubmissionIsNotNull(
        StudentProfile studentProfile,
        LocalDate startDate,
        LocalDate endDate
    );
    

	/**
	 * ✅ NEW: Find progress by date range and student
	 * Used during schedule deletion to find associated progress records
	 */
	List<StudentLessonProgress> findByScheduledDateBetweenAndStudentProfile(
	    LocalDate startDate,
	    LocalDate endDate,
	    StudentProfile studentProfile
	);

    
    /**
     * ✅ NEW: Check if progress has a submission
     */
    default boolean hasSubmission(StudentLessonProgress progress) {
        return progress.getAssessmentSubmission() != null;
    }
    
    /**
     * ✅ NEW: Find progress by student ID and lesson topic ID
     * Used for diagnostic queries
     */
    List<StudentLessonProgress> findByStudentProfileIdAndLessonTopicId(
        Long studentId, 
        Long lessonTopicId
    );
    
    /**
     * ✅ NEW: Find ALL progress records by student and assessment
     * Returns list to handle multi-period lessons
     */
    @Query("SELECT slp FROM StudentLessonProgress slp " +
           "WHERE slp.studentProfile.id = :studentId " +
           "AND slp.assessment.id = :assessmentId " +
           "ORDER BY slp.periodSequence ASC")
    List<StudentLessonProgress> findAllByStudentProfileIdAndAssessmentId(
        @Param("studentId") Long studentId,
        @Param("assessmentId") Long assessmentId
    );
    
	
	/**
	 * Find all progress records for a specific student and subject
	 * Used by multi-period controllers to get all periods for a student/subject combo
	 */
    /**
     * Find all progress records for a specific student and subject
     * Used by multi-period controllers to get all periods for a student/subject combo
     */
    @Query("SELECT slp FROM StudentLessonProgress slp " +
           "WHERE slp.studentProfile.id = :studentProfileId " +
           "AND slp.subject.id = :subjectId")
    List<StudentLessonProgress> findByStudentProfileIdAndSubjectId(
        @Param("studentProfileId") Long studentProfileId,
        @Param("subjectId") Long subjectId
    );
    
    boolean existsByStudentProfileAndScheduledDateAndLessonTopic(
    	    StudentProfile studentProfile,
    	    LocalDate scheduledDate,
    	    LessonTopic lessonTopic
    	);
}