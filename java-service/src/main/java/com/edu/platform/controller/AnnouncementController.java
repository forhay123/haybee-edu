package com.edu.platform.controller;

import com.edu.platform.dto.notification.AnnouncementDTO;
import com.edu.platform.dto.notification.CreateAnnouncementRequest;
import com.edu.platform.dto.notification.SystemAlertRequest;
import com.edu.platform.service.AnnouncementService;
import com.edu.platform.service.IntegrationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for announcements and system alerts
 * Admin-only endpoints for creating and managing announcements
 */
@RestController
@RequestMapping("/announcements")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Announcements", description = "Admin endpoints for announcements and system alerts")
@SecurityRequirement(name = "Bearer Authentication")
public class AnnouncementController {

    private final AnnouncementService announcementService;
    private final IntegrationService integrationService;
    private final com.edu.platform.repository.UserRepository userRepository;

    /**
     * Create a new announcement (draft or publish immediately)
     * Admin only
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create announcement", description = "Create a new announcement (draft or publish)")
    public ResponseEntity<AnnouncementDTO> createAnnouncement(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody CreateAnnouncementRequest request) {
        
        Long adminUserId = getUserIdFromEmail(userDetails.getUsername());
        AnnouncementDTO announcement = announcementService.createAnnouncement(adminUserId, request);
        return ResponseEntity.ok(announcement);
    }

    /**
     * Publish an existing announcement
     * Admin only
     */
    @PostMapping("/{id}/publish")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Publish announcement", description = "Publish a draft announcement")
    public ResponseEntity<AnnouncementDTO> publishAnnouncement(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        
        Long adminUserId = getUserIdFromEmail(userDetails.getUsername());
        AnnouncementDTO announcement = announcementService.publishAnnouncement(adminUserId, id);
        return ResponseEntity.ok(announcement);
    }

    /**
     * Send a system alert (immediate, high priority, all users)
     * Admin only
     */
    @PostMapping("/system-alert")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Send system alert", description = "Send high-priority alert to all users")
    public ResponseEntity<AnnouncementDTO> sendSystemAlert(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody SystemAlertRequest request) {
        
        Long adminUserId = getUserIdFromEmail(userDetails.getUsername());
        AnnouncementDTO alert = announcementService.sendSystemAlert(adminUserId, request);
        return ResponseEntity.ok(alert);
    }

    /**
     * Get all announcements (admin view)
     * Admin only
     */
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get all announcements", description = "Get paginated list of all announcements")
    public ResponseEntity<Page<AnnouncementDTO>> getAllAnnouncements(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Page<AnnouncementDTO> announcements = announcementService.getAllAnnouncements(page, size);
        return ResponseEntity.ok(announcements);
    }

    /**
     * Get published announcements
     * Accessible by all authenticated users
     */
    @GetMapping
    @Operation(summary = "Get published announcements", description = "Get paginated list of published announcements")
    public ResponseEntity<Page<AnnouncementDTO>> getPublishedAnnouncements(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Page<AnnouncementDTO> announcements = announcementService.getPublishedAnnouncements(page, size);
        return ResponseEntity.ok(announcements);
    }

    /**
     * Get active (non-expired) announcements
     * Accessible by all authenticated users
     */
    @GetMapping("/active")
    @Operation(summary = "Get active announcements", description = "Get list of active (published, non-expired) announcements")
    public ResponseEntity<List<AnnouncementDTO>> getActiveAnnouncements() {
        List<AnnouncementDTO> announcements = announcementService.getActiveAnnouncements();
        return ResponseEntity.ok(announcements);
    }

    /**
     * Get announcement by ID
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get announcement", description = "Get announcement by ID")
    public ResponseEntity<AnnouncementDTO> getAnnouncement(@PathVariable Long id) {
        AnnouncementDTO announcement = announcementService.getAnnouncementById(id);
        return ResponseEntity.ok(announcement);
    }

    /**
     * Update announcement (only drafts can be updated)
     * Admin only
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update announcement", description = "Update a draft announcement")
    public ResponseEntity<AnnouncementDTO> updateAnnouncement(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @RequestBody CreateAnnouncementRequest request) {
        
        Long adminUserId = getUserIdFromEmail(userDetails.getUsername());
        AnnouncementDTO announcement = announcementService.updateAnnouncement(adminUserId, id, request);
        return ResponseEntity.ok(announcement);
    }

    /**
     * Delete announcement
     * Admin only
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete announcement", description = "Delete an announcement")
    public ResponseEntity<Map<String, String>> deleteAnnouncement(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        
        Long adminUserId = getUserIdFromEmail(userDetails.getUsername());
        announcementService.deleteAnnouncement(adminUserId, id);
        return ResponseEntity.ok(Map.of("message", "Announcement deleted successfully"));
    }

    // ==================== HELPER METHODS ====================

    /**
     * Get user ID from authenticated email
     */
    private Long getUserIdFromEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"))
                .getId();
    }
    

	/**
	 * ✅ Manually trigger assessment creation for a specific lesson topic
	 */
	@PostMapping("/create-for-lesson/{lessonTopicId}")
	@Operation(summary = "Create assessment for specific lesson", 
	           description = "Manually trigger assessment creation for a lesson that has AI questions")
	public ResponseEntity<Map<String, Object>> createAssessmentForLesson(
	        @PathVariable Long lessonTopicId) {
	    
	    log.info("🔧 Admin manually triggering assessment creation for lesson {}", lessonTopicId);
	    
	    try {
	        integrationService.triggerAssessmentCreationForLesson(lessonTopicId);
	        
	        return ResponseEntity.ok(Map.of(
	            "success", true,
	            "message", "Assessment creation triggered for lesson " + lessonTopicId,
	            "lessonTopicId", lessonTopicId
	        ));
	    } catch (Exception e) {
	        log.error("❌ Failed to create assessment for lesson {}: {}", lessonTopicId, e.getMessage());
	        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
	            .body(Map.of(
	                "success", false,
	                "error", e.getMessage(),
	                "lessonTopicId", lessonTopicId
	            ));
	    }
	}
	
	/**
	 * ✅ Create assessments for ALL topics that have questions but no assessment
	 */
	@PostMapping("/create-missing-assessments")
	@Operation(summary = "Bulk create missing assessments", 
	           description = "Create assessments for all lesson topics that have AI questions but no assessment")
	public ResponseEntity<Map<String, Object>> createAllMissingAssessments() {
	    
	    log.info("🔧 Admin triggering bulk assessment creation for all lessons");
	    
	    try {
	        Map<String, Object> result = integrationService.createMissingAssessmentsForAllLessons();
	        
	        return ResponseEntity.ok(result);
	    } catch (Exception e) {
	        log.error("❌ Bulk assessment creation failed: {}", e.getMessage());
	        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
	            .body(Map.of(
	                "success", false,
	                "error", e.getMessage()
	            ));
	    }
	}
    
}