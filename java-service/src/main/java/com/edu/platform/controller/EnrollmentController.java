package com.edu.platform.controller;

import com.edu.platform.dto.classdata.EnrollmentDto;
import com.edu.platform.model.ClassEntity;
import com.edu.platform.model.Enrollment;
import com.edu.platform.model.SchoolSession;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.service.ClassService;
import com.edu.platform.service.EnrollmentService;
import com.edu.platform.service.SchoolSessionService;
import com.edu.platform.service.StudentProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/enrollments")
@RequiredArgsConstructor
public class EnrollmentController {

    private final EnrollmentService enrollmentService;
    private final StudentProfileService studentProfileService;
    private final ClassService classService;
    private final SchoolSessionService schoolSessionService;

    // -----------------------------
    // Admin-only endpoints
    // -----------------------------

    /** Get all enrollments */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<List<EnrollmentDto>> getAll() {
        try {
            List<EnrollmentDto> dtos = enrollmentService.getAllEnrollments()
                    .stream()
                    .map(this::toDto)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            log.error("Error fetching all enrollments", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error fetching enrollments");
        }
    }

    /** Get enrollments by student */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/student/{studentId}")
    public ResponseEntity<List<EnrollmentDto>> getByStudent(@PathVariable Long studentId) {
        List<EnrollmentDto> dtos = enrollmentService.getEnrollmentsByStudent(studentId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    /** Create a new enrollment */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<EnrollmentDto> create(@RequestBody EnrollmentDto dto) {
        StudentProfile studentProfile = studentProfileService.getById(dto.getStudentProfileId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student profile not found"));

        ClassEntity classEntity = classService.getClassById(dto.getClassEntityId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class not found"));

        SchoolSession session = schoolSessionService.getById(dto.getSessionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));

        Enrollment enrollment = Enrollment.builder()
                .studentProfile(studentProfile)
                .classEntity(classEntity)
                .session(session)
                .enrolledOn(LocalDate.now())
                .active(dto.isActive())
                .build();

        Enrollment saved = enrollmentService.createEnrollment(enrollment);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(saved));
    }

    /** Deactivate an enrollment (soft delete) */
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/deactivate")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        enrollmentService.deactivateEnrollment(id);
        return ResponseEntity.noContent().build();
    }

    /** Delete an enrollment permanently */
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        enrollmentService.deleteEnrollment(id);
        return ResponseEntity.noContent().build();
    }

    // -----------------------------
    // Student endpoints
    // -----------------------------
    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/student/me")
    public ResponseEntity<List<EnrollmentDto>> getMyEnrollments(@AuthenticationPrincipal UserDetails principal) {
        log.info("Fetching enrollments for user: {}", principal.getUsername());
        
        StudentProfile profile = studentProfileService.getByEmail(principal.getUsername())
                .orElseThrow(() -> {
                    log.error("Student profile not found for email: {}", principal.getUsername());
                    return new ResponseStatusException(HttpStatus.NOT_FOUND, 
                        "Student profile not found. Please contact your administrator.");
                });

        List<EnrollmentDto> dtos = enrollmentService.getEnrollmentsByStudent(profile.getId())
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    // -----------------------------
    // Mapper with null safety
    // -----------------------------
    private EnrollmentDto toDto(Enrollment e) {
        try {
            return EnrollmentDto.builder()
                    .id(e.getId())
                    .studentProfileId(e.getStudentProfile().getId())
                    .studentName(e.getStudentProfile().getUser() != null 
                        ? e.getStudentProfile().getUser().getFullName() 
                        : "Unknown")
                    .studentType(e.getStudentProfile().getStudentType() != null 
                        ? e.getStudentProfile().getStudentType().name() 
                        : "SCHOOL")
                    .classEntityId(e.getClassEntity().getId())
                    .className(e.getClassEntity().getName())
                    .sessionId(e.getSession().getId())
                    .sessionName(e.getSession().getName())
                    .active(e.isActive())
                    .enrolledOn(e.getEnrolledOn() != null ? e.getEnrolledOn().toString() : null)
                    .build();
        } catch (Exception ex) {
            log.error("Error mapping enrollment to DTO", ex);
            throw new RuntimeException("Error processing enrollment data", ex);
        }
    }
}