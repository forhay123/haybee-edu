package com.edu.platform.repository;

import com.edu.platform.model.DailySchedule;
import com.edu.platform.model.LessonTopic;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.model.assessment.Assessment;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DailyScheduleRepository extends JpaRepository<DailySchedule, Long> {
    
    /**
     * Find schedules by date
     */
    List<DailySchedule> findByScheduledDateOrderByPeriodNumberAsc(LocalDate scheduledDate);
    
    /**
     * Find schedules between dates
     */
    List<DailySchedule> findByScheduledDateBetweenOrderByScheduledDateAscPeriodNumberAsc(
            LocalDate fromDate, LocalDate toDate);
    
    /**
     * Find schedules from a date onwards
     */
    List<DailySchedule> findByScheduledDateGreaterThanEqualOrderByScheduledDateAscPeriodNumberAsc(
            LocalDate fromDate);
    
    /**
     * Find schedules up to a date
     */
    List<DailySchedule> findByScheduledDateLessThanEqualOrderByScheduledDateAscPeriodNumberAsc(
            LocalDate toDate);
    
    /**
     * Find all schedules ordered
     */
    List<DailySchedule> findAllByOrderByScheduledDateAscPeriodNumberAsc();
    
    /**
     * Check if schedule exists for date and period
     */
    boolean existsByScheduledDateAndPeriodNumber(LocalDate scheduledDate, Integer periodNumber);
    
    /**
     * Find schedules by subject
     */
    List<DailySchedule> findBySubjectIdOrderByScheduledDateAscPeriodNumberAsc(Long subjectId);
    
    /**
     * Find schedules by lesson topic
     */
    List<DailySchedule> findByLessonTopicIdOrderByScheduledDateAscPeriodNumberAsc(Long lessonTopicId);
    
    /**
     * Check if schedule exists for student, date, and period
     */
    boolean existsByStudentProfileAndScheduledDateAndPeriodNumber(
            StudentProfile studentProfile, LocalDate date, Integer periodNumber);
    
    /**
     * Find all schedules for a specific student on a specific date
     */
    @EntityGraph(attributePaths = {"studentProfile", "subject", "lessonTopic"})
    List<DailySchedule> findByStudentProfileAndScheduledDate(
            StudentProfile studentProfile, LocalDate date);
    
    /**
     * Find all schedules for a specific student between dates
     */
    @EntityGraph(attributePaths = {"studentProfile", "subject", "lessonTopic"})
    List<DailySchedule> findByStudentProfileAndScheduledDateBetween(
            StudentProfile studentProfile, LocalDate fromDate, LocalDate toDate);
    
    /**
     * Find schedules for a student ordered by date and period
     */
    @EntityGraph(attributePaths = {"studentProfile", "subject", "lessonTopic"})
    List<DailySchedule> findByStudentProfileOrderByScheduledDateAscPeriodNumberAsc(
            StudentProfile studentProfile);
    
    /**
     * ✅ NEW: Find specific schedule by all identifiers
     */
    @EntityGraph(attributePaths = {"studentProfile", "subject", "lessonTopic"})
    Optional<DailySchedule> findByStudentProfileAndLessonTopicAndScheduledDateAndPeriodNumber(
            StudentProfile studentProfile,
            LessonTopic lessonTopic,
            LocalDate scheduledDate,
            Integer periodNumber
    );
    
    /**
     * ✅ NEW: Check if exact schedule exists (prevents duplicates)
     */
    boolean existsByStudentProfileAndLessonTopicAndScheduledDateAndPeriodNumber(
            StudentProfile studentProfile,
            LessonTopic lessonTopic,
            LocalDate scheduledDate,
            Integer periodNumber
    );
    
    /**
     * ✅ NEW: Find schedules for a lesson topic on a date
     */
    @EntityGraph(attributePaths = {"studentProfile", "subject", "lessonTopic"})
    List<DailySchedule> findByLessonTopicAndScheduledDate(
            LessonTopic lessonTopic,
            LocalDate scheduledDate
    );
    
    /**
     * ✅ NEW: Delete old schedules before a date (for cleanup)
     */
    @Transactional
    @Modifying
    @Query("DELETE FROM DailySchedule d WHERE d.scheduledDate < :beforeDate")
    void deleteByScheduledDateBefore(@Param("beforeDate") LocalDate beforeDate);




    /**
     * Find schedules by student and schedule source (CLASS or INDIVIDUAL)
     */
    @EntityGraph(attributePaths = {"studentProfile", "subject", "lessonTopic"})
    List<DailySchedule> findByStudentProfileAndScheduleSourceOrderByScheduledDateAscPeriodNumberAsc(
            StudentProfile studentProfile, String scheduleSource);
    
    /**
     * Find all schedules linked to a specific individual timetable
     */
    @EntityGraph(attributePaths = {"studentProfile", "subject", "lessonTopic"})
    List<DailySchedule> findByIndividualTimetableIdOrderByScheduledDateAscPeriodNumberAsc(
            Long individualTimetableId);
	
	/**
	 * Find all schedules linked to a specific individual timetable (without ordering)
	 */
	@EntityGraph(attributePaths = {"studentProfile", "subject", "lessonTopic"})
	List<DailySchedule> findByIndividualTimetableId(Long individualTimetableId);
	    
    /**
     * Delete schedules for a student on a specific date (for regeneration)
     */
    @Transactional
    @Modifying
    @Query("DELETE FROM DailySchedule d WHERE d.studentProfile = :student AND d.scheduledDate = :date")
    void deleteByStudentProfileAndScheduleDate(
            @Param("student") StudentProfile student, 
            @Param("date") LocalDate date);
    
    /**
     * Delete all schedules for a specific individual timetable
     */
    @Transactional
    @Modifying
    @Query("DELETE FROM DailySchedule d WHERE d.individualTimetableId = :timetableId")
    void deleteByIndividualTimetableId(@Param("timetableId") Long timetableId);
    
    /**
     * Count schedules by student and source
     */
    long countByStudentProfileAndScheduleSource(StudentProfile studentProfile, String scheduleSource);
    
    /**
     * Find schedules by student, date, and source
     */
    @EntityGraph(attributePaths = {"studentProfile", "subject", "lessonTopic"})
    List<DailySchedule> findByStudentProfileAndScheduledDateAndScheduleSource(
            StudentProfile studentProfile, LocalDate date, String scheduleSource);
    
    /**
     * Check if INDIVIDUAL schedule exists for student on date
     */
    boolean existsByStudentProfileAndScheduledDateAndScheduleSource(
            StudentProfile studentProfile, LocalDate date, String scheduleSource);


    /**
     * Count schedules for a student on a specific date with schedule source
     */
    long countByStudentProfileAndScheduledDateAndScheduleSource(
            StudentProfile studentProfile,
            LocalDate scheduledDate,
            String scheduleSource);

    /**
     * Delete schedules by student, date, and source
     */
    @Transactional
    @Modifying
    @Query("DELETE FROM DailySchedule d WHERE d.studentProfile = :student " +
           "AND d.scheduledDate = :date AND d.scheduleSource = :source")
    void deleteByStudentProfileAndScheduledDateAndScheduleSource(
            @Param("student") StudentProfile student,
            @Param("date") LocalDate date,
            @Param("source") String source);

    /**
     * Delete schedules by student, date range, and source
     */
    @Transactional
    @Modifying
    @Query("DELETE FROM DailySchedule d WHERE d.studentProfile = :student " +
           "AND d.scheduledDate BETWEEN :startDate AND :endDate " +
           "AND d.scheduleSource = :source")
    void deleteByStudentProfileAndScheduledDateBetweenAndScheduleSource(
            @Param("student") StudentProfile student,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("source") String source);

    /**
     * Find schedules by student, date, and source (ordered)
     */
    @EntityGraph(attributePaths = {"studentProfile", "subject", "lessonTopic"})
    List<DailySchedule> findByStudentProfileAndScheduledDateAndScheduleSourceOrderByPeriodNumber(
            StudentProfile studentProfile,
            LocalDate scheduledDate,
            String scheduleSource);

    /**
     * Find schedules by student, date range, and source (ordered)
     */
    @EntityGraph(attributePaths = {"studentProfile", "subject", "lessonTopic"})
    List<DailySchedule> findByStudentProfileAndScheduledDateBetweenAndScheduleSourceOrderByScheduledDateAscPeriodNumberAsc(
            StudentProfile studentProfile,
            LocalDate startDate,
            LocalDate endDate,
            String scheduleSource);
    
    
    /**
     * ✅ NEW: Find by student and assessment
     */
    Optional<DailySchedule> findByStudentProfileAndAssessment(
        StudentProfile student, 
        Assessment assessment
    );

    /**
     * ✅ NEW: Find by student ID and assessment ID
     */
    @Query("SELECT ds FROM DailySchedule ds " +
           "WHERE ds.studentProfile.id = :studentId " +
           "AND ds.assessment.id = :assessmentId")
    Optional<DailySchedule> findByStudentProfileIdAndAssessmentId(
        @Param("studentId") Long studentId,
        @Param("assessmentId") Long assessmentId
    );

    /**
     * ✅ NEW: Find by student, date, and period
     */
    Optional<DailySchedule> findByStudentProfileAndScheduledDateAndPeriodNumber(
        StudentProfile studentProfile,
        LocalDate scheduledDate,
        Integer periodNumber
    );
    
    

    // ============================================================
    // PHASE 1: MULTI-PERIOD ASSESSMENT QUERIES
    // ============================================================
    
    /**
     * Find all schedules for a lesson topic in a week (for multi-period linking)
     */
    @EntityGraph(attributePaths = {"studentProfile", "subject", "lessonTopic"})
    List<DailySchedule> findByStudentProfileAndLessonTopicAndScheduledDateBetweenOrderByScheduledDateAsc(
            StudentProfile studentProfile,
            LessonTopic lessonTopic,
            LocalDate startDate,
            LocalDate endDate
    );
    
    /**
     * Find schedules by lesson topic and week range
     */
    @Query("SELECT ds FROM DailySchedule ds " +
           "WHERE ds.lessonTopic = :lessonTopic " +
           "AND ds.scheduledDate BETWEEN :startDate AND :endDate " +
           "ORDER BY ds.scheduledDate ASC, ds.periodNumber ASC")
    List<DailySchedule> findByLessonTopicAndWeekRange(
            @Param("lessonTopic") LessonTopic lessonTopic,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
    
    /**
     * Find all schedules with missing lesson topics (for notification)
     */
    @EntityGraph(attributePaths = {"studentProfile", "subject"})
    List<DailySchedule> findByMissingLessonTopicTrueAndScheduleSource(String scheduleSource);
    
    /**
     * Find schedules with missing topics for a specific week
     */
    @Query("SELECT ds FROM DailySchedule ds " +
           "WHERE ds.missingLessonTopic = true " +
           "AND ds.scheduleSource = :scheduleSource " +
           "AND ds.scheduledDate BETWEEN :startDate AND :endDate")
    List<DailySchedule> findMissingTopicsForWeek(
            @Param("scheduleSource") String scheduleSource,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
    
    /**
     * Find schedules with conflicts
     */
    @EntityGraph(attributePaths = {"studentProfile", "subject", "lessonTopic"})
    List<DailySchedule> findByHasScheduleConflictTrueAndScheduleSource(String scheduleSource);
    
    /**
     * Count schedules with missing topics
     */
    long countByMissingLessonTopicTrueAndScheduleSource(String scheduleSource);
    
    /**
     * Count schedules with conflicts
     */
    long countByHasScheduleConflictTrueAndScheduleSource(String scheduleSource);

    // ============================================================
    // LINKED SCHEDULES QUERIES (MULTI-PERIOD)
    // ============================================================
    
    /**
     * Find all schedules for a student, lesson topic, and week
     * Used to identify all periods of a multi-period topic
     */
    @Query("SELECT ds FROM DailySchedule ds " +
           "WHERE ds.studentProfile = :student " +
           "AND ds.lessonTopic = :topic " +
           "AND ds.scheduledDate BETWEEN :weekStart AND :weekEnd " +
           "ORDER BY ds.periodSequence ASC")
    List<DailySchedule> findAllPeriodsForTopicInWeek(
            @Param("student") StudentProfile student,
            @Param("topic") LessonTopic topic,
            @Param("weekStart") LocalDate weekStart,
            @Param("weekEnd") LocalDate weekEnd
    );
    
    /**
     * Find schedules by period sequence
     */
    List<DailySchedule> findByStudentProfileAndLessonTopicAndPeriodSequence(
            StudentProfile studentProfile,
            LessonTopic lessonTopic,
            Integer periodSequence
    );
    
    /**
     * Count total periods for a lesson topic in a week
     */
    @Query("SELECT COUNT(ds) FROM DailySchedule ds " +
           "WHERE ds.studentProfile = :student " +
           "AND ds.lessonTopic = :topic " +
           "AND ds.scheduledDate BETWEEN :weekStart AND :weekEnd")
    long countPeriodsForTopicInWeek(
            @Param("student") StudentProfile student,
            @Param("topic") LessonTopic topic,
            @Param("weekStart") LocalDate weekStart,
            @Param("weekEnd") LocalDate weekEnd
    );

    // ============================================================
    // ASSESSMENT INSTANCE QUERIES
    // ============================================================
    
    /**
     * Find schedules by assessment instance ID
     */
    @EntityGraph(attributePaths = {"studentProfile", "subject", "lessonTopic"})
    List<DailySchedule> findByAssessmentInstanceIdOrderByScheduledDateAsc(Long assessmentInstanceId);
    
    /**
     * Check if assessment instance is used
     */
    boolean existsByAssessmentInstanceId(Long assessmentInstanceId);

    // ============================================================
    // SCHEDULE STATUS QUERIES
    // ============================================================
    
    /**
     * Find schedules by status
     */
    @EntityGraph(attributePaths = {"studentProfile", "subject", "lessonTopic"})
    List<DailySchedule> findByScheduleStatusAndScheduleSource(
            com.edu.platform.model.enums.ScheduleStatus status,
            String scheduleSource
    );
    
    /**
     * Find IN_PROGRESS schedules (waiting for topic assignment)
     */
    @Query("SELECT ds FROM DailySchedule ds " +
           "WHERE ds.scheduleStatus = 'IN_PROGRESS' " +
           "AND ds.scheduleSource = 'INDIVIDUAL' " +
           "AND ds.scheduledDate BETWEEN :startDate AND :endDate")
    List<DailySchedule> findInProgressSchedulesInWeek(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
    
    /**
     * Count schedules by status
     */
    long countByScheduleStatusAndScheduleSource(
            com.edu.platform.model.enums.ScheduleStatus status,
            String scheduleSource
    );

    // ============================================================
    // ARCHIVAL SUPPORT QUERIES
    // ============================================================
    
    /**
     * Find schedules to archive (old week's schedules)
     */
    @Query("SELECT ds FROM DailySchedule ds " +
           "WHERE ds.scheduleSource = 'INDIVIDUAL' " +
           "AND ds.scheduledDate BETWEEN :startDate AND :endDate")
    List<DailySchedule> findSchedulesToArchive(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
    
    /**
     * Find schedules by student for archival
     */
    @Query("SELECT ds FROM DailySchedule ds " +
           "WHERE ds.studentProfile = :student " +
           "AND ds.scheduleSource = 'INDIVIDUAL' " +
           "AND ds.scheduledDate BETWEEN :startDate AND :endDate")
    List<DailySchedule> findSchedulesToArchiveForStudent(
            @Param("student") StudentProfile student,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // ============================================================
    // WEEKLY GENERATION QUERIES
    // ============================================================
    
    /**
     * Find all INDIVIDUAL schedules for a specific week
     */
    @Query("SELECT ds FROM DailySchedule ds " +
           "WHERE ds.scheduleSource = 'INDIVIDUAL' " +
           "AND ds.scheduledDate BETWEEN :weekStart AND :weekEnd " +
           "ORDER BY ds.studentProfile.id, ds.scheduledDate, ds.periodNumber")
    List<DailySchedule> findIndividualSchedulesForWeek(
            @Param("weekStart") LocalDate weekStart,
            @Param("weekEnd") LocalDate weekEnd
    );
    
    /**
     * Find all students with INDIVIDUAL schedules in a week
     */
    @Query("SELECT DISTINCT ds.studentProfile FROM DailySchedule ds " +
           "WHERE ds.scheduleSource = 'INDIVIDUAL' " +
           "AND ds.scheduledDate BETWEEN :weekStart AND :weekEnd")
    List<StudentProfile> findStudentsWithIndividualSchedulesInWeek(
            @Param("weekStart") LocalDate weekStart,
            @Param("weekEnd") LocalDate weekEnd
    );
    
    /**
     * Count INDIVIDUAL schedules for a week
     */
    @Query("SELECT COUNT(ds) FROM DailySchedule ds " +
           "WHERE ds.scheduleSource = 'INDIVIDUAL' " +
           "AND ds.scheduledDate BETWEEN :weekStart AND :weekEnd")
    long countIndividualSchedulesForWeek(
            @Param("weekStart") LocalDate weekStart,
            @Param("weekEnd") LocalDate weekEnd
    );

    // ============================================================
    // MANUAL ASSIGNMENT QUERIES
    // ============================================================
    
    /**
     * Find manually assigned schedules
     */
    @Query("SELECT ds FROM DailySchedule ds " +
           "WHERE ds.lessonAssignmentMethod IN ('MANUAL_ADMIN', 'MANUAL_TEACHER') " +
           "AND ds.scheduledDate BETWEEN :startDate AND :endDate")
    List<DailySchedule> findManuallyAssignedSchedules(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
    
    /**
     * Find schedules manually assigned by a specific user
     */
    @EntityGraph(attributePaths = {"studentProfile", "subject", "lessonTopic"})
    List<DailySchedule> findByManuallyAssignedByUserIdOrderByManuallyAssignedAtDesc(Long userId);
    
    /**
     * Count manually assigned schedules
     */
    @Query("SELECT COUNT(ds) FROM DailySchedule ds " +
           "WHERE ds.lessonAssignmentMethod IN ('MANUAL_ADMIN', 'MANUAL_TEACHER')")
    long countManuallyAssignedSchedules();
    
    
    /**
     * ✅ NEW: Find schedules between dates and by schedule source
     */
    @EntityGraph(attributePaths = {"studentProfile", "subject", "lessonTopic"})
    List<DailySchedule> findByScheduledDateBetweenAndScheduleSource(
            LocalDate startDate,
            LocalDate endDate,
            String scheduleSource
    );
    

	/**
	 * Delete schedules between dates by schedule source
	 */
	@Transactional
	@Modifying
	@Query("DELETE FROM DailySchedule d WHERE d.scheduledDate BETWEEN :startDate AND :endDate " +
	       "AND d.scheduleSource = :source")
	void deleteByScheduledDateBetweenAndScheduleSource(
	        @Param("startDate") LocalDate startDate,
	        @Param("endDate") LocalDate endDate,
	        @Param("source") String source);
	
	
	
	int countByIndividualTimetableIdAndScheduledDate(Long timetableId, LocalDate date);
	int countByIndividualTimetableIdAndScheduledDateGreaterThanEqual(Long timetableId, LocalDate date);
	int deleteByIndividualTimetableIdAndScheduledDateGreaterThanEqual(Long timetableId, LocalDate date);

	
	/**
	 * ✅ SPRINT 7: Find schedules by subject and missing topic flag
	 */
	@EntityGraph(attributePaths = {"studentProfile", "subject", "lessonTopic"})
	List<DailySchedule> findByMissingLessonTopicTrueAndSubjectAndScheduleSource(
	        Subject subject, 
	        String scheduleSource
	);

	/**
	 * ✅ SPRINT 7: Find schedules by student with missing topics
	 */
	@EntityGraph(attributePaths = {"studentProfile", "subject", "lessonTopic"})
	List<DailySchedule> findByStudentProfileAndMissingLessonTopicTrue(
	        StudentProfile studentProfile
	);

	/**
	 * ✅ SPRINT 7: Check if student already used a lesson topic
	 */
	boolean existsByStudentProfileAndLessonTopic(
	        StudentProfile studentProfile, 
	        LessonTopic lessonTopic
	);

	/**
	 * ✅ SPRINT 7: Count usage of a lesson topic (across all students)
	 */
	long countByLessonTopic(LessonTopic lessonTopic);
		
	
	/**
	 * ✅ Count schedules by schedule source
	 */
	long countByScheduleSource(String scheduleSource);
	
	/**
	 * ✅ Find schedules by schedule source (ordered)
	 */
	@EntityGraph(attributePaths = {"studentProfile", "subject", "lessonTopic"})
	List<DailySchedule> findByScheduleSourceOrderByScheduledDateAscPeriodNumberAsc(
	    String scheduleSource
	);
	
	/**
	 * Count schedules between dates by schedule source
	 */
	long countByScheduledDateBetweenAndScheduleSource(
	    LocalDate startDate,
	    LocalDate endDate,
	    String scheduleSource
	);
	
    
    /**
     * Find all distinct student profile IDs with schedules in a date range
     */
    @Query("SELECT DISTINCT ds.studentProfile.id FROM DailySchedule ds " +
           "WHERE ds.scheduledDate BETWEEN :startDate AND :endDate " +
           "AND ds.scheduleSource = :source")
    List<Long> findDistinctStudentProfileIdsByDateRangeAndSource(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate,
        @Param("source") String source
    );
    
    /**
     * Find schedules by student ID, date range, and source
     */
    @Query("SELECT ds FROM DailySchedule ds " +
           "WHERE ds.studentProfile.id = :studentProfileId " +
           "AND ds.scheduledDate BETWEEN :startDate AND :endDate " +
           "AND ds.scheduleSource = :source " +
           "ORDER BY ds.scheduledDate ASC, ds.periodNumber ASC")
    List<DailySchedule> findByStudentProfileIdAndScheduledDateBetweenAndScheduleSourceOrderByScheduledDateAscPeriodNumberAsc(
        @Param("studentProfileId") Long studentProfileId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate,
        @Param("source") String source
    );
    
    /**
     * ✅ Find schedules by student and date range (ordered)
     */
    @EntityGraph(attributePaths = {"studentProfile", "subject", "lessonTopic"})
    List<DailySchedule> findByStudentProfileAndScheduledDateBetweenOrderByScheduledDateAscPeriodNumberAsc(
            StudentProfile studentProfile,
            LocalDate startDate,
            LocalDate endDate
    );
    

	/**
	 * Find schedules by lesson topic ID and student profile ID
	 * Used for submission validation
	 */
	List<DailySchedule> findByLessonTopicIdAndStudentProfileId(
	    Long lessonTopicId, 
	    Long studentProfileId
	);
}

