package com.edu.platform.controller;

import com.edu.platform.dto.progress.ComprehensiveLessonDto;
import com.edu.platform.dto.progress.ComprehensiveLessonsReport;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.TeacherProfile;
import com.edu.platform.model.User;
import com.edu.platform.repository.TeacherProfileRepository;
import com.edu.platform.repository.UserRepository;
import com.edu.platform.service.StudentProfileService;
import com.edu.platform.service.TeacherProfileService;
import com.edu.platform.service.progress.ComprehensiveLessonService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * ✅ Comprehensive lesson tracking controller
 * Endpoints for viewing scheduled, completed, missed, and in-progress lessons
 */
@RestController
@RequestMapping("/progress/lessons")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Comprehensive Lessons", description = "Complete lesson tracking with status filtering")
public class ComprehensiveLessonsController {

    private final ComprehensiveLessonService comprehensiveLessonService;
    private final StudentProfileService studentProfileService;
    private final UserRepository userRepository;
    private final TeacherProfileService teacherProfileService;
    private final TeacherProfileRepository teacherProfileRepository;


    // ======================================================
    // 📌 1. PRIMARY ENDPOINT: Comprehensive Lessons Report
    // ======================================================
    
    /**
     * ✅ Get comprehensive lesson report for current student
     * Shows all lessons grouped by status (SCHEDULED, COMPLETED, MISSED, IN_PROGRESS)
     * with date filtering and statistics
     */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/comprehensive")
    @Operation(
            summary = "Get comprehensive lessons report",
            description = "Fetch all lessons with status, grouped by category. Supports date range and status filtering.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Lessons report retrieved"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized"),
                    @ApiResponse(responseCode = "404", description = "Student profile not found")
            }
    )
    public ResponseEntity<ComprehensiveLessonsReport> getComprehensiveLessons(
            Authentication auth,
            @Parameter(description = "Start date (YYYY-MM-DD)", example = "2025-01-01")
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            
            @Parameter(description = "End date (YYYY-MM-DD)", example = "2025-01-31")
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            
            @Parameter(description = "Filter by status: SCHEDULED, COMPLETED, MISSED, IN_PROGRESS", 
                      example = "COMPLETED")
            @RequestParam(required = false) String status) {

        log.info("📚 GET /progress/lessons/comprehensive - User: {}, from: {}, to: {}, status: {}",
                auth.getName(), fromDate, toDate, status);

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        StudentProfile student = studentProfileService.getStudentProfile(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        ComprehensiveLessonsReport report = comprehensiveLessonService
                .getComprehensiveLessons(student.getId(), fromDate, toDate, status);

        log.info("✅ Returned report: Total={}, Completed={}, Missed={}, InProgress={}",
                report.getTotalLessons(), report.getCompletedCount(),
                report.getMissedCount(), report.getInProgressCount());

        return ResponseEntity.ok(report);
    }

    /**
     * ✅ Admin can view comprehensive lessons for any student
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/comprehensive/student/{studentId}")
    @Operation(
            summary = "Get comprehensive lessons for any student (ADMIN)",
            description = "Admin endpoint to view any student's comprehensive lesson report"
    )
    public ResponseEntity<ComprehensiveLessonsReport> getComprehensiveLessonsAdmin(
            @Parameter(description = "Student profile ID")
            @PathVariable Long studentId,
            
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            
            @RequestParam(required = false) String status) {

        log.info("📚 ADMIN GET /progress/lessons/comprehensive/student/{} - from: {}, to: {}, status: {}",
                studentId, fromDate, toDate, status);

        studentProfileService.getById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found: " + studentId));

        ComprehensiveLessonsReport report = comprehensiveLessonService
                .getComprehensiveLessons(studentId, fromDate, toDate, status);

        return ResponseEntity.ok(report);
    }

    // ======================================================
    // 📌 2. STATUS-SPECIFIC ENDPOINTS
    // ======================================================
    
    /**
     * ✅ Get only completed lessons
     */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/completed")
    @Operation(summary = "Get completed lessons only")
    public ResponseEntity<List<ComprehensiveLessonDto>> getCompletedLessons(
            Authentication auth,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        StudentProfile student = studentProfileService.getStudentProfile(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        List<ComprehensiveLessonDto> lessons = comprehensiveLessonService
                .getLessonsByStatus(student.getId(), "COMPLETED", fromDate, toDate);

        log.info("✅ Found {} completed lessons", lessons.size());
        return ResponseEntity.ok(lessons);
    }
    

/**
 * ✅ FIXED: Get all lessons for teacher's subjects with filters
 */
@PreAuthorize("hasRole('TEACHER')")
@GetMapping("/teacher/comprehensive")
@Operation(
        summary = "Get comprehensive lessons for teacher's subjects",
        description = "Teacher endpoint to view lessons across their classes with filters"
)
public ResponseEntity<List<ComprehensiveLessonDto>> getTeacherLessons(
        Authentication auth,
        @RequestParam(required = false) 
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
        
        @RequestParam(required = false) 
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
        
        @RequestParam(required = false) String status,
        
        @RequestParam(required = false) Long subjectId,
        
        @RequestParam(required = false) Long classId,
        
        @RequestParam(required = false) Long studentId) {

    log.info("📚 TEACHER GET /progress/lessons/teacher/comprehensive - User: {}", auth.getName());

    User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

    // ✅ FIX: Use findByUserId instead of getTeacherProfile
    TeacherProfile teacher = teacherProfileRepository.findByUserId(user.getId())
            .orElseThrow(() -> new IllegalArgumentException("Teacher profile not found for user: " + user.getId()));

    log.info("✅ Found teacher profile ID: {}", teacher.getId());

    List<ComprehensiveLessonDto> lessons = comprehensiveLessonService
            .getTeacherComprehensiveLessons(
                teacher.getId(),  // ✅ Pass teacher profile ID
                fromDate, 
                toDate, 
                status, 
                subjectId, 
                classId, 
                studentId
            );

    log.info("✅ Teacher returned {} lessons", lessons.size());
    return ResponseEntity.ok(lessons);
}

/**
 * ✅ FIXED: Get aggregated statistics for teacher's subjects
 */
@PreAuthorize("hasRole('TEACHER')")
@GetMapping("/teacher/stats")
@Operation(
        summary = "Get statistics for teacher's subjects",
        description = "Aggregated stats across teacher's classes and subjects"
)
public ResponseEntity<Map<String, Object>> getTeacherStats(
        Authentication auth,
        @RequestParam(required = false) 
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
        
        @RequestParam(required = false) 
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
        
        @RequestParam(required = false) Long subjectId,
        
        @RequestParam(required = false) Long classId) {

    log.info("📊 TEACHER GET /progress/lessons/teacher/stats - User: {}", auth.getName());

    User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

    // ✅ FIX: Use findByUserId instead of getTeacherProfile
    TeacherProfile teacher = teacherProfileRepository.findByUserId(user.getId())
            .orElseThrow(() -> new IllegalArgumentException("Teacher profile not found for user: " + user.getId()));

    log.info("✅ Found teacher profile ID: {}", teacher.getId());

    Map<String, Object> stats = comprehensiveLessonService
            .getTeacherStats(teacher.getId(), fromDate, toDate, subjectId, classId);

    return ResponseEntity.ok(stats);
}

    // ======================================================
    // 📌 5. ADMIN ENDPOINTS (NEW)
    // ======================================================

    /**
     * ✅ NEW: Get all lessons across all students with filters
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/comprehensive")
    @Operation(
            summary = "Get all lessons (ADMIN)",
            description = "Admin endpoint to view lessons across all students with filters"
    )
    public ResponseEntity<List<ComprehensiveLessonDto>> getAdminLessons(
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            
            @RequestParam(required = false) String status,
            
            @RequestParam(required = false) Long subjectId,
            
            @RequestParam(required = false) Long classId,
            
            @RequestParam(required = false) Long studentId) {

        log.info("📚 ADMIN GET /progress/lessons/admin/comprehensive");

        List<ComprehensiveLessonDto> lessons = comprehensiveLessonService
                .getAdminComprehensiveLessons(
                    fromDate, 
                    toDate, 
                    status, 
                    subjectId, 
                    classId, 
                    studentId
                );

        log.info("✅ Admin returned {} lessons", lessons.size());
        return ResponseEntity.ok(lessons);
    }

    /**
     * ✅ NEW: Get system-wide statistics
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/stats")
    @Operation(
            summary = "Get system-wide statistics (ADMIN)",
            description = "Aggregated stats across all students, teachers, subjects"
    )
    public ResponseEntity<Map<String, Object>> getAdminStats(
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            
            @RequestParam(required = false) Long subjectId,
            
            @RequestParam(required = false) Long classId) {

        log.info("📊 ADMIN GET /progress/lessons/admin/stats");

        Map<String, Object> stats = comprehensiveLessonService
                .getAdminStats(fromDate, toDate, subjectId, classId);

        return ResponseEntity.ok(stats);
    }

    /**
     * ✅ Get only missed lessons
     */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/missed")
    @Operation(summary = "Get missed lessons only")
    public ResponseEntity<List<ComprehensiveLessonDto>> getMissedLessons(
            Authentication auth,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        StudentProfile student = studentProfileService.getStudentProfile(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        List<ComprehensiveLessonDto> lessons = comprehensiveLessonService
                .getLessonsByStatus(student.getId(), "MISSED", fromDate, toDate);

        log.info("🚨 Found {} missed lessons", lessons.size());
        return ResponseEntity.ok(lessons);
    }

    /**
     * ✅ Get only in-progress lessons
     */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/in-progress")
    @Operation(summary = "Get in-progress lessons only")
    public ResponseEntity<List<ComprehensiveLessonDto>> getInProgressLessons(
            Authentication auth,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        StudentProfile student = studentProfileService.getStudentProfile(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        List<ComprehensiveLessonDto> lessons = comprehensiveLessonService
                .getLessonsByStatus(student.getId(), "IN_PROGRESS", fromDate, toDate);

        log.info("⏰ Found {} in-progress lessons", lessons.size());
        return ResponseEntity.ok(lessons);
    }

    /**
     * ✅ Get only scheduled lessons
     */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/scheduled")
    @Operation(summary = "Get scheduled lessons only")
    public ResponseEntity<List<ComprehensiveLessonDto>> getScheduledLessons(
            Authentication auth,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        StudentProfile student = studentProfileService.getStudentProfile(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        List<ComprehensiveLessonDto> lessons = comprehensiveLessonService
                .getLessonsByStatus(student.getId(), "SCHEDULED", fromDate, toDate);

        log.info("📅 Found {} scheduled lessons", lessons.size());
        return ResponseEntity.ok(lessons);
    }

    // ======================================================
    // 📌 3. URGENT & ANALYTICS ENDPOINTS
    // ======================================================
    
    /**
     * ✅ Get urgent lessons (missed + overdue) that need immediate attention
     */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/urgent")
    @Operation(
            summary = "Get urgent lessons",
            description = "Get lessons that need immediate attention (missed + overdue)"
    )
    public ResponseEntity<List<ComprehensiveLessonDto>> getUrgentLessons(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        StudentProfile student = studentProfileService.getStudentProfile(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        List<ComprehensiveLessonDto> urgentLessons = comprehensiveLessonService
                .getUrgentLessons(student.getId());

        log.info("🚨 Found {} urgent lessons", urgentLessons.size());
        return ResponseEntity.ok(urgentLessons);
    }

    /**
     * ✅ Get lessons grouped by subject
     */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/by-subject")
    @Operation(summary = "Get lessons grouped by subject")
    public ResponseEntity<Map<String, List<ComprehensiveLessonDto>>> getLessonsBySubject(
            Authentication auth,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        StudentProfile student = studentProfileService.getStudentProfile(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        Map<String, List<ComprehensiveLessonDto>> lessonsBySubject = comprehensiveLessonService
                .getLessonsBySubject(student.getId(), fromDate, toDate);

        log.info("📖 Lessons grouped by {} subjects", lessonsBySubject.size());
        return ResponseEntity.ok(lessonsBySubject);
    }

    /**
     * ✅ Get statistics summary
     */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/stats")
    @Operation(
            summary = "Get lesson statistics",
            description = "Get comprehensive statistics (completion rate, risk status, etc.)"
    )
    public ResponseEntity<Map<String, Object>> getStatistics(
            Authentication auth,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        StudentProfile student = studentProfileService.getStudentProfile(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        Map<String, Object> stats = comprehensiveLessonService
                .getStatusStats(student.getId(), fromDate, toDate);

        return ResponseEntity.ok(stats);
    }

    /**
     * ✅ Check student progress status (on track or at risk)
     */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/status")
    @Operation(summary = "Get student progress status")
    public ResponseEntity<Map<String, Object>> getProgressStatus(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        StudentProfile student = studentProfileService.getStudentProfile(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        Boolean onTrack = comprehensiveLessonService.isStudentOnTrack(student.getId());
        Boolean atRisk = comprehensiveLessonService.isStudentAtRisk(student.getId());

        return ResponseEntity.ok(Map.of(
                "studentId", student.getId(),
                "studentName", student.getUser().getFullName(),
                "isOnTrack", onTrack,
                "isAtRisk", atRisk,
                "status", onTrack ? "ON_TRACK" : (atRisk ? "AT_RISK" : "NEUTRAL")
        ));
    }
}