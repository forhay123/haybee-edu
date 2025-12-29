package com.edu.platform.controller;

import com.edu.platform.model.VideoLesson;
import com.edu.platform.model.VideoWatchHistory;
import com.edu.platform.repository.UserRepository;
import com.edu.platform.repository.VideoLessonRepository;
import com.edu.platform.repository.VideoWatchHistoryRepository;
import com.edu.platform.service.VideoLessonService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/video-analytics")
@RequiredArgsConstructor
@Tag(name = "Video Analytics", description = "Video analytics and watch statistics")
public class VideoAnalyticsController {

    private final VideoLessonService videoLessonService;
    private final VideoLessonRepository videoLessonRepository;
    private final VideoWatchHistoryRepository videoWatchHistoryRepository;

    /**
     * ✅ Helper method to convert date string to Instant (start of day UTC)
     */
    private Instant parseStartDate(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) return null;
        try {
            return LocalDate.parse(dateStr).atStartOfDay().toInstant(ZoneOffset.UTC);
        } catch (Exception e) {
            log.warn("Failed to parse start date: {}", dateStr);
            return null;
        }
    }

    /**
     * ✅ Helper method to convert date string to Instant (end of day UTC)
     */
    private Instant parseEndDate(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) return null;
        try {
            return LocalDate.parse(dateStr).atTime(23, 59, 59).toInstant(ZoneOffset.UTC);
        } catch (Exception e) {
            log.warn("Failed to parse end date: {}", dateStr);
            return null;
        }
    }

    // ==================== TEACHER ANALYTICS ====================

    @GetMapping("/teacher/overview")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get overall video analytics for teacher")
    public ResponseEntity<Map<String, Object>> getTeacherOverview(
            @RequestParam(required = false) String startDate,  // ✅ Changed from Instant to String
            @RequestParam(required = false) String endDate,    // ✅ Changed from Instant to String
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Fetching analytics overview for teacher: {} (startDate: {}, endDate: {})", 
                 email, startDate, endDate);
        
        Instant start = parseStartDate(startDate);
        Instant end = parseEndDate(endDate);
        
        Map<String, Object> analytics = videoLessonService.getTeacherAnalytics(email, start, end);
        return ResponseEntity.ok(analytics);
    }

    @GetMapping("/video/{videoId}/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get detailed stats for a specific video")
    public ResponseEntity<Map<String, Object>> getVideoStats(
            @PathVariable Long videoId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Fetching stats for video: {} by teacher: {}", videoId, email);
        
        Map<String, Object> stats = videoLessonService.getVideoStatistics(videoId, email);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/video/{videoId}/watch-data")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get watch data for a video (completion rates, drop-off points)")
    public ResponseEntity<Map<String, Object>> getVideoWatchData(
            @PathVariable Long videoId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Fetching watch data for video: {}", videoId);
        
        Map<String, Object> watchData = videoLessonService.getVideoWatchData(videoId, email);
        return ResponseEntity.ok(watchData);
    }

    @GetMapping("/subject/{subjectId}/engagement")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get engagement metrics for a subject")
    public ResponseEntity<Map<String, Object>> getSubjectEngagement(
            @PathVariable Long subjectId,
            @RequestParam(required = false) String startDate,  // ✅ Changed from Instant to String
            @RequestParam(required = false) String endDate,    // ✅ Changed from Instant to String
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Fetching engagement for subject: {} by teacher: {}", subjectId, email);
        
        Instant start = parseStartDate(startDate);
        Instant end = parseEndDate(endDate);
        
        Map<String, Object> engagement = videoLessonService.getSubjectEngagement(
                subjectId, email, start, end
        );
        return ResponseEntity.ok(engagement);
    }

    @GetMapping("/top-videos")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get top performing videos")
    public ResponseEntity<List<Map<String, Object>>> getTopVideos(
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "views") String sortBy,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Fetching top {} videos sorted by: {} for teacher: {}", limit, sortBy, email);
        
        List<Map<String, Object>> topVideos = videoLessonService.getTopVideos(email, limit, sortBy);
        return ResponseEntity.ok(topVideos);
    }

    // ==================== STUDENT ANALYTICS ====================

    @GetMapping("/student/progress")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Get video learning progress for student")
    public ResponseEntity<Map<String, Object>> getStudentProgress(
            @RequestParam(required = false) Long subjectId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Fetching video progress for student: {}", email);
        
        Map<String, Object> progress = videoLessonService.getStudentVideoProgress(email, subjectId);
        return ResponseEntity.ok(progress);
    }

    @GetMapping("/student/watch-time")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Get total watch time for student")
    public ResponseEntity<Map<String, Object>> getStudentWatchTime(
            @RequestParam(required = false) String startDate,  // ✅ Changed from Instant to String
            @RequestParam(required = false) String endDate,    // ✅ Changed from Instant to String
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Fetching watch time for student: {}", email);
        
        Instant start = parseStartDate(startDate);
        Instant end = parseEndDate(endDate);
        
        Map<String, Object> watchTime = videoLessonService.getStudentWatchTime(email, start, end);
        return ResponseEntity.ok(watchTime);
    }

    @GetMapping("/student/completed-videos")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Get list of completed videos")
    public ResponseEntity<List<Map<String, Object>>> getCompletedVideos(
            @RequestParam(required = false) Long subjectId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Fetching completed videos for student: {}", email);
        
        List<Map<String, Object>> completed = videoLessonService.getCompletedVideos(email, subjectId);
        return ResponseEntity.ok(completed);
    }

    @GetMapping("/recommendations/{studentId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Get recommended videos based on watch history")
    public ResponseEntity<List<Map<String, Object>>> getRecommendations(
            @PathVariable Long studentId,
            @RequestParam(defaultValue = "10") int limit,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Fetching video recommendations for student ID: {}", studentId);
        
        List<Map<String, Object>> recommendations = videoLessonService.getRecommendedVideos(email, limit);
        return ResponseEntity.ok(recommendations);
    }

    @GetMapping("/history/{studentId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Get watch history for a student")
    public ResponseEntity<Map<String, Object>> getWatchHistory(
            @PathVariable Long studentId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Fetching watch history for student ID: {}", studentId);
        
        Map<String, Object> history = Map.of(
            "studentId", studentId,
            "message", "Watch history endpoint - implementation pending"
        );
        return ResponseEntity.ok(history);
    }

    // ==================== ADMIN ANALYTICS ====================

    @GetMapping("/admin/platform-stats")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get platform-wide video statistics")
    public ResponseEntity<Map<String, Object>> getPlatformStats(
            @RequestParam(required = false) String startDate,  // ✅ Changed from Instant to String
            @RequestParam(required = false) String endDate     // ✅ Changed from Instant to String
    ) {
        log.info("Fetching platform-wide video statistics");
        
        Instant start = parseStartDate(startDate);
        Instant end = parseEndDate(endDate);
        
        Map<String, Object> stats = videoLessonService.getPlatformVideoStats(start, end);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/admin/teacher-rankings")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get teacher rankings by video engagement")
    public ResponseEntity<List<Map<String, Object>>> getTeacherRankings(
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String startDate,  // ✅ Changed from Instant to String
            @RequestParam(required = false) String endDate     // ✅ Changed from Instant to String
    ) {
        log.info("Fetching teacher rankings by video engagement");
        
        Instant start = parseStartDate(startDate);
        Instant end = parseEndDate(endDate);
        
        List<Map<String, Object>> rankings = videoLessonService.getTeacherRankings(limit, start, end);
        return ResponseEntity.ok(rankings);
    }

    @GetMapping("/admin/engagement-trends")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get video engagement trends over time")
    public ResponseEntity<Map<String, Object>> getEngagementTrends(
            @RequestParam(required = false) String startDate,     // ✅ Changed from Instant to String
            @RequestParam(required = false) String endDate,       // ✅ Changed from Instant to String
            @RequestParam(defaultValue = "daily") String groupBy
    ) {
        log.info("Fetching engagement trends grouped by: {}", groupBy);
        
        Instant start = parseStartDate(startDate);
        Instant end = parseEndDate(endDate);
        
        Map<String, Object> trends = videoLessonService.getEngagementTrends(start, end, groupBy);
        return ResponseEntity.ok(trends);
    }

    // ==================== EXPORT ENDPOINTS ====================

    @GetMapping("/video/{videoId}/export")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Export video analytics as CSV")
    public ResponseEntity<byte[]> exportVideoAnalytics(
            @PathVariable Long videoId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Exporting analytics for video: {} by teacher: {}", videoId, email);
        
        byte[] csv = videoLessonService.exportVideoAnalytics(videoId, email);
        
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=video_" + videoId + "_analytics.csv")
                .header("Content-Type", "text/csv")
                .body(csv);
    }

    @GetMapping("/teacher/export")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Export all teacher video analytics as CSV")
    public ResponseEntity<byte[]> exportTeacherAnalytics(
            @RequestParam(required = false) String startDate,  // ✅ Changed from Instant to String
            @RequestParam(required = false) String endDate,    // ✅ Changed from Instant to String
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Exporting all analytics for teacher: {}", email);
        
        Instant start = parseStartDate(startDate);
        Instant end = parseEndDate(endDate);
        
        byte[] csv = videoLessonService.exportTeacherAnalytics(email, start, end);
        
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=teacher_video_analytics.csv")
                .header("Content-Type", "text/csv")
                .body(csv);
    }

    @GetMapping("/teacher/summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get teacher video summary (alias for overview)")
    public ResponseEntity<Map<String, Object>> getTeacherSummary(
            @RequestParam(required = false) String startDate,  // ✅ Changed from Instant to String
            @RequestParam(required = false) String endDate,    // ✅ Changed from Instant to String
            Authentication auth
    ) {
        return getTeacherOverview(startDate, endDate, auth);
    }
    
    
    @PostMapping("/admin/refresh-analytics")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Manually trigger analytics refresh for all videos")
    public ResponseEntity<Map<String, Object>> refreshAnalytics() {
        log.info("Admin triggered manual analytics refresh");
        
        try {
            videoLessonService.manualRefreshAnalytics();
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Analytics refresh completed successfully",
                "timestamp", Instant.now().toString()
            ));
        } catch (Exception e) {
            log.error("Failed to refresh analytics", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                        "success", false,
                        "message", "Failed to refresh analytics: " + e.getMessage(),
                        "timestamp", Instant.now().toString()
                    ));
        }
    }

    @GetMapping("/admin/analytics-status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get analytics system status and health check")
    public ResponseEntity<Map<String, Object>> getAnalyticsStatus() {
        log.info("Fetching analytics system status");
        
        try {
            List<VideoLesson> allVideos = videoLessonRepository.findAll();
            
            long videosWithAnalytics = allVideos.stream()
                    .filter(v -> v.getTotalViews() != null && v.getTotalViews() > 0)
                    .count();
            
            // Count videos that need refresh (view count doesn't match watch history)
            long videosNeedingRefresh = 0;
            for (VideoLesson video : allVideos) {
                List<VideoWatchHistory> watches = videoWatchHistoryRepository
                        .findByVideoLessonIdOrderByWatchStartedAtDesc(video.getId());
                
                if (watches.isEmpty()) continue;
                
                long uniqueStudents = watches.stream()
                        .map(h -> h.getStudent().getId())
                        .distinct()
                        .count();
                
                Integer currentViews = video.getTotalViews() != null ? video.getTotalViews() : 0;
                if (currentViews < uniqueStudents) {
                    videosNeedingRefresh++;
                }
            }
            
            String healthStatus = videosNeedingRefresh > 10 ? "WARNING" : "HEALTHY";
            
            return ResponseEntity.ok(Map.of(
                "totalVideos", allVideos.size(),
                "videosWithAnalytics", videosWithAnalytics,
                "videosNeedingRefresh", videosNeedingRefresh,
                "lastRefreshTime", Instant.now().toString(),
                "healthStatus", healthStatus,
                "message", videosNeedingRefresh > 0 
                    ? videosNeedingRefresh + " videos need analytics refresh" 
                    : "All analytics up to date"
            ));
        } catch (Exception e) {
            log.error("Failed to fetch analytics status", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                        "error", "Failed to fetch analytics status: " + e.getMessage()
                    ));
        }
    }
}