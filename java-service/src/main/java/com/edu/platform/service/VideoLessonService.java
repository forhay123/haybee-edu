package com.edu.platform.service;

import com.edu.platform.dto.integration.*;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.exception.ValidationException;
import com.edu.platform.model.*;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.model.enums.VideoStatus;
import com.edu.platform.repository.*;
import com.edu.platform.service.integration.YouTubeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.scheduling.annotation.Scheduled;

import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpStatusCodeException;  // ✅ FIXED - removed underscores

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class VideoLessonService {

    private final VideoLessonRepository videoLessonRepository;
    private final UserRepository userRepository;
    private final SubjectRepository subjectRepository;
    private final LessonTopicRepository lessonTopicRepository;
    private final TeacherYouTubeTokenRepository tokenRepository;
    private final VideoWatchHistoryRepository watchHistoryRepository;
    private final VideoTranscriptRepository transcriptRepository;
    private final VideoChapterRepository chapterRepository;
    private final YouTubeService youtubeService;
    private final RestTemplate restTemplate;
    private final StudentProfileRepository studentProfileRepository;
    private final ClassRepository classRepository;

    private static final List<String> ALLOWED_VIDEO_TYPES = Arrays.asList(
            "video/mp4", "video/quicktime", "video/x-msvideo", "video/x-ms-wmv",
            "video/x-flv", "video/3gpp", "video/webm", "video/mpeg"
    );

    // ==================== HELPER METHOD ====================
    
    /**
     * Helper method to check if user has a specific role
     */
    private boolean hasRole(User user, String roleName) {
        return user.getRoles().stream()
                .anyMatch(role -> roleName.equalsIgnoreCase(role.getName()));
    }

    // ==================== OAuth Management ====================

    @Transactional(readOnly = true)
    public YouTubeAuthStatusDto initiateYouTubeAuth(String teacherEmail) {
        log.info("Initiating YouTube auth for teacher: {}", teacherEmail);

        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));

        return tokenRepository.findByTeacherId(teacher.getId())
                .map(token -> {
                    if (token.isExpired()) {
                        String state = UUID.randomUUID().toString();
                        String authUrl = youtubeService.getAuthorizationUrl(teacherEmail, state);
                        
                        return YouTubeAuthStatusDto.builder()
                                .connected(false)
                                .expired(true)
                                .authUrl(authUrl)
                                .build();
                    }
                    
                    return YouTubeAuthStatusDto.builder()
                            .connected(true)
                            .channelId(token.getYoutubeChannelId())
                            .channelName(token.getYoutubeChannelName())
                            .connectedAt(token.getCreatedAt())
                            .expiresAt(token.getExpiresAt())
                            .build();
                })
                .orElseGet(() -> {
                    String state = UUID.randomUUID().toString();
                    String authUrl = youtubeService.getAuthorizationUrl(teacherEmail, state);
                    
                    return YouTubeAuthStatusDto.builder()
                            .connected(false)
                            .authUrl(authUrl)
                            .build();
                });
    }

    @Transactional(readOnly = true)
    public YouTubeAuthStatusDto getYouTubeAuthStatus(String teacherEmail) {
        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));

        return tokenRepository.findByTeacherId(teacher.getId())
                .map(token -> YouTubeAuthStatusDto.builder()
                        .connected(!token.isExpired())
                        .expired(token.isExpired())
                        .channelId(token.getYoutubeChannelId())
                        .channelName(token.getYoutubeChannelName())
                        .connectedAt(token.getCreatedAt())
                        .expiresAt(token.getExpiresAt())
                        .build())
                .orElse(YouTubeAuthStatusDto.builder()
                        .connected(false)
                        .build());
    }

    @Transactional
    public void disconnectYouTube(String teacherEmail) {
        log.info("Disconnecting YouTube for teacher: {}", teacherEmail);

        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));

        tokenRepository.findByTeacherId(teacher.getId())
                .ifPresent(token -> {
                    tokenRepository.delete(token);
                    log.info("✅ Successfully disconnected YouTube account");
                });
    }

    @Transactional
    public void completeYouTubeAuth(String code, String state, String teacherEmail) {
        log.info("Completing YouTube OAuth for teacher: {}", teacherEmail);
        
        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        
        youtubeService.handleOAuthCallback(code, state, teacherEmail);
        
        log.info("✅ YouTube OAuth completed successfully for: {}", teacherEmail);
    }

    // ==================== Video Upload & Management ====================

    @Transactional
    public VideoLessonDto uploadVideo(MultipartFile file, UploadVideoRequest request, String teacherEmail) {
        log.info("Uploading video: {}", request.getTitle());

        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));

        if (!hasRole(teacher, "TEACHER")) {
            log.error("❌ User {} does not have TEACHER role. Roles: {}", 
                      teacherEmail, 
                      teacher.getRoles().stream()
                          .map(role -> role.getName())
                          .collect(Collectors.toList()));
            throw new ValidationException("Only teachers can upload videos");
        }

        Subject subject = subjectRepository.findById(request.getSubjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));

        if (file.isEmpty()) {
            throw new ValidationException("Video file is required");
        }

        if (!ALLOWED_VIDEO_TYPES.contains(file.getContentType())) {
            throw new ValidationException("Invalid video format. Allowed: MP4, MOV, AVI, WMV, FLV, 3GP, WebM, MPEG");
        }

        long maxSize = 2L * 1024 * 1024 * 1024;
        if (file.getSize() > maxSize) {
            throw new ValidationException("Video file too large. Max size: 2GB");
        }

        LessonTopic lessonTopic = null;
        if (request.getLessonTopicId() != null) {
            lessonTopic = lessonTopicRepository.findById(request.getLessonTopicId())
                    .orElseThrow(() -> new ResourceNotFoundException("Lesson topic not found"));

            if (!lessonTopic.getSubject().getId().equals(subject.getId())) {
                throw new ValidationException("Lesson topic does not belong to the specified subject");
            }
        }

        TeacherYouTubeToken token = tokenRepository.findByTeacherId(teacher.getId())
                .orElseThrow(() -> new ValidationException("Please connect your YouTube account first"));

        if (token.isExpired()) {
            throw new ValidationException("YouTube token expired. Please reconnect your account");
        }

        YouTubeUploadResponse uploadResponse = youtubeService.uploadVideo(file, request, teacher.getId());

        Instant now = Instant.now();
        
        VideoLesson videoLesson = VideoLesson.builder()
                .teacher(teacher)
                .subject(subject)
                .lessonTopic(lessonTopic)
                .youtubeVideoId(uploadResponse.getVideoId())
                .youtubeUrl(uploadResponse.getVideoUrl())
                .embedUrl(uploadResponse.getEmbedUrl())
                .thumbnailUrl(uploadResponse.getThumbnailUrl())
                .youtubeChannelId(token.getYoutubeChannelId())
                .title(request.getTitle())
                .description(request.getDescription())
                .durationSeconds(0) // ✅ Set to 0 initially, will be updated later
                .status(VideoStatus.PENDING)
                .uploadDate(now)
                .createdAt(now)
                .updatedAt(now)
                .isAspirantMaterial(request.getIsAspirantMaterial() != null ? request.getIsAspirantMaterial() : false)
                .isPublic(request.getIsPublic() != null ? request.getIsPublic() : false)
                .isPremium(false)
                .totalViews(0)
                .build();

        videoLesson = videoLessonRepository.save(videoLesson);

        log.info("✅ Successfully created video lesson. ID: {}, YouTube ID: {}", 
                videoLesson.getId(), uploadResponse.getVideoId());

        return mapToDto(videoLesson, null);
    }

    @Transactional
    public VideoLessonDto linkVideoToLesson(Long videoId, Long lessonTopicId, String teacherEmail) {
        log.info("Linking video {} to lesson topic {}", videoId, lessonTopicId);

        VideoLesson video = videoLessonRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Video not found"));

        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));

        if (!video.getTeacher().getId().equals(teacher.getId())) {
            throw new ValidationException("You can only link your own videos");
        }

        LessonTopic lessonTopic = lessonTopicRepository.findById(lessonTopicId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson topic not found"));

        if (!lessonTopic.getSubject().getId().equals(video.getSubject().getId())) {
            throw new ValidationException("Lesson topic does not belong to the video's subject");
        }

        video.setLessonTopic(lessonTopic);
        video.setUpdatedAt(Instant.now());
        video = videoLessonRepository.save(video);

        log.info("✅ Successfully linked video to lesson topic");

        return mapToDto(video, null);
    }

    @Transactional
    public VideoLessonDto unlinkVideoFromLesson(Long videoId, String teacherEmail) {
        log.info("Unlinking video {} from lesson topic", videoId);
        
        VideoLesson video = videoLessonRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Video not found"));
        
        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        
        if (!video.getTeacher().getId().equals(teacher.getId())) {
            throw new ValidationException("You can only unlink your own videos");
        }
        
        video.setLessonTopic(null);
        video.setUpdatedAt(Instant.now());
        video = videoLessonRepository.save(video);
        
        log.info("✅ Successfully unlinked video from lesson topic");
        
        return mapToDto(video, null);
    }

    // ✅ NEW: Scheduled job to update video durations
    @Scheduled(fixedDelay = 300000) // Run every 5 minutes
    @Transactional
    public void updateProcessingVideos() {
        log.info("🔄 Checking for videos that need duration updates...");
        
        List<VideoLesson> processingVideos = videoLessonRepository.findByDurationSecondsIsNullOrDurationSecondsEquals(0);
        
        if (processingVideos.isEmpty()) {
            return;
        }
        
        log.info("📹 Found {} videos to update", processingVideos.size());
        
        for (VideoLesson video : processingVideos) {
            try {
                YouTubeVideoResponse details = youtubeService.getVideoDetails(
                    video.getYoutubeVideoId(), 
                    video.getTeacher().getId()
                );
                
                if (details.getDurationSeconds() > 0) {
                    video.setDurationSeconds(details.getDurationSeconds());
                    video.setStatus(VideoStatus.PUBLISHED);
                    video.setProcessingCompletedAt(Instant.now());
                    video.setUpdatedAt(Instant.now());
                    videoLessonRepository.save(video);
                    
                    log.info("✅ Updated video {}: duration = {} seconds", 
                            video.getId(), details.getDurationSeconds());
                }
            } catch (Exception e) {
                log.warn("⚠️ Failed to update video {}: {}", video.getId(), e.getMessage());
            }
        }
    }
 // ==================== Video Retrieval ====================

    @Transactional(readOnly = true)
    public List<VideoLessonDto> getVideosForSubject(Long subjectId, String studentType) {
        boolean isAspirant = "ASPIRANT".equalsIgnoreCase(studentType);

        List<VideoLesson> videos = videoLessonRepository.findBySubjectIdAndStatus(subjectId, VideoStatus.PUBLISHED)
                .stream()
                .filter(v -> v.getIsAspirantMaterial() == isAspirant)
                // ✅ CRITICAL: Only show published videos
                .filter(v -> Boolean.TRUE.equals(v.getPublished()))
                .collect(Collectors.toList());

        return videos.stream()
                .map(v -> mapToDto(v, null))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<VideoLessonDto> getVideosForStudent(String studentEmail) {
        log.warn("getVideosForStudent not fully implemented yet");
        return List.of();
    }

    @Transactional(readOnly = true)
    public List<VideoLessonDto> getVideosForTeacher(String teacherEmail) {
        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));

        List<VideoLesson> videos = videoLessonRepository.findByTeacherIdOrderByUploadDateDesc(teacher.getId());

        return videos.stream()
                .map(v -> mapToDto(v, null))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<VideoLessonDto> getVideosForTopic(Long lessonTopicId) {
        log.info("Fetching videos for lesson topic: {}", lessonTopicId);
        
        List<VideoLesson> videos = videoLessonRepository.findByLessonTopicId(lessonTopicId);
        
        return videos.stream()
                .filter(v -> v.getStatus() == VideoStatus.PUBLISHED)
                // ✅ CRITICAL: Only show published videos
                .filter(v -> Boolean.TRUE.equals(v.getPublished()))
                .map(v -> mapToDto(v, null))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<VideoLessonDto> getTeacherVideos(String teacherEmail, Long subjectId, 
                                                  String status, Pageable pageable) {
        log.info("Fetching paginated videos for teacher: {}", teacherEmail);
        
        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        
        Page<VideoLesson> videos;
        
        if (subjectId != null && status != null) {
            VideoStatus videoStatus = VideoStatus.valueOf(status.toUpperCase());
            videos = videoLessonRepository.findByTeacherIdAndSubjectIdAndStatus(
                    teacher.getId(), subjectId, videoStatus, pageable);
        } else if (subjectId != null) {
            videos = videoLessonRepository.findByTeacherIdAndSubjectId(
                    teacher.getId(), subjectId, pageable);
        } else if (status != null) {
            VideoStatus videoStatus = VideoStatus.valueOf(status.toUpperCase());
            videos = videoLessonRepository.findByTeacherIdAndStatus(
                    teacher.getId(), videoStatus, pageable);
        } else {
            videos = videoLessonRepository.findByTeacherId(teacher.getId(), pageable);
        }
        
        return videos.map(v -> mapToDto(v, null));
    }

    /**
     * ✅ FIXED METHOD: Get paginated videos for student
     * NOW INCLUDES: Videos from general subjects + departmental subjects
     */
    @Transactional(readOnly = true)
    public Page<VideoLessonDto> getVideosForStudent(String studentEmail, Long subjectId, 
                                                     String studentType, Pageable pageable) {
        log.info("Fetching paginated videos for student: {} (type: {})", studentEmail, studentType);
        
        User student = userRepository.findByEmail(studentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        
        StudentProfile studentProfile = studentProfileRepository.findByUserId(student.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
        
        StudentType profileStudentType = studentProfile.getStudentType();
        boolean isAspirant = profileStudentType == StudentType.ASPIRANT;
        
        log.info("📋 Student type: {}, isAspirant: {}", profileStudentType, isAspirant);
        
        Page<VideoLesson> videos;
        
        // ✅ ASPIRANT LOGIC: Enrolled subjects + ALL aspirant-flagged videos
        if (isAspirant) {
            Set<Subject> enrolledSubjects = studentProfile.getSubjects();
            
            if (enrolledSubjects == null || enrolledSubjects.isEmpty()) {
                log.warn("⚠️ ASPIRANT student has no enrolled subjects");
                return Page.empty(pageable);
            }
            
            List<Long> enrolledSubjectIds = enrolledSubjects.stream()
                    .map(Subject::getId)
                    .collect(Collectors.toList());
            
            log.info("🎯 ASPIRANT has {} enrolled subjects: {}", enrolledSubjectIds.size(), enrolledSubjectIds);
            
            if (subjectId != null) {
                // Specific subject filter
                // Show video if: (video is in enrolled subject) OR (video is aspirant material)
                videos = videoLessonRepository.findBySubjectIdAndStatusAndPublishedTrueOrderByUploadDateDesc(
                        subjectId, VideoStatus.PUBLISHED, pageable);
                
                // Filter: must be either in enrolled subjects OR be aspirant material
                videos = videos.map(v -> {
                    boolean inEnrolledSubject = enrolledSubjectIds.contains(v.getSubject().getId());
                    boolean isAspirantMaterial = Boolean.TRUE.equals(v.getIsAspirantMaterial());
                    
                    if (inEnrolledSubject || isAspirantMaterial) {
                        return v;
                    }
                    return null; // Filter out
                }).map(v -> v); // Remove nulls
                
            } else {
                // No subject filter - get all accessible videos
                // Two criteria: enrolled subjects OR aspirant material flag
                List<VideoLesson> allVideos = videoLessonRepository
                        .findByStatusAndPublishedTrue(VideoStatus.PUBLISHED);
                
                List<VideoLesson> accessibleVideos = allVideos.stream()
                        .filter(v -> {
                            boolean inEnrolledSubject = enrolledSubjectIds.contains(v.getSubject().getId());
                            boolean isAspirantMaterial = Boolean.TRUE.equals(v.getIsAspirantMaterial());
                            return inEnrolledSubject || isAspirantMaterial;
                        })
                        .sorted((v1, v2) -> v2.getUploadDate().compareTo(v1.getUploadDate()))
                        .collect(Collectors.toList());
                
                log.info("📹 ASPIRANT: Found {} accessible videos (enrolled subjects + aspirant-flagged)", 
                        accessibleVideos.size());
                
                // Convert to Page
                int start = (int) pageable.getOffset();
                int end = Math.min((start + pageable.getPageSize()), accessibleVideos.size());
                List<VideoLesson> pageContent = accessibleVideos.subList(start, end);
                
                videos = new PageImpl<>(pageContent, pageable, accessibleVideos.size());
            }
        } 
        // ✅ REGULAR STUDENT LOGIC: Class subjects only, no aspirant materials
        else {
            List<Long> enrolledSubjectIds = getSubjectIdsForStudent(studentProfile);
            
            if (enrolledSubjectIds.isEmpty()) {
                log.warn("⚠️ REGULAR student has no enrolled subjects");
                return Page.empty(pageable);
            }
            
            log.info("✅ REGULAR student enrolled in {} subjects: {}", 
                    enrolledSubjectIds.size(), enrolledSubjectIds);
            
            if (subjectId != null) {
                if (!enrolledSubjectIds.contains(subjectId)) {
                    log.warn("⚠️ Student not enrolled in subject {}", subjectId);
                    return Page.empty(pageable);
                }
                
                // Get videos for specific subject, exclude aspirant materials
                videos = videoLessonRepository
                        .findBySubjectIdAndStatusAndIsAspirantMaterialAndPublishedTrueOrderByUploadDateDesc(
                                subjectId, VideoStatus.PUBLISHED, false, pageable);
            } else {
                // Get all videos from enrolled subjects, exclude aspirant materials
                videos = videoLessonRepository
                        .findBySubjectIdInAndStatusAndIsAspirantMaterialAndPublishedTrueOrderByUploadDateDesc(
                                enrolledSubjectIds, VideoStatus.PUBLISHED, false, pageable);
            }
            
            log.info("📹 REGULAR: Found {} videos from enrolled subjects", videos.getTotalElements());
        }
        
        // Map to DTOs with watch history
        return videos.map(v -> {
            VideoWatchHistory watchHistory = watchHistoryRepository
                    .findByVideoLessonIdAndStudentId(v.getId(), student.getId())
                    .orElse(null);
            return mapToDto(v, watchHistory);
        });
    }

    /**
     * ✅ Get subject IDs for REGULAR students (SCHOOL/HOME)
     * ASPIRANT students don't use this method - they have manually enrolled subjects
     */
    private List<Long> getSubjectIdsForStudent(StudentProfile studentProfile) {
        if (studentProfile.getClassLevel() == null) {
            log.warn("⚠️ Student profile {} has no class assigned", studentProfile.getId());
            return List.of();
        }
        
        Long classId = studentProfile.getClassLevel().getId();
        String className = studentProfile.getClassLevel().getName();
        StudentType studentType = studentProfile.getStudentType();
        
        log.info("🔍 Getting subjects for REGULAR student: class={} (ID={}), type={}", 
                className, classId, studentType);
        
        String grade = extractGrade(className);
        List<Long> subjectIds = new ArrayList<>();
        
        // Get GENERAL subjects for this grade and student type
        List<ClassEntity> allClasses = classRepository.findAll();
        List<Long> generalClassIds = allClasses.stream()
                .filter(c -> c.getName().contains(grade) && 
                            c.getName().contains("General") &&
                            c.getStudentType() == studentType)
                .map(ClassEntity::getId)
                .collect(Collectors.toList());
        
        if (!generalClassIds.isEmpty()) {
            List<Subject> generalSubjects = subjectRepository.findByClassEntityId(generalClassIds.get(0));
            log.info("📚 Found {} GENERAL subjects", generalSubjects.size());
            
            subjectIds.addAll(generalSubjects.stream()
                    .map(Subject::getId)
                    .collect(Collectors.toList()));
        }
        
        // Get DEPARTMENTAL subjects for the student's specific class
        List<Subject> departmentalSubjects = subjectRepository.findByClassEntityId(classId);
        log.info("📚 Found {} DEPARTMENTAL subjects", departmentalSubjects.size());
        
        departmentalSubjects.forEach(subject -> {
            if (!subjectIds.contains(subject.getId())) {
                subjectIds.add(subject.getId());
            }
        });
        
        log.info("✅ Total {} subjects (General + Departmental)", subjectIds.size());
        return subjectIds;
    }

    private String extractGrade(String className) {
        if (className == null) return "";
        if (className.startsWith("JSS")) return className.substring(0, 4);
        if (className.startsWith("SSS")) return className.substring(0, 4);
        return className.split(" ")[0];
    }

    /**
     * Extract location from class name
     * E.g., "SSS1 Science HOME" -> "HOME", "JSS2 Art SCHOOL" -> "SCHOOL"
     */
    private String extractLocation(String className) {
        if (className == null) return "";
        
        String[] parts = className.split(" ");
        if (parts.length > 0) {
            String lastPart = parts[parts.length - 1].toUpperCase();
            if (lastPart.equals("HOME") || lastPart.equals("SCHOOL")) {
                return lastPart;
            }
        }
        
        return "";
    }
    @Transactional(readOnly = true)
    public Page<VideoLessonDto> searchVideos(VideoSearchRequest request, String userEmail, 
                                              Pageable pageable) {
        log.info("Searching videos with query: {}", request.getQuery());
        
        Page<VideoLesson> videos = videoLessonRepository.searchVideos(
                request.getQuery(), VideoStatus.PUBLISHED, pageable);
        
        // Filter by published status for students
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        if (hasRole(user, "STUDENT")) {
            return videos
                    .map(v -> Boolean.TRUE.equals(v.getPublished()) ? mapToDto(v, null) : null)
                    .map(dto -> dto);
        }
        
        // Teachers and admins see all videos
        return videos.map(v -> mapToDto(v, null));
    }

    @Transactional(readOnly = true)
    public Page<VideoLessonDto> getAllVideosForAdmin(Long subjectId, String status, Pageable pageable) {
        log.info("Fetching all videos for admin - subjectId: {}, status: {}", subjectId, status);
        
        Page<VideoLesson> videos;
        
        if (subjectId != null && status != null) {
            VideoStatus videoStatus = VideoStatus.valueOf(status.toUpperCase());
            videos = videoLessonRepository.findBySubjectIdAndStatus(subjectId, videoStatus, pageable);
        } else if (subjectId != null) {
            videos = videoLessonRepository.findBySubjectId(subjectId, pageable);
        } else if (status != null) {
            VideoStatus videoStatus = VideoStatus.valueOf(status.toUpperCase());
            videos = videoLessonRepository.findByStatus(videoStatus, pageable);
        } else {
            videos = videoLessonRepository.findAll(pageable);
        }
        
        return videos.map(v -> mapToDto(v, null));
    }
    
    
    @Transactional
    public VideoLessonDto updatePublishedStatus(Long videoId, Boolean published, String teacherEmail) {
        log.info("Updating published status for video: {} to {}", videoId, published);
        
        VideoLesson video = videoLessonRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Video not found"));
        
        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        
        if (!video.getTeacher().getId().equals(teacher.getId())) {
            throw new ValidationException("You can only update your own videos");
        }
        
        // Can only publish videos that are in PUBLISHED status
        if (published && video.getStatus() != VideoStatus.PUBLISHED) {
            throw new ValidationException("Cannot publish video that is not in PUBLISHED status");
        }
        
        video.setPublished(published);
        video.setUpdatedAt(Instant.now());
        video = videoLessonRepository.save(video);
        
        log.info("✅ Successfully updated published status to: {}", published);
        
        return mapToDto(video, null);
    }

    @Transactional(readOnly = true)
    public VideoDetailsDto getVideoDetails(Long videoId, String userEmail) {
        VideoLesson video = videoLessonRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Video not found"));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        VideoDetailsDto dto = VideoDetailsDto.builder()
                .id(video.getId())
                .title(video.getTitle())
                .description(video.getDescription())
                .status(video.getStatus().name())
                .published(video.getPublished() != null ? video.getPublished() : false) // ✅ ADD THIS LINE
                .youtubeVideoId(video.getYoutubeVideoId())
                .youtubeUrl(video.getYoutubeUrl())
                .embedUrl(video.getEmbedUrl())
                .thumbnailUrl(video.getThumbnailUrl())
                .durationSeconds(video.getDurationSeconds() != null ? video.getDurationSeconds() : 0)
                .teacherId(video.getTeacher().getId())
                .teacherName(video.getTeacher().getFullName())
                .teacherEmail(video.getTeacher().getEmail())
                .subjectId(video.getSubject().getId())
                .subjectName(video.getSubject().getName())
                .hasTranscript(video.getHasTranscript())
                .hasChapters(video.getHasChapters())
                .hasQuiz(video.getHasQuiz())
                .hasSummary(video.getHasSummary())
                .isAspirantMaterial(video.getIsAspirantMaterial())
                .isPublic(video.getIsPublic())
                .isPremium(video.getIsPremium())
                .totalViews(video.getTotalViews() != null ? video.getTotalViews() : 0)
                .averageCompletionRate(video.getAverageCompletionRate() != null ? 
                        video.getAverageCompletionRate().doubleValue() : null)
                .uploadDate(video.getUploadDate() != null ? video.getUploadDate() : Instant.now())
                .processingCompletedAt(video.getProcessingCompletedAt())
                .createdAt(video.getCreatedAt() != null ? video.getCreatedAt() : Instant.now())
                .updatedAt(video.getUpdatedAt() != null ? video.getUpdatedAt() : Instant.now())
                .build();

        if (video.getLessonTopic() != null) {
            dto.setLessonTopicId(video.getLessonTopic().getId());
            dto.setLessonTopicTitle(video.getLessonTopic().getTopicTitle());
        }

        if (video.getSessionRecording() != null) {
            dto.setSessionRecordingId(video.getSessionRecording().getId());
        }

        if (hasRole(user, "TEACHER") && video.getTeacher().getId().equals(user.getId())) {
            transcriptRepository.findByVideoLessonId(videoId)
                    .ifPresent(transcript -> dto.setTranscript(transcript.getFullTranscript()));

            List<VideoChapter> chapters = chapterRepository.findByVideoLessonIdOrderByChapterNumberAsc(videoId);
            if (!chapters.isEmpty()) {
                dto.setChapters(chapters.stream()
                        .map(this::mapToChapterDto)
                        .collect(Collectors.toList()));
            }
        }

        if (hasRole(user, "STUDENT")) {
            watchHistoryRepository.findByVideoLessonIdAndStudentId(videoId, user.getId())
                    .ifPresent(watchHistory -> {
                        dto.setLastPositionSeconds(watchHistory.getLastPositionSeconds());
                        dto.setCompletionPercentage(watchHistory.getCompletionPercentage() != null ? 
                                watchHistory.getCompletionPercentage().doubleValue() : null);
                        dto.setCompleted(watchHistory.getCompleted());
                        dto.setLastWatchedAt(watchHistory.getWatchStartedAt());
                    });
        }

        return dto;
    }

    @Transactional(readOnly = true)
    public List<VideoChapterDto> getVideoChapters(Long videoId) {
        log.info("Fetching chapters for video: {}", videoId);
        
        VideoLesson video = videoLessonRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Video not found"));
        
        List<VideoChapter> chapters = chapterRepository.findByVideoLessonIdOrderByChapterNumberAsc(videoId);
        
        return chapters.stream()
                .map(this::mapToChapterDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public String getVideoTranscript(Long videoId) {
        log.info("Fetching transcript for video: {}", videoId);
        
        VideoTranscript transcript = transcriptRepository.findByVideoLessonId(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Transcript not found"));
        
        return transcript.getFullTranscript();
    }

    // ==================== Video Update & Delete ====================

    @Transactional
    public VideoLessonDto updateVideoMetadata(Long videoId, VideoUpdateRequest request, String teacherEmail) {
        log.info("Updating video metadata: {}", videoId);

        VideoLesson video = videoLessonRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Video not found"));

        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));

        if (!hasRole(teacher, "TEACHER")) {
            throw new ValidationException("Only teachers can update videos");
        }

        if (!video.getTeacher().getId().equals(teacher.getId())) {
            throw new ValidationException("You can only update your own videos");
        }

        boolean needsYouTubeUpdate = false;

        if (request.getTitle() != null && !request.getTitle().equals(video.getTitle())) {
            video.setTitle(request.getTitle());
            needsYouTubeUpdate = true;
        }

        if (request.getDescription() != null && !request.getDescription().equals(video.getDescription())) {
            video.setDescription(request.getDescription());
            needsYouTubeUpdate = true;
        }

        if (request.getLessonTopicId() != null) {
            LessonTopic lessonTopic = lessonTopicRepository.findById(request.getLessonTopicId())
                    .orElseThrow(() -> new ResourceNotFoundException("Lesson topic not found"));

            if (!lessonTopic.getSubject().getId().equals(video.getSubject().getId())) {
                throw new ValidationException("Lesson topic does not belong to the video's subject");
            }

            video.setLessonTopic(lessonTopic);
        }

        if (request.getIsAspirantMaterial() != null) {
            video.setIsAspirantMaterial(request.getIsAspirantMaterial());
        }

        if (request.getIsPublic() != null) {
            video.setIsPublic(request.getIsPublic());
        }

        if (needsYouTubeUpdate || request.getPrivacyStatus() != null) {
            youtubeService.updateVideoMetadata(video.getYoutubeVideoId(), request, teacher.getId());
        }

        video.setUpdatedAt(Instant.now());
        video = videoLessonRepository.save(video);

        log.info("✅ Successfully updated video metadata");

        return mapToDto(video, null);
    }

    @Transactional
    public void deleteVideo(Long videoId, String teacherEmail) {
        log.info("Deleting video: {}", videoId);

        VideoLesson video = videoLessonRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Video not found"));

        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));

        if (!hasRole(teacher, "TEACHER")) {
            throw new ValidationException("Only teachers can delete videos");
        }

        if (!video.getTeacher().getId().equals(teacher.getId())) {
            throw new ValidationException("You can only delete your own videos");
        }

        try {
            youtubeService.deleteVideo(video.getYoutubeVideoId(), teacher.getId());
        } catch (Exception e) {
            log.warn("Failed to delete video from YouTube: {}", e.getMessage());
        }

        videoLessonRepository.delete(video);

        log.info("✅ Successfully deleted video");
    }

    @Transactional
    public void syncVideoDetailsFromYouTube(Long videoId) {
        log.info("Syncing video details from YouTube for video: {}", videoId);
        
        VideoLesson video = videoLessonRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Video not found"));
        
        try {
            YouTubeVideoResponse youtubeDetails = youtubeService.getVideoDetails(
                    video.getYoutubeVideoId(), 
                    video.getTeacher().getId()
            );
            
            if (youtubeDetails.getDurationSeconds() > 0 && video.getDurationSeconds() == null) {
                video.setDurationSeconds(youtubeDetails.getDurationSeconds());
            }
            
            if (youtubeDetails.getThumbnailUrl() != null && !youtubeDetails.getThumbnailUrl().contains("/default.jpg")) {
                video.setThumbnailUrl(youtubeDetails.getThumbnailUrl());
            }
            
            video.setStatus(VideoStatus.PUBLISHED);
            video.setProcessingCompletedAt(Instant.now());
            video.setUpdatedAt(Instant.now());
            
            videoLessonRepository.save(video);
            
            log.info("✅ Successfully synced video details from YouTube");
        } catch (Exception e) {
            log.error("Failed to sync video details from YouTube", e);
        }
    }

    // ==================== Transcript & Chapter Management ====================

    @Transactional
    public void triggerTranscriptGeneration(Long videoId, String teacherEmail) {
        log.info("Triggering transcript generation for video: {}", videoId);
        
        VideoLesson video = videoLessonRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Video not found"));
        
        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        
        if (!video.getTeacher().getId().equals(teacher.getId())) {
            throw new ValidationException("You can only generate transcripts for your own videos");
        }
        
        // ✅ Call Python service to generate transcript
        try {
            // Get Python service URL from environment or default
            String pythonServiceUrl = System.getenv("PYTHON_SERVICE_URL");
            if (pythonServiceUrl == null || pythonServiceUrl.isEmpty()) {
                pythonServiceUrl = "http://python-service:8000";
            }
            
            String url = pythonServiceUrl + "/videos/" + videoId + "/generate-transcript";
            
            log.info("📞 Calling Python service: {}", url);
            
            // Make POST request to Python service
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            
            log.info("✅ Python service response: {}", response.getBody());
            
        } catch (Exception e) {
            log.error("❌ Failed to call Python service for transcript generation: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to trigger transcript generation: " + e.getMessage());
        }
        
        log.info("✅ Transcript generation request sent to Python service for video: {}", videoId);
    }

    @Transactional
    public void triggerChapterGeneration(Long videoId, String teacherEmail) {
        log.info("Triggering chapter generation for video: {}", videoId);
        
        VideoLesson video = videoLessonRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Video not found"));
        
        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        
        if (!video.getTeacher().getId().equals(teacher.getId())) {
            throw new ValidationException("You can only generate chapters for your own videos");
        }
        
        VideoTranscript transcript = transcriptRepository.findByVideoLessonId(videoId)
                .orElseThrow(() -> new ValidationException("Video must have transcript first"));
        
        // ✅ Call Python service to generate chapters
        try {
            String pythonServiceUrl = System.getenv("PYTHON_SERVICE_URL");
            if (pythonServiceUrl == null || pythonServiceUrl.isEmpty()) {
                pythonServiceUrl = "http://python-service:8000";
            }
            
            String url = pythonServiceUrl + "/videos/" + videoId + "/generate-chapters";
            
            log.info("📞 Calling Python service for chapters: {}", url);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            
            log.info("✅ Python service response: {}", response.getBody());
            
        } catch (Exception e) {
            log.error("❌ Failed to call Python service for chapter generation: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to trigger chapter generation: " + e.getMessage());
        }
        
        log.info("✅ Chapter generation request sent to Python service for video: {}", videoId);
    }


    @Transactional
    public void updateTranscript(Long videoId, String transcriptText) {
        VideoLesson video = videoLessonRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Video not found"));
        
        VideoTranscript transcript = transcriptRepository.findByVideoLessonId(videoId)
                .orElseGet(() -> {
                    VideoTranscript newTranscript = new VideoTranscript();
                    newTranscript.setVideoLesson(video);
                    return newTranscript;
                });
        
        transcript.setFullTranscript(transcriptText);
        transcriptRepository.save(transcript);
        
        video.setHasTranscript(true);
        video.setUpdatedAt(Instant.now());
        videoLessonRepository.save(video);
        
        log.info("✅ Updated video transcript");
    }

    @Transactional
    public void updateChapters(Long videoId, List<Map<String, Object>> chaptersData) {
        VideoLesson video = videoLessonRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Video not found"));
        
        chapterRepository.deleteByVideoLessonId(videoId);
        
        for (int i = 0; i < chaptersData.size(); i++) {
            Map<String, Object> chapterData = chaptersData.get(i);
            
            VideoChapter chapter = new VideoChapter();
            chapter.setVideoLesson(video);
            chapter.setChapterNumber(i + 1);
            chapter.setTitle((String) chapterData.get("title"));
            chapter.setStartTimeSeconds((Integer) chapterData.get("startTime"));
            chapter.setEndTimeSeconds((Integer) chapterData.get("endTime"));
            chapter.setSummary((String) chapterData.get("summary"));
            
            @SuppressWarnings("unchecked")
            List<String> concepts = (List<String>) chapterData.get("keyConcepts");
            if (concepts != null) {
                chapter.setKeyConcepts(concepts);
            }
            
            chapterRepository.save(chapter);
        }
        
        video.setHasChapters(true);
        video.setUpdatedAt(Instant.now());
        videoLessonRepository.save(video);
        
        log.info("✅ Updated video chapters");
    }
    
 // ==================== Watch History Management ====================

 // ===== REPLACE the recordWatchProgress method in VideoLessonService.java =====

    @Transactional
    public VideoWatchHistoryDto recordWatchProgress(Long videoId, String studentEmail, 
                                                     Integer watchedSeconds, Integer totalSeconds, 
                                                     Boolean completed) {
        User student = userRepository.findByEmail(studentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        
        if (!hasRole(student, "STUDENT")) {
            throw new ValidationException("Only students can record watch history");
        }
        
        VideoLesson video = videoLessonRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Video not found"));
        
        // ✅ FIXED: Get ALL existing records and handle duplicates
        List<VideoWatchHistory> existingRecords = watchHistoryRepository
                .findByVideoLessonIdOrderByWatchStartedAtDesc(videoId)
                .stream()
                .filter(h -> h.getStudent().getId().equals(student.getId()))
                .collect(Collectors.toList());
        
        VideoWatchHistory history;
        
        if (existingRecords.isEmpty()) {
            // Create new record
            history = new VideoWatchHistory();
            history.setVideoLesson(video);
            history.setStudent(student);
            history.setWatchStartedAt(Instant.now());
            
            // ✅ INCREMENT VIEW COUNT on first watch
            Integer currentViews = video.getTotalViews() != null ? video.getTotalViews() : 0;
            video.setTotalViews(currentViews + 1);
            video.setUpdatedAt(Instant.now());
            videoLessonRepository.save(video);
            
            log.info("🎬 New watch session - Video: {}, Student: {}, View: {}", 
                     videoId, student.getEmail(), video.getTotalViews());
        } else {
            // ✅ Use most recent, delete any duplicates
            history = existingRecords.get(0);
            
            if (existingRecords.size() > 1) {
                log.warn("⚠️ Found {} duplicate watch records for video {} and student {}, cleaning up...", 
                         existingRecords.size(), videoId, student.getId());
                
                // Delete duplicates (keep the first one)
                for (int i = 1; i < existingRecords.size(); i++) {
                    watchHistoryRepository.delete(existingRecords.get(i));
                }
                
                log.info("✅ Cleaned up {} duplicate records", existingRecords.size() - 1);
            }
        }
        
        // Update position and completion
        boolean wasNotCompleted = !Boolean.TRUE.equals(history.getCompleted());
        
        history.setLastPositionSeconds(watchedSeconds);
        history.setCompleted(completed != null ? completed : false);
        
        // Calculate completion percentage
        if (totalSeconds != null && totalSeconds > 0) {
            BigDecimal completion = BigDecimal.valueOf(watchedSeconds)
                    .divide(BigDecimal.valueOf(totalSeconds), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            history.setCompletionPercentage(completion);
            
            log.debug("📊 Completion: {}%", completion.setScale(1, RoundingMode.HALF_UP));
        }
        
        // Track total watch time intelligently
        if (history.getTotalWatchTimeSeconds() == null) {
            history.setTotalWatchTimeSeconds(watchedSeconds);
        } else {
            Integer lastPosition = history.getLastPositionSeconds();
            if (lastPosition != null && watchedSeconds > lastPosition) {
                int additionalTime = Math.min(watchedSeconds - lastPosition, 30);
                history.setTotalWatchTimeSeconds(history.getTotalWatchTimeSeconds() + additionalTime);
            }
        }
        
        if (Boolean.TRUE.equals(completed) && history.getWatchEndedAt() == null) {
            history.setWatchEndedAt(Instant.now());
        }
        
        history = watchHistoryRepository.save(history);
        
        // Update analytics if newly completed
        if (wasNotCompleted && Boolean.TRUE.equals(completed)) {
            log.info("✅ Video completed - Updating analytics");
            updateVideoAnalytics(video);
        }
        
        log.info("💾 Progress saved - Video: {}, Position: {}s, Completed: {}", 
                 videoId, watchedSeconds, completed);
        
        return mapToWatchHistoryDto(history);
    }
    /**
     * ✅ NEW METHOD: Recalculate video analytics based on watch history
     */
    @Transactional
    protected void updateVideoAnalytics(VideoLesson video) {
        List<VideoWatchHistory> allWatches = watchHistoryRepository
                .findByVideoLessonIdOrderByWatchStartedAtDesc(video.getId());
        
        if (allWatches.isEmpty()) {
            return;
        }
        
        // Calculate average completion rate
        double avgCompletion = allWatches.stream()
                .filter(h -> h.getCompletionPercentage() != null)
                .mapToDouble(h -> h.getCompletionPercentage().doubleValue())
                .average()
                .orElse(0.0);
        
        video.setAverageCompletionRate(BigDecimal.valueOf(avgCompletion)
                .setScale(2, RoundingMode.HALF_UP));
        
        // Ensure view count is at least the number of unique students
        long uniqueStudents = allWatches.stream()
                .map(h -> h.getStudent().getId())
                .distinct()
                .count();
        
        Integer currentViews = video.getTotalViews() != null ? video.getTotalViews() : 0;
        if (currentViews < uniqueStudents) {
            video.setTotalViews((int) uniqueStudents);
        }
        
        video.setUpdatedAt(Instant.now());
        videoLessonRepository.save(video);
        
        log.info("📊 Analytics updated - Video: {} ({}), Views: {}, Avg Completion: {}%", 
                 video.getId(), video.getTitle(), video.getTotalViews(), 
                 avgCompletion);
    }

    /**
     * ✅ Scheduled job to refresh analytics for all videos (runs every 15 minutes)
     */
    @Scheduled(fixedDelay = 900000) // 15 minutes = 900,000 ms
    @Transactional
    public void refreshVideoAnalytics() {
        log.info("🔄 Starting scheduled video analytics refresh...");
        
        List<VideoLesson> allVideos = videoLessonRepository.findAll();
        int updatedCount = 0;
        
        for (VideoLesson video : allVideos) {
            try {
                List<VideoWatchHistory> watches = watchHistoryRepository
                        .findByVideoLessonIdOrderByWatchStartedAtDesc(video.getId());
                
                if (watches.isEmpty()) {
                    continue;
                }
                
                // Calculate metrics
                long uniqueStudents = watches.stream()
                        .map(h -> h.getStudent().getId())
                        .distinct()
                        .count();
                
                double avgCompletion = watches.stream()
                        .filter(h -> h.getCompletionPercentage() != null)
                        .mapToDouble(h -> h.getCompletionPercentage().doubleValue())
                        .average()
                        .orElse(0.0);
                
                // Update if there's a discrepancy
                boolean needsUpdate = false;
                
                Integer currentViews = video.getTotalViews() != null ? video.getTotalViews() : 0;
                if (currentViews < uniqueStudents) {
                    video.setTotalViews((int) uniqueStudents);
                    needsUpdate = true;
                }
                
                BigDecimal newAvgCompletion = BigDecimal.valueOf(avgCompletion)
                        .setScale(2, RoundingMode.HALF_UP);
                
                if (video.getAverageCompletionRate() == null || 
                    video.getAverageCompletionRate().compareTo(newAvgCompletion) != 0) {
                    video.setAverageCompletionRate(newAvgCompletion);
                    needsUpdate = true;
                }
                
                if (needsUpdate) {
                    video.setUpdatedAt(Instant.now());
                    videoLessonRepository.save(video);
                    updatedCount++;
                }
                
            } catch (Exception e) {
                log.error("Failed to update analytics for video {}: {}", video.getId(), e.getMessage());
            }
        }
        
        log.info("✅ Analytics refresh completed - Updated {} videos out of {}", 
                 updatedCount, allVideos.size());
    }

    /**
     * ✅ Manual trigger for refreshing analytics (for admin use)
     */
    @Transactional
    public void manualRefreshAnalytics() {
        log.info("🔄 Manual analytics refresh triggered");
        refreshVideoAnalytics();
    }

    @Transactional(readOnly = true)
    public List<VideoWatchHistoryDto> getWatchHistory(String studentEmail, Long subjectId, 
                                                        Pageable pageable) {
        User student = userRepository.findByEmail(studentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        
        List<VideoWatchHistory> histories;
        if (subjectId != null) {
            histories = watchHistoryRepository.findByStudentIdAndVideoLesson_SubjectId(
                    student.getId(), subjectId, pageable);
        } else {
            histories = watchHistoryRepository.findByStudentId(student.getId(), pageable);
        }
        
        return histories.stream()
                .map(this::mapToWatchHistoryDto)
                .collect(Collectors.toList());
    }

    // ==================== Video Processing Status Updates ====================

    @Transactional
    public void updateProcessingStatus(Long videoId, VideoStatus status) {
        VideoLesson video = videoLessonRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Video not found"));

        video.setStatus(status);
        
        if (status == VideoStatus.PUBLISHED) {
            video.setProcessingCompletedAt(Instant.now());
        }

        video.setUpdatedAt(Instant.now());
        videoLessonRepository.save(video);
        log.info("✅ Updated video status to: {}", status);
    }

    @Transactional
    public void updateVideoDuration(Long videoId) {
        VideoLesson video = videoLessonRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Video not found"));

        try {
            YouTubeVideoResponse youtubeDetails = youtubeService.getVideoDetails(
                    video.getYoutubeVideoId(), 
                    video.getTeacher().getId()
            );

            video.setDurationSeconds(youtubeDetails.getDurationSeconds());
            video.setThumbnailUrl(youtubeDetails.getThumbnailUrl());
            video.setUpdatedAt(Instant.now());
            
            videoLessonRepository.save(video);
            
            log.info("✅ Updated video duration: {} seconds", youtubeDetails.getDurationSeconds());
        } catch (Exception e) {
            log.error("Failed to update video duration", e);
        }
    }

    @Transactional
    public void updateVideoStatus(String youtubeId, String status) {
        VideoLesson video = videoLessonRepository.findByYoutubeVideoId(youtubeId)
                .orElseThrow(() -> new ResourceNotFoundException("Video not found"));
        
        VideoStatus videoStatus = VideoStatus.valueOf(status.toUpperCase());
        video.setStatus(videoStatus);
        video.setUpdatedAt(Instant.now());
        
        videoLessonRepository.save(video);
        log.info("✅ Updated video status to: {}", status);
    }

    @Transactional
    public void updateProcessingSuccess(Long videoId, String youtubeUrl, String thumbnailUrl, 
                                         Integer durationSeconds) {
        VideoLesson video = videoLessonRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Video not found"));
        
        video.setYoutubeUrl(youtubeUrl);
        video.setThumbnailUrl(thumbnailUrl);
        video.setDurationSeconds(durationSeconds);
        video.setStatus(VideoStatus.PUBLISHED);
        video.setProcessingCompletedAt(Instant.now());
        video.setUpdatedAt(Instant.now());
        
        videoLessonRepository.save(video);
        
        log.info("✅ Video processing completed successfully");
    }

    @Transactional
    public void updateProcessingFailure(Long videoId, String error) {
        VideoLesson video = videoLessonRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Video not found"));
        
        video.setStatus(VideoStatus.FAILED);
        video.setUpdatedAt(Instant.now());
        
        videoLessonRepository.save(video);
        
        log.error("Video processing failed: {}", error);
    }

    // ==================== ANALYTICS IMPLEMENTATION ====================

    @Transactional(readOnly = true)
    public Map<String, Object> getTeacherAnalytics(String teacherEmail, Instant startDate, Instant endDate) {
        log.info("📊 Getting analytics for teacher: {}", teacherEmail);
        
        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        
        log.info("👤 Teacher found: ID={}, Email={}", teacher.getId(), teacherEmail);
        
        if (startDate == null) startDate = Instant.now().minus(30, ChronoUnit.DAYS);
        if (endDate == null) endDate = Instant.now();
        
        // Get all videos by teacher
        List<VideoLesson> videos = videoLessonRepository.findByTeacherId(teacher.getId(), Pageable.unpaged()).getContent();
        
        log.info("📹 Found {} videos for teacher", videos.size());
        
        if (videos.isEmpty()) {
            return createEmptyAnalytics();
        }
        
        // ✅ CRITICAL FIX: Get video IDs and query watch history
        List<Long> videoIds = videos.stream()
                .map(VideoLesson::getId)
                .collect(Collectors.toList());
        
        log.info("🔍 Video IDs to query: {}", videoIds);
        
        // ✅ Query watch history directly - this is what was missing!
        List<VideoWatchHistory> watchHistory = watchHistoryRepository
                .findByVideoLesson_TeacherIdAndWatchStartedAtBetween(
                    teacher.getId(), startDate, endDate
                );
        
        log.info("📊 Found {} watch history records", watchHistory.size());
        
        // Calculate metrics FROM WATCH HISTORY, not from video.totalViews
        int totalVideos = videos.size();
        int publishedVideos = (int) videos.stream()
                .filter(v -> v.getStatus() == VideoStatus.PUBLISHED)
                .count();
        
        // ✅ FIX: Total views = number of watch history records
        int totalViews = watchHistory.size();
        
        // ✅ Total watch time from history
        int totalWatchTimeSeconds = watchHistory.stream()
                .mapToInt(h -> h.getTotalWatchTimeSeconds() != null ? h.getTotalWatchTimeSeconds() : 0)
                .sum();
        
        // ✅ Average completion from history
        double avgCompletionRate = watchHistory.stream()
                .filter(h -> h.getCompletionPercentage() != null)
                .mapToDouble(h -> h.getCompletionPercentage().doubleValue())
                .average()
                .orElse(0.0);
        
        // ✅ Unique students from history
        int uniqueStudents = (int) watchHistory.stream()
                .map(h -> h.getStudent().getId())
                .distinct()
                .count();
        
        // ✅ Completed views from history
        long completedViews = watchHistory.stream()
                .filter(VideoWatchHistory::getCompleted)
                .count();
        
        log.info("✅ Analytics calculated - Views: {}, Unique Students: {}, Completed: {}, Avg Completion: {}%", 
                 totalViews, uniqueStudents, completedViews, Math.round(avgCompletionRate));
        
        return Map.of(
            "totalVideos", totalVideos,
            "publishedVideos", publishedVideos,
            "processingVideos", totalVideos - publishedVideos,
            "totalViews", totalViews,
            "totalWatchTimeHours", Math.round(totalWatchTimeSeconds / 3600.0 * 100) / 100.0,
            "averageCompletionRate", Math.round(avgCompletionRate * 100) / 100.0,
            "uniqueStudents", uniqueStudents,
            "completedViews", completedViews,
            "dateRange", Map.of("start", startDate, "end", endDate)
        );
    }

    private Map<String, Object> createEmptyAnalytics() {
        return Map.of(
            "totalVideos", 0,
            "publishedVideos", 0,
            "processingVideos", 0,
            "totalViews", 0,
            "totalWatchTimeHours", 0.0,
            "averageCompletionRate", 0.0,
            "uniqueStudents", 0,
            "completedViews", 0,
            "dateRange", Map.of("start", "", "end", "")
        );
    }
    @Transactional(readOnly = true)
    public Map<String, Object> getVideoStatistics(Long videoId, String teacherEmail) {
        VideoLesson video = videoLessonRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Video not found"));
        
        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        
        if (!video.getTeacher().getId().equals(teacher.getId())) {
            throw new ValidationException("You can only view statistics for your own videos");
        }
        
        List<VideoWatchHistory> watchHistory = watchHistoryRepository
                .findByVideoLessonIdOrderByWatchStartedAtDesc(videoId);
        
        long uniqueViewers = watchHistoryRepository.countUniqueViewersByVideoId(videoId);
        Double avgCompletion = watchHistoryRepository.calculateAverageCompletionRateByVideoId(videoId);
        
        long completedViews = watchHistory.stream()
                .filter(VideoWatchHistory::getCompleted)
                .count();
        
        int totalWatchTime = watchHistory.stream()
                .mapToInt(h -> h.getTotalWatchTimeSeconds() != null ? h.getTotalWatchTimeSeconds() : 0)
                .sum();
        
        double avgWatchTime = uniqueViewers > 0 ? totalWatchTime / (double) uniqueViewers : 0;
        
        return Map.of(
            "videoId", videoId,
            "title", video.getTitle(),
            "totalViews", video.getTotalViews() != null ? video.getTotalViews() : 0,
            "uniqueViewers", uniqueViewers,
            "completedViews", completedViews,
            "averageCompletionRate", avgCompletion != null ? Math.round(avgCompletion * 100) / 100.0 : 0.0,
            "totalWatchTimeHours", Math.round(totalWatchTime / 3600.0 * 100) / 100.0,
            "averageWatchTimeMinutes", Math.round(avgWatchTime / 60.0 * 100) / 100.0,
            "durationMinutes", video.getDurationSeconds() != null ? video.getDurationSeconds() / 60 : 0,
            "uploadDate", video.getUploadDate()
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getVideoWatchData(Long videoId, String teacherEmail) {
        VideoLesson video = videoLessonRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Video not found"));
        
        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        
        if (!video.getTeacher().getId().equals(teacher.getId())) {
            throw new ValidationException("You can only view watch data for your own videos");
        }
        
        List<VideoWatchHistory> watchHistory = watchHistoryRepository
                .findByVideoLessonIdOrderByWatchStartedAtDesc(videoId);
        
        Map<String, Long> completionDistribution = watchHistory.stream()
                .filter(h -> h.getCompletionPercentage() != null)
                .collect(Collectors.groupingBy(h -> {
                    double completion = h.getCompletionPercentage().doubleValue();
                    if (completion < 25) return "0-25%";
                    else if (completion < 50) return "25-50%";
                    else if (completion < 75) return "50-75%";
                    else return "75-100%";
                }, Collectors.counting()));
        
        List<Map<String, Object>> recentWatches = watchHistory.stream()
                .limit(10)
                .map(h -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("studentName", h.getStudent().getFullName());
                    map.put("watchedAt", h.getWatchStartedAt());
                    map.put("completionPercentage", h.getCompletionPercentage() != null ? 
                        h.getCompletionPercentage().doubleValue() : 0.0);
                    map.put("completed", h.getCompleted());
                    return map;
                })
                .collect(Collectors.toList());
        
        Map<String, Object> result = new HashMap<>();
        result.put("videoId", videoId);
        result.put("completionDistribution", completionDistribution);
        result.put("recentWatches", recentWatches);
        result.put("totalSessions", watchHistory.size());
        
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getSubjectEngagement(Long subjectId, String teacherEmail, 
                                                      Instant startDate, Instant endDate) {
        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
        
        final Instant finalStartDate = startDate == null ? Instant.now().minus(30, ChronoUnit.DAYS) : startDate;
        final Instant finalEndDate = endDate == null ? Instant.now() : endDate;
        
        List<VideoLesson> videos = videoLessonRepository
                .findByTeacherIdAndSubjectId(teacher.getId(), subjectId, Pageable.unpaged())
                .getContent();
        
        if (videos.isEmpty()) {
            return Map.of(
                "subjectId", subjectId,
                "subjectName", subject.getName(),
                "message", "No videos found for this subject",
                "totalVideos", 0
            );
        }
        
        Set<Long> videoIds = videos.stream().map(VideoLesson::getId).collect(Collectors.toSet());
        
        List<VideoWatchHistory> watchHistory = watchHistoryRepository.findAll().stream()
                .filter(h -> videoIds.contains(h.getVideoLesson().getId()))
                .filter(h -> h.getWatchStartedAt().isAfter(finalStartDate) && h.getWatchStartedAt().isBefore(finalEndDate))
                .collect(Collectors.toList());
        
        int totalViews = watchHistory.size();
        int uniqueStudents = (int) watchHistory.stream()
                .map(h -> h.getStudent().getId())
                .distinct()
                .count();
        
        double avgCompletion = watchHistory.stream()
                .filter(h -> h.getCompletionPercentage() != null)
                .mapToDouble(h -> h.getCompletionPercentage().doubleValue())
                .average()
                .orElse(0.0);
        
        return Map.of(
            "subjectId", subjectId,
            "subjectName", subject.getName(),
            "totalVideos", videos.size(),
            "publishedVideos", videos.stream().filter(v -> v.getStatus() == VideoStatus.PUBLISHED).count(),
            "totalViews", totalViews,
            "uniqueStudents", uniqueStudents,
            "averageCompletionRate", Math.round(avgCompletion * 100) / 100.0,
            "dateRange", Map.of("start", finalStartDate, "end", finalEndDate)
        );
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getTopVideos(String teacherEmail, int limit, String sortBy) {
        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        
        List<VideoLesson> videos = videoLessonRepository.findByTeacherId(teacher.getId(), Pageable.unpaged()).getContent();
        
        return videos.stream()
                .filter(v -> v.getStatus() == VideoStatus.PUBLISHED)
                .sorted((v1, v2) -> {
                    switch (sortBy.toLowerCase()) {
                        case "views":
                            return Integer.compare(
                                v2.getTotalViews() != null ? v2.getTotalViews() : 0,
                                v1.getTotalViews() != null ? v1.getTotalViews() : 0
                            );
                        case "completion_rate":
                            return Double.compare(
                                v2.getAverageCompletionRate() != null ? v2.getAverageCompletionRate().doubleValue() : 0,
                                v1.getAverageCompletionRate() != null ? v1.getAverageCompletionRate().doubleValue() : 0
                            );
                        default:
                            return v2.getUploadDate().compareTo(v1.getUploadDate());
                    }
                })
                .limit(limit)
                .map(v -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("videoId", v.getId());
                    map.put("title", v.getTitle());
                    map.put("subjectName", v.getSubject().getName());
                    map.put("views", v.getTotalViews() != null ? v.getTotalViews() : 0);
                    map.put("averageCompletionRate", v.getAverageCompletionRate() != null ? 
                        Math.round(v.getAverageCompletionRate().doubleValue() * 100) / 100.0 : 0.0);
                    map.put("uploadDate", v.getUploadDate());
                    map.put("youtubeUrl", v.getYoutubeUrl());
                    return map;
                })
                .collect(Collectors.toList());
    }
    
 // ==================== STUDENT ANALYTICS ====================

    @Transactional(readOnly = true)
    public Map<String, Object> getStudentVideoProgress(String studentEmail, Long subjectId) {
        User student = userRepository.findByEmail(studentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        
        List<VideoWatchHistory> watchHistory;
        if (subjectId != null) {
            watchHistory = watchHistoryRepository.findByStudentIdAndVideoLesson_SubjectId(
                student.getId(), subjectId, Pageable.unpaged()
            );
        } else {
            watchHistory = watchHistoryRepository.findByStudentIdOrderByWatchStartedAtDesc(student.getId());
        }
        
        long completedVideos = watchHistory.stream()
                .filter(VideoWatchHistory::getCompleted)
                .count();
        
        long inProgressVideos = watchHistory.stream()
                .filter(h -> !h.getCompleted() && h.getLastPositionSeconds() > 0)
                .count();
        
        double avgCompletion = watchHistory.stream()
                .filter(h -> h.getCompletionPercentage() != null)
                .mapToDouble(h -> h.getCompletionPercentage().doubleValue())
                .average()
                .orElse(0.0);
        
        return Map.of(
            "totalWatched", watchHistory.size(),
            "completedVideos", completedVideos,
            "inProgressVideos", inProgressVideos,
            "averageCompletionRate", Math.round(avgCompletion * 100) / 100.0,
            "subjectId", subjectId != null ? subjectId : "all"
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStudentWatchTime(String studentEmail, Instant startDate, Instant endDate) {
        User student = userRepository.findByEmail(studentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        
        final Instant finalStartDate = startDate == null ? Instant.now().minus(30, ChronoUnit.DAYS) : startDate;
        final Instant finalEndDate = endDate == null ? Instant.now() : endDate;
        
        List<VideoWatchHistory> watchHistory = watchHistoryRepository
                .findByStudentIdOrderByWatchStartedAtDesc(student.getId())
                .stream()
                .filter(h -> h.getWatchStartedAt().isAfter(finalStartDate) && h.getWatchStartedAt().isBefore(finalEndDate))
                .collect(Collectors.toList());
        
        int totalWatchTime = watchHistory.stream()
                .mapToInt(h -> h.getTotalWatchTimeSeconds() != null ? h.getTotalWatchTimeSeconds() : 0)
                .sum();
        
        long uniqueVideos = watchHistory.stream()
                .map(h -> h.getVideoLesson().getId())
                .distinct()
                .count();
        
        return Map.of(
            "totalWatchTimeHours", Math.round(totalWatchTime / 3600.0 * 100) / 100.0,
            "totalSessions", watchHistory.size(),
            "uniqueVideosWatched", uniqueVideos,
            "dateRange", Map.of("start", finalStartDate, "end", finalEndDate)
        );
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCompletedVideos(String studentEmail, Long subjectId) {
        User student = userRepository.findByEmail(studentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        
        List<VideoWatchHistory> completed = watchHistoryRepository
                .findByStudentIdAndCompletedTrue(student.getId());
        
        if (subjectId != null) {
            completed = completed.stream()
                    .filter(h -> h.getVideoLesson().getSubject().getId().equals(subjectId))
                    .collect(Collectors.toList());
        }
        
        return completed.stream()
                .map(h -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("videoId", h.getVideoLesson().getId());
                    map.put("title", h.getVideoLesson().getTitle());
                    map.put("subjectName", h.getVideoLesson().getSubject().getName());
                    map.put("completedAt", h.getWatchEndedAt() != null ? h.getWatchEndedAt() : h.getWatchStartedAt());
                    map.put("watchTimeMinutes", h.getTotalWatchTimeSeconds() != null ? 
                        h.getTotalWatchTimeSeconds() / 60 : 0);
                    return map;
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getRecommendedVideos(String studentEmail, int limit) {
        User student = userRepository.findByEmail(studentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        
        List<VideoWatchHistory> watchHistory = watchHistoryRepository
                .findRecentByStudentId(student.getId());
        
        Set<Long> watchedSubjectIds = watchHistory.stream()
                .map(h -> h.getVideoLesson().getSubject().getId())
                .collect(Collectors.toSet());
        
        if (watchedSubjectIds.isEmpty()) {
            return videoLessonRepository.findByStatus(VideoStatus.PUBLISHED).stream()
                    .filter(v -> Boolean.TRUE.equals(v.getPublished())) // ✅ ADD THIS
                    .sorted((v1, v2) -> v2.getUploadDate().compareTo(v1.getUploadDate()))
                    .limit(limit)
                    .map(v -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("videoId", v.getId());
                        map.put("title", v.getTitle());
                        map.put("subjectName", v.getSubject().getName());
                        map.put("reason", "Recently uploaded");
                        return map;
                    })
                    .collect(Collectors.toList());
        }
        
        Set<Long> watchedVideoIds = watchHistory.stream()
                .map(h -> h.getVideoLesson().getId())
                .collect(Collectors.toSet());
        
        List<VideoLesson> recommendations = videoLessonRepository.findAll().stream()
                .filter(v -> v.getStatus() == VideoStatus.PUBLISHED)
                .filter(v -> Boolean.TRUE.equals(v.getPublished())) // ✅ ADD THIS
                .filter(v -> watchedSubjectIds.contains(v.getSubject().getId()))
                .filter(v -> !watchedVideoIds.contains(v.getId()))
                .sorted((v1, v2) -> {
                    int views1 = v1.getTotalViews() != null ? v1.getTotalViews() : 0;
                    int views2 = v2.getTotalViews() != null ? v2.getTotalViews() : 0;
                    return Integer.compare(views2, views1);
                })
                .limit(limit)
                .collect(Collectors.toList());
        
        return recommendations.stream()
                .map(v -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("videoId", v.getId());
                    map.put("title", v.getTitle());
                    map.put("subjectName", v.getSubject().getName());
                    map.put("views", v.getTotalViews() != null ? v.getTotalViews() : 0);
                    map.put("reason", "Based on your interests");
                    return map;
                })
                .collect(Collectors.toList());
    }

    // ==================== PLATFORM ANALYTICS ====================

    @Transactional(readOnly = true)
    public Map<String, Object> getPlatformVideoStats(Instant startDate, Instant endDate) {
        final Instant finalStartDate = startDate == null ? Instant.now().minus(30, ChronoUnit.DAYS) : startDate;
        final Instant finalEndDate = endDate == null ? Instant.now() : endDate;
        
        List<VideoLesson> allVideos = videoLessonRepository.findAll();
        
        long totalVideos = allVideos.size();
        long publishedVideos = allVideos.stream()
                .filter(v -> v.getStatus() == VideoStatus.PUBLISHED)
                .count();
        
        int totalViews = allVideos.stream()
                .mapToInt(v -> v.getTotalViews() != null ? v.getTotalViews() : 0)
                .sum();
        
        long uniqueTeachers = allVideos.stream()
                .map(v -> v.getTeacher().getId())
                .distinct()
                .count();
        
        long videosInRange = allVideos.stream()
                .filter(v -> v.getUploadDate().isAfter(finalStartDate) && v.getUploadDate().isBefore(finalEndDate))
                .count();
        
        return Map.of(
            "totalVideos", totalVideos,
            "publishedVideos", publishedVideos,
            "processingVideos", totalVideos - publishedVideos,
            "totalViews", totalViews,
            "uniqueTeachers", uniqueTeachers,
            "videosUploadedInRange", videosInRange,
            "dateRange", Map.of("start", finalStartDate, "end", finalEndDate)
        );
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getTeacherRankings(int limit, Instant startDate, Instant endDate) {
        List<VideoLesson> allVideos = videoLessonRepository.findAll();
        
        Map<Long, Map<String, Object>> teacherStats = new HashMap<>();
        
        for (VideoLesson video : allVideos) {
            Long teacherId = video.getTeacher().getId();
            teacherStats.putIfAbsent(teacherId, new HashMap<>(Map.of(
                "teacherId", teacherId,
                "teacherName", video.getTeacher().getFullName(),
                "videoCount", 0,
                "totalViews", 0
            )));
            
            Map<String, Object> stats = teacherStats.get(teacherId);
            stats.put("videoCount", (int) stats.get("videoCount") + 1);
            stats.put("totalViews", (int) stats.get("totalViews") + 
                (video.getTotalViews() != null ? video.getTotalViews() : 0));
        }
        
        return teacherStats.values().stream()
                .sorted((s1, s2) -> Integer.compare((int) s2.get("totalViews"), (int) s1.get("totalViews")))
                .limit(limit)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getEngagementTrends(Instant startDate, Instant endDate, String groupBy) {
        return Map.of(
            "message", "Engagement trends implementation requires date grouping",
            "groupBy", groupBy,
            "dateRange", Map.of("start", startDate, "end", endDate)
        );
    }

    // ==================== EXPORT METHODS ====================

    public byte[] exportVideoAnalytics(Long videoId, String teacherEmail) {
        Map<String, Object> stats = getVideoStatistics(videoId, teacherEmail);
        
        StringBuilder csv = new StringBuilder();
        csv.append("Metric,Value\n");
        stats.forEach((key, value) -> csv.append(key).append(",").append(value).append("\n"));
        
        return csv.toString().getBytes();
    }

    public byte[] exportTeacherAnalytics(String teacherEmail, Instant startDate, Instant endDate) {
        Map<String, Object> analytics = getTeacherAnalytics(teacherEmail, startDate, endDate);
        
        StringBuilder csv = new StringBuilder();
        csv.append("Metric,Value\n");
        analytics.forEach((key, value) -> {
            if (!"dateRange".equals(key)) {
                csv.append(key).append(",").append(value).append("\n");
            }
        });
        
        return csv.toString().getBytes();
    }

    // ==================== HELPER METHODS WITH NULL SAFETY ====================

    private VideoLessonDto mapToDto(VideoLesson video, VideoWatchHistory watchHistory) {
        Instant now = Instant.now();
        
        VideoLessonDto dto = VideoLessonDto.builder()
                .id(video.getId())
                .title(video.getTitle())
                .description(video.getDescription())
                .status(video.getStatus().name())
                .published(video.getPublished() != null ? video.getPublished() : false) // ✅ ADD THIS
                .youtubeVideoId(video.getYoutubeVideoId())
                .youtubeUrl(video.getYoutubeUrl())
                .embedUrl(video.getEmbedUrl())
                .thumbnailUrl(video.getThumbnailUrl())
                .durationSeconds(video.getDurationSeconds() != null ? video.getDurationSeconds() : 0)
                .teacherId(video.getTeacher().getId())
                .teacherName(video.getTeacher().getFullName())
                .subjectId(video.getSubject().getId())
                .subjectName(video.getSubject().getName())
                .hasTranscript(video.getHasTranscript())
                .hasChapters(video.getHasChapters())
                .hasQuiz(video.getHasQuiz())
                .hasSummary(video.getHasSummary())
                .isAspirantMaterial(video.getIsAspirantMaterial())
                .isPublic(video.getIsPublic())
                .isPremium(video.getIsPremium())
                .totalViews(video.getTotalViews() != null ? video.getTotalViews() : 0)
                .averageCompletionRate(video.getAverageCompletionRate() != null ? 
                        video.getAverageCompletionRate().doubleValue() : null)
                .uploadDate(video.getUploadDate() != null ? video.getUploadDate() : now)
                .processingCompletedAt(video.getProcessingCompletedAt())
                .createdAt(video.getCreatedAt() != null ? video.getCreatedAt() : now)
                .updatedAt(video.getUpdatedAt() != null ? video.getUpdatedAt() : now)
                .build();

        if (video.getLessonTopic() != null) {
            dto.setLessonTopicId(video.getLessonTopic().getId());
            dto.setLessonTopicTitle(video.getLessonTopic().getTopicTitle());
        }

        if (video.getSessionRecording() != null) {
            dto.setSessionRecordingId(video.getSessionRecording().getId());
        }

        if (watchHistory != null) {
            dto.setLastPositionSeconds(watchHistory.getLastPositionSeconds());
            dto.setCompletionPercentage(watchHistory.getCompletionPercentage() != null ? 
                    watchHistory.getCompletionPercentage().doubleValue() : null);
            dto.setCompleted(watchHistory.getCompleted());
        }

        return dto;
    }
    
    
    private VideoChapterDto mapToChapterDto(VideoChapter chapter) {
        return VideoChapterDto.builder()
                .id(chapter.getId())
                .chapterNumber(chapter.getChapterNumber())
                .title(chapter.getTitle())
                .startTimeSeconds(chapter.getStartTimeSeconds())
                .endTimeSeconds(chapter.getEndTimeSeconds())
                .keyConcepts(
                    chapter.getKeyConcepts() != null 
                        ? List.copyOf(chapter.getKeyConcepts())  // immutable safe copy
                        : List.of()
                )
                .summary(chapter.getSummary())
                .build();
    }


    private VideoWatchHistoryDto mapToWatchHistoryDto(VideoWatchHistory history) {
        return VideoWatchHistoryDto.builder()
                .id(history.getId())
                .videoLessonId(history.getVideoLesson().getId())
                .studentId(history.getStudent().getId())
                .lastPositionSeconds(history.getLastPositionSeconds())
                .completionPercentage(history.getCompletionPercentage() != null ? 
                        history.getCompletionPercentage().doubleValue() : null)
                .completed(history.getCompleted())
                .watchStartedAt(history.getWatchStartedAt())
                .build();
    }
}