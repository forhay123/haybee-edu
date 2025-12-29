package com.edu.platform.repository;

import com.edu.platform.model.LiveSession;
import com.edu.platform.model.enums.SessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface LiveSessionRepository extends JpaRepository<LiveSession, Long> , JpaSpecificationExecutor<LiveSession> {
    
    // Find sessions by teacher
    List<LiveSession> findByTeacherId(Long teacherId);
    
    // Find sessions by status
    List<LiveSession> findByStatus(SessionStatus status);
    
    // Find sessions by subject and statuses
    List<LiveSession> findBySubjectIdAndStatusIn(Long subjectId, List<SessionStatus> statuses);
    
    // Find sessions by class
    List<LiveSession> findByClassEntityId(Long classId);
    
    // Find upcoming sessions by date range
    List<LiveSession> findByStatusAndScheduledStartTimeBetween(
        SessionStatus status, 
        Instant startTime, 
        Instant endTime
    );
    
    // Find by Zoom meeting ID
    Optional<LiveSession> findByZoomMeetingId(String zoomMeetingId);
    
    // Find by Zoom meeting UUID
    Optional<LiveSession> findByZoomMeetingUuid(String zoomMeetingUuid);
    
    // Find sessions for student's enrolled subjects
    @Query("SELECT ls FROM LiveSession ls WHERE ls.subject.id IN :subjectIds " +
           "AND ls.status IN :statuses ORDER BY ls.scheduledStartTime ASC")
    List<LiveSession> findBySubjectIdsAndStatuses(
        @Param("subjectIds") List<Long> subjectIds,
        @Param("statuses") List<SessionStatus> statuses
    );
    
    // Find upcoming sessions (next 7 days)
    @Query("SELECT ls FROM LiveSession ls WHERE ls.status = :status " +
           "AND ls.scheduledStartTime BETWEEN :now AND :futureTime " +
           "ORDER BY ls.scheduledStartTime ASC")
    List<LiveSession> findUpcomingSessions(
        @Param("status") SessionStatus status,
        @Param("now") Instant now,
        @Param("futureTime") Instant futureTime
    );
    
    // Find sessions by teacher and date range
    @Query("SELECT ls FROM LiveSession ls WHERE ls.teacher.id = :teacherId " +
           "AND ls.scheduledStartTime BETWEEN :startDate AND :endDate " +
           "ORDER BY ls.scheduledStartTime DESC")
    List<LiveSession> findByTeacherAndDateRange(
        @Param("teacherId") Long teacherId,
        @Param("startDate") Instant startDate,
        @Param("endDate") Instant endDate
    );
    
    // Count sessions by teacher and status
    long countByTeacherIdAndStatus(Long teacherId, SessionStatus status);
    
    // Find sessions needing recording check (ended but not processed)
    @Query("SELECT ls FROM LiveSession ls WHERE ls.status = :status " +
           "AND ls.hasRecording = false AND ls.actualEndTime IS NOT NULL " +
           "AND ls.actualEndTime < :threshold")
    List<LiveSession> findSessionsNeedingRecordingCheck(
        @Param("status") SessionStatus status,
        @Param("threshold") Instant threshold
    );
    
    // ✅ Find sessions by teacher and date range
    List<LiveSession> findByTeacherIdAndScheduledStartTimeBetween(
            Long teacherId, Instant startDate, Instant endDate);
    
    // ✅ Find sessions by subject and date range
    List<LiveSession> findBySubjectIdAndScheduledStartTimeBetween(
            Long subjectId, Instant startDate, Instant endDate);
    
    // ✅ Find sessions by class and date range
    List<LiveSession> findByClassEntityIdAndScheduledStartTimeBetween(
            Long classId, Instant startDate, Instant endDate);
    
    // ✅ FIXED: Find past sessions for a student's class
    // Use actualEndTime (if ended) OR scheduledStartTime (for old sessions)
    @Query("SELECT ls FROM LiveSession ls WHERE ls.classEntity.id = :classId " +
           "AND (ls.actualEndTime < :now OR (ls.actualEndTime IS NULL AND ls.scheduledStartTime < :now)) " +
           "AND ls.status IN ('ENDED', 'CANCELLED') " +
           "ORDER BY ls.scheduledStartTime DESC")
    List<LiveSession> findPastSessionsByClassId(
            @Param("classId") Long classId, 
            @Param("now") Instant now);
    

    
    
    @Query("SELECT ls FROM LiveSession ls WHERE ls.classEntity.id = :classId " +
    	       "AND ls.scheduledStartTime > :now " +
    	       "AND ls.status IN ('SCHEDULED', 'LIVE') " +  // ✅ Include LIVE sessions
    	       "ORDER BY ls.scheduledStartTime ASC")
    	List<LiveSession> findUpcomingSessionsByClassId(
    	        @Param("classId") Long classId, 
    	        @Param("now") Instant now);
    

    
    // ✅ NEW: Find sessions by class for a specific date range including both SCHEDULED and LIVE
    @Query("SELECT ls FROM LiveSession ls WHERE ls.classEntity.id = :classId " +
           "AND ls.status IN ('SCHEDULED', 'LIVE') " +
           "AND ls.scheduledStartTime BETWEEN :startDate AND :endDate " +
           "ORDER BY ls.scheduledStartTime ASC")
    List<LiveSession> findUpcomingAndLiveSessionsByClassIdAndDateRange(
            @Param("classId") Long classId,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate
    );

    // ✅ NEW: Find LIVE sessions for a specific class
    @Query("SELECT ls FROM LiveSession ls WHERE ls.classEntity.id = :classId AND ls.status = 'LIVE'")
    List<LiveSession> findLiveSessionsByClassId(@Param("classId") Long classId);

    // ✅ NEW: Find SCHEDULED sessions for a specific class
    @Query("SELECT ls FROM LiveSession ls WHERE ls.classEntity.id = :classId AND ls.status = 'SCHEDULED' AND ls.scheduledStartTime >= :now ORDER BY ls.scheduledStartTime ASC")
    List<LiveSession> findScheduledSessionsByClassId(@Param("classId") Long classId, @Param("now") Instant now);

    
    
}