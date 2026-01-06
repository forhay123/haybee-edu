package com.edu.platform.controller.individual;

import com.edu.platform.dto.classdata.SubjectDto;
import com.edu.platform.dto.individual.ManualTimetableCreationRequest;
import com.edu.platform.dto.individual.ManualTimetableCreationResponse;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.service.individual.ManualTimetableGeneratorService;
import com.edu.platform.service.SubjectService;
import com.edu.platform.service.StudentProfileService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * REST Controller for Manual Subject Selection
 * 
 * Endpoints:
 * - GET /available-subjects/{studentId} - Get subjects for student's class
 * - POST /create - Create virtual timetable from selected subjects
 */
@RestController
@RequestMapping("/individual/manual-selection")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Manual Subject Selection", description = "Create timetables by selecting subjects manually")
public class ManualSubjectSelectionController {
    
    private final SubjectService subjectService;
    private final StudentProfileService studentProfileService;
    private final ManualTimetableGeneratorService manualTimetableService;
    
    /**
     * Get available subjects for a student based on their class
     * 
     * Filters subjects by:
     * - Student's class
     * - Student's department
     * - Student type (INDIVIDUAL)
     * 
     * @param studentProfileId Student's profile ID
     * @return List of available subjects
     */
    @GetMapping("/student/{studentProfileId}/available-subjects")
    @PreAuthorize("hasAnyRole('ADMIN', 'STUDENT')")
    @Operation(
        summary = "Get available subjects for manual selection",
        description = "Returns subjects available for the student's class and department"
    )
    public ResponseEntity<List<SubjectDto>> getAvailableSubjects(
            @PathVariable Long studentProfileId) {
        
        log.info("📚 Fetching available subjects for student {}", studentProfileId);
        
        // Get student profile
        StudentProfile student = studentProfileService.getById(studentProfileId)
            .orElseThrow(() -> new RuntimeException("Student not found: " + studentProfileId));
        
        // Get subjects for this student's class/department/type
        List<Subject> subjects = subjectService.getSubjectsForStudent(
            student.getClassLevel() != null ? student.getClassLevel().getId() : null,
            student.getDepartment() != null ? student.getDepartment().getId() : null,
            student.getStudentType()
        ).stream()
            .map(responseDto -> {
                // Convert SubjectResponseDto back to Subject entity
                // We need the actual Subject entities for the toSubjectDto method
                return subjectService.getSubject(responseDto.getId())
                    .map(dto -> {
                        Subject subject = new Subject();
                        subject.setId(dto.getId());
                        subject.setName(dto.getName());
                        subject.setCode(dto.getCode());
                        subject.setLevel(dto.getLevel());
                        subject.setGrade(dto.getGrade());
                        subject.setCompulsory(dto.isCompulsory());
                        return subject;
                    })
                    .orElse(null);
            })
            .filter(java.util.Objects::nonNull)
            .collect(Collectors.toList());
        
        // Convert to DTOs
        List<SubjectDto> subjectDtos = subjects.stream()
            .map(this::toSubjectDto)
            .collect(Collectors.toList());
        
        log.info("✅ Found {} available subjects for student {}", subjectDtos.size(), studentProfileId);
        
        return ResponseEntity.ok(subjectDtos);
    }
    
    /**
     * Create virtual timetable from manually selected subjects
     * 
     * Flow:
     * 1. Validate 4-10 subjects selected
     * 2. Create virtual timetable record (upload_type='MANUAL')
     * 3. Build extracted_entries with balanced distribution
     * 4. Generate Week 1-12 schedules immediately
     * 
     * @param request Contains studentProfileId and selected subject IDs
     * @return Response with timetable ID and schedules created
     */
    @PostMapping("/create")
    @PreAuthorize("hasAnyRole('ADMIN', 'STUDENT')")
    @Operation(
        summary = "Create timetable from selected subjects",
        description = "Generates a virtual timetable and schedules from manually selected subjects"
    )
    public ResponseEntity<ManualTimetableCreationResponse> createManualTimetable(
            @Valid @RequestBody ManualTimetableCreationRequest request) {
        
        log.info("🎯 Creating manual timetable for student {} with {} subjects", 
                 request.getStudentProfileId(), request.getSubjectIds().size());
        
        ManualTimetableCreationResponse response = manualTimetableService
            .generateVirtualTimetable(request);
        
        log.info("✅ Manual timetable created: {} schedules generated", 
                 response.getSchedulesCreated());
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Helper: Convert Subject entity to DTO
     */
    private SubjectDto toSubjectDto(Subject subject) {
        return SubjectDto.builder()
            .id(subject.getId())
            .name(subject.getName())
            .code(subject.getCode())
            .level(subject.getLevel())
            .grade(subject.getGrade())
            .compulsory(subject.isCompulsory())
            .classId(subject.getClassEntity() != null ? subject.getClassEntity().getId() : null)
            .departmentId(subject.getDepartment() != null ? subject.getDepartment().getId() : null)
            .build();
    }
}