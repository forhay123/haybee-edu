package com.edu.platform.controller;

import com.edu.platform.dto.user.StudentProfileDto;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.User;
import com.edu.platform.repository.UserRepository;
import com.edu.platform.service.StudentProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/student-profiles")
@RequiredArgsConstructor
public class StudentProfileController {

    private final StudentProfileService studentProfileService;
    private final UserRepository userRepository;

    /** ✅ ADMIN: Create student profile */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<StudentProfileDto> create(@RequestBody StudentProfileDto dto) {

        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID " + dto.getUserId()));

        StudentProfile profile = studentProfileService.fromDto(dto, user);
        StudentProfile saved = studentProfileService.saveStudentProfile(profile);

        return ResponseEntity
                .created(URI.create("/student-profiles/" + saved.getId()))
                .body(studentProfileService.toDto(saved));
    }

    /** ✅ ADMIN: Update student profile */
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<StudentProfileDto> update(@PathVariable Long id,
                                                    @RequestBody StudentProfileDto dto) {

        StudentProfile profile = studentProfileService.getById(id)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found with ID " + id));

        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID " + dto.getUserId()));

        profile.setUser(user);
        profile.setStudentType(dto.getStudentType());
        profile.setChosenLanguage(dto.getChosenLanguage());

        // ✅ Use service methods (fixes previous errors)
        profile.setClassLevel(dto.getClassId() != null
                ? studentProfileService.getClassById(dto.getClassId()).orElse(null)
                : null
        );

        profile.setDepartment(dto.getDepartmentId() != null
                ? studentProfileService.getDepartmentById(dto.getDepartmentId()).orElse(null)
                : null
        );

        StudentProfile updated = studentProfileService.saveStudentProfile(profile);
        return ResponseEntity.ok(studentProfileService.toDto(updated));
    }

    /** ✅ ADMIN sees all | Others see ONLY their own profile */
    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public ResponseEntity<List<StudentProfileDto>> getAll(Authentication auth) {

        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (isAdmin) {
            return ResponseEntity.ok(
                    studentProfileService.getAllProfiles()
                            .stream().map(studentProfileService::toDto).toList()
            );
        }

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return studentProfileService.getStudentProfile(user.getId())
                .map(profile -> ResponseEntity.ok(List.of(studentProfileService.toDto(profile))))
                .orElse(ResponseEntity.ok(List.of()));
    }

    /** ✅ ADMIN: any user profile | USER: only own profile */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/user/{userId}")
    public ResponseEntity<StudentProfileDto> getByUserId(@PathVariable Long userId, Authentication auth) {

        User current = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!isAdmin && !current.getId().equals(userId)) {
            return ResponseEntity.status(403).build();
        }

        return studentProfileService.getStudentProfile(userId)
                .map(studentProfileService::toDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** ✅ Logged-in user profile shortcut */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/me")
    public ResponseEntity<StudentProfileDto> getMyProfile(Authentication auth) {

        User current = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return studentProfileService.getStudentProfile(current.getId())
                .map(studentProfileService::toDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** ✅ ADMIN: Delete student profile */
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {

        if (studentProfileService.getById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        studentProfileService.deleteStudentProfile(id);
        return ResponseEntity.noContent().build();
    }
}
