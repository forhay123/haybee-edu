package com.edu.platform.repository;

import com.edu.platform.model.LessonTopic;
import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.model.assessment.AssessmentInstance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for assessment instances (shuffled assessments)
 * Used for multi-period assessments where same topic appears multiple times per week
 */
@Repository
public interface AssessmentInstanceRepository extends JpaRepository<AssessmentInstance, Long> {

    // ============================================================
    // BASIC QUERIES
    // ============================================================

    /** Find all instances of a base assessment (entity version) */
    List<AssessmentInstance> findByBaseAssessmentOrderByPeriodSequenceAsc(Assessment baseAssessment);

    /** Find all instances for a lesson topic */
    List<AssessmentInstance> findByLessonTopicOrderByPeriodSequenceAsc(LessonTopic lessonTopic);

    /** Find specific instance by base assessment and suffix */
    Optional<AssessmentInstance> findByBaseAssessmentAndInstanceSuffix(
            Assessment baseAssessment,
            String instanceSuffix
    );

    /** Find instance by base assessment and period sequence */
    Optional<AssessmentInstance> findByBaseAssessmentAndPeriodSequence(
            Assessment baseAssessment,
            Integer periodSequence
    );

    // ============================================================
    // REQUIRED BY AssessmentShufflingService (ID-Based Queries)
    // ============================================================

    /**
     * Find all instances for a base assessment and order by sequence.
     * REQUIRED: AssessmentShufflingService.getAllInstances(...)
     */
    @Query("""
            SELECT ai FROM AssessmentInstance ai
            WHERE ai.baseAssessment.id = :assessmentId
            ORDER BY ai.periodSequence ASC
            """)
    List<AssessmentInstance> findByBaseAssessmentIdOrderByPeriodSequenceAsc(
            @Param("assessmentId") Long assessmentId
    );

    /**
     * Find specific instance by base assessment ID and suffix.
     * REQUIRED: AssessmentShufflingService.createShuffledInstances(...)
     */
    @Query("""
            SELECT ai FROM AssessmentInstance ai
            WHERE ai.baseAssessment.id = :assessmentId
            AND ai.instanceSuffix = :suffix
            """)
    Optional<AssessmentInstance> findByBaseAssessmentIdAndInstanceSuffix(
            @Param("assessmentId") Long assessmentId,
            @Param("suffix") String suffix
    );

    /**
     * Find instance by base assessment ID and period sequence.
     * REQUIRED: AssessmentShufflingService.getInstanceForPeriod(...)
     */
    @Query("""
            SELECT ai FROM AssessmentInstance ai
            WHERE ai.baseAssessment.id = :assessmentId
            AND ai.periodSequence = :sequence
            """)
    Optional<AssessmentInstance> findByBaseAssessmentIdAndPeriodSequence(
            @Param("assessmentId") Long assessmentId,
            @Param("sequence") Integer sequence
    );

    // ============================================================
    // TOPIC QUERIES
    // ============================================================

    /** Find all instances for a lesson topic by ID */
    @Query("""
            SELECT ai FROM AssessmentInstance ai
            WHERE ai.lessonTopic.id = :topicId
            ORDER BY ai.periodSequence ASC
            """)
    List<AssessmentInstance> findByLessonTopicId(@Param("topicId") Long topicId);

    /** Find instances for lesson topic + week number */
    @Query("""
            SELECT ai FROM AssessmentInstance ai
            WHERE ai.lessonTopic.id = :topicId
            AND ai.weekNumber = :weekNumber
            ORDER BY ai.periodSequence ASC
            """)
    List<AssessmentInstance> findByLessonTopicIdAndWeekNumber(
            @Param("topicId") Long topicId,
            @Param("weekNumber") Integer weekNumber
    );

    /** Count instances for a lesson topic */
    long countByLessonTopic(LessonTopic lessonTopic);

    /** Count instances for topic by ID */
    @Query("""
            SELECT COUNT(ai) FROM AssessmentInstance ai
            WHERE ai.lessonTopic.id = :topicId
            """)
    long countByLessonTopicId(@Param("topicId") Long topicId);

    // ============================================================
    // ACTIVE / INACTIVE INSTANCE QUERIES
    // ============================================================

    List<AssessmentInstance> findByIsActiveTrueOrderByCreatedAtDesc();

    List<AssessmentInstance> findByLessonTopicAndIsActiveTrueOrderByPeriodSequenceAsc(
            LessonTopic lessonTopic
    );

    List<AssessmentInstance> findByBaseAssessmentAndIsActiveTrueOrderByPeriodSequenceAsc(
            Assessment baseAssessment
    );

    List<AssessmentInstance> findByIsActiveFalseOrderByCreatedAtDesc();

    // ============================================================
    // WEEK NUMBER QUERIES
    // ============================================================

    List<AssessmentInstance> findByWeekNumberOrderByLessonTopicAscPeriodSequenceAsc(Integer weekNumber);

    List<AssessmentInstance> findByLessonTopicAndWeekNumberOrderByPeriodSequenceAsc(
            LessonTopic lessonTopic,
            Integer weekNumber
    );

    long countByWeekNumber(Integer weekNumber);

    // ============================================================
    // VALIDATION
    // ============================================================

    boolean existsByBaseAssessmentAndInstanceSuffix(Assessment baseAssessment, String suffix);

    boolean existsByBaseAssessmentAndPeriodSequence(Assessment baseAssessment, Integer periodSequence);

    boolean existsByLessonTopicAndWeekNumber(LessonTopic lessonTopic, Integer weekNumber);

    // ============================================================
    // DELETE OPERATIONS
    // ============================================================

    void deleteByBaseAssessment(Assessment baseAssessment);

    void deleteByLessonTopic(LessonTopic lessonTopic);

    @Query("""
            DELETE FROM AssessmentInstance ai
            WHERE ai.isActive = false
            AND ai.createdAt < :beforeDate
            """)
    void deleteInactiveInstancesBefore(@Param("beforeDate") java.time.LocalDateTime beforeDate);

    // ============================================================
    // STATS
    // ============================================================

    @Query("SELECT COUNT(ai) FROM AssessmentInstance ai")
    long countTotalInstances();

    @Query("SELECT COUNT(ai) FROM AssessmentInstance ai WHERE ai.isActive = true")
    long countActiveInstances();

    @Query("""
            SELECT ai.weekNumber, COUNT(ai)
            FROM AssessmentInstance ai
            WHERE ai.weekNumber IS NOT NULL
            GROUP BY ai.weekNumber
            ORDER BY ai.weekNumber
            """)
    List<Object[]> getInstanceCountByWeek();
}
