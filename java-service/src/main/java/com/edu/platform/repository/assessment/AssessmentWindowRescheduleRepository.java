package com.edu.platform.repository.assessment;

import com.edu.platform.model.assessment.AssessmentWindowReschedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for AssessmentWindowReschedule
 */
@Repository
public interface AssessmentWindowRescheduleRepository extends JpaRepository<AssessmentWindowReschedule, Long> {
    
    /**
     * Find active reschedule for a specific student and assessment
     * Used by AssessmentAccessService to check if window was rescheduled
     */
    @Query("""
        SELECT r FROM AssessmentWindowReschedule r
        WHERE r.student.id = :studentId
        AND r.assessment.id = :assessmentId
        AND r.isActive = true
        AND r.cancelledAt IS NULL
        ORDER BY r.rescheduledAt DESC
        """)
    Optional<AssessmentWindowReschedule> findActiveRescheduleForStudent(
        @Param("studentId") Long studentId,
        @Param("assessmentId") Long assessmentId
    );
    
    /**
     * Find all reschedules created by a teacher
     */
    @Query("""
        SELECT r FROM AssessmentWindowReschedule r
        LEFT JOIN FETCH r.student s
        LEFT JOIN FETCH s.user u
        LEFT JOIN FETCH r.assessment a
        LEFT JOIN FETCH a.subject sub
        WHERE r.teacher.id = :teacherId
        ORDER BY r.rescheduledAt DESC
        """)
    List<AssessmentWindowReschedule> findByTeacherIdWithDetails(@Param("teacherId") Long teacherId);
    
    /**
     * Find reschedules by teacher for a specific student
     */
    @Query("""
        SELECT r FROM AssessmentWindowReschedule r
        LEFT JOIN FETCH r.student s
        LEFT JOIN FETCH s.user u
        LEFT JOIN FETCH r.assessment a
        WHERE r.teacher.id = :teacherId
        AND r.student.id = :studentId
        ORDER BY r.rescheduledAt DESC
        """)
    List<AssessmentWindowReschedule> findByTeacherIdAndStudentId(
        @Param("teacherId") Long teacherId,
        @Param("studentId") Long studentId
    );
    
    /**
     * Find all reschedules for a student
     */
    @Query("""
        SELECT r FROM AssessmentWindowReschedule r
        LEFT JOIN FETCH r.teacher t
        LEFT JOIN FETCH t.user u
        LEFT JOIN FETCH r.assessment a
        WHERE r.student.id = :studentId
        ORDER BY r.rescheduledAt DESC
        """)
    List<AssessmentWindowReschedule> findByStudentIdWithDetails(@Param("studentId") Long studentId);
    
    /**
     * Find active reschedules by teacher
     */
    @Query("""
        SELECT r FROM AssessmentWindowReschedule r
        WHERE r.teacher.id = :teacherId
        AND r.isActive = true
        AND r.cancelledAt IS NULL
        ORDER BY r.rescheduledAt DESC
        """)
    List<AssessmentWindowReschedule> findActiveByTeacherId(@Param("teacherId") Long teacherId);
    
    /**
     * Count active reschedules for a teacher in a time period
     * Used for analytics/reporting
     */
    @Query("""
        SELECT COUNT(r) FROM AssessmentWindowReschedule r
        WHERE r.teacher.id = :teacherId
        AND r.rescheduledAt >= :since
        AND r.isActive = true
        """)
    long countActiveReschedulesByTeacherSince(
        @Param("teacherId") Long teacherId,
        @Param("since") LocalDateTime since
    );
    
    /**
     * Check if student already has an active reschedule for this schedule
     * Prevents multiple reschedules for same assessment
     */
    @Query("""
        SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END
        FROM AssessmentWindowReschedule r
        WHERE r.dailySchedule.id = :scheduleId
        AND r.student.id = :studentId
        AND r.isActive = true
        """)
    boolean existsActiveRescheduleForSchedule(
        @Param("scheduleId") Long scheduleId,
        @Param("studentId") Long studentId
    );
    
    /**
     * Find reschedules happening soon (for notifications)
     */
    @Query("""
        SELECT r FROM AssessmentWindowReschedule r
        WHERE r.newWindowStart BETWEEN :start AND :end
        AND r.isActive = true
        ORDER BY r.newWindowStart ASC
        """)
    List<AssessmentWindowReschedule> findUpcomingReschedules(
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end
    );
}