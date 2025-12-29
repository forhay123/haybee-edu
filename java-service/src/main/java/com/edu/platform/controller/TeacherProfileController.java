package com.edu.platform.controller;

import com.edu.platform.dto.user.TeacherProfileDto;
import com.edu.platform.service.TeacherProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/teachers")
@RequiredArgsConstructor
public class TeacherProfileController {

    private final TeacherProfileService teacherService;

    /**
     * ✅ Get teacher profile by user ID
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping("/user/{userId}")
    public ResponseEntity<TeacherProfileDto> getTeacherProfileByUserId(@PathVariable Long userId) {
        TeacherProfileDto dto = teacherService.getTeacherProfileByUserId(userId);
        return ResponseEntity.ok(dto);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping
    public ResponseEntity<List<TeacherProfileDto>> getAllTeachers() {
        return ResponseEntity.ok(teacherService.getAllTeachers());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<TeacherProfileDto> createTeacher(@RequestBody TeacherProfileDto dto) {
        return ResponseEntity.ok(teacherService.createAndReturnDto(dto));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<TeacherProfileDto> updateTeacher(
            @PathVariable Long id,
            @RequestBody TeacherProfileDto dto) {
        return ResponseEntity.ok(teacherService.updateAndReturnDto(id, dto));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeacher(@PathVariable Long id) {
        teacherService.deleteTeacherProfile(id);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{id}/assign-classes")
    public ResponseEntity<Void> assignClasses(
            @PathVariable Long id,
            @RequestBody List<Long> classIds) {
        teacherService.assignTeacherToClasses(id, classIds);
        return ResponseEntity.ok().build();
    }
}