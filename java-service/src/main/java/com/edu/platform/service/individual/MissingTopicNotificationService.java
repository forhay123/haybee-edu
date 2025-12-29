package com.edu.platform.service.individual;

import com.edu.platform.dto.notification.MissingTopicNotificationDto;
import com.edu.platform.event.NotificationEventPublisher;
import com.edu.platform.model.Subject;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.TeacherProfile;
import com.edu.platform.model.User;
import com.edu.platform.model.enums.NotificationPriority;
import com.edu.platform.model.enums.NotificationType;
import com.edu.platform.repository.SubjectRepository;
import com.edu.platform.repository.TeacherProfileRepository;
import com.edu.platform.repository.UserRepository;
import com.edu.platform.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ✅ SPRINT 6: Handles notifications for missing lesson topics.
 * Sends detailed notifications to admins and teachers when lesson topics are missing during schedule generation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class MissingTopicNotificationService {

    private final NotificationService notificationService;
    private final NotificationEventPublisher eventPublisher;
    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;
    private final TeacherProfileRepository teacherProfileRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("MMM dd, yyyy");
    private static final DateTimeFormatter WEEK_RANGE_FORMATTER = DateTimeFormatter.ofPattern("MMM dd");

    /**
     * ✅ Notify admin and teachers about missing lesson topics for a week.
     * Groups students by subject and sends detailed notifications with full student info.
     * 
     * @param missingTopicsMap Map of subject ID to list of affected students
     * @param weekNumber Current week number
     * @param weekStartDate Monday of the week
     * @param weekEndDate Sunday of the week
     */
    public void notifyMissingTopics(
            Map<Long, List<StudentProfile>> missingTopicsMap,
            int weekNumber,
            LocalDate weekStartDate,
            LocalDate weekEndDate) {
        
        if (missingTopicsMap == null || missingTopicsMap.isEmpty()) {
            log.debug("No missing topics to notify about");
            return;
        }

        log.info("📢 Notifying about {} missing topics for Week {}", 
                missingTopicsMap.size(), weekNumber);

        // Create DTOs for each subject
        List<MissingTopicNotificationDto> missingTopicDtos = new ArrayList<>();
        
        for (Map.Entry<Long, List<StudentProfile>> entry : missingTopicsMap.entrySet()) {
            Long subjectId = entry.getKey();
            List<StudentProfile> affectedStudents = entry.getValue();
            
            Subject subject = subjectRepository.findById(subjectId)
                    .orElse(null);
            
            if (subject == null) {
                log.warn("⚠️ Subject not found for ID: {}", subjectId);
                continue;
            }

            MissingTopicNotificationDto dto = buildMissingTopicDto(
                    subject,
                    affectedStudents,
                    weekNumber,
                    weekStartDate,
                    weekEndDate
            );
            
            missingTopicDtos.add(dto);
        }

        // Send to admin
        notifyAdmin(missingTopicDtos, weekNumber, weekStartDate, weekEndDate);

        // Send to teachers (grouped by subject)
        notifyTeachers(missingTopicDtos, weekNumber, weekStartDate, weekEndDate);

        log.info("✅ Sent missing topic notifications for {} subjects", missingTopicDtos.size());
    }

    /**
     * ✅ Build DTO for a missing topic
     */
    private MissingTopicNotificationDto buildMissingTopicDto(
            Subject subject,
            List<StudentProfile> affectedStudents,
            int weekNumber,
            LocalDate weekStartDate,
            LocalDate weekEndDate) {
        
        // Build student details
        List<MissingTopicNotificationDto.StudentDetail> studentDetails = affectedStudents.stream()
                .map(this::buildStudentDetail)
                .sorted(Comparator.comparing(MissingTopicNotificationDto.StudentDetail::getStudentName))
                .collect(Collectors.toList());

        // Find teacher for this subject
        TeacherInfo teacherInfo = findTeacherForSubject(subject.getId());

        // Calculate total periods affected (placeholder - should come from timetable)
        int totalPeriodsAffected = affectedStudents.size() * 3; // Assuming 3 periods per student

        return MissingTopicNotificationDto.builder()
                .subjectId(subject.getId())
                .subjectName(subject.getName())
                .weekNumber(weekNumber)
                .weekStartDate(weekStartDate)
                .weekEndDate(weekEndDate)
                .affectedStudentCount(affectedStudents.size())
                .studentDetails(studentDetails)
                .teacherId(teacherInfo != null ? teacherInfo.userId : null)
                .teacherName(teacherInfo != null ? teacherInfo.name : null)
                .teacherEmail(teacherInfo != null ? teacherInfo.email : null)
                .createTopicUrl(String.format("/teacher/lesson-topics/create?subject=%d&week=%d", 
                        subject.getId(), weekNumber))
                .viewDetailsUrl(String.format("/admin/missing-topics/week/%d/subject/%d", 
                        weekNumber, subject.getId()))
                .assignExistingTopicUrl(String.format("/admin/lesson-topics/assign?subject=%d&week=%d", 
                        subject.getId(), weekNumber))
                .hasExistingTopicsForOtherWeeks(false) // TODO: Check if topics exist for other weeks
                .totalPeriodsAffected(totalPeriodsAffected)
                .build();
    }

    /**
     * ✅ Build detailed student information
     */
    private MissingTopicNotificationDto.StudentDetail buildStudentDetail(StudentProfile student) {
        // Get student name from User entity
        String studentName = student.getUser().getFullName();
        
        // Get class name
        String className = student.getClassLevel() != null 
                ? student.getClassLevel().getName() 
                : "N/A";
        
        // Get timetable schedule for this subject
        // TODO: Fetch actual schedule from individual_student_timetables_extracted_entries
        // For now, placeholder
        List<String> scheduleSlots = List.of("Mon 4:00pm", "Wed 5:00pm", "Fri 4:30pm");
        
        return MissingTopicNotificationDto.StudentDetail.builder()
                .studentId(student.getId())
                .studentName(studentName)
                .className(className)
                .studentType(student.getStudentType().name())
                .scheduleSlots(scheduleSlots)
                .totalPeriods(scheduleSlots.size())
                .build();
    }

    /**
     * ✅ Notify admin about all missing topics
     */
    private void notifyAdmin(
            List<MissingTopicNotificationDto> missingTopics,
            int weekNumber,
            LocalDate weekStartDate,
            LocalDate weekEndDate) {
        
        // Get all admin users (users with ADMIN role)
        List<User> admins = userRepository.findAll().stream()
                .filter(user -> user.getRoles().stream()
                        .anyMatch(role -> "ADMIN".equals(role.getName())))
                .collect(Collectors.toList());
        
        if (admins.isEmpty()) {
            log.warn("⚠️ No admin users found to notify about missing topics");
            return;
        }

        String weekRange = weekStartDate.format(WEEK_RANGE_FORMATTER) + " - " + 
                          weekEndDate.format(WEEK_RANGE_FORMATTER) + ", " + 
                          weekEndDate.getYear();

        int totalStudentsAffected = missingTopics.stream()
                .mapToInt(MissingTopicNotificationDto::getAffectedStudentCount)
                .sum();

        String title = String.format("Missing Lesson Topics - Week %d Assignments", weekNumber);
        
        StringBuilder messageBuilder = new StringBuilder();
        messageBuilder.append(String.format("The following subjects are missing lesson topics for Week %d (%s):\n\n",
                weekNumber, weekRange));

        for (int i = 0; i < missingTopics.size(); i++) {
            MissingTopicNotificationDto dto = missingTopics.get(i);
            messageBuilder.append(String.format("%d. %s\n", i + 1, dto.getSubjectName()));
            messageBuilder.append(String.format("   Teacher: %s\n", 
                    dto.getTeacherName() != null ? dto.getTeacherName() : "Not assigned"));
            messageBuilder.append(String.format("   Affected Students: %d\n\n", dto.getAffectedStudentCount()));
            
            // Show first 3 students
            int studentsToShow = Math.min(3, dto.getStudentDetails().size());
            for (int j = 0; j < studentsToShow; j++) {
                MissingTopicNotificationDto.StudentDetail student = dto.getStudentDetails().get(j);
                messageBuilder.append(String.format("   • %s\n", student.getStudentName()));
                messageBuilder.append(String.format("     - Class: %s\n", student.getClassName()));
                messageBuilder.append(String.format("     - Student Type: %s\n", student.getStudentType()));
                messageBuilder.append(String.format("     - Schedule: %s\n", 
                        String.join(", ", student.getScheduleSlots())));
                messageBuilder.append("\n");
            }
            
            if (dto.getStudentDetails().size() > 3) {
                messageBuilder.append(String.format("   ... (%d more students)\n\n", 
                        dto.getStudentDetails().size() - 3));
            }
            
            messageBuilder.append(String.format("   Action Required: Assign lesson topic\n"));
            messageBuilder.append(String.format("   [View Details: %s]\n\n", dto.getViewDetailsUrl()));
        }

        messageBuilder.append(String.format("\nTotal Students Affected: %d\n", totalStudentsAffected));
        messageBuilder.append(String.format("Total Subjects Missing Topics: %d\n", missingTopics.size()));

        String message = messageBuilder.toString();
        String actionUrl = String.format("/admin/missing-topics/week/%d", weekNumber);

        // Send to all admins
        List<Long> adminUserIds = admins.stream()
                .map(User::getId)
                .collect(Collectors.toList());

        notificationService.createBulkNotifications(
                adminUserIds,
                NotificationType.SYSTEM_ALERT,
                NotificationPriority.HIGH,
                title,
                message,
                actionUrl,
                (long) weekNumber,
                "MISSING_LESSON_TOPIC"
        );

        log.info("✅ Sent missing topic notification to {} admins", adminUserIds.size());
    }

    /**
     * ✅ Notify teachers about missing topics for their subjects
     */
    private void notifyTeachers(
            List<MissingTopicNotificationDto> missingTopics,
            int weekNumber,
            LocalDate weekStartDate,
            LocalDate weekEndDate) {
        
        String weekRange = weekStartDate.format(WEEK_RANGE_FORMATTER) + " - " + 
                          weekEndDate.format(WEEK_RANGE_FORMATTER) + ", " + 
                          weekEndDate.getYear();

        for (MissingTopicNotificationDto dto : missingTopics) {
            if (dto.getTeacherId() == null) {
                log.warn("⚠️ No teacher assigned to subject: {}", dto.getSubjectName());
                continue;
            }
            
            String title = String.format("Missing Lesson Topic - %s Week %d", 
                    dto.getSubjectName(), weekNumber);
            
            StringBuilder messageBuilder = new StringBuilder();
            messageBuilder.append(String.format("Your subject (%s) is missing a lesson topic for Week %d (%s).\n\n",
                    dto.getSubjectName(), weekNumber, weekRange));
            messageBuilder.append(String.format("Affected Students: %d\n\n", dto.getAffectedStudentCount()));
            messageBuilder.append("Detailed Student List:\n\n");

            for (int i = 0; i < dto.getStudentDetails().size(); i++) {
                MissingTopicNotificationDto.StudentDetail student = dto.getStudentDetails().get(i);
                messageBuilder.append(String.format("%d. %s\n", i + 1, student.getStudentName()));
                messageBuilder.append(String.format("   - Class: %s\n", student.getClassName()));
                messageBuilder.append(String.format("   - Student Type: %s\n", student.getStudentType()));
                messageBuilder.append(String.format("   - Schedule: %s\n", 
                        String.join(", ", student.getScheduleSlots())));
                messageBuilder.append(String.format("   - Total periods: %d\n\n", student.getTotalPeriods()));
            }

            messageBuilder.append("\nAction Required:\n");
            messageBuilder.append("Please create a lesson topic for Week ");
            messageBuilder.append(weekNumber);
            messageBuilder.append(" or contact admin to assign an existing topic.\n");

            String message = messageBuilder.toString();

            notificationService.createNotification(
                    dto.getTeacherId(),
                    NotificationType.SYSTEM_ALERT,
                    NotificationPriority.HIGH,
                    title,
                    message,
                    dto.getCreateTopicUrl(),
                    dto.getSubjectId(),
                    "MISSING_LESSON_TOPIC"
            );

            log.info("✅ Sent missing topic notification to teacher {} for subject {}", 
                    dto.getTeacherEmail(), dto.getSubjectName());
        }
    }

    /**
     * ✅ Notify single admin about a specific missing topic
     * Used when admin manually checks for missing topics
     */
    public void notifySingleMissingTopic(
            Long adminUserId,
            Subject subject,
            List<StudentProfile> affectedStudents,
            int weekNumber,
            LocalDate weekStartDate,
            LocalDate weekEndDate) {
        
        MissingTopicNotificationDto dto = buildMissingTopicDto(
                subject,
                affectedStudents,
                weekNumber,
                weekStartDate,
                weekEndDate
        );

        String weekRange = weekStartDate.format(WEEK_RANGE_FORMATTER) + " - " + 
                          weekEndDate.format(WEEK_RANGE_FORMATTER) + ", " + 
                          weekEndDate.getYear();

        String title = String.format("Missing Lesson Topic: %s (Week %d)", 
                subject.getName(), weekNumber);
        
        StringBuilder messageBuilder = new StringBuilder();
        messageBuilder.append(String.format("Subject %s is missing a lesson topic for Week %d (%s).\n\n",
                subject.getName(), weekNumber, weekRange));
        messageBuilder.append(String.format("Affected Students: %d\n\n", dto.getAffectedStudentCount()));
        
        for (MissingTopicNotificationDto.StudentDetail student : dto.getStudentDetails()) {
            messageBuilder.append(String.format("• %s (%s)\n", student.getStudentName(), student.getClassName()));
            messageBuilder.append(String.format("  Schedule: %s\n", String.join(", ", student.getScheduleSlots())));
        }

        String message = messageBuilder.toString();

        notificationService.createNotification(
                adminUserId,
                NotificationType.SYSTEM_ALERT,
                NotificationPriority.HIGH,
                title,
                message,
                dto.getViewDetailsUrl(),
                subject.getId(),
                "MISSING_LESSON_TOPIC"
        );

        log.info("✅ Sent single missing topic notification to admin {}", adminUserId);
    }

    /**
     * ✅ Find teacher for a subject by looking through TeacherProfile relationships
     */
    private TeacherInfo findTeacherForSubject(Long subjectId) {
        List<TeacherProfile> allTeachers = teacherProfileRepository.findAll();
        
        for (TeacherProfile teacher : allTeachers) {
            if (teacher.getSubjects() != null) {
                boolean hasSubject = teacher.getSubjects().stream()
                        .anyMatch(subject -> subject.getId().equals(subjectId));
                
                if (hasSubject) {
                    User teacherUser = teacher.getUser();
                    return new TeacherInfo(
                            teacherUser.getId(),
                            teacherUser.getFullName(),
                            teacherUser.getEmail()
                    );
                }
            }
        }
        
        log.warn("⚠️ No teacher found for subject ID: {}", subjectId);
        return null;
    }

    // ==================== INTERNAL DATA CLASS ====================

    /**
     * Internal class to hold teacher information
     */
    private static class TeacherInfo {
        final Long userId;
        final String name;
        final String email;

        TeacherInfo(Long userId, String name, String email) {
            this.userId = userId;
            this.name = name;
            this.email = email;
        }
    }
}