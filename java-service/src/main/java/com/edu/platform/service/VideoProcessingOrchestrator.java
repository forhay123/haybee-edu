package com.edu.platform.service;

import com.edu.platform.integration.PythonVideoClient;
import com.edu.platform.model.SessionRecording;
import com.edu.platform.model.VideoLesson;
import com.edu.platform.model.enums.RecordingStatus;
import com.edu.platform.model.enums.VideoStatus;
import com.edu.platform.repository.SessionRecordingRepository;
import com.edu.platform.repository.VideoLessonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Orchestrates the complete video processing workflow:
 * 1. Download Zoom recording
 * 2. Upload to YouTube
 * 3. Generate transcript
 * 4. Generate AI chapters
 * 5. Update database with results
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VideoProcessingOrchestrator {

    private final PythonVideoClient pythonVideoClient;
    private final VideoLessonRepository videoLessonRepository;
    private final SessionRecordingRepository sessionRecordingRepository;

    /**
     * Process a Zoom recording: download -> upload to YouTube -> generate transcript & chapters
     */
    @Async
    @Transactional
    public void processZoomRecording(Long recordingId, String zoomDownloadUrl) {
        log.info("Starting processing for recording: {}", recordingId);
        
        SessionRecording recording = sessionRecordingRepository.findById(recordingId)
                .orElseThrow(() -> new RuntimeException("Recording not found: " + recordingId));

        try {
            // Step 1: Update status to PROCESSING
            recording.setStatus(RecordingStatus.PROCESSING);
            recording.setProcessingStartedAt(Instant.now());
            sessionRecordingRepository.save(recording);

            // Step 2: Download from Zoom to MinIO
            log.info("Downloading Zoom recording...");
            Map<String, Object> downloadResult = pythonVideoClient.downloadZoomRecording(
                    recording.getLiveSession().getZoomMeetingId(),
                    zoomDownloadUrl
            );
            
            String videoPath = (String) downloadResult.get("videoPath");
            log.info("Recording downloaded to: {}", videoPath);

            // Step 3: Create VideoLesson entity
            VideoLesson videoLesson = createVideoLessonFromRecording(recording);
            videoLesson.setStatus(VideoStatus.UPLOADING);
            videoLesson = videoLessonRepository.save(videoLesson);

            // Step 4: Upload to YouTube
            log.info("Uploading to YouTube...");
            Map<String, Object> youtubeMetadata = buildYouTubeMetadata(recording, videoLesson);
            Map<String, Object> uploadResult = pythonVideoClient.uploadToYouTube(
                    videoLesson.getId(),
                    videoPath,
                    youtubeMetadata
            );

            String youtubeId = (String) uploadResult.get("youtubeId");
            String youtubeUrl = (String) uploadResult.get("youtubeUrl");
            String thumbnailUrl = (String) uploadResult.get("thumbnailUrl");

            videoLesson.setYoutubeVideoId(youtubeId);
            videoLesson.setYoutubeUrl(youtubeUrl);
            videoLesson.setThumbnailUrl(thumbnailUrl);
            videoLesson.setStatus(VideoStatus.PROCESSING);
            videoLesson = videoLessonRepository.save(videoLesson);

            log.info("Video uploaded to YouTube: {}", youtubeUrl);

            // Step 5: Generate transcript
            log.info("Generating transcript...");
            pythonVideoClient.generateTranscript(videoLesson.getId(), videoPath);

            // Step 6: Generate AI chapters (will be done async by Python service)
            log.info("Triggering chapter generation...");
            // Chapter generation will happen in Python after transcript is ready

            // Step 7: Update recording status
            recording.setStatus(RecordingStatus.READY);
            recording.setVideoUrl(youtubeUrl);
            recording.setProcessingCompletedAt(Instant.now());
            sessionRecordingRepository.save(recording);

            // Step 8: Update video status to ACTIVE (after all processing)
            videoLesson.setStatus(VideoStatus.ACTIVE);
            videoLesson.setUploadedAt(Instant.now());
            videoLessonRepository.save(videoLesson);

            log.info("Successfully processed recording: {}", recordingId);

        } catch (Exception e) {
            log.error("Failed to process recording: {}", recordingId, e);
            
            // Update recording status to FAILED
            recording.setStatus(RecordingStatus.FAILED);
            recording.setProcessingCompletedAt(Instant.now());
            sessionRecordingRepository.save(recording);
            
            // Update video status to FAILED if it exists
            VideoLesson videoLesson = videoLessonRepository.findBySessionRecording(recording)
                    .orElse(null);
            if (videoLesson != null) {
                videoLesson.setStatus(VideoStatus.FAILED);
                videoLessonRepository.save(videoLesson);
            }
        }
    }

    /**
     * Process a directly uploaded video (not from Zoom)
     */
    @Async
    @Transactional
    public void processUploadedVideo(Long videoId, String videoPath) {
        log.info("Starting processing for uploaded video: {}", videoId);
        
        VideoLesson videoLesson = videoLessonRepository.findById(videoId)
                .orElseThrow(() -> new RuntimeException("Video not found: " + videoId));

        try {
            // Step 1: Update status
            videoLesson.setStatus(VideoStatus.PROCESSING);
            videoLessonRepository.save(videoLesson);

            // Step 2: Generate transcript
            log.info("Generating transcript for video: {}", videoId);
            pythonVideoClient.generateTranscript(videoId, videoPath);

            // Step 3: Trigger chapter generation (async)
            log.info("Triggering chapter generation for video: {}", videoId);
            // Will be done by Python service after transcript is ready

            // Step 4: Extract thumbnail if not provided
            if (videoLesson.getThumbnailUrl() == null) {
                log.info("Extracting thumbnail for video: {}", videoId);
                Map<String, Object> thumbnailResult = pythonVideoClient.extractThumbnail(
                        videoId, videoPath, 5 // 5 seconds into the video
                );
                String thumbnailUrl = (String) thumbnailResult.get("thumbnailUrl");
                videoLesson.setThumbnailUrl(thumbnailUrl);
            }

            // Step 5: Update status to ACTIVE
            videoLesson.setStatus(VideoStatus.ACTIVE);
            videoLesson.setUploadedAt(Instant.now());
            videoLessonRepository.save(videoLesson);

            log.info("Successfully processed uploaded video: {}", videoId);

        } catch (Exception e) {
            log.error("Failed to process uploaded video: {}", videoId, e);
            
            videoLesson.setStatus(VideoStatus.FAILED);
            videoLessonRepository.save(videoLesson);
        }
    }

    /**
     * Retry processing for a failed video
     */
    @Async
    @Transactional
    public void retryProcessing(Long videoId) {
        log.info("Retrying processing for video: {}", videoId);
        
        VideoLesson videoLesson = videoLessonRepository.findById(videoId)
                .orElseThrow(() -> new RuntimeException("Video not found: " + videoId));

        if (videoLesson.getStatus() != VideoStatus.FAILED) {
            throw new IllegalStateException("Can only retry failed videos");
        }

        // If it's from a recording, retry the recording processing
        if (videoLesson.getSessionRecording() != null) {
            SessionRecording recording = videoLesson.getSessionRecording();
            if (recording.getRecordingUrl() != null) {
                processZoomRecording(recording.getId(), recording.getRecordingUrl());
            } else {
                throw new IllegalStateException("No recording URL available");
            }
        } else {
            // For direct uploads, we'd need to store the video path somewhere
            throw new UnsupportedOperationException("Retry not supported for direct uploads yet");
        }
    }

    /**
     * Get processing status for a video
     */
    public Map<String, Object> getProcessingStatus(Long videoId) {
        VideoLesson videoLesson = videoLessonRepository.findById(videoId)
                .orElseThrow(() -> new RuntimeException("Video not found: " + videoId));

        Map<String, Object> status = new HashMap<>();
        status.put("videoId", videoId);
        status.put("status", videoLesson.getStatus().name());
        status.put("hasTranscript", videoLesson.getTranscript() != null);
        status.put("hasChapters", !videoLesson.getChapters().isEmpty());
        status.put("youtubeUrl", videoLesson.getYoutubeUrl());
        status.put("thumbnailUrl", videoLesson.getThumbnailUrl());

        // Get detailed status from Python service
        try {
            Map<String, Object> pythonStatus = pythonVideoClient.getProcessingStatus(videoId);
            status.putAll(pythonStatus);
        } catch (Exception e) {
            log.warn("Could not fetch status from Python service", e);
        }

        return status;
    }

    /**
     * Cancel ongoing processing
     */
    @Transactional
    public void cancelProcessing(Long videoId) {
        log.info("Canceling processing for video: {}", videoId);
        
        VideoLesson videoLesson = videoLessonRepository.findById(videoId)
                .orElseThrow(() -> new RuntimeException("Video not found: " + videoId));

        // Cancel in Python service
        try {
            pythonVideoClient.cancelProcessing(videoId);
        } catch (Exception e) {
            log.warn("Could not cancel in Python service", e);
        }

        // Update status
        videoLesson.setStatus(VideoStatus.FAILED);
        videoLessonRepository.save(videoLesson);

        // Update recording if exists
        if (videoLesson.getSessionRecording() != null) {
            SessionRecording recording = videoLesson.getSessionRecording();
            recording.setStatus(RecordingStatus.FAILED);
            sessionRecordingRepository.save(recording);
        }
    }

    // ==================== PRIVATE HELPER METHODS ====================

    private VideoLesson createVideoLessonFromRecording(SessionRecording recording) {
        VideoLesson videoLesson = new VideoLesson();
        
        videoLesson.setTitle(recording.getLiveSession().getTitle() + " - Recording");
        videoLesson.setDescription("Recorded session from " + recording.getLiveSession().getScheduledStartTime());
        videoLesson.setSubject(recording.getLiveSession().getSubject());
        videoLesson.setUploadedBy(recording.getLiveSession().getTeacher());
        videoLesson.setLessonTopic(recording.getLiveSession().getLessonTopic());
        videoLesson.setSessionRecording(recording);
        videoLesson.setIsAspirantMaterial(false);
        videoLesson.setIsPublic(false);
        videoLesson.setStatus(VideoStatus.PENDING);
        
        return videoLesson;
    }

    private Map<String, Object> buildYouTubeMetadata(SessionRecording recording, VideoLesson videoLesson) {
        Map<String, Object> metadata = new HashMap<>();
        
        metadata.put("title", videoLesson.getTitle());
        metadata.put("description", buildDescription(recording, videoLesson));
        metadata.put("tags", buildTags(recording, videoLesson));
        metadata.put("categoryId", "27"); // Education category
        metadata.put("privacyStatus", videoLesson.getIsPublic() ? "public" : "unlisted");
        
        return metadata;
    }

    private String buildDescription(SessionRecording recording, VideoLesson videoLesson) {
        StringBuilder desc = new StringBuilder();
        
        desc.append(videoLesson.getDescription()).append("\n\n");
        desc.append("Subject: ").append(videoLesson.getSubject().getName()).append("\n");
        
        if (videoLesson.getLessonTopic() != null) {
            desc.append("Topic: ").append(videoLesson.getLessonTopic().getTitle()).append("\n");
        }
        
        desc.append("Teacher: ").append(videoLesson.getUploadedBy().getFullName()).append("\n");
        desc.append("\nRecorded: ").append(recording.getRecordedAt()).append("\n");
        
        return desc.toString();
    }

    private String[] buildTags(SessionRecording recording, VideoLesson videoLesson) {
        return new String[]{
                videoLesson.getSubject().getName(),
                "Education",
                "Online Learning",
                videoLesson.getIsAspirantMaterial() ? "Aspirant" : "School",
                videoLesson.getUploadedBy().getFullName()
        };
    }
}