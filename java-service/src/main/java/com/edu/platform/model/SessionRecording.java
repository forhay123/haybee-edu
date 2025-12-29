package com.edu.platform.model;

import com.edu.platform.model.enums.RecordingStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "session_recordings", schema = "academic")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionRecording {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ==================== Relationships ====================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "live_session_id", nullable = false)
    private LiveSession liveSession;

    @OneToOne(mappedBy = "sessionRecording", cascade = CascadeType.ALL)
    private VideoLesson videoLesson;

    // ==================== Zoom Recording Details ====================

    @Column(name = "zoom_recording_id", unique = true, length = 100)
    private String zoomRecordingId;

    @Column(name = "zoom_download_url", columnDefinition = "TEXT")
    private String zoomDownloadUrl;

    @Column(name = "recording_start_time")
    private Instant recordingStartTime;

    @Column(name = "recording_end_time")
    private Instant recordingEndTime;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    @Column(name = "file_type", length = 20)
    private String fileType;

    // ==================== Processing Status ====================

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    @Builder.Default
    private RecordingStatus status = RecordingStatus.PENDING;

    @Column(name = "download_completed_at")
    private Instant downloadCompletedAt;

    @Column(name = "processing_started_at")
    private Instant processingStartedAt;

    @Column(name = "processing_completed_at")
    private Instant processingCompletedAt;

    // ==================== YouTube Upload ====================

    @Column(name = "youtube_video_id", unique = true, length = 20)
    private String youtubeVideoId;

    @Column(name = "youtube_url", columnDefinition = "TEXT")
    private String youtubeUrl;

    // ==================== Local Storage ====================

    @Column(name = "local_file_path", columnDefinition = "TEXT")
    private String localFilePath;

    @Column(name = "temp_storage_url", columnDefinition = "TEXT")
    private String tempStorageUrl;

    // ✅ NEW: Add hasTranscript field
    @Column(name = "has_transcript")
    @Builder.Default
    private Boolean hasTranscript = false;

    // ==================== Audit Fields ====================

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // ==================== Helper Methods ====================

    /**
     * Alias for recordingStartTime (used in VideoProcessingOrchestrator)
     */
    public Instant getRecordedAt() {
        return this.recordingStartTime;
    }

    public void setRecordedAt(Instant recordedAt) {
        this.recordingStartTime = recordedAt;
    }

    /**
     * Alias for zoomDownloadUrl (used in VideoProcessingOrchestrator)
     */
    public String getRecordingUrl() {
        return this.zoomDownloadUrl;
    }

    public void setRecordingUrl(String recordingUrl) {
        this.zoomDownloadUrl = recordingUrl;
    }

    /**
     * Alias for youtubeUrl (used in VideoProcessingOrchestrator)
     */
    public void setVideoUrl(String videoUrl) {
        this.youtubeUrl = videoUrl;
    }

    public String getVideoUrl() {
        return this.youtubeUrl;
    }
    
    /**
     * ✅ NEW: Getter for hasTranscript (for DTOs)
     */
    public Boolean getHasTranscript() {
        return this.hasTranscript != null ? this.hasTranscript : false;
    }
}