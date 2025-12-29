package com.edu.platform.controller.individual;

import com.edu.platform.dto.ApiResponse;
import com.edu.platform.dto.assessment.AssessmentDto;
import com.edu.platform.dto.assessment.CreateCustomAssessmentRequest;
import com.edu.platform.model.User;
import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.service.UserService;
import com.edu.platform.service.individual.CustomAssessmentService;
import com.edu.platform.service.individual.PendingAssessmentTracker;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;

/**
 * ✅ NEW CONTROLLER: Custom Period Assessment Management
 * Handles creation, editing, and deletion of custom assessments for Period 2/3
 */
@RestController
@RequestMapping("/individual/custom-assessments")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Custom Period Assessments", description = "Teacher-created custom assessments for multi-period lessons")
@SecurityRequirement(name = "bearerAuth")
public class CustomPeriodAssessmentController {

    private final CustomAssessmentService customAssessmentService;
    private final PendingAssessmentTracker pendingAssessmentTracker;
    private final UserService userService;

    /**
     * ✅ GET /api/v1/individual/custom-assessments/pending
     * Get list of pending custom assessments needing creation
     */
    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Get pending custom assessments", 
               description = "Returns list of periods waiting for teacher to create custom assessment")
    public ResponseEntity<ApiResponse<List<PendingAssessmentTracker.PendingAssessmentInfo>>> getPendingCustomAssessments(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) List<Long> subjectIds) {
        
        try {
            log.info("📋 GET /pending - Teacher: {}, Subjects: {}", 
                    userDetails.getUsername(), subjectIds);

            List<PendingAssessmentTracker.PendingAssessmentInfo> pending;
            
            if (subjectIds != null && !subjectIds.isEmpty()) {
                pending = pendingAssessmentTracker.getPendingAssessmentsBySubjects(subjectIds);
            } else {
                // Get all pending for this teacher's subjects
                User teacher = userService.findByEmail(userDetails.getUsername())
                        .orElseThrow(() -> new RuntimeException("User not found"));
                // TODO: Get teacher's subject IDs from TeacherProfile
                pending = pendingAssessmentTracker.getAllPendingAssessments();
            }

            log.info("✅ Found {} pending custom assessments", pending.size());
            
            // ✅ FIXED: message first, then data
            return ResponseEntity.ok(ApiResponse.success(
                    pending.size() + " pending custom assessments found",
                    pending
            ));

        } catch (Exception e) {
            log.error("❌ Error fetching pending assessments: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to fetch pending assessments: " + e.getMessage()));
        }
    }

    /**
     * ✅ POST /api/v1/individual/custom-assessments/create
     * Teacher creates a custom assessment for specific student/period
     */
    @PostMapping("/create")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Create custom period assessment",
               description = "Create a custom assessment for a student based on previous performance")
    public ResponseEntity<ApiResponse<AssessmentDto>> createCustomAssessment(
            @Valid @RequestBody CreateCustomAssessmentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        try {
            log.info("📝 POST /create - Teacher: {}, Student: {}, Subject: {}, Period: {}",
                    userDetails.getUsername(),
                    request.getStudentProfileId(),
                    request.getSubjectId(),
                    request.getPeriodNumber());

            User teacher = userService.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Assessment assessment = customAssessmentService.createCustomPeriodAssessment(
                    request, teacher
            );

            AssessmentDto dto = convertToDto(assessment);

            log.info("✅ Custom assessment created: ID {}", assessment.getId());

            // ✅ FIXED: message first, then data
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success(
                            "Custom assessment created successfully",
                            dto
                    ));

        } catch (IllegalArgumentException | IllegalStateException e) {
            log.error("❌ Validation error creating custom assessment: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));

        } catch (Exception e) {
            log.error("❌ Error creating custom assessment: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to create custom assessment: " + e.getMessage()));
        }
    }

    /**
     * ✅ GET /api/v1/individual/custom-assessments/student/{studentId}/subject/{subjectId}/period/{periodNumber}
     * Get specific custom assessment for student/subject/period
     */
    @GetMapping("/student/{studentId}/subject/{subjectId}/period/{periodNumber}")
    @PreAuthorize("hasAnyRole('TEACHER', 'STUDENT', 'ADMIN')")
    @Operation(summary = "Get custom assessment for period",
               description = "Retrieve custom assessment for specific student, subject, and period")
    public ResponseEntity<ApiResponse<AssessmentDto>> getCustomAssessmentForPeriod(
            @PathVariable Long studentId,
            @PathVariable Long subjectId,
            @PathVariable Integer periodNumber,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        try {
            log.info("🔍 GET /student/{}/subject/{}/period/{} - User: {}",
                    studentId, subjectId, periodNumber, userDetails.getUsername());

            // TODO: Add authorization check - students can only see their own assessments

            // Query for custom assessment
            // This will need to be implemented in CustomAssessmentService
            AssessmentDto assessment = null; // TODO: Implement getCustomAssessmentForPeriod

            if (assessment == null) {
                log.info("❌ No custom assessment found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("No custom assessment found for this period"));
            }

            log.info("✅ Found custom assessment: ID {}", assessment.getId());

            // ✅ FIXED: message first, then data
            return ResponseEntity.ok(ApiResponse.success(
                    "Custom assessment found",
                    assessment
            ));

        } catch (Exception e) {
            log.error("❌ Error fetching custom assessment: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to fetch custom assessment: " + e.getMessage()));
        }
    }

    /**
     * ✅ PUT /api/v1/individual/custom-assessments/{id}
     * Edit custom assessment before student sees it
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Update custom assessment",
               description = "Edit custom assessment details (only before student submission)")
    public ResponseEntity<ApiResponse<AssessmentDto>> updateCustomAssessment(
            @PathVariable Long id,
            @Valid @RequestBody CreateCustomAssessmentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        try {
            log.info("✏️ PUT /{} - Teacher: {}", id, userDetails.getUsername());

            User teacher = userService.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Assessment assessment = customAssessmentService.updateCustomAssessment(
                    id, request, teacher
            );

            AssessmentDto dto = convertToDto(assessment);

            log.info("✅ Custom assessment updated: ID {}", id);

            // ✅ FIXED: message first, then data
            return ResponseEntity.ok(ApiResponse.success(
                    "Custom assessment updated successfully",
                    dto
            ));

        } catch (IllegalArgumentException | IllegalStateException e) {
            log.error("❌ Validation error updating custom assessment: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));

        } catch (Exception e) {
            log.error("❌ Error updating custom assessment: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to update custom assessment: " + e.getMessage()));
        }
    }

    /**
     * ✅ DELETE /api/v1/individual/custom-assessments/{id}
     * Delete custom assessment (only if no submissions yet)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Delete custom assessment",
               description = "Delete custom assessment if no student submissions exist")
    public ResponseEntity<ApiResponse<Void>> deleteCustomAssessment(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        try {
            log.info("🗑️ DELETE /{} - Teacher: {}", id, userDetails.getUsername());

            User teacher = userService.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            customAssessmentService.deleteCustomAssessment(id, teacher);

            log.info("✅ Custom assessment deleted: ID {}", id);

            // ✅ FIXED: message first, then data (null for Void)
            return ResponseEntity.ok(ApiResponse.success(
                    "Custom assessment deleted successfully",
                    null
            ));

        } catch (IllegalArgumentException | IllegalStateException e) {
            log.error("❌ Cannot delete custom assessment: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));

        } catch (Exception e) {
            log.error("❌ Error deleting custom assessment: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to delete custom assessment: " + e.getMessage()));
        }
    }

    /**
     * ✅ GET /api/v1/individual/custom-assessments/count/pending
     * Get count of pending custom assessments (for dashboard badge)
     */
    @GetMapping("/count/pending")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Count pending custom assessments",
               description = "Get count for dashboard notification badge")
    public ResponseEntity<ApiResponse<Long>> countPendingCustomAssessments(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) List<Long> subjectIds) {
        
        try {
            log.info("🔢 GET /count/pending - Teacher: {}", userDetails.getUsername());

            long count;
            
            if (subjectIds != null && !subjectIds.isEmpty()) {
                count = pendingAssessmentTracker.countPendingAssessments(subjectIds);
            } else {
                // TODO: Get teacher's subject IDs from TeacherProfile
                count = 0;
            }

            log.info("✅ Pending count: {}", count);

            // ✅ FIXED: message first, then data
            return ResponseEntity.ok(ApiResponse.success(
                    count + " pending custom assessments",
                    count
            ));

        } catch (Exception e) {
            log.error("❌ Error counting pending assessments: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to count pending assessments: " + e.getMessage()));
        }
    }

    // ============================================================
    // HELPER METHODS
    // ============================================================

    /**
     * Convert Assessment entity to DTO
     */
    private AssessmentDto convertToDto(Assessment assessment) {
        return AssessmentDto.builder()
                .id(assessment.getId())
                .title(assessment.getTitle())
                .description(assessment.getDescription())
                .type(assessment.getType())
                .subjectId(assessment.getSubject().getId())
                .subjectName(assessment.getSubject().getName())
                .totalMarks(assessment.getTotalMarks())
                .passingMarks(assessment.getPassingMarks())
                .durationMinutes(assessment.getDurationMinutes())
                .published(assessment.getPublished())
                .dueDate(assessment.getDueDate())
                .isCustomAssessment(assessment.isCustomAssessment())
                .periodNumber(assessment.getPeriodNumber())
                .targetStudentId(assessment.getTargetStudentId())
                .parentAssessmentId(assessment.getParentAssessmentId())
                .createdById(assessment.getCreatedBy() != null ? 
                        assessment.getCreatedBy().getId() : null)
                .createdByName(assessment.getCreatedBy() != null ? 
                        assessment.getCreatedBy().getFullName() : null)
                .createdAt(assessment.getCreatedAt())
                .build();
    }
}