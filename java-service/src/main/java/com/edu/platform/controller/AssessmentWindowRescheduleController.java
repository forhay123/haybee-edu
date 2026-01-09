package com.edu.platform.controller;

import com.edu.platform.dto.assessment.WindowRescheduleDto;
import com.edu.platform.dto.assessment.WindowRescheduleRequest;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.TeacherProfile;
import com.edu.platform.model.User;
import com.edu.platform.repository.StudentProfileRepository;
import com.edu.platform.repository.TeacherProfileRepository;
import com.edu.platform.repository.UserRepository;
import com.edu.platform.service.assessment.AssessmentWindowRescheduleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST Controller for managing assessment window rescheduling
 * Allows teachers to reschedule assessments BEFORE they start (prevents cheating)
 */
@RestController
@RequestMapping("/assessments/window-reschedules")
@RequiredArgsConstructor
@Slf4j
public class AssessmentWindowRescheduleController {
    
    private final AssessmentWindowRescheduleService rescheduleService;
    private final UserRepository userRepository;
    private final TeacherProfileRepository teacherProfileRepository;
    private final StudentProfileRepository studentProfileRepository;
    
    /**
     * ✅ Helper method to get current authenticated user
     * Same pattern as AssessmentController
     */
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            log.error("❌ No authentication found in security context");
            throw new RuntimeException("User not authenticated");
        }
        
        String email = authentication.getName();
        log.debug("🔍 Fetching user with email: {}", email);
        
        return userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.error("❌ User not found with email: {}", email);
                    return new RuntimeException("User not found: " + email);
                });
    }
    
    /**
     * Reschedule an assessment window (Teacher or Admin)
     * POST /api/v1/assessments/window-reschedules
     */
    @PostMapping
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    public ResponseEntity<WindowRescheduleDto> rescheduleAssessment(
            @RequestBody @Valid WindowRescheduleRequest request) {
        
        User currentUser = getCurrentUser();
        log.info("📝 POST /api/v1/assessments/window-reschedules - User: {}, Schedule: {}", 
                 currentUser.getEmail(), request.getDailyScheduleId());
        
        // Get teacher profile from current user
        TeacherProfile teacherProfile = teacherProfileRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new RuntimeException(
                    "Teacher profile not found for user: " + currentUser.getEmail()));
        
        WindowRescheduleDto reschedule = rescheduleService.rescheduleAssessment(
            teacherProfile.getId(),
            request
        );
        
        log.info("✅ Assessment rescheduled: id={}, student={}, newStart={}", 
                 reschedule.getId(), reschedule.getStudentId(), reschedule.getNewWindowStart());
        
        return ResponseEntity.ok(reschedule);
    }
    
    /**
     * Get reschedules created by authenticated teacher
     * GET /api/v1/assessments/window-reschedules/teacher?studentId=X
     */
    @GetMapping("/teacher")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    public ResponseEntity<List<WindowRescheduleDto>> getTeacherReschedules(
            @RequestParam(required = false) Long studentId) {
        
        User currentUser = getCurrentUser();
        log.info("📋 GET /api/v1/assessments/window-reschedules/teacher - User: {}, Student: {}", 
                 currentUser.getEmail(), studentId);
        
        TeacherProfile teacherProfile = teacherProfileRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new RuntimeException(
                    "Teacher profile not found for user: " + currentUser.getEmail()));
        
        List<WindowRescheduleDto> reschedules = rescheduleService.getTeacherReschedules(
            teacherProfile.getId(), 
            studentId
        );
        
        log.info("✅ Retrieved {} reschedules for teacher {}", 
                reschedules.size(), teacherProfile.getId());
        
        return ResponseEntity.ok(reschedules);
    }
    
    /**
     * Get reschedules for authenticated student
     * GET /api/v1/assessments/window-reschedules/my
     */
    @GetMapping("/my")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<WindowRescheduleDto>> getMyReschedules() {
        
        User currentUser = getCurrentUser();
        log.info("📋 GET /api/v1/assessments/window-reschedules/my - User: {}", 
                 currentUser.getEmail());
        
        StudentProfile studentProfile = studentProfileRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new RuntimeException(
                    "Student profile not found for user: " + currentUser.getEmail()));
        
        List<WindowRescheduleDto> reschedules = rescheduleService.getStudentReschedules(
            studentProfile.getId());
        
        log.info("✅ Retrieved {} reschedules for student {}", 
                reschedules.size(), studentProfile.getId());
        
        return ResponseEntity.ok(reschedules);
    }
    
    /**
     * Cancel a reschedule (Teacher or Admin)
     * DELETE /api/v1/assessments/window-reschedules/{rescheduleId}
     */
    @DeleteMapping("/{rescheduleId}")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    public ResponseEntity<Void> cancelReschedule(
            @PathVariable Long rescheduleId,
            @RequestBody Map<String, String> body) {
        
        User currentUser = getCurrentUser();
        log.info("🚫 DELETE /api/v1/assessments/window-reschedules/{} - User: {}", 
                 rescheduleId, currentUser.getEmail());
        
        TeacherProfile teacherProfile = teacherProfileRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new RuntimeException(
                    "Teacher profile not found for user: " + currentUser.getEmail()));
        
        String reason = body.getOrDefault("reason", "Cancelled by teacher");
        
        rescheduleService.cancelReschedule(teacherProfile.getId(), rescheduleId, reason);
        
        log.info("✅ Reschedule cancelled: reschedule={}", rescheduleId);
        
        return ResponseEntity.noContent().build();
    }
    
    /**
     * Admin: Get all reschedules with filters
     * GET /api/v1/assessments/window-reschedules/admin?teacherId=X&studentId=Y
     */
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<WindowRescheduleDto>> getAllReschedules(
            @RequestParam(required = false) Long teacherId,
            @RequestParam(required = false) Long studentId) {
        
        log.info("📋 GET /api/v1/assessments/window-reschedules/admin - Teacher: {}, Student: {}", 
                 teacherId, studentId);
        
        // TODO: Implement admin view with filters
        // For now, return empty list
        
        return ResponseEntity.ok(List.of());
    }
}