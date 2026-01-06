package com.edu.platform.service;

import com.edu.platform.dto.user.UserDto;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.model.User;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.repository.UserRepository;

import jakarta.transaction.Transactional;
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
     * ✅ CORRECTED: Delete a user with proper cascade cleanup
     * Uses verified column names from database schema
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
            
            // 1. Delete enrollments (the original constraint violation)
            int enrollments = jdbcTemplate.update(
                "DELETE FROM academic.enrollments WHERE student_profile_id = ?", 
                studentProfileId
            );
            totalDeleted += enrollments;
            log.info("  ✅ Deleted {} enrollments", enrollments);

            // 2. Delete student subjects
            int studentSubjects = jdbcTemplate.update(
                "DELETE FROM academic.student_subjects WHERE student_profile_id = ?", 
                studentProfileId
            );
            totalDeleted += studentSubjects;
            log.info("  ✅ Deleted {} student subjects", studentSubjects);

            // 3. Delete assessment submissions (student_id column)
            int submissions = jdbcTemplate.update(
                "DELETE FROM academic.assessment_submissions WHERE student_id = ?", 
                studentProfileId
            );
            totalDeleted += submissions;
            log.info("  ✅ Deleted {} assessment submissions", submissions);

            // 4. Delete custom assessments targeting this student
            int customAssessments = jdbcTemplate.update(
                "DELETE FROM academic.assessments WHERE target_student_profile_id = ?", 
                studentProfileId
            );
            totalDeleted += customAssessments;
            log.info("  ✅ Deleted {} custom assessments", customAssessments);

            // 5. Delete student lesson progress
            int progress = jdbcTemplate.update(
                "DELETE FROM academic.student_lesson_progress WHERE student_profile_id = ?", 
                studentProfileId
            );
            totalDeleted += progress;
            log.info("  ✅ Deleted {} lesson progress records", progress);

            // 6. Delete daily schedules (student_id column)
            int schedules = jdbcTemplate.update(
                "DELETE FROM academic.daily_schedules WHERE student_id = ?", 
                studentProfileId
            );
            totalDeleted += schedules;
            log.info("  ✅ Deleted {} daily schedules", schedules);

            // 7. Delete individual lesson topics
            int individualTopics = jdbcTemplate.update(
                "DELETE FROM academic.individual_lesson_topics WHERE student_profile_id = ?", 
                studentProfileId
            );
            totalDeleted += individualTopics;
            log.info("  ✅ Deleted {} individual lesson topics", individualTopics);

            // 8. Delete individual student schemes
            int schemes = jdbcTemplate.update(
                "DELETE FROM academic.individual_student_schemes WHERE student_profile_id = ?", 
                studentProfileId
            );
            totalDeleted += schemes;
            log.info("  ✅ Deleted {} student schemes", schemes);

            // 9. Delete individual timetables
            int timetables = jdbcTemplate.update(
                "DELETE FROM academic.individual_student_timetables WHERE student_profile_id = ?", 
                studentProfileId
            );
            totalDeleted += timetables;
            log.info("  ✅ Deleted {} individual timetables", timetables);

            // 10. Delete daily progress summaries
            int summaries = jdbcTemplate.update(
                "DELETE FROM academic.daily_progress_summary WHERE student_profile_id = ?", 
                studentProfileId
            );
            totalDeleted += summaries;
            log.info("  ✅ Deleted {} progress summaries", summaries);

            // 11. Delete archived daily schedules (if exists)
            try {
                int archivedSchedules = jdbcTemplate.update(
                    "DELETE FROM academic.archived_daily_schedules WHERE student_id = ?", 
                    studentProfileId
                );
                totalDeleted += archivedSchedules;
                log.info("  ✅ Deleted {} archived schedules", archivedSchedules);
            } catch (Exception e) {
                log.debug("  ℹ️ No archived_daily_schedules table or no records");
            }

            // 12. Delete archived progress (if exists)
            try {
                int archivedProgress = jdbcTemplate.update(
                    "DELETE FROM academic.archived_student_lesson_progress WHERE student_profile_id = ?", 
                    studentProfileId
                );
                totalDeleted += archivedProgress;
                log.info("  ✅ Deleted {} archived progress records", archivedProgress);
            } catch (Exception e) {
                log.debug("  ℹ️ No archived_student_lesson_progress table or no records");
            }

            // 13. Delete video watch history (if exists)
            try {
                int watchHistory = jdbcTemplate.update(
                    "DELETE FROM academic.video_watch_history WHERE student_id = ?", 
                    studentProfileId
                );
                totalDeleted += watchHistory;
                log.info("  ✅ Deleted {} video watch records", watchHistory);
            } catch (Exception e) {
                log.debug("  ℹ️ No video_watch_history table or no records");
            }

            // 14. Delete session attendance (if exists)
            try {
                int attendance = jdbcTemplate.update(
                    "DELETE FROM academic.session_attendance WHERE student_id = ?", 
                    studentProfileId
                );
                totalDeleted += attendance;
                log.info("  ✅ Deleted {} attendance records", attendance);
            } catch (Exception e) {
                log.debug("  ℹ️ No session_attendance table or no records");
            }

            // 15. Finally, delete student profile
            int profile = jdbcTemplate.update(
                "DELETE FROM academic.student_profiles WHERE id = ?", 
                studentProfileId
            );
            totalDeleted += profile;
            log.info("  ✅ Deleted student profile");
        }

        // ============================================================
        // TEACHER-RELATED CLEANUP
        // ============================================================
        if (teacherProfileId != null) {
            log.info("👨‍🏫 User is a TEACHER - cleaning up teacher-related data...");

            // 1. Delete teacher subjects
            try {
                int teacherSubjects = jdbcTemplate.update(
                    "DELETE FROM academic.teacher_subjects WHERE teacher_profile_id = ?", 
                    teacherProfileId
                );
                totalDeleted += teacherSubjects;
                log.info("  ✅ Deleted {} teacher subjects", teacherSubjects);
            } catch (Exception e) {
                log.debug("  ℹ️ No teacher_subjects or no records");
            }

            // 2. Delete teacher classes
            try {
                int teacherClasses = jdbcTemplate.update(
                    "DELETE FROM academic.teacher_classes WHERE teacher_id = ?", 
                    teacherProfileId
                );
                totalDeleted += teacherClasses;
                log.info("  ✅ Deleted {} teacher classes", teacherClasses);
            } catch (Exception e) {
                log.debug("  ℹ️ No teacher_classes or no records");
            }

            // 3. Delete teacher question bank
            try {
                int questionBank = jdbcTemplate.update(
                    "DELETE FROM academic.teacher_question_bank WHERE teacher_id = ?", 
                    teacherProfileId
                );
                totalDeleted += questionBank;
                log.info("  ✅ Deleted {} question bank entries", questionBank);
            } catch (Exception e) {
                log.debug("  ℹ️ No teacher_question_bank or no records");
            }

            // 4. Delete teacher YouTube tokens
            try {
                int youtubeTokens = jdbcTemplate.update(
                    "DELETE FROM academic.teacher_youtube_tokens WHERE teacher_id = ?", 
                    teacherProfileId
                );
                totalDeleted += youtubeTokens;
                log.info("  ✅ Deleted {} YouTube tokens", youtubeTokens);
            } catch (Exception e) {
                log.debug("  ℹ️ No teacher_youtube_tokens or no records");
            }

            // 5. Delete live sessions created by teacher
            try {
                int liveSessions = jdbcTemplate.update(
                    "DELETE FROM academic.live_sessions WHERE teacher_id = ?", 
                    teacherProfileId
                );
                totalDeleted += liveSessions;
                log.info("  ✅ Deleted {} live sessions", liveSessions);
            } catch (Exception e) {
                log.debug("  ℹ️ No live_sessions or no records");
            }

            // 6. Finally, delete teacher profile
            int profile = jdbcTemplate.update(
                "DELETE FROM academic.teacher_profiles WHERE id = ?", 
                teacherProfileId
            );
            totalDeleted += profile;
            log.info("  ✅ Deleted teacher profile");
        }

        // ============================================================
        // COMMON USER DATA CLEANUP (for both students and teachers)
        // ============================================================
        log.info("🔧 Cleaning up common user data...");

        // 1. Delete chat messages
        try {
            int chatMessages = jdbcTemplate.update(
                "DELETE FROM core.chat_messages WHERE sender_id = ?", 
                userId
            );
            totalDeleted += chatMessages;
            log.info("  ✅ Deleted {} chat messages", chatMessages);
        } catch (Exception e) {
            log.debug("  ℹ️ No chat_messages or no records");
        }

        // 2. Delete notifications
        try {
            int notifications = jdbcTemplate.update(
                "DELETE FROM core.notifications WHERE user_id = ?", 
                userId
            );
            totalDeleted += notifications;
            log.info("  ✅ Deleted {} notifications", notifications);
        } catch (Exception e) {
            log.debug("  ℹ️ No notifications or no records");
        }

        // 3. Delete announcement targets
        try {
            int announcementTargets = jdbcTemplate.update(
                "DELETE FROM core.announcement_target_users WHERE user_id = ?", 
                userId
            );
            totalDeleted += announcementTargets;
            log.info("  ✅ Deleted {} announcement targets", announcementTargets);
        } catch (Exception e) {
            log.debug("  ℹ️ No announcement_target_users or no records");
        }

        // 4. Delete user roles
        int userRoles = jdbcTemplate.update(
            "DELETE FROM core.user_roles WHERE user_id = ?", 
            userId
        );
        totalDeleted += userRoles;
        log.info("  ✅ Deleted {} user roles", userRoles);

        // ============================================================
        // FINALLY DELETE THE USER
        // ============================================================
        userRepository.delete(user);
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