package com.edu.platform.controller;

import com.edu.platform.dto.user.StudentProfileDto;
import com.edu.platform.dto.user.UserDto;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.User;
import com.edu.platform.service.RoleService;
import com.edu.platform.service.StudentService;
import com.edu.platform.service.TeacherProfileService;
import com.edu.platform.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final RoleService roleService;
    private final StudentService studentService;
    private final TeacherProfileService teacherProfileService;

    // ==================== GENERAL USER ENDPOINTS ====================

    /**
     * ✅ Fetch details of the currently authenticated user
     */
    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser(@AuthenticationPrincipal UserDetails principal) {
        User user = userService.findByEmail(principal.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(userService.toDto(user));
    }

    /**
     * 🆕 Get all users available for chat (accessible to all authenticated users)
     * This endpoint returns basic user info for creating direct messages
     */
    @GetMapping("/chat-users")
    public ResponseEntity<List<UserDto>> getChatUsers(Authentication authentication) {
        String currentUserEmail = authentication.getName();
        
        // Get current user
        User currentUser = userService.findByEmail(currentUserEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        // Get all users except the current user
        List<UserDto> users = userService.getAllUserDtos().stream()
                .filter(dto -> !dto.getId().equals(currentUser.getId()))
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(users);
    }

    /**
     * ✅ Admin-only: List all users in the system
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<List<UserDto>> listUsers() {
        return ResponseEntity.ok(userService.getAllUserDtos());
    }

    /**
     * ✅ Admin-only: Assign a role to a specific user
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/roles")
    public ResponseEntity<Void> assignRole(@PathVariable Long id, @RequestParam String role) {
        roleService.assignRoleToUser(id, role);
        return ResponseEntity.ok().build();
    }

    /**
     * ✅ Admin-only: View all roles currently assigned to a specific user
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{id}/roles")
    public ResponseEntity<Set<String>> getUserRoles(@PathVariable Long id) {
        User user = userService.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Set<String> roles = user.getRoles() != null
                ? user.getRoles().stream().map(r -> r.getName()).collect(Collectors.toSet())
                : Set.of();

        return ResponseEntity.ok(roles);
    }

    // ==================== TEACHER ENDPOINTS ====================

    /**
     * ✅ Get all students across all classes assigned to the authenticated teacher
     */
    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/teacher/students")
    public ResponseEntity<List<StudentProfileDto>> getStudentsForTeacher(Authentication authentication) {
        String email = authentication.getName();

        // Get teacher's class IDs from their subjects
        List<Long> teacherClassIds = teacherProfileService.getTeacherClassIds(email);

        if (teacherClassIds.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        // Get students in those classes
        List<StudentProfile> students = studentService.getStudentsForTeacher(teacherClassIds);

        // Map to DTOs
        List<StudentProfileDto> dtos = students.stream()
                .map(this::toStudentDto)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    /**
     * ✅ Get students in a specific class for the authenticated teacher
     */
    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/teacher/classes/{classId}/students")
    public ResponseEntity<List<StudentProfileDto>> getStudentsByClassForTeacher(
            Authentication authentication,
            @PathVariable Long classId) {
        String email = authentication.getName();

        // Verify teacher has this class assigned
        List<Long> teacherClassIds = teacherProfileService.getTeacherClassIds(email);
        
        if (!teacherClassIds.contains(classId)) {
            return ResponseEntity.status(403).build(); // Forbidden
        }

        // Get students by classId
        List<StudentProfile> students = studentService.getStudentsByClassId(classId);

        List<StudentProfileDto> dtos = students.stream()
                .map(this::toStudentDto)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    // ==================== MAPPERS ====================

    private StudentProfileDto toStudentDto(StudentProfile student) {
        return StudentProfileDto.builder()
                .id(student.getId())
                .userId(student.getUser().getId())
                .fullName(student.getUser().getFullName())
                .email(student.getUser().getEmail())
                .studentType(student.getStudentType())
                .classId(student.getClassLevel() != null ? student.getClassLevel().getId() : null)
                .className(student.getClassLevel() != null ? student.getClassLevel().getName() : null)
                .departmentId(student.getDepartment() != null ? student.getDepartment().getId() : null)
                .departmentName(student.getDepartment() != null ? student.getDepartment().getName() : null)
                .subjectIds(student.getSubjects() != null 
                        ? student.getSubjects().stream().map(s -> s.getId()).collect(Collectors.toSet())
                        : Set.of())
                .subjectNames(student.getSubjects() != null
                        ? student.getSubjects().stream().map(s -> s.getName()).collect(Collectors.toSet())
                        : Set.of())
                .chosenLanguage(student.getChosenLanguage())
                .build();
    }
    
    
 // Add this to UserController.java

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getUserStats() {
        List<User> allUsers = userService.getAllUsers();
        
        long totalTeachers = allUsers.stream()
                .filter(u -> u.getRoles().stream()
                        .anyMatch(r -> "TEACHER".equalsIgnoreCase(r.getName())))
                .count();
        
        long totalStudents = allUsers.stream()
                .filter(u -> u.getRoles().stream()
                        .anyMatch(r -> "STUDENT".equalsIgnoreCase(r.getName())))
                .count();
        
        long totalAdmins = allUsers.stream()
                .filter(u -> u.getRoles().stream()
                        .anyMatch(r -> "ADMIN".equalsIgnoreCase(r.getName())))
                .count();
        
        Map<String, Object> stats = Map.of(
            "totalUsers", allUsers.size(),
            "totalTeachers", totalTeachers,
            "totalStudents", totalStudents,
            "totalAdmins", totalAdmins
        );
        
        return ResponseEntity.ok(stats);
    }
}