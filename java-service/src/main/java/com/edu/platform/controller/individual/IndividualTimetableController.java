package com.edu.platform.controller.individual;

import com.edu.platform.dto.individual.*;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.individual.IndividualStudentTimetable;
import com.edu.platform.repository.DailyScheduleRepository;
import com.edu.platform.repository.UserRepository;
import com.edu.platform.repository.individual.IndividualTimetableRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import com.edu.platform.service.TeacherProfileService;
import com.edu.platform.service.individual.IndividualTimetableService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.springframework.http.HttpHeaders;
import org.springframework.beans.factory.annotation.Value;

@RestController
@RequestMapping("/individual/timetable")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Individual Timetable", description = "Timetable upload and management for INDIVIDUAL students")
public class IndividualTimetableController {
    
    private final IndividualTimetableService timetableService;
    private final TeacherProfileService teacherProfileService;
    private final UserRepository userRepository;
    private final IndividualTimetableRepository timetableRepository;
    private final DailyScheduleRepository scheduleRepository;
    private final StudentLessonProgressRepository progressRepository;
    
    
    @Value("${file.upload.base-path:/app}")
    private String uploadBasePath;
    
    // ============================================================
    // STUDENT & ADMIN: UPLOAD
    // ============================================================
    
    /**
     * ✅ MAIN UPLOAD ENDPOINT - Handles both file uploads and camera captures
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    @Operation(
        summary = "Upload timetable (file or camera)", 
        description = "Upload a timetable document (PDF/Excel/Image) for AI processing. " +
                      "Supports both traditional file uploads and camera captures. " +
                      "Include classId for accurate subject mapping."
    )
    public ResponseEntity<TimetableUploadResponse> uploadTimetable(
            @RequestParam("file") MultipartFile file,
            @RequestParam("studentProfileId") Long studentProfileId,
            @RequestParam(value = "classId", required = false) Long classId,
            @RequestParam(value = "uploadType", defaultValue = "file") String uploadType, // ✅ NEW
            @RequestParam(value = "termId", required = false) Long termId,
            @RequestParam(value = "academicYear", required = false) String academicYear) {
        
        try {
            log.info("📥 Timetable upload request: studentId={}, classId={}, uploadType={}", 
                     studentProfileId, classId, uploadType);
            
            // ✅ Validate upload type
            if (!uploadType.equals("file") && !uploadType.equals("camera")) {
                return ResponseEntity.badRequest()
                    .body(TimetableUploadResponse.builder()
                        .message("Invalid uploadType. Must be 'file' or 'camera'")
                        .build());
            }
            
            TimetableUploadRequest request = TimetableUploadRequest.builder()
                .studentProfileId(studentProfileId)
                .classId(classId)
                .termId(termId)
                .academicYear(academicYear)
                .uploadType(uploadType) // ✅ Include upload type
                .build();
            
            TimetableUploadResponse response = timetableService.uploadTimetable(file, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (IOException e) {
            log.error("Failed to upload timetable", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(TimetableUploadResponse.builder()
                    .message("Failed to upload file: " + e.getMessage())
                    .build());
        }
    }
    
    /**
     * ✅ CONVENIENCE ENDPOINT: Camera upload (automatically sets uploadType=camera)
     */
    @PostMapping(value = "/upload/camera", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    @Operation(
        summary = "Upload timetable from camera", 
        description = "Convenience endpoint for mobile camera uploads. " +
                      "Same as /upload but automatically sets uploadType=camera."
    )
    public ResponseEntity<TimetableUploadResponse> uploadTimetableFromCamera(
            @RequestParam("file") MultipartFile file,
            @RequestParam("studentProfileId") Long studentProfileId,
            @RequestParam(value = "classId", required = false) Long classId,
            @RequestParam(value = "termId", required = false) Long termId,
            @RequestParam(value = "academicYear", required = false) String academicYear) {
        
        log.info("📸 Camera upload request: studentId={}, classId={}", studentProfileId, classId);
        
        // Just call the main upload endpoint with uploadType="camera"
        return uploadTimetable(file, studentProfileId, classId, "camera", termId, academicYear);
    }
    
    // ============================================================
    // QUERY ENDPOINTS - NO CHANGES NEEDED
    // ============================================================
    
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Get timetable by ID")
    public ResponseEntity<IndividualTimetableDto> getTimetable(@PathVariable Long id) {
        IndividualTimetableDto timetable = timetableService.getTimetableById(id);
        return ResponseEntity.ok(timetable);
    }
    
    @GetMapping("/{id}/entries")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Get timetable entries")
    public ResponseEntity<List<TimetableEntryDto>> getTimetableEntries(@PathVariable Long id) {
        List<TimetableEntryDto> entries = timetableService.getTimetableEntries(id);
        return ResponseEntity.ok(entries);
    }
    
    @GetMapping("/student/{studentProfileId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Get all timetables for a student")
    public ResponseEntity<List<IndividualTimetableDto>> getStudentTimetables(
            @PathVariable Long studentProfileId) {
        List<IndividualTimetableDto> timetables = 
            timetableService.getTimetablesForStudent(studentProfileId);
        return ResponseEntity.ok(timetables);
    }
    
    @GetMapping("/student/{studentProfileId}/latest")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Get latest timetable for a student")
    public ResponseEntity<IndividualTimetableDto> getLatestTimetable(
            @PathVariable Long studentProfileId) {
        IndividualTimetableDto timetable = timetableService.getLatestTimetable(studentProfileId);
        if (timetable == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(timetable);
    }
    
    /**
     * Simple delete (Admin only - no validation checks)
     * Students should use /delete-with-cleanup endpoint
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")  // Changed from hasAnyRole to ADMIN only
    @Operation(summary = "Delete timetable (Admin only)")
    public ResponseEntity<Void> deleteTimetable(@PathVariable Long id) {
        timetableService.deleteTimetable(id);
        return ResponseEntity.noContent().build();
    }
    
    // ============================================================
    // ADMIN ENDPOINTS
    // ============================================================
    
    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get all timetables")
    public ResponseEntity<List<IndividualTimetableDto>> getAllTimetables() {
        List<IndividualTimetableDto> timetables = timetableService.getAllTimetables();
        return ResponseEntity.ok(timetables);
    }
    
    @GetMapping("/admin/filter")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Filter timetables by status")
    public ResponseEntity<List<IndividualTimetableDto>> getTimetablesByStatus(
            @RequestParam("status") String status) {
        List<IndividualTimetableDto> timetables = timetableService.getTimetablesByStatus(status);
        return ResponseEntity.ok(timetables);
    }
    
    @GetMapping("/admin/stats")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get system statistics")
    public ResponseEntity<TimetableSystemStatsDto> getSystemStats() {
        TimetableSystemStatsDto stats = timetableService.getSystemStats();
        return ResponseEntity.ok(stats);
    }
    
    @DeleteMapping("/admin/bulk")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Bulk delete timetables")
    public ResponseEntity<BulkOperationResultDto> bulkDelete(@RequestBody List<Long> timetableIds) {
        BulkOperationResultDto result = timetableService.bulkDelete(timetableIds);
        return ResponseEntity.ok(result);
    }
    
    @PostMapping("/admin/{id}/reprocess")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Reprocess timetable")
    public ResponseEntity<Void> reprocessTimetable(@PathVariable Long id) {
        timetableService.reprocessTimetable(id);
        return ResponseEntity.ok().build();
    }
    
    @PutMapping("/admin/{timetableId}/mapping")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update subject mapping")
    public ResponseEntity<Void> updateSubjectMapping(
            @PathVariable Long timetableId,
            @RequestParam("entryIndex") int entryIndex,
            @RequestParam("subjectId") Long subjectId) {
        
        timetableService.updateSubjectMapping(timetableId, entryIndex, subjectId);
        return ResponseEntity.ok().build();
    }
    
    // ============================================================
    // TEACHER ENDPOINTS
    // ============================================================
    
    @GetMapping("/teacher/my-students")
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Get my students' timetables")
    public ResponseEntity<List<IndividualTimetableDto>> getMyStudentsTimetables(
            Authentication authentication) {
        
        Long teacherProfileId = extractTeacherProfileId(authentication);
        List<IndividualTimetableDto> timetables = 
            timetableService.getTimetablesForTeacher(teacherProfileId);
        
        return ResponseEntity.ok(timetables);
    }
    
    @GetMapping("/teacher/student/{studentProfileId}")
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Get student timetable")
    public ResponseEntity<IndividualTimetableDto> getStudentTimetableForTeacher(
            @PathVariable Long studentProfileId,
            Authentication authentication) {
        
        Long teacherProfileId = extractTeacherProfileId(authentication);
        IndividualTimetableDto timetable = 
            timetableService.getStudentTimetableForTeacher(teacherProfileId, studentProfileId);
        
        if (timetable == null) {
            return ResponseEntity.notFound().build();
        }
        
        return ResponseEntity.ok(timetable);
    }
    
    // ============================================================
    // HELPER METHODS
    // ============================================================
    
    private Long extractTeacherProfileId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("User not authenticated");
        }
        
        User springUser = (User) authentication.getPrincipal();
        String email = springUser.getUsername();
        
        com.edu.platform.model.User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found: " + email));
        
        var teacherProfileDto = teacherProfileService.getTeacherProfileByUserId(user.getId());
        return teacherProfileDto.getId();
    }
    
    
	
	/**
	 * SPRINT 4: Check if student can upload a timetable
	 * Returns existing timetable info if upload is blocked
	 */
	@GetMapping("/check-eligibility/{studentProfileId}")
	@PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
	@Operation(
	    summary = "Check upload eligibility",
	    description = "Check if student can upload a timetable. " +
	                  "Returns existing timetable info and deletion impact if blocked."
	)
	public ResponseEntity<TimetableReplacementDto> checkUploadEligibility(
	        @PathVariable Long studentProfileId) {
	    
	    log.info("🔍 Checking upload eligibility for student {}", studentProfileId);
	    TimetableReplacementDto dto = timetableService.checkUploadEligibility(studentProfileId);
	    return ResponseEntity.ok(dto);
	}
	
	/**
	 * SPRINT 4: Delete timetable with schedule cleanup
	 * Enhanced version that cleans up schedules and progress
	 */
	@DeleteMapping("/delete-with-cleanup")
	@PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
	@Operation(
	    summary = "Delete timetable with cleanup",
	    description = "Delete timetable and associated schedules/progress. " +
	                  "Preserves completed assessments in history."
	)
	public ResponseEntity<TimetableDeleteResponse> deleteTimetableWithCleanup(
	        @RequestBody TimetableDeleteRequest request) {
	    
	    log.info("🗑️ Delete request for timetable {} from student {}", 
	        request.getTimetableId(), request.getStudentProfileId());
	    
	    TimetableDeleteResponse response = timetableService.deleteTimetableWithCleanup(request);
	    
	    if (response.getSuccess()) {
	        return ResponseEntity.ok(response);
	    } else {
	        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
	    }
	}
	
	/**
	 * SPRINT 4: Preview deletion impact
	 * Shows what will be deleted/preserved before actual deletion
	 */
	@GetMapping("/deletion-impact/{timetableId}")
	@PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
	@Operation(
	    summary = "Preview deletion impact",
	    description = "See what will be deleted/preserved before deleting timetable"
	)
	public ResponseEntity<TimetableReplacementDto.DeletionImpactInfo> previewDeletionImpact(
	        @PathVariable Long timetableId) {
	    
	    log.info("📊 Preview deletion impact for timetable {}", timetableId);
	    
	    IndividualStudentTimetable timetable = timetableRepository.findById(timetableId)
	        .orElseThrow(() -> new ResourceNotFoundException("Timetable not found"));
	    
	    StudentProfile student = timetable.getStudentProfile();
	    LocalDate today = LocalDate.now();
	    
	    int currentSchedules = scheduleRepository.countByIndividualTimetableIdAndScheduledDate(
	        timetableId, today
	    );
	    int futureSchedules = scheduleRepository.countByIndividualTimetableIdAndScheduledDateGreaterThanEqual(
	        timetableId, today
	    );
	    int completedAssessments = progressRepository.countCompletedProgressForStudent(
	        student, today.minusMonths(6), today
	    );
	    int pendingAssessments = progressRepository.countIncompleteProgressForStudent(
	        student, today, today.plusYears(1)
	    );
	    
	    TimetableReplacementDto.DeletionImpactInfo impact =
	        TimetableReplacementDto.DeletionImpactInfo.builder()
	            .currentSchedulesCount(currentSchedules)
	            .futureSchedulesCount(futureSchedules)
	            .completedAssessmentsCount(completedAssessments)
	            .pendingAssessmentsCount(pendingAssessments)
	            .willPreserveCompletedAssessments(true)
	            .warningMessage(String.format(
	                "Deleting will remove %d future schedules and %d pending assessments. " +
	                "%d completed assessments will be preserved.",
	                futureSchedules, pendingAssessments, completedAssessments
	            ))
	            .build();
	    
	    return ResponseEntity.ok(impact);
	}
	
	
	@GetMapping("/files/{filename:.+}")
	public ResponseEntity<Resource> serveTimetableFile(@PathVariable String filename) {
	    try {
	        Path filePath = Paths.get(uploadBasePath, "uploads/individual/timetables", filename);
	        
	        if (!Files.exists(filePath) || !Files.isReadable(filePath)) {
	            log.warn("File not found or not readable: {}", filename);
	            return ResponseEntity.notFound().build();
	        }
	        
	        Resource resource = new UrlResource(filePath.toUri());
	        String contentType = Files.probeContentType(filePath);
	        if (contentType == null) contentType = "application/pdf";
	        
	        return ResponseEntity.ok()
	                .contentType(MediaType.parseMediaType(contentType))
	                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
	                .body(resource);
	                
	    } catch (Exception e) {
	        log.error("Error serving file '{}': {}", filename, e.getMessage());
	        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
	    }
	}
}