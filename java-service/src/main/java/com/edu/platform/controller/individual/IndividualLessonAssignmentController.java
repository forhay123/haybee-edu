package com.edu.platform.controller.individual;

import com.edu.platform.dto.individual.ManualAssignmentRequest;
import com.edu.platform.dto.individual.ManualAssignmentResponse;
import com.edu.platform.dto.individual.PendingAssignmentDto;
import com.edu.platform.repository.UserRepository;
import com.edu.platform.service.individual.ManualTopicAssignmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ✅ FIXED: Controller for manual lesson topic assignment
 */
@RestController
@RequestMapping("/individual/lesson-assignment")
@RequiredArgsConstructor
@Slf4j
public class IndividualLessonAssignmentController {

    private final ManualTopicAssignmentService assignmentService;
    private final UserRepository userRepository;

    // ============================================================
    // ADMIN + TEACHER: Manual Assignment
    // ============================================================

    /**
     * ✅ Assign lesson topic to a single schedule
     */
    @PostMapping("/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ManualAssignmentResponse> assignTopicToSchedule(
            @RequestBody ManualAssignmentRequest request) {
        
        log.info("📝 POST /assign - scheduleId: {}, topicId: {}", 
            request.getScheduleId(), request.getLessonTopicId());

        ManualAssignmentResponse response = assignmentService.assignTopicToSchedule(request);
        return ResponseEntity.ok(response);
    }

    /**
     * ✅ Bulk assign lesson topic to multiple schedules
     */
    @PostMapping("/bulk-assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ManualAssignmentResponse> bulkAssignTopic(
            @RequestBody ManualAssignmentRequest request) {
        
        log.info("📝 POST /bulk-assign - {} schedules, topicId: {}", 
            request.getScheduleIds() != null ? request.getScheduleIds().size() : 0,
            request.getLessonTopicId());

        ManualAssignmentResponse response = assignmentService.bulkAssignTopic(request);
        return ResponseEntity.ok(response);
    }

    // ============================================================
    // ADMIN + TEACHER: Query Pending Assignments
    // ============================================================

    /**
     * ✅ Get all pending assignments (ADMIN only)
     */
    @GetMapping("/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PendingAssignmentDto>> getAllPendingAssignments() {
        log.info("📋 GET /pending - all");

        List<PendingAssignmentDto> pending = assignmentService.getAllPendingAssignments();
        return ResponseEntity.ok(pending);
    }

    /**
     * ✅ Get pending assignments for a specific week
     */
    @GetMapping("/pending/week/{weekNumber}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<List<PendingAssignmentDto>> getPendingAssignmentsByWeek(
            @PathVariable Integer weekNumber) {
        
        log.info("📋 GET /pending/week/{}", weekNumber);

        List<PendingAssignmentDto> pending = assignmentService
            .getPendingAssignmentsByWeek(weekNumber);
        return ResponseEntity.ok(pending);
    }

    /**
     * ✅ Get pending assignments for a specific subject
     */
    @GetMapping("/pending/subject/{subjectId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<List<PendingAssignmentDto>> getPendingAssignmentsBySubject(
            @PathVariable Long subjectId) {
        
        log.info("📋 GET /pending/subject/{}", subjectId);

        List<PendingAssignmentDto> pending = assignmentService
            .getPendingAssignmentsBySubject(subjectId);
        return ResponseEntity.ok(pending);
    }

    /**
     * ✅ Get pending assignments for a specific student
     */
    @GetMapping("/pending/student/{studentProfileId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<List<PendingAssignmentDto>> getPendingAssignmentsForStudent(
            @PathVariable Long studentProfileId) {
        
        log.info("📋 GET /pending/student/{}", studentProfileId);

        List<PendingAssignmentDto> pending = assignmentService
            .getPendingAssignmentsForStudent(studentProfileId);
        return ResponseEntity.ok(pending);
    }

    /**
     * ✅ FIXED: Get pending assignments for current teacher (filtered by their subjects)
     * Using the same authentication pattern as IndividualTimetableController
     */
    @GetMapping("/pending/my-subjects")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<?> getPendingAssignmentsForCurrentTeacher(
            Authentication authentication) {
        
        log.info("📋 GET /pending/my-subjects");

        try {
            // ✅ FIX: Use same pattern as IndividualTimetableController
            if (authentication == null || !authentication.isAuthenticated()) {
                log.error("❌ User not authenticated");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
            }
            
            // Get Spring Security User from authentication
            User springUser = (User) authentication.getPrincipal();
            String email = springUser.getUsername();
            
            log.info("🔍 Authenticated user email: {}", email);

            // Get custom User entity from database
            com.edu.platform.model.User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));

            if (user.getTeacherProfile() == null) {
                log.error("❌ User {} has no teacher profile", email);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("User is not a teacher");
            }

            Long teacherProfileId = user.getTeacherProfile().getId();
            log.info("✅ Teacher profile ID: {}", teacherProfileId);

            // Get pending assignments filtered by teacher's subjects
            List<PendingAssignmentDto> pending = assignmentService
                .getPendingAssignmentsForTeacher(teacherProfileId);

            log.info("✅ Found {} pending assignments for teacher {}", 
                pending.size(), teacherProfileId);

            return ResponseEntity.ok(pending);
            
        } catch (Exception e) {
            log.error("❌ Error getting pending assignments for teacher: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error: " + e.getMessage());
        }
    }

    // ============================================================
    // ADMIN + TEACHER: Get Suggested Topics
    // ============================================================

    /**
     * ✅ Get suggested lesson topics for a schedule
     */
    @GetMapping("/suggestions/{scheduleId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<List<PendingAssignmentDto.SuggestedTopicDto>> getSuggestedTopics(
            @PathVariable Long scheduleId) {
        
        log.info("💡 GET /suggestions/{}", scheduleId);

        List<PendingAssignmentDto.SuggestedTopicDto> suggestions = 
            assignmentService.getSuggestedTopics(scheduleId);
        return ResponseEntity.ok(suggestions);
    }
}