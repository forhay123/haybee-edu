package com.edu.platform.repository;

import com.edu.platform.model.SessionAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SessionAttendanceRepository extends JpaRepository<SessionAttendance, Long> {
    
    // Find attendance by session
    List<SessionAttendance> findByLiveSessionId(Long liveSessionId);
    
    // Find attendance by session and student
    Optional<SessionAttendance> findByLiveSessionIdAndStudentId(Long liveSessionId, Long studentId);
    
    // Find attendance by student
    List<SessionAttendance> findByStudentIdOrderByJoinedAtDesc(Long studentId);
    
    // Check if student attended session
    boolean existsByLiveSessionIdAndStudentId(Long liveSessionId, Long studentId);
    
    // Count attendees for session
    long countByLiveSessionId(Long liveSessionId);
    
    // Count attendees who were present
    long countByLiveSessionIdAndWasPresentTrue(Long liveSessionId);
    
    // Find attendance by teacher (through session)
    @Query("SELECT sa FROM SessionAttendance sa WHERE sa.liveSession.teacher.id = :teacherId " +
           "ORDER BY sa.joinedAt DESC")
    List<SessionAttendance> findByTeacherId(@Param("teacherId") Long teacherId);
    
    // Calculate average participation score for student
    @Query("SELECT AVG(sa.participationScore) FROM SessionAttendance sa " +
           "WHERE sa.student.id = :studentId AND sa.participationScore IS NOT NULL")
    Double calculateAverageParticipationScoreByStudentId(@Param("studentId") Long studentId);
    
    // Calculate average duration for student
    @Query("SELECT AVG(sa.durationMinutes) FROM SessionAttendance sa " +
           "WHERE sa.student.id = :studentId AND sa.durationMinutes IS NOT NULL")
    Double calculateAverageDurationByStudentId(@Param("studentId") Long studentId);
    
    // Count sessions attended by student
    long countByStudentIdAndWasPresentTrue(Long studentId);
    
    // Find students who attended session
    @Query("SELECT sa FROM SessionAttendance sa WHERE sa.liveSession.id = :sessionId " +
           "AND sa.wasPresent = true ORDER BY sa.joinedAt ASC")
    List<SessionAttendance> findAttendedBySessionId(@Param("sessionId") Long sessionId);
    
    // Find top participants (by participation score)
    @Query("SELECT sa FROM SessionAttendance sa WHERE sa.liveSession.id = :sessionId " +
           "AND sa.participationScore IS NOT NULL ORDER BY sa.participationScore DESC")
    List<SessionAttendance> findTopParticipantsBySessionId(@Param("sessionId") Long sessionId);
}