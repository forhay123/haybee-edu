package com.edu.platform.controller;

import com.edu.platform.dto.classdata.ClassDto;
import com.edu.platform.dto.classdata.SubjectResponseDto;
import com.edu.platform.model.ClassEntity;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.service.ClassService;
import com.edu.platform.service.SubjectService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * REST controller for managing classes safely.
 */
@RestController
@RequestMapping("/classes")
@RequiredArgsConstructor
@Slf4j
public class ClassController {

    private final ClassService classService;
    private final SubjectService subjectService;

    /** Get all classes */
    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public ResponseEntity<List<ClassDto>> getAll() {
        List<ClassDto> dtos = classService.getAllClasses()
                .stream()
                .map(this::toDtoWithDisplayName)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    /**
     * ✅ NEW: Get teacher's assigned classes
     */
    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/teacher/my-classes")
    public ResponseEntity<List<ClassDto>> getMyTeacherClasses(Authentication authentication) {
        String email = authentication.getName();
        log.info("GET /classes/teacher/my-classes for {}", email);
        
        List<ClassEntity> classes = classService.getTeacherClasses(email);
        
        List<ClassDto> dtos = classes.stream()
                .map(this::toDtoWithDisplayName)
                .collect(Collectors.toList());
        
        log.info("Teacher {} has {} assigned classes", email, dtos.size());
        return ResponseEntity.ok(dtos);
    }

    /**
     * Get classes by student type
     */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/type/{studentType}")
    public ResponseEntity<List<ClassDto>> getByStudentType(@PathVariable String studentType) {
        StudentType type = StudentType.valueOf(studentType.toUpperCase());

        List<ClassDto> dtos = classService.getClassesByStudentType(type)
                .stream()
                .map(this::toDtoWithDisplayName)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    /** Create a class */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<?> create(@RequestBody ClassEntity classEntity) {
        try {
            ClassEntity saved = classService.createClass(classEntity);
            return ResponseEntity.ok(toDtoWithDisplayName(saved));
        } catch (Exception ex) {
            return ResponseEntity.status(500).body(Map.of(
                    "code", "INTERNAL_ERROR",
                    "message", ex.getMessage()
            ));
        }
    }

    /** Update a class */
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody ClassEntity updated) {
        try {
            ClassEntity saved = classService.updateClass(id, updated);
            return ResponseEntity.ok(toDtoWithDisplayName(saved));
        } catch (RuntimeException ex) {
            return ResponseEntity.status(404).body(Map.of(
                    "code", "NOT_FOUND",
                    "message", ex.getMessage()
            ));
        } catch (Exception ex) {
            return ResponseEntity.status(500).body(Map.of(
                    "code", "INTERNAL_ERROR",
                    "message", ex.getMessage()
            ));
        }
    }

    /** Delete a class */
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            classService.deleteClass(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(409).body(Map.of(
                    "code", "CONFLICT",
                    "message", ex.getMessage()
            ));
        } catch (RuntimeException ex) {
            return ResponseEntity.status(404).body(Map.of(
                    "code", "NOT_FOUND",
                    "message", ex.getMessage()
            ));
        } catch (Exception ex) {
            return ResponseEntity.status(500).body(Map.of(
                    "code", "INTERNAL_ERROR",
                    "message", ex.getMessage()
            ));
        }
    }
    
    
 // Add to ClassController

    /**
     * ✅ NEW: Get all subjects assigned to a specific class
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping("/{classId}/subjects")
    public ResponseEntity<List<SubjectResponseDto>> getClassSubjects(@PathVariable Long classId) {
        log.info("GET /classes/{}/subjects Fetching subjects for class", classId);
        List<SubjectResponseDto> subjects = subjectService.getSubjectsByClass(classId);
        log.info("Class {} has {} subjects", classId, subjects.size());
        return ResponseEntity.ok(subjects);
    }

    /**
     * Helper: convert ClassEntity → ClassDto with appended student type (HOME, ASPIRANT)
     */
    private ClassDto toDtoWithDisplayName(ClassEntity entity) {
        String displayName = entity.getName();

        // ✅ Append type for HOME and ASPIRANT to make it clearer in the UI
        if (entity.getStudentType() == StudentType.HOME || entity.getStudentType() == StudentType.ASPIRANT) {
            displayName = displayName + " " + entity.getStudentType().name();
        }

        return ClassDto.builder()
                .id(entity.getId())
                .name(displayName)
                .level(entity.getLevel())
                .departmentName(entity.getDepartment() != null ? entity.getDepartment().getName() : null)
                .departmentId(entity.getDepartment() != null ? entity.getDepartment().getId() : null)
                .studentType(entity.getStudentType() != null ? entity.getStudentType().name() : null)
                .build();
    }
}