package com.edu.platform.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * Client for calling Python video processing service
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PythonVideoClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${PYTHON_SERVICE_URL:http://python-service:8000}")
    private String pythonServiceUrl;

    @Value("${SYSTEM_TOKEN}")
    private String systemToken;

    /**
     * Trigger video download from Zoom
     */
    public Map<String, Object> downloadZoomRecording(String meetingId, String downloadUrl) {
        log.info("Triggering Zoom recording download for meeting: {}", meetingId);
        
        try {
            String url = pythonServiceUrl + "/api/videos/download-zoom";
            
            Map<String, Object> request = new HashMap<>();
            request.put("meetingId", meetingId);
            request.put("downloadUrl", downloadUrl);
            
            HttpHeaders headers = createHeaders();
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Successfully triggered Zoom recording download");
                return response.getBody();
            } else {
                log.error("Failed to trigger download: {}", response.getStatusCode());
                throw new RuntimeException("Failed to trigger download: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            log.error("Error triggering Zoom recording download", e);
            throw new RuntimeException("Failed to download Zoom recording", e);
        }
    }

    /**
     * Trigger video upload to YouTube
     */
    public Map<String, Object> uploadToYouTube(Long videoId, String videoPath, Map<String, Object> metadata) {
        log.info("Triggering YouTube upload for video: {}", videoId);
        
        try {
            String url = pythonServiceUrl + "/api/videos/upload-youtube";
            
            Map<String, Object> request = new HashMap<>();
            request.put("videoId", videoId);
            request.put("videoPath", videoPath);
            request.put("metadata", metadata);
            
            HttpHeaders headers = createHeaders();
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Successfully triggered YouTube upload");
                return response.getBody();
            } else {
                log.error("Failed to trigger upload: {}", response.getStatusCode());
                throw new RuntimeException("Failed to trigger upload: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            log.error("Error triggering YouTube upload", e);
            throw new RuntimeException("Failed to upload to YouTube", e);
        }
    }

    /**
     * Generate video transcript using Whisper
     */
    public Map<String, Object> generateTranscript(Long videoId, String videoPath) {
        log.info("Triggering transcript generation for video: {}", videoId);
        
        try {
            String url = pythonServiceUrl + "/api/videos/transcribe";
            
            Map<String, Object> request = new HashMap<>();
            request.put("videoId", videoId);
            request.put("videoPath", videoPath);
            
            HttpHeaders headers = createHeaders();
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Successfully triggered transcript generation");
                return response.getBody();
            } else {
                log.error("Failed to trigger transcription: {}", response.getStatusCode());
                throw new RuntimeException("Failed to trigger transcription: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            log.error("Error triggering transcript generation", e);
            throw new RuntimeException("Failed to generate transcript", e);
        }
    }

    /**
     * Generate AI chapters for video
     */
    public Map<String, Object> generateChapters(Long videoId, String transcript) {
        log.info("Triggering chapter generation for video: {}", videoId);
        
        try {
            String url = pythonServiceUrl + "/api/videos/generate-chapters";
            
            Map<String, Object> request = new HashMap<>();
            request.put("videoId", videoId);
            request.put("transcript", transcript);
            
            HttpHeaders headers = createHeaders();
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Successfully triggered chapter generation");
                return response.getBody();
            } else {
                log.error("Failed to trigger chapter generation: {}", response.getStatusCode());
                throw new RuntimeException("Failed to trigger chapter generation: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            log.error("Error triggering chapter generation", e);
            throw new RuntimeException("Failed to generate chapters", e);
        }
    }

    /**
     * Process entire video pipeline (download -> upload -> transcribe -> chapters)
     */
    public Map<String, Object> processVideoPipeline(Long videoId, String zoomRecordingUrl, Map<String, Object> youtubeMetadata) {
        log.info("Triggering full video processing pipeline for video: {}", videoId);
        
        try {
            String url = pythonServiceUrl + "/api/videos/process-pipeline";
            
            Map<String, Object> request = new HashMap<>();
            request.put("videoId", videoId);
            request.put("zoomRecordingUrl", zoomRecordingUrl);
            request.put("youtubeMetadata", youtubeMetadata);
            
            HttpHeaders headers = createHeaders();
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Successfully triggered video processing pipeline");
                return response.getBody();
            } else {
                log.error("Failed to trigger pipeline: {}", response.getStatusCode());
                throw new RuntimeException("Failed to trigger pipeline: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            log.error("Error triggering video processing pipeline", e);
            throw new RuntimeException("Failed to process video pipeline", e);
        }
    }

    /**
     * Get processing status for a video
     */
    public Map<String, Object> getProcessingStatus(Long videoId) {
        log.info("Fetching processing status for video: {}", videoId);
        
        try {
            String url = pythonServiceUrl + "/api/videos/" + videoId + "/status";
            
            HttpHeaders headers = createHeaders();
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                return response.getBody();
            } else {
                log.error("Failed to fetch status: {}", response.getStatusCode());
                throw new RuntimeException("Failed to fetch status: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            log.error("Error fetching processing status", e);
            throw new RuntimeException("Failed to get processing status", e);
        }
    }

    /**
     * Cancel ongoing video processing
     */
    public void cancelProcessing(Long videoId) {
        log.info("Canceling video processing for video: {}", videoId);
        
        try {
            String url = pythonServiceUrl + "/api/videos/" + videoId + "/cancel";
            
            HttpHeaders headers = createHeaders();
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            restTemplate.exchange(url, HttpMethod.POST, entity, Void.class);
            
            log.info("Successfully canceled video processing");
            
        } catch (Exception e) {
            log.error("Error canceling video processing", e);
            throw new RuntimeException("Failed to cancel processing", e);
        }
    }

    /**
     * Extract thumbnail from video
     */
    public Map<String, Object> extractThumbnail(Long videoId, String videoPath, Integer timestampSeconds) {
        log.info("Triggering thumbnail extraction for video: {}", videoId);
        
        try {
            String url = pythonServiceUrl + "/api/videos/extract-thumbnail";
            
            Map<String, Object> request = new HashMap<>();
            request.put("videoId", videoId);
            request.put("videoPath", videoPath);
            request.put("timestampSeconds", timestampSeconds);
            
            HttpHeaders headers = createHeaders();
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Successfully triggered thumbnail extraction");
                return response.getBody();
            } else {
                log.error("Failed to extract thumbnail: {}", response.getStatusCode());
                throw new RuntimeException("Failed to extract thumbnail: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            log.error("Error extracting thumbnail", e);
            throw new RuntimeException("Failed to extract thumbnail", e);
        }
    }

    /**
     * Create HTTP headers with system token
     */
    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-System-Token", systemToken);
        headers.set("Authorization", "Bearer " + systemToken);
        return headers;
    }
}