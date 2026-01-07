package com.edu.platform.service;

import com.edu.platform.dto.user.UserDto;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.model.User;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.repository.UserRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;
    private final SafeDeletionService safeDeletionService;
    
    @PersistenceContext
    private EntityManager entityManager;

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public List<UserDto> getAllUserDtos() {
        return userRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public StudentType getStudentTypeByEmail(String email) {
        return findByEmail(email)
            .map(User::getStudentType)
            .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
    }

    public UserDto toDto(User user) {
        Set<String> roles = user.getRoles().stream()
                .map(role -> role.getName())
                .collect(Collectors.toSet());

        return UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .enabled(user.isEnabled())
                .roles(roles)
                .userType(user.getUserType())                      // ✅ ADD THIS
                .studentType(user.getStudentType())                // ✅ ADD THIS
                .preferredClass(user.getPreferredClass())          // ✅ ADD THIS
                .preferredDepartment(user.getPreferredDepartment()) // ✅ ADD THIS
                .build();
    }

    /**
     * ✅ FIXED: Delete user with correct foreign key dependency order
     * Tables must be deleted in reverse dependency order (children before parents)
     */
    @Transactional
    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        log.info("🗑️ Starting cascade deletion for user {} ({})", userId, user.getEmail());

        Long studentProfileId = getStudentProfileId(userId);
        Long teacherProfileId = getTeacherProfileId(userId);

        int totalDeleted = 0;

        // ============================================================
        // STUDENT-RELATED CLEANUP - Delete in correct order
        // ============================================================
        if (studentProfileId != null) {
            log.info("📚 User is a STUDENT - cleaning up student-related data...");
            
            // STEP 1: Delete leaf tables (no dependencies on them)
            totalDeleted += safeDeletionService.deleteInNewTransaction("video_watch_history", "student_id", studentProfileId);
            totalDeleted += safeDeletionService.deleteInNewTransaction("session_attendance", "student_id", studentProfileId);
            totalDeleted += safeDeletionService.deleteInNewTransaction("daily_progress_summary", "student_profile_id", studentProfileId);
            
            // STEP 2: Delete archived tables
            totalDeleted += safeDeletionService.deleteInNewTransaction("archived_daily_schedules", "student_id", studentProfileId);
            totalDeleted += safeDeletionService.deleteInNewTransaction("archived_student_lesson_progress", "student_id", studentProfileId);
            
            // STEP 3: Delete timetable/schedule related tables
            totalDeleted += safeDeletionService.deleteInNewTransaction("daily_schedules", "student_id", studentProfileId);
            totalDeleted += safeDeletionService.deleteInNewTransaction("individual_lesson_topics", "student_profile_id", studentProfileId);
            totalDeleted += safeDeletionService.deleteInNewTransaction("individual_student_schemes", "student_profile_id", studentProfileId);
            totalDeleted += safeDeletionService.deleteInNewTransaction("individual_student_timetables", "student_profile_id", studentProfileId);
            
            // STEP 4: Delete student_lesson_progress BEFORE assessment_submissions
            // (student_lesson_progress references assessment_submissions)
            totalDeleted += safeDeletionService.deleteInNewTransaction("student_lesson_progress", "student_profile_id", studentProfileId);
            
            // STEP 5: Now safe to delete assessment_submissions
            totalDeleted += safeDeletionService.deleteInNewTransaction("assessment_submissions", "student_id", studentProfileId);
            
            // STEP 6: Delete assessments
            totalDeleted += safeDeletionService.deleteInNewTransaction("assessments", "target_student_profile_id", studentProfileId);
            
            // STEP 7: Delete enrollment-related tables
            totalDeleted += safeDeletionService.deleteInNewTransaction("enrollments", "student_profile_id", studentProfileId);
            totalDeleted += safeDeletionService.deleteInNewTransaction("student_subjects", "student_profile_id", studentProfileId);
            
            // STEP 8: Finally, delete student profile
            totalDeleted += safeDeletionService.deleteInNewTransaction("student_profiles", "id", studentProfileId);
            log.info("  ✅ Deleted student profile");
        }

        // ============================================================
        // TEACHER-RELATED CLEANUP
        // ============================================================
        if (teacherProfileId != null) {
            log.info("👨‍🏫 User is a TEACHER - cleaning up teacher-related data...");

            totalDeleted += safeDeletionService.deleteInNewTransaction("teacher_subjects", "teacher_profile_id", teacherProfileId);
            totalDeleted += safeDeletionService.deleteInNewTransaction("teacher_classes", "teacher_id", teacherProfileId);
            totalDeleted += safeDeletionService.deleteInNewTransaction("teacher_question_bank", "teacher_id", teacherProfileId);
            totalDeleted += safeDeletionService.deleteInNewTransaction("teacher_youtube_tokens", "teacher_id", teacherProfileId);
            totalDeleted += safeDeletionService.deleteInNewTransaction("live_sessions", "teacher_id", teacherProfileId);

            // Finally, delete teacher profile
            totalDeleted += safeDeletionService.deleteInNewTransaction("teacher_profiles", "id", teacherProfileId);
            log.info("  ✅ Deleted teacher profile");
        }

        // ============================================================
        // COMMON USER DATA CLEANUP
        // ============================================================
        log.info("🔧 Cleaning up common user data...");

        totalDeleted += safeDeletionService.deleteInNewTransaction("chat_messages", "sender_id", userId, "core");
        totalDeleted += safeDeletionService.deleteInNewTransaction("notifications", "user_id", userId, "core");
        totalDeleted += safeDeletionService.deleteInNewTransaction("announcement_target_users", "user_id", userId, "core");
        totalDeleted += safeDeletionService.deleteInNewTransaction("user_roles", "user_id", userId, "core");

        // ============================================================
        // FINALLY DELETE THE USER
        // ============================================================
        
        // CRITICAL: Flush and clear Hibernate session before deleting User entity
        entityManager.flush();
        entityManager.clear();
        
        // Fetch fresh copy and delete
        User freshUser = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found after cleanup: " + userId));
        
        userRepository.delete(freshUser);
        entityManager.flush();
        
        log.info("✅ User {} deleted successfully", userId);
        log.info("📊 Total records cleaned: {}", totalDeleted);
    }

    /**
     * Helper: Get student profile ID for a user
     */
    private Long getStudentProfileId(Long userId) {
        try {
            return jdbcTemplate.queryForObject(
                "SELECT id FROM academic.student_profiles WHERE user_id = ?",
                Long.class,
                userId
            );
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Helper: Get teacher profile ID for a user
     */
    private Long getTeacherProfileId(Long userId) {
        try {
            return jdbcTemplate.queryForObject(
                "SELECT id FROM academic.teacher_profiles WHERE user_id = ?",
                Long.class,
                userId
            );
        } catch (Exception e) {
            return null;
        }
    }
}