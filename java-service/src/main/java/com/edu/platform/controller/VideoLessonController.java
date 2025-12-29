package com.edu.platform.controller;

import com.edu.platform.dto.integration.*;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.model.VideoLesson;
import com.edu.platform.repository.VideoLessonRepository;
import com.edu.platform.service.VideoLessonService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/videos")
@RequiredArgsConstructor
@Tag(name = "Video Lessons", description = "Video lesson management and playback")
public class VideoLessonController {

    private final VideoLessonService videoLessonService;
    private final VideoLessonRepository videoLessonRepository;

    // ==================== YOUTUBE AUTH ENDPOINTS ====================

    @GetMapping("/auth/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Check YouTube connection status")
    public ResponseEntity<YouTubeAuthStatusDto> getAuthStatus(Authentication auth) {
        String email = auth.getName();
        log.info("Checking YouTube auth status for: {}", email);
        
        YouTubeAuthStatusDto status = videoLessonService.getYouTubeAuthStatus(email);
        return ResponseEntity.ok(status);
    }

    @PostMapping("/auth/initiate")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Initiate YouTube OAuth flow")
    public ResponseEntity<YouTubeAuthStatusDto> initiateAuth(Authentication auth) {
        String email = auth.getName();
        log.info("Initiating YouTube auth for: {}", email);
        
        YouTubeAuthStatusDto status = videoLessonService.initiateYouTubeAuth(email);
        return ResponseEntity.ok(status);
    }

    @DeleteMapping("/auth/disconnect")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Disconnect YouTube account")
    public ResponseEntity<Void> disconnectYouTube(Authentication auth) {
        String email = auth.getName();
        log.info("Disconnecting YouTube for: {}", email);
        
        videoLessonService.disconnectYouTube(email);
        return ResponseEntity.noContent().build();
    }

    // ==================== UPLOAD ENDPOINTS ====================

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Upload a video lesson to YouTube")
    public ResponseEntity<VideoLessonDto> uploadVideo(
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
        log.info("Uploading video '{}' for teacher: {}", title, email);
        
        UploadVideoRequest request = UploadVideoRequest.builder()
                .title(title)
                .description(description)
                .subjectId(subjectId)
                .lessonTopicId(lessonTopicId)
                .isAspirantMaterial(isAspirantMaterial)
                .isPublic(isPublic)
                .privacyStatus(privacyStatus)
                .build();
        
        VideoLessonDto video = videoLessonService.uploadVideo(file, request, email);
        return ResponseEntity.status(HttpStatus.CREATED).body(video);
    }

    // ==================== TEACHER VIDEO MANAGEMENT ====================

    @GetMapping("/my-videos")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get all videos for current teacher")
    public ResponseEntity<Page<VideoLessonDto>> getMyVideos(
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) String status,
            Pageable pageable,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Fetching videos for teacher: {}", email);
        
        Page<VideoLessonDto> videos = videoLessonService.getTeacherVideos(email, subjectId, status, pageable);
        return ResponseEntity.ok(videos);
    }

    @GetMapping("/{videoId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get video details by ID")
    public ResponseEntity<VideoDetailsDto> getVideoDetails(
            @PathVariable Long videoId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Fetching video details: {} for user: {}", videoId, email);
        
        VideoDetailsDto video = videoLessonService.getVideoDetails(videoId, email);
        return ResponseEntity.ok(video);
    }

    @PutMapping("/{videoId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Update video metadata")
    public ResponseEntity<VideoLessonDto> updateVideo(
            @PathVariable Long videoId,
            @Valid @RequestBody VideoUpdateRequest request,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Updating video: {} by teacher: {}", videoId, email);
        
        VideoLessonDto updated = videoLessonService.updateVideoMetadata(videoId, request, email);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{videoId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Delete a video lesson")
    public ResponseEntity<Void> deleteVideo(
            @PathVariable Long videoId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Deleting video: {} by teacher: {}", videoId, email);
        
        videoLessonService.deleteVideo(videoId, email);
        return ResponseEntity.noContent().build();
    }

    // ==================== LESSON LINKING ====================

    @PostMapping("/{videoId}/link-topic/{lessonTopicId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Link video to a lesson topic")
    public ResponseEntity<VideoLessonDto> linkToTopic(
            @PathVariable Long videoId,
            @PathVariable Long lessonTopicId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Linking video {} to topic {} by {}", videoId, lessonTopicId, email);
        
        VideoLessonDto updated = videoLessonService.linkVideoToLesson(videoId, lessonTopicId, email);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{videoId}/unlink-topic")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Unlink video from lesson topic")
    public ResponseEntity<VideoLessonDto> unlinkFromTopic(
            @PathVariable Long videoId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Unlinking video {} from topic by {}", videoId, email);
        
        VideoLessonDto updated = videoLessonService.unlinkVideoFromLesson(videoId, email);
        return ResponseEntity.ok(updated);
    }

    // ==================== STUDENT VIDEO ACCESS ====================

    @GetMapping("/student/available")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Get available videos for current student")
    public ResponseEntity<Page<VideoLessonDto>> getAvailableVideos(
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) String studentType,
            Pageable pageable,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Fetching available videos for student: {}", email);
        
        Page<VideoLessonDto> videos = videoLessonService.getVideosForStudent(
                email, subjectId, studentType, pageable
        );
        return ResponseEntity.ok(videos);
    }

    @GetMapping("/subject/{subjectId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get videos for a specific subject")
    public ResponseEntity<List<VideoLessonDto>> getSubjectVideos(
            @PathVariable Long subjectId,
            @RequestParam(required = false, defaultValue = "SCHOOL") String studentType
    ) {
        log.info("Fetching videos for subject: {}, type: {}", subjectId, studentType);
        
        List<VideoLessonDto> videos = videoLessonService.getVideosForSubject(subjectId, studentType);
        return ResponseEntity.ok(videos);
    }

    @GetMapping("/topic/{lessonTopicId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get videos for a specific lesson topic")
    public ResponseEntity<List<VideoLessonDto>> getTopicVideos(
            @PathVariable Long lessonTopicId
    ) {
        log.info("Fetching videos for topic: {}", lessonTopicId);
        
        List<VideoLessonDto> videos = videoLessonService.getVideosForTopic(lessonTopicId);
        return ResponseEntity.ok(videos);
    }

    // ==================== VIDEO SEARCH ====================

    @PostMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Search videos by title, description, or tags")
    public ResponseEntity<Page<VideoLessonDto>> searchVideos(
            @Valid @RequestBody VideoSearchRequest request,
            Pageable pageable,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Searching videos with query: {} for user: {}", request.getQuery(), email);
        
        Page<VideoLessonDto> videos = videoLessonService.searchVideos(request, email, pageable);
        return ResponseEntity.ok(videos);
    }

    // ==================== VIDEO CHAPTERS ====================

    @GetMapping("/{videoId}/chapters")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get chapters for a video")
    public ResponseEntity<List<VideoChapterDto>> getVideoChapters(
            @PathVariable Long videoId
    ) {
        log.info("Fetching chapters for video: {}", videoId);
        
        List<VideoChapterDto> chapters = videoLessonService.getVideoChapters(videoId);
        return ResponseEntity.ok(chapters);
    }

    @PostMapping("/{videoId}/chapters/generate")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Trigger AI chapter generation")
    public ResponseEntity<Void> generateChapters(
            @PathVariable Long videoId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Generating chapters for video: {} by teacher: {}", videoId, email);
        
        videoLessonService.triggerChapterGeneration(videoId, email);
        return ResponseEntity.accepted().build();
    }

    // ==================== VIDEO TRANSCRIPTS ====================

    @GetMapping("/{videoId}/transcript")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get video transcript")
    public ResponseEntity<String> getVideoTranscript(
            @PathVariable Long videoId
    ) {
        log.info("Fetching transcript for video: {}", videoId);
        
        String transcript = videoLessonService.getVideoTranscript(videoId);
        return ResponseEntity.ok(transcript);
    }

    @PostMapping("/{videoId}/transcript/generate")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Trigger transcript generation")
    public ResponseEntity<Void> generateTranscript(
            @PathVariable Long videoId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Generating transcript for video: {} by teacher: {}", videoId, email);
        
        videoLessonService.triggerTranscriptGeneration(videoId, email);
        return ResponseEntity.accepted().build();
    }

    // ==================== WATCH HISTORY ====================

    @PostMapping("/{videoId}/watch")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Record video watch progress")
    public ResponseEntity<VideoWatchHistoryDto> recordWatchProgress(
            @PathVariable Long videoId,
            @RequestParam Integer watchedSeconds,
            @RequestParam(required = false) Integer totalSeconds,
            @RequestParam(required = false, defaultValue = "false") Boolean completed,
            Authentication auth
    ) {
        String email = auth.getName();
        log.debug("Recording watch progress for video: {} by student: {}", videoId, email);
        
        VideoWatchHistoryDto history = videoLessonService.recordWatchProgress(
                videoId, email, watchedSeconds, totalSeconds, completed
        );
        return ResponseEntity.ok(history);
    }

    @GetMapping("/student/watch-history")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Get watch history for current student")
    public ResponseEntity<List<VideoWatchHistoryDto>> getWatchHistory(
            @RequestParam(required = false) Long subjectId,
            Pageable pageable,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Fetching watch history for student: {}", email);
        
        List<VideoWatchHistoryDto> history = videoLessonService.getWatchHistory(email, subjectId, pageable);
        return ResponseEntity.ok(history);
    }
    
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get all videos with optional filters")
    public ResponseEntity<List<VideoLessonDto>> getAllVideos(
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String order,
            @RequestParam(required = false, defaultValue = "10") Integer limit,
            @RequestParam(required = false, defaultValue = "0") Integer offset,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("GET /videos - Fetching videos for user: {} with params - limit: {}, sortBy: {}, order: {}", 
                 email, limit, sortBy, order);
        
        try {
            // Map frontend field names to entity field names
            String entitySortField = sortBy;
            if ("uploadedAt".equals(sortBy)) {
                entitySortField = "uploadDate";
            }
            
            // Calculate page number (avoid division by zero)
            int pageNumber = limit > 0 ? offset / limit : 0;
            
            // Create pageable with sorting
            Pageable pageable = PageRequest.of(
                pageNumber, 
                limit,
                entitySortField != null && "DESC".equalsIgnoreCase(order) 
                    ? Sort.by(entitySortField).descending() 
                    : Sort.by(entitySortField != null ? entitySortField : "uploadDate").descending()
            );
            
            // ✅ FIXED: Different logic based on role
            boolean isTeacher = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_TEACHER"));
            boolean isAdmin = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            
            Page<VideoLessonDto> videos;
            
            if (isAdmin) {
                // ✅ Admins get ALL videos from ALL teachers
                videos = videoLessonService.getAllVideosForAdmin(subjectId, status, pageable);
            } else if (isTeacher) {
                // Teachers get only their own videos
                videos = videoLessonService.getTeacherVideos(email, subjectId, status, pageable);
            } else {
                // Students get published videos only
                videos = videoLessonService.getVideosForStudent(email, subjectId, null, pageable);
            }
            
            log.info("Returning {} videos for user: {}", videos.getContent().size(), email);
            return ResponseEntity.ok(videos.getContent());
        } catch (Exception e) {
            log.error("Error fetching videos for user: {}", email, e);
            throw e;
        }
    }
    
    
    
    @PostMapping("/{videoId}/toggle-publish")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Toggle video published status")
    public ResponseEntity<VideoLessonDto> togglePublishStatus(
            @PathVariable Long videoId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Toggling publish status for video: {} by user: {}", videoId, email);
        
        // Get current video
        VideoLesson video = videoLessonRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Video not found"));
        
        // Toggle the published state
        Boolean newPublishedState = !Boolean.TRUE.equals(video.getPublished());
        
        VideoLessonDto updatedVideo = videoLessonService.updatePublishedStatus(
                videoId, 
                newPublishedState, 
                email
        );
        
        log.info("✅ Successfully toggled published status to: {} for video: {}", newPublishedState, videoId);
        return ResponseEntity.ok(updatedVideo);
    }

}