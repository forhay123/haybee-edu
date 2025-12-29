package com.edu.platform.repository;

import com.edu.platform.model.SessionRecording;
import com.edu.platform.model.enums.RecordingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SessionRecordingRepository extends JpaRepository<SessionRecording, Long> {
    
    // Find recordings by live session
    List<SessionRecording> findByLiveSessionId(Long liveSessionId);
    
    // Find recording by Zoom recording ID
    Optional<SessionRecording> findByZoomRecordingId(String zoomRecordingId);
    
    // Find recording by YouTube video ID
    Optional<SessionRecording> findByYoutubeVideoId(String youtubeVideoId);
    
    // Find recordings by status
    List<SessionRecording> findByStatus(RecordingStatus status);
    
    // Find pending recordings (for processing)
    @Query("SELECT sr FROM SessionRecording sr WHERE sr.status IN :statuses " +
           "ORDER BY sr.createdAt ASC")
    List<SessionRecording> findByStatusIn(@Param("statuses") List<RecordingStatus> statuses);
    
    // Find recordings ready for upload
    @Query("SELECT sr FROM SessionRecording sr WHERE sr.status = :status " +
           "AND sr.downloadCompletedAt IS NOT NULL " +
           "AND sr.youtubeVideoId IS NULL")
    List<SessionRecording> findReadyForUpload(@Param("status") RecordingStatus status);
    
    // Count recordings by session
    long countByLiveSessionId(Long liveSessionId);
    
    // Find recordings by teacher (through session)
    @Query("SELECT sr FROM SessionRecording sr WHERE sr.liveSession.teacher.id = :teacherId " +
           "ORDER BY sr.createdAt DESC")
    List<SessionRecording> findByTeacherId(@Param("teacherId") Long teacherId);
}