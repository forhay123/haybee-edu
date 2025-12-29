package com.edu.platform.controller.individual;

import com.edu.platform.dto.individual.*;
import com.edu.platform.service.individual.IndividualSchemeService;
import com.edu.platform.service.individual.IndividualTimetableService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;


// ============================================================
// FILE 2: IndividualSchemeController.java
// ============================================================
@RestController
@RequestMapping("/individual/scheme")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Individual Scheme", description = "Scheme of work upload and management for INDIVIDUAL students")
public class IndividualSchemeController {
    
    private final IndividualSchemeService schemeService;
    
    /**
     * Upload a scheme of work document
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    @Operation(summary = "Upload scheme of work", description = "Upload a scheme of work document for a specific subject")
    public ResponseEntity<SchemeUploadResponse> uploadScheme(
            @RequestParam("file") MultipartFile file,
            @RequestParam("studentProfileId") Long studentProfileId,
            @RequestParam("subjectId") Long subjectId,
            @RequestParam(value = "termId", required = false) Long termId,
            @RequestParam(value = "academicYear", required = false) String academicYear) {
        
        try {
            SchemeUploadRequest request = SchemeUploadRequest.builder()
                .studentProfileId(studentProfileId)
                .subjectId(subjectId)
                .termId(termId)
                .academicYear(academicYear)
                .build();
            
            SchemeUploadResponse response = schemeService.uploadScheme(file, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (IOException e) {
            log.error("Failed to upload scheme", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(SchemeUploadResponse.builder()
                    .message("Failed to upload file: " + e.getMessage())
                    .build());
        }
    }
    
    /**
     * Get scheme by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Get scheme by ID")
    public ResponseEntity<IndividualSchemeDto> getScheme(@PathVariable Long id) {
        IndividualSchemeDto scheme = schemeService.getSchemeById(id);
        return ResponseEntity.ok(scheme);
    }
    
    /**
     * Get all schemes for a student
     */
    @GetMapping("/student/{studentProfileId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Get all schemes for a student")
    public ResponseEntity<List<IndividualSchemeDto>> getStudentSchemes(
            @PathVariable Long studentProfileId) {
        List<IndividualSchemeDto> schemes = 
            schemeService.getSchemesForStudent(studentProfileId);
        return ResponseEntity.ok(schemes);
    }
    
    /**
     * Get schemes for a student and subject
     */
    @GetMapping("/student/{studentProfileId}/subject/{subjectId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Get schemes for a student and subject")
    public ResponseEntity<List<IndividualSchemeDto>> getStudentSubjectSchemes(
            @PathVariable Long studentProfileId,
            @PathVariable Long subjectId) {
        List<IndividualSchemeDto> schemes = 
            schemeService.getSchemesForStudentAndSubject(studentProfileId, subjectId);
        return ResponseEntity.ok(schemes);
    }
    
    /**
     * Get latest scheme for a student and subject
     */
    @GetMapping("/student/{studentProfileId}/subject/{subjectId}/latest")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Get latest scheme for a student and subject")
    public ResponseEntity<IndividualSchemeDto> getLatestScheme(
            @PathVariable Long studentProfileId,
            @PathVariable Long subjectId) {
        IndividualSchemeDto scheme = schemeService.getLatestScheme(studentProfileId, subjectId);
        if (scheme == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(scheme);
    }
    
    /**
     * Delete a scheme
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    @Operation(summary = "Delete scheme")
    public ResponseEntity<Void> deleteScheme(@PathVariable Long id) {
        schemeService.deleteScheme(id);
        return ResponseEntity.noContent().build();
    }
}