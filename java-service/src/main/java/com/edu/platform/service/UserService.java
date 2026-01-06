package com.edu.platform.service;

import com.edu.platform.dto.user.UserDto;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.model.User;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.repository.UserRepository;

import jakarta.transaction.Transactional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;

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
                .build();
    }

    /**
     * ✅ SAFE: Delete a user with proper cascade cleanup
     * Each deletion is wrapped separately to handle column name mismatches
     */
    @Transactional
    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        log.info("🗑️ Starting cascade deletion for user {} ({})", userId, user.getEmail());

        // Get student profile ID if exists
        Long studentProfileId = getStudentProfileId(userId);
        
        // Get teacher profile ID if exists
        Long teacherProfileId = getTeacherProfileId(userId);

        int totalDeleted = 0;

        // ============================================================
        // STUDENT-RELATED CLEANUP
        // ============================================================
        if (studentProfileId != null) {
            log.info("📚 User is a STUDENT - cleaning up student-related data...");
            
            // Each deletion is a separate method to isolate failures
            totalDeleted += safeDelete("enrollments", "student_profile_id", studentProfileId);
            totalDeleted += safeDelete("student_subjects", "student_profile_id", studentProfileId);
            totalDeleted += safeDelete("assessment_submissions", "student_id", studentProfileId);
            totalDeleted += safeDelete("assessments", "target_student_profile_id", studentProfileId);
            totalDeleted += safeDelete("student_lesson_progress", "student_profile_id", studentProfileId);
            totalDeleted += safeDelete("daily_schedules", "student_id", studentProfileId);
            totalDeleted += safeDelete("individual_lesson_topics", "student_profile_id", studentProfileId);
            totalDeleted += safeDelete("individual_student_schemes", "student_profile_id", studentProfileId);
            totalDeleted += safeDelete("individual_student_timetables", "student_profile_id", studentProfileId);
            totalDeleted += safeDelete("daily_progress_summary", "student_profile_id", studentProfileId);
            
            // Archived tables (currently empty, but using correct column names if needed)
            // Both archived tables use student_id, not student_profile_id
            totalDeleted += safeDelete("archived_daily_schedules", "student_id", studentProfileId);
            totalDeleted += safeDelete("archived_student_lesson_progress", "student_id", studentProfileId);
            
            // Optional tables
            totalDeleted += safeDelete("video_watch_history", "student_id", studentProfileId);
            totalDeleted += safeDelete("session_attendance", "student_id", studentProfileId);

            // Finally, delete student profile
            totalDeleted += safeDelete("student_profiles", "id", studentProfileId);
            log.info("  ✅ Deleted student profile");
        }

        // ============================================================
        // TEACHER-RELATED CLEANUP
        // ============================================================
        if (teacherProfileId != null) {
            log.info("👨‍🏫 User is a TEACHER - cleaning up teacher-related data...");

            totalDeleted += safeDelete("teacher_subjects", "teacher_profile_id", teacherProfileId);
            totalDeleted += safeDelete("teacher_classes", "teacher_id", teacherProfileId);
            totalDeleted += safeDelete("teacher_question_bank", "teacher_id", teacherProfileId);
            totalDeleted += safeDelete("teacher_youtube_tokens", "teacher_id", teacherProfileId);
            totalDeleted += safeDelete("live_sessions", "teacher_id", teacherProfileId);

            // Finally, delete teacher profile
            totalDeleted += safeDelete("teacher_profiles", "id", teacherProfileId);
            log.info("  ✅ Deleted teacher profile");
        }

        // ============================================================
        // COMMON USER DATA CLEANUP
        // ============================================================
        log.info("🔧 Cleaning up common user data...");

        totalDeleted += safeDelete("chat_messages", "sender_id", userId, "core");
        totalDeleted += safeDelete("notifications", "user_id", userId, "core");
        totalDeleted += safeDelete("announcement_target_users", "user_id", userId, "core");
        totalDeleted += safeDelete("user_roles", "user_id", userId, "core");

        // ============================================================
        // FINALLY DELETE THE USER
        // ============================================================
        
        // CRITICAL: Flush and clear Hibernate session before deleting User entity
        // This prevents StaleObjectStateException since we deleted student_profile via JDBC
        entityManager.flush();
        entityManager.clear();
        
        // Now fetch a fresh copy of the user and delete it
        User freshUser = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        
        userRepository.delete(freshUser);
        entityManager.flush(); // Force the delete to happen now
        
        log.info("✅ User {} deleted successfully", userId);
        log.info("📊 Total records cleaned: {}", totalDeleted);
    }

    /**
     * Safe delete method - checks if column exists first, then deletes
     */
    private int safeDelete(String tableName, String columnName, Long id) {
        return safeDelete(tableName, columnName, id, "academic");
    }

    private int safeDelete(String tableName, String columnName, Long id, String schema) {
        try {
            // First, verify the column exists
            String checkSql = """
                SELECT COUNT(*) 
                FROM information_schema.columns 
                WHERE table_schema = ? 
                  AND table_name = ? 
                  AND column_name = ?
                """;
            
            Integer columnExists = jdbcTemplate.queryForObject(checkSql, Integer.class, schema, tableName, columnName);
            
            if (columnExists == null || columnExists == 0) {
                log.warn("  ⚠️ Column {}.{}.{} does not exist - skipping", schema, tableName, columnName);
                return 0;
            }
            
            // Column exists, proceed with deletion
            String sql = String.format("DELETE FROM %s.%s WHERE %s = ?", schema, tableName, columnName);
            int deleted = jdbcTemplate.update(sql, id);
            if (deleted > 0) {
                log.info("  ✅ Deleted {} records from {}.{}", deleted, schema, tableName);
            }
            return deleted;
        } catch (Exception e) {
            log.warn("  ⚠️ Could not delete from {}.{}: {}", schema, tableName, e.getMessage());
            return 0;
        }
    }

    /**
     * Try primary column name, fall back to alternate if first fails
     */
    private int safeDeleteWithFallback(String tableName, String primaryColumn, String fallbackColumn, Long id) {
        try {
            String sql = String.format("DELETE FROM academic.%s WHERE %s = ?", tableName, primaryColumn);
            int deleted = jdbcTemplate.update(sql, id);
            if (deleted > 0) {
                log.info("  ✅ Deleted {} records from academic.{}", deleted, tableName);
            }
            return deleted;
        } catch (Exception e) {
            // Try fallback column
            try {
                String sql = String.format("DELETE FROM academic.%s WHERE %s = ?", tableName, fallbackColumn);
                int deleted = jdbcTemplate.update(sql, id);
                if (deleted > 0) {
                    log.info("  ✅ Deleted {} records from academic.{} (using {})", deleted, tableName, fallbackColumn);
                }
                return deleted;
            } catch (Exception e2) {
                log.warn("  ⚠️ Could not delete from academic.{}: {}", tableName, e2.getMessage());
                return 0;
            }
        }
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