package com.edu.platform.controller;

import com.edu.platform.service.VideoLessonService;
import com.edu.platform.service.LiveSessionService;
import io.swagger.v3.oas.annotations.Hidden;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/webhooks/videos")
@RequiredArgsConstructor
@Tag(name = "Video Webhooks", description = "Webhooks for video processing events")
public class VideoWebhookController {

    private final VideoLessonService videoLessonService;
    private final LiveSessionService liveSessionService;

    /**
     * Zoom webhook for recording events
     * https://developers.zoom.us/docs/api/rest/webhook-reference/recording-events/
     */
    @PostMapping("/zoom/recording")
    @Hidden // Hide from Swagger as it's for external webhooks
    @Operation(summary = "Zoom recording webhook")
    public ResponseEntity<Map<String, Object>> handleZoomRecording(
            @RequestHeader(value = "authorization", required = false) String authorization,
            @RequestBody Map<String, Object> payload
    ) {
        log.info("Received Zoom recording webhook");
        log.debug("Webhook payload: {}", payload);

        try {
            // Verify webhook signature (if configured)
            // verifyZoomWebhookSignature(authorization, payload);

            String event = (String) payload.get("event");
            
            if ("recording.completed".equals(event)) {
                handleRecordingCompleted(payload);
            } else if ("recording.transcript_completed".equals(event)) {
                handleTranscriptCompleted(payload);
            } else {
                log.info("Unhandled Zoom webhook event: {}", event);
            }

            return ResponseEntity.ok(Map.of("status", "received"));

        } catch (Exception e) {
            log.error("Failed to process Zoom webhook", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * YouTube webhook for video processing events
     * https://developers.google.com/youtube/v3/guides/push_notifications
     */
    @PostMapping("/youtube/notification")
    @Hidden
    @Operation(summary = "YouTube notification webhook")
    public ResponseEntity<Map<String, Object>> handleYouTubeNotification(
            @RequestBody Map<String, Object> payload
    ) {
        log.info("Received YouTube notification webhook");
        log.debug("Webhook payload: {}", payload);

        try {
            String event = (String) payload.get("event");
            
            if ("video.processed".equals(event)) {
                handleVideoProcessed(payload);
            } else if ("video.failed".equals(event)) {
                handleVideoFailed(payload);
            } else {
                log.info("Unhandled YouTube webhook event: {}", event);
            }

            return ResponseEntity.ok(Map.of("status", "received"));

        } catch (Exception e) {
            log.error("Failed to process YouTube webhook", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Internal webhook from Python service for processing completion
     */
    @PostMapping("/processing/completed")
    @Operation(summary = "Video processing completed webhook")
    public ResponseEntity<Map<String, Object>> handleProcessingCompleted(
            @RequestHeader(value = "X-System-Token") String systemToken,
            @RequestBody Map<String, Object> payload
    ) {
        log.info("Received video processing completed webhook");
        log.debug("Webhook payload: {}", payload);

        try {
            // Verify system token
            // verifySystemToken(systemToken);

            Long videoId = ((Number) payload.get("videoId")).longValue();
            String status = (String) payload.get("status");
            
            if ("success".equals(status)) {
                handleProcessingSuccess(videoId, payload);
            } else {
                handleProcessingFailure(videoId, payload);
            }

            return ResponseEntity.ok(Map.of("status", "processed"));

        } catch (Exception e) {
            log.error("Failed to process completion webhook", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Internal webhook for transcript generation completion
     */
    @PostMapping("/transcript/completed")
    @Operation(summary = "Transcript generation completed webhook")
    public ResponseEntity<Map<String, Object>> handleTranscriptCompleted(
            @RequestHeader(value = "X-System-Token") String systemToken,
            @RequestBody Map<String, Object> payload
    ) {
        log.info("Received transcript completed webhook");

        try {
            Long videoId = ((Number) payload.get("videoId")).longValue();
            String transcript = (String) payload.get("transcript");
            
            videoLessonService.updateTranscript(videoId, transcript);

            return ResponseEntity.ok(Map.of("status", "updated"));

        } catch (Exception e) {
            log.error("Failed to process transcript webhook", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Internal webhook for chapter generation completion
     */
    @PostMapping("/chapters/completed")
    @Operation(summary = "Chapter generation completed webhook")
    public ResponseEntity<Map<String, Object>> handleChaptersCompleted(
            @RequestHeader(value = "X-System-Token") String systemToken,
            @RequestBody Map<String, Object> payload
    ) {
        log.info("Received chapters completed webhook");

        try {
            Long videoId = ((Number) payload.get("videoId")).longValue();
            @SuppressWarnings("unchecked")
            java.util.List<Map<String, Object>> chapters = 
                (java.util.List<Map<String, Object>>) payload.get("chapters");
            
            videoLessonService.updateChapters(videoId, chapters);

            return ResponseEntity.ok(Map.of("status", "updated"));

        } catch (Exception e) {
            log.error("Failed to process chapters webhook", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // ==================== PRIVATE HELPER METHODS ====================

    private void handleRecordingCompleted(Map<String, Object> payload) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> obj = (Map<String, Object>) payload.get("payload");
            @SuppressWarnings("unchecked")
            Map<String, Object> recording = (Map<String, Object>) obj.get("object");
            
            String meetingId = String.valueOf(recording.get("id"));
            String recordingUrl = (String) recording.get("share_url");
            
            log.info("Zoom recording completed for meeting: {}", meetingId);
            
            // Trigger processing via LiveSessionService
            liveSessionService.handleRecordingReady(meetingId, recordingUrl);
            
        } catch (Exception e) {
            log.error("Failed to handle recording completed", e);
        }
    }

    private void handleTranscriptCompleted(Map<String, Object> payload) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> obj = (Map<String, Object>) payload.get("payload");
            @SuppressWarnings("unchecked")
            Map<String, Object> transcript = (Map<String, Object>) obj.get("object");
            
            String meetingId = String.valueOf(transcript.get("meeting_id"));
            String transcriptUrl = (String) transcript.get("download_url");
            
            log.info("Zoom transcript completed for meeting: {}", meetingId);
            
            liveSessionService.handleTranscriptReady(meetingId, transcriptUrl);
            
        } catch (Exception e) {
            log.error("Failed to handle transcript completed", e);
        }
    }

    private void handleVideoProcessed(Map<String, Object> payload) {
        try {
            String youtubeId = (String) payload.get("videoId");
            String status = (String) payload.get("status");
            
            log.info("YouTube video processed: {}, status: {}", youtubeId, status);
            
            videoLessonService.updateVideoStatus(youtubeId, "ACTIVE");
            
        } catch (Exception e) {
            log.error("Failed to handle video processed", e);
        }
    }

    private void handleVideoFailed(Map<String, Object> payload) {
        try {
            String youtubeId = (String) payload.get("videoId");
            String error = (String) payload.get("error");
            
            log.error("YouTube video processing failed: {}, error: {}", youtubeId, error);
            
            videoLessonService.updateVideoStatus(youtubeId, "FAILED");
            
        } catch (Exception e) {
            log.error("Failed to handle video failure", e);
        }
    }

    private void handleProcessingSuccess(Long videoId, Map<String, Object> payload) {
        try {
            log.info("Video processing succeeded for video: {}", videoId);
            
            String youtubeUrl = (String) payload.get("youtubeUrl");
            String thumbnailUrl = (String) payload.get("thumbnailUrl");
            Integer durationSeconds = (Integer) payload.get("durationSeconds");
            
            videoLessonService.updateProcessingSuccess(
                videoId, youtubeUrl, thumbnailUrl, durationSeconds
            );
            
        } catch (Exception e) {
            log.error("Failed to handle processing success", e);
        }
    }

    private void handleProcessingFailure(Long videoId, Map<String, Object> payload) {
        try {
            String error = (String) payload.get("error");
            
            log.error("Video processing failed for video: {}, error: {}", videoId, error);
            
            videoLessonService.updateProcessingFailure(videoId, error);
            
        } catch (Exception e) {
            log.error("Failed to handle processing failure", e);
        }
    }
}