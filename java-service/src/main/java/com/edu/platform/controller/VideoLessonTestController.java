package com.edu.platform.controller;

import com.edu.platform.dto.integration.*;
import com.edu.platform.service.VideoLessonService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/test/videos")
@RequiredArgsConstructor
@Tag(name = "Video Lesson Test", description = "Test endpoints for video lesson management")
public class VideoLessonTestController {

    private final VideoLessonService videoLessonService;

    @GetMapping("/teacher/my-videos")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Test: Get all videos for current teacher")
    public ResponseEntity<Map<String, Object>> getMyVideos(Authentication auth) {
        String email = auth.getName();
        log.info("[TEST] Fetching videos for teacher: {}", email);
        
        try {
            List<VideoLessonDto> videos = videoLessonService.getVideosForTeacher(email);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", videos.size());
            response.put("videos", videos);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("[TEST] Failed to fetch videos", e);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/{videoId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Test: Get video details by ID")
    public ResponseEntity<Map<String, Object>> getVideoDetails(
            @PathVariable Long videoId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("[TEST] Fetching video details: {} for user: {}", videoId, email);
        
        try {
            VideoDetailsDto video = videoLessonService.getVideoDetails(videoId, email);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("video", video);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("[TEST] Failed to fetch video details", e);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            
            return ResponseEntity.status(404).body(response);
        }
    }

    @GetMapping("/subject/{subjectId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Test: Get videos for subject")
    public ResponseEntity<Map<String, Object>> getVideosForSubject(
            @PathVariable Long subjectId,
            @RequestParam(value = "studentType", required = false, defaultValue = "SCHOOL") String studentType
    ) {
        log.info("[TEST] Fetching videos for subject: {}, studentType: {}", subjectId, studentType);
        
        try {
            List<VideoLessonDto> videos = videoLessonService.getVideosForSubject(subjectId, studentType);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("subjectId", subjectId);
            response.put("studentType", studentType);
            response.put("count", videos.size());
            response.put("videos", videos);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("[TEST] Failed to fetch videos for subject", e);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            
            return ResponseEntity.status(500).body(response);
        }
    }

    @PostMapping("/{videoId}/link-topic/{lessonTopicId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Test: Link video to lesson topic")
    public ResponseEntity<Map<String, Object>> linkVideoToTopic(
            @PathVariable Long videoId,
            @PathVariable Long lessonTopicId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("[TEST] Linking video {} to topic {} by {}", videoId, lessonTopicId, email);
        
        try {
            VideoLessonDto updatedVideo = videoLessonService.linkVideoToLesson(videoId, lessonTopicId, email);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Video linked to topic successfully");
            response.put("video", updatedVideo);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("[TEST] Failed to link video to topic", e);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            
            return ResponseEntity.status(500).body(response);
        }
    }

    @PutMapping("/{videoId}/metadata")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Test: Update video metadata")
    public ResponseEntity<Map<String, Object>> updateVideoMetadata(
            @PathVariable Long videoId,
            @RequestBody VideoUpdateRequest request,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("[TEST] Updating video metadata: {} by {}", videoId, email);
        
        try {
            VideoLessonDto updatedVideo = videoLessonService.updateVideoMetadata(videoId, request, email);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Video metadata updated successfully");
            response.put("video", updatedVideo);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("[TEST] Failed to update video metadata", e);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            
            return ResponseEntity.status(500).body(response);
        }
    }

    @DeleteMapping("/{videoId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Test: Delete video")
    public ResponseEntity<Map<String, Object>> deleteVideo(
            @PathVariable Long videoId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("[TEST] Deleting video: {} by {}", videoId, email);
        
        try {
            videoLessonService.deleteVideo(videoId, email);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Video deleted successfully");
            response.put("videoId", videoId);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("[TEST] Failed to delete video", e);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/health")
    @Operation(summary = "Test: Health check for video service")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "healthy");
        response.put("service", "VideoLessonService");
        response.put("timestamp", System.currentTimeMillis());
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/student/my-videos")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Test: Get videos for current student")
    public ResponseEntity<Map<String, Object>> getVideosForStudent(Authentication auth) {
        String email = auth.getName();
        log.info("[TEST] Fetching videos for student: {}", email);
        
        try {
            List<VideoLessonDto> videos = videoLessonService.getVideosForStudent(email);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", videos.size());
            response.put("videos", videos);
            response.put("note", "This feature requires student enrollment data");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("[TEST] Failed to fetch student videos", e);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            
            return ResponseEntity.status(500).body(response);
        }
    }
}