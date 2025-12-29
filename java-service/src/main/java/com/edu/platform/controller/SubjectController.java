package com.edu.platform.controller;

import com.edu.platform.dto.classdata.LessonTopicDto;
import com.edu.platform.dto.classdata.SubjectDto;
import com.edu.platform.dto.classdata.SubjectResponseDto;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.service.LessonTopicService;
import com.edu.platform.service.SubjectService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/subjects")
@RequiredArgsConstructor
@Slf4j
public class SubjectController {

    private final SubjectService subjectService;
    private final LessonTopicService lessonTopicService;

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<SubjectResponseDto> createSubject(@RequestBody SubjectDto subjectDto) {
        log.info("POST /subjects Creating subject: {}", subjectDto);
        SubjectResponseDto response = subjectService.createSubject(subjectDto);
        log.info("Created subject with ID {}", response.getId());
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public ResponseEntity<List<SubjectResponseDto>> getAllSubjects() {
        log.info("GET /subjects Fetching all subjects");
        List<SubjectResponseDto> subjects = subjectService.getAllSubjects();
        log.info("Returned {} subjects", subjects.size());
        return ResponseEntity.ok(subjects);
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}")
    public ResponseEntity<SubjectResponseDto> getSubject(@PathVariable Long id) {
        log.info("GET /subjects/{} Fetching subject", id);
        return subjectService.getSubject(id)
                .map(subject -> {
                    log.info("Found subject: {}", subject);
                    return ResponseEntity.ok(subject);
                })
                .orElseGet(() -> {
                    log.warn("Subject {} not found", id);
                    return ResponseEntity.notFound().build();
                });
    }

    // ✅ NEW: Get lesson topics for a specific subject
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{subjectId}/lesson-topics")
    public ResponseEntity<List<LessonTopicDto>> getLessonTopicsBySubject(
            @PathVariable Long subjectId) {
        log.info("GET /subjects/{}/lesson-topics Fetching lesson topics", subjectId);
        
        // Get lessons for this subject (accessible to all authenticated users)
        List<LessonTopicDto> lessons = lessonTopicService.getLessonsBySubjectIdPublic(subjectId);
        
        log.info("Returned {} lesson topics for subject {}", lessons.size(), subjectId);
        return ResponseEntity.ok(lessons);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<SubjectResponseDto> updateSubject(@PathVariable Long id, @RequestBody SubjectDto subjectDto) {
        log.info("PUT /subjects/{} Updating subject with {}", id, subjectDto);
        SubjectResponseDto response = subjectService.updateSubject(id, subjectDto);
        log.info("Updated subject {}", id);
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSubject(@PathVariable Long id) {
        log.info("DELETE /subjects/{} Deleting subject", id);
        subjectService.deleteSubject(id);
        log.info("Deleted subject {}", id);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping("/class/{classId}")
    public ResponseEntity<List<SubjectResponseDto>> getSubjectsByClass(@PathVariable Long classId) {
        log.info("GET /subjects/class/{} Fetching subjects by class", classId);
        List<SubjectResponseDto> subjects = subjectService.getSubjectsByClass(classId);
        log.info("Class {} returned {} subjects", classId, subjects.size());
        return ResponseEntity.ok(subjects);
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/students")
    public ResponseEntity<List<SubjectResponseDto>> getSubjectsForStudent(
            @RequestParam Long classId,
            @RequestParam(required = false) Long departmentId,
            @RequestParam String studentType
    ) {
        log.info("GET /subjects/students classId={}, deptId={}, type={}", classId, departmentId, studentType);

        if ("REGULAR".equalsIgnoreCase(studentType)) {
            studentType = "SCHOOL";
        }

        StudentType type;
        try {
            type = StudentType.valueOf(studentType.toUpperCase());
        } catch (IllegalArgumentException e) {
            log.error("Invalid studentType {}", studentType);
            return ResponseEntity.badRequest().build();
        }

        List<SubjectResponseDto> subjects = subjectService.getSubjectsForStudent(classId, departmentId, type);
        log.info("Returned {} subjects for student request", subjects.size());
        return ResponseEntity.ok(subjects);
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/aspirant/available")
    public ResponseEntity<List<SubjectResponseDto>> getAspirantAvailableSubjects(
            @RequestParam(required = false) Long departmentId
    ) {
        log.info("GET /subjects/aspirant/available deptId={}", departmentId);
        List<SubjectResponseDto> subjects = subjectService.getAspirantAvailableSubjects(departmentId);
        log.info("Returned {} aspirant-available subjects", subjects.size());
        return ResponseEntity.ok(subjects);
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/enrolled")
    public ResponseEntity<List<SubjectResponseDto>> getEnrolledSubjects(Authentication authentication) {
        String email = authentication.getName();
        log.info("GET /subjects/enrolled for {}", email);
        List<SubjectResponseDto> subjects = subjectService.getEnrolledSubjects(email);
        log.info("User {} enrolled in {} subjects", email, subjects.size());
        return ResponseEntity.ok(subjects);
    }

    @PreAuthorize("isAuthenticated()")
    @PostMapping("/enroll")
    public ResponseEntity<String> enrollInSubjects(
            @RequestBody List<Long> subjectIds,
            Authentication authentication
    ) {
        String email = authentication.getName();
        log.info("POST /subjects/enroll {} enrolling in {}", email, subjectIds);

        subjectService.enrollInSubjects(email, subjectIds);

        log.info("User {} successfully enrolled in subjects {}", email, subjectIds);
        return ResponseEntity.ok("Successfully enrolled in subjects");
    }


	@PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
	@GetMapping("/teacher/my-subjects")
	public ResponseEntity<List<SubjectResponseDto>> getMyTeacherSubjects(Authentication authentication) {
	    String email = authentication.getName();
	    log.info("GET /subjects/teacher/my-subjects for {}", email);
	    List<SubjectResponseDto> subjects = subjectService.getTeacherSubjects(email);
	    log.info("Teacher {} has {} assigned subjects", email, subjects.size());
	    return ResponseEntity.ok(subjects);
	}
}