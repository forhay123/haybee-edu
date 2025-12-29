package com.edu.platform.controller;

import com.edu.platform.dto.integration.CreateMeetingRequest;
import com.edu.platform.dto.integration.ZoomMeetingResponse;
import com.edu.platform.dto.integration.ZoomRecordingResponse;
import com.edu.platform.service.integration.ZoomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/zoom")
@RequiredArgsConstructor
@Tag(name = "Zoom Test", description = "Test endpoints for Zoom integration")
public class ZoomTestController {

    private final ZoomService zoomService;

    @GetMapping("/token")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Test Zoom token generation")
    public ResponseEntity<Map<String, Object>> testToken() {
        log.info("Testing Zoom token generation");
        
        try {
            String token = zoomService.getAccessToken();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Successfully obtained Zoom access token");
            response.put("tokenLength", token.length());
            response.put("tokenPrefix", token.substring(0, Math.min(20, token.length())) + "...");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Failed to get Zoom token", e);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            
            return ResponseEntity.status(500).body(response);
        }
    }

    @PostMapping("/create-meeting")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Test creating a Zoom meeting")
    public ResponseEntity<Map<String, Object>> testCreateMeeting() {
        log.info("Testing Zoom meeting creation");
        
        try {
            // Create a test meeting 1 hour from now
            CreateMeetingRequest request = CreateMeetingRequest.builder()
                    .topic("Test Live Class - " + Instant.now().toString())
                    .startTime(Instant.now().plus(1, ChronoUnit.HOURS))
                    .duration(60)
                    .timezone("UTC")
                    .password("test123")
                    .settings(CreateMeetingRequest.MeetingSettings.builder()
                            .joinBeforeHost(true)
                            .muteUponEntry(false)
                            .waitingRoom(false)
                            .autoRecording(true)
                            .build())
                    .build();
            
            ZoomMeetingResponse meeting = zoomService.createMeeting(request);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Successfully created Zoom meeting");
            response.put("meetingId", meeting.getId());
            response.put("joinUrl", meeting.getJoinUrl());
            response.put("startUrl", meeting.getStartUrl());
            response.put("password", meeting.getPassword());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Failed to create Zoom meeting", e);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/meeting/{meetingId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Test getting meeting details")
    public ResponseEntity<Map<String, Object>> testGetMeeting(@PathVariable String meetingId) {
        log.info("Testing get meeting details for: {}", meetingId);
        
        try {
            ZoomMeetingResponse meeting = zoomService.getMeetingDetails(meetingId);
            
            if (meeting == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("error", "Meeting not found");
                return ResponseEntity.status(404).body(response);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("meeting", meeting);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Failed to get meeting details", e);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            
            return ResponseEntity.status(500).body(response);
        }
    }

    @DeleteMapping("/meeting/{meetingId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Test deleting a meeting")
    public ResponseEntity<Map<String, Object>> testDeleteMeeting(@PathVariable String meetingId) {
        log.info("Testing delete meeting: {}", meetingId);
        
        try {
            zoomService.deleteMeeting(meetingId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Successfully deleted Zoom meeting");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Failed to delete meeting", e);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/recordings/{meetingId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Test listing meeting recordings")
    public ResponseEntity<Map<String, Object>> testListRecordings(@PathVariable String meetingId) {
        log.info("Testing list recordings for meeting: {}", meetingId);
        
        try {
            ZoomRecordingResponse recordings = zoomService.listRecordings(meetingId);
            
            if (recordings == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "No recordings found");
                return ResponseEntity.ok(response);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("recordingCount", recordings.getRecordingFiles() != null ? recordings.getRecordingFiles().size() : 0);
            response.put("recordings", recordings);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Failed to list recordings", e);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/health")
    @Operation(summary = "Check Zoom integration health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Try to get a token
            String token = zoomService.getAccessToken();
            
            response.put("status", "healthy");
            response.put("zoom_api", "connected");
            response.put("token_obtained", true);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("status", "unhealthy");
            response.put("zoom_api", "disconnected");
            response.put("error", e.getMessage());
            
            return ResponseEntity.status(503).body(response);
        }
    }
}