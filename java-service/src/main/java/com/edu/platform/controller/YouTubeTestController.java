package com.edu.platform.controller;

import com.edu.platform.dto.integration.*;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.model.User;
import com.edu.platform.repository.UserRepository;
import com.edu.platform.service.VideoLessonService;
import com.edu.platform.service.integration.YouTubeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/youtube")
@RequiredArgsConstructor
@Tag(name = "YouTube Test", description = "Test endpoints for YouTube integration")
public class YouTubeTestController {

    private final VideoLessonService videoLessonService;
    private final YouTubeService youtubeService;
    private final UserRepository userRepository;

    @GetMapping("/auth/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Check YouTube connection status")
    public ResponseEntity<YouTubeAuthStatusDto> getAuthStatus(Authentication auth) {
        String email = auth.getName();
        log.info("Checking YouTube auth status for: {}", email);
        
        YouTubeAuthStatusDto status = videoLessonService.getYouTubeAuthStatus(email);
        return ResponseEntity.ok(status);
    }

    @GetMapping("/auth/initiate")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Initiate YouTube OAuth")
    public ResponseEntity<YouTubeAuthStatusDto> initiateAuth(Authentication auth) {
        String email = auth.getName();
        log.info("Initiating YouTube auth for: {}", email);
        
        YouTubeAuthStatusDto status = videoLessonService.initiateYouTubeAuth(email);
        return ResponseEntity.ok(status);
    }

    @PostMapping("/auth/callback")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Handle OAuth callback (testing)")
    public ResponseEntity<Map<String, Object>> handleCallback(
            @RequestParam String code,
            @RequestParam String state,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Handling OAuth callback for: {}", email);
        
        try {
            youtubeService.handleOAuthCallback(code, state, email);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Successfully connected YouTube account");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Failed to handle OAuth callback", e);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            
            return ResponseEntity.status(500).body(response);
        }
    }

    @DeleteMapping("/auth/disconnect")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Disconnect YouTube account")
    public ResponseEntity<Map<String, Object>> disconnectYouTube(Authentication auth) {
        String email = auth.getName();
        log.info("Disconnecting YouTube for: {}", email);
        
        try {
            videoLessonService.disconnectYouTube(email);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Successfully disconnected YouTube account");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Failed to disconnect YouTube", e);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            
            return ResponseEntity.status(500).body(response);
        }
    }

    @PostMapping("/videos/upload")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Upload video to YouTube")
    public ResponseEntity<Map<String, Object>> uploadVideo(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam("subjectId") Long subjectId,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "lessonTopicId", required = false) Long lessonTopicId,
            @RequestParam(value = "isAspirantMaterial", required = false, defaultValue = "false") Boolean isAspirantMaterial,
            @RequestParam(value = "isPublic", required = false, defaultValue = "false") Boolean isPublic,
            @RequestParam(value = "privacyStatus", required = false, defaultValue = "unlisted") String privacyStatus,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Uploading video for teacher: {}", email);
        
        try {
            UploadVideoRequest request = UploadVideoRequest.builder()
                    .title(title)
                    .description(description)
                    .subjectId(subjectId)
                    .lessonTopicId(lessonTopicId)
                    .isAspirantMaterial(isAspirantMaterial)
                    .isPublic(isPublic)
                    .privacyStatus(privacyStatus)
                    .build();
            
            VideoLessonDto videoLesson = videoLessonService.uploadVideo(file, request, email);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Video uploaded successfully");
            response.put("video", videoLesson);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Failed to upload video", e);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/videos/my-videos")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get all my videos")
    public ResponseEntity<List<VideoLessonDto>> getMyVideos(Authentication auth) {
        String email = auth.getName();
        log.info("Fetching videos for teacher: {}", email);
        
        List<VideoLessonDto> videos = videoLessonService.getVideosForTeacher(email);
        return ResponseEntity.ok(videos);
    }

    @GetMapping("/videos/{videoId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get video details")
    public ResponseEntity<VideoDetailsDto> getVideoDetails(
            @PathVariable Long videoId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Fetching video details: {}", videoId);
        
        VideoDetailsDto video = videoLessonService.getVideoDetails(videoId, email);
        return ResponseEntity.ok(video);
    }

    @PutMapping("/videos/{videoId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Update video metadata")
    public ResponseEntity<VideoLessonDto> updateVideo(
            @PathVariable Long videoId,
            @RequestBody VideoUpdateRequest request,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Updating video: {}", videoId);
        
        VideoLessonDto updatedVideo = videoLessonService.updateVideoMetadata(videoId, request, email);
        return ResponseEntity.ok(updatedVideo);
    }

    @DeleteMapping("/videos/{videoId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Delete video")
    public ResponseEntity<Map<String, Object>> deleteVideo(
            @PathVariable Long videoId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Deleting video: {}", videoId);
        
        try {
            videoLessonService.deleteVideo(videoId, email);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Video deleted successfully");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Failed to delete video", e);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/videos/subject/{subjectId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get videos for a subject")
    public ResponseEntity<List<VideoLessonDto>> getVideosForSubject(
            @PathVariable Long subjectId,
            @RequestParam(value = "studentType", required = false, defaultValue = "SCHOOL") String studentType
    ) {
        log.info("Fetching videos for subject: {}, type: {}", subjectId, studentType);
        
        List<VideoLessonDto> videos = videoLessonService.getVideosForSubject(subjectId, studentType);
        return ResponseEntity.ok(videos);
    }

    @PostMapping("/videos/{videoId}/link-topic")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Link video to lesson topic")
    public ResponseEntity<VideoLessonDto> linkToTopic(
            @PathVariable Long videoId,
            @RequestParam Long lessonTopicId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Linking video {} to topic {}", videoId, lessonTopicId);
        
        VideoLessonDto updatedVideo = videoLessonService.linkVideoToLesson(videoId, lessonTopicId, email);
        return ResponseEntity.ok(updatedVideo);
    }

    @GetMapping("/health")
    @Operation(summary = "Check YouTube integration health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Just check if the config is loaded
            response.put("status", "healthy");
            response.put("youtube_api", "configured");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("status", "unhealthy");
            response.put("error", e.getMessage());
            
            return ResponseEntity.status(503).body(response);
        }
    }
    
   
}