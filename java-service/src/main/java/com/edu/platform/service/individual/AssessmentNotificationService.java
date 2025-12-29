package com.edu.platform.service.individual;

import com.edu.platform.dto.notification.AssessmentAvailableNotificationDto;
import com.edu.platform.dto.notification.AssessmentExpiredNotificationDto;
import com.edu.platform.event.NotificationEventPublisher;
import com.edu.platform.model.*;
import com.edu.platform.model.enums.NotificationPriority;
import com.edu.platform.model.enums.NotificationType;
import com.edu.platform.repository.*;
import com.edu.platform.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

/**
 * ✅ SPRINT 6: Handles assessment-related notifications for individual students.
 * Sends notifications when assessments become available or expire.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AssessmentNotificationService {

    private final NotificationService notificationService;
    private final NotificationEventPublisher eventPublisher;
    private final StudentProfileRepository studentProfileRepository;
    private final SubjectRepository subjectRepository;
    private final TeacherProfileRepository teacherProfileRepository;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("h:mm a");
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("MMM dd, yyyy h:mm a");

    /**
     * ✅ Notify student that their assessment window has opened.
     * Sent when window_start time is reached.
     * 
     * @param progressId The progress record ID
     * @param studentId Student ID
     * @param subjectId Subject ID
     * @param lessonTopicId Lesson topic ID
     * @param lessonTopicTitle Lesson topic title
     * @param weekNumber Week number
     * @param windowStart When the assessment window opened
     * @param windowEnd When the assessment window closes
     * @param graceDeadline When grace period ends
     * @param dayOfWeek Day of week (e.g., "Monday")
     * @param periodTimeSlot Period time (e.g., "4:00 PM - 6:00 PM")
     * @param periodSequence Which period in sequence (1, 2, 3...)
     * @param totalPeriodsInSequence Total periods for this topic
     */
    public void notifyAssessmentAvailable(
            Long progressId,
            Long studentId,
            Long subjectId,
            Long lessonTopicId,
            String lessonTopicTitle,
            Integer weekNumber,
            LocalDateTime windowStart,
            LocalDateTime windowEnd,
            LocalDateTime graceDeadline,
            String dayOfWeek,
            String periodTimeSlot,
            Integer periodSequence,
            Integer totalPeriodsInSequence) {

        log.info("📢 Notifying assessment available: Student {}, Topic {}, Period {}/{}",
                studentId, lessonTopicTitle, periodSequence, totalPeriodsInSequence);

        // Get student profile
        Optional<StudentProfile> studentProfileOpt = studentProfileRepository.findById(studentId);
        if (studentProfileOpt.isEmpty()) {
            log.error("❌ Student profile not found: {}", studentId);
            return;
        }

        StudentProfile student = studentProfileOpt.get();
        User studentUser = student.getUser();

        // Get subject
        Optional<Subject> subjectOpt = subjectRepository.findById(subjectId);
        if (subjectOpt.isEmpty()) {
            log.error("❌ Subject not found: {}", subjectId);
            return;
        }

        Subject subject = subjectOpt.get();

        // Find teacher for the subject
        TeacherInfo teacherInfo = findTeacherForSubject(subjectId);

        // Calculate duration
        int durationMinutes = (int) Duration.between(windowStart, windowEnd).toMinutes();
        int graceMinutes = (int) Duration.between(windowEnd, graceDeadline).toMinutes();
        int timeUntilWindowCloses = (int) Duration.between(LocalDateTime.now(), windowEnd).toMinutes();

        // Check if this is a multi-period topic
        boolean hasMultiplePeriods = totalPeriodsInSequence > 1;

        // Build notification title
        String title = buildAssessmentAvailableTitle(
                subject.getName(),
                lessonTopicTitle,
                periodSequence,
                totalPeriodsInSequence,
                hasMultiplePeriods
        );

        // Build notification message
        String message = buildAssessmentAvailableMessage(
                subject.getName(),
                lessonTopicTitle,
                weekNumber,
                dayOfWeek,
                periodTimeSlot,
                windowStart,
                windowEnd,
                graceDeadline,
                durationMinutes,
                graceMinutes,
                periodSequence,
                totalPeriodsInSequence,
                hasMultiplePeriods,
                teacherInfo
        );

        // Build action URL
        String actionUrl = String.format("/student/assessments/start/%d", progressId);

        // Send notification
        notificationService.createNotification(
                studentUser.getId(),
                NotificationType.ASSESSMENT_PUBLISHED,
                NotificationPriority.HIGH,
                title,
                message,
                actionUrl,
                progressId,
                "ASSESSMENT_AVAILABLE"
        );

        log.info("✅ Sent assessment available notification to student {}", studentUser.getEmail());
    }

    /**
     * ✅ Notify student that their assessment has expired (grace period ended).
     * Sent when grace_deadline time is reached and student hasn't submitted.
     */
    public void notifyAssessmentExpired(
            Long progressId,
            Long studentId,
            Long subjectId,
            Long lessonTopicId,
            String lessonTopicTitle,
            Integer weekNumber,
            LocalDateTime windowEnd,
            LocalDateTime graceDeadline,
            String dayOfWeek,
            String periodTimeSlot,
            Integer periodSequence,
            Integer totalPeriodsInSequence,
            Integer completedPeriodsCount) {

        log.info("📢 Notifying assessment expired: Student {}, Topic {}, Period {}/{}",
                studentId, lessonTopicTitle, periodSequence, totalPeriodsInSequence);

        // Get student profile
        Optional<StudentProfile> studentProfileOpt = studentProfileRepository.findById(studentId);
        if (studentProfileOpt.isEmpty()) {
            log.error("❌ Student profile not found: {}", studentId);
            return;
        }

        StudentProfile student = studentProfileOpt.get();
        User studentUser = student.getUser();

        // Get subject
        Optional<Subject> subjectOpt = subjectRepository.findById(subjectId);
        if (subjectOpt.isEmpty()) {
            log.error("❌ Subject not found: {}", subjectId);
            return;
        }

        Subject subject = subjectOpt.get();

        // Find teacher
        TeacherInfo teacherInfo = findTeacherForSubject(subjectId);

        // Calculate completion stats
        boolean hasMultiplePeriods = totalPeriodsInSequence > 1;
        int remainingPeriodsCount = totalPeriodsInSequence - completedPeriodsCount;
        double completionPercentage = (completedPeriodsCount * 100.0) / totalPeriodsInSequence;

        // Build notification title
        String title = buildAssessmentExpiredTitle(
                subject.getName(),
                lessonTopicTitle,
                periodSequence,
                totalPeriodsInSequence,
                hasMultiplePeriods
        );

        // Build notification message
        String message = buildAssessmentExpiredMessage(
                subject.getName(),
                lessonTopicTitle,
                weekNumber,
                dayOfWeek,
                periodTimeSlot,
                windowEnd,
                graceDeadline,
                periodSequence,
                totalPeriodsInSequence,
                completedPeriodsCount,
                remainingPeriodsCount,
                completionPercentage,
                hasMultiplePeriods,
                teacherInfo
        );

        // Build action URL
        String actionUrl = String.format("/student/assessments/incomplete/%d", progressId);

        // Send notification
        notificationService.createNotification(
                studentUser.getId(),
                NotificationType.SYSTEM_ALERT,
                NotificationPriority.HIGH,
                title,
                message,
                actionUrl,
                progressId,
                "ASSESSMENT_EXPIRED"
        );

        log.info("✅ Sent assessment expired notification to student {}", studentUser.getEmail());
    }

    /**
     * ✅ Notify teacher about a student's expired assessment
     * Used for teacher awareness and follow-up
     */
    public void notifyTeacherAboutExpiredAssessment(
            Long progressId,
            Long studentId,
            Long subjectId,
            String lessonTopicTitle,
            Integer weekNumber,
            Integer periodSequence,
            Integer totalPeriodsInSequence) {

        log.info("📢 Notifying teacher about expired assessment: Student {}, Topic {}",
                studentId, lessonTopicTitle);

        // Get student
        Optional<StudentProfile> studentProfileOpt = studentProfileRepository.findById(studentId);
        if (studentProfileOpt.isEmpty()) {
            log.error("❌ Student profile not found: {}", studentId);
            return;
        }

        StudentProfile student = studentProfileOpt.get();

        // Get subject
        Optional<Subject> subjectOpt = subjectRepository.findById(subjectId);
        if (subjectOpt.isEmpty()) {
            log.error("❌ Subject not found: {}", subjectId);
            return;
        }

        Subject subject = subjectOpt.get();

        // Find teacher
        TeacherInfo teacherInfo = findTeacherForSubject(subjectId);
        if (teacherInfo == null || teacherInfo.userId == null) {
            log.warn("⚠️ No teacher found for subject: {}", subject.getName());
            return;
        }

        String title = String.format("Student Missed Assessment - %s", lessonTopicTitle);

        String message = String.format(
                "Student %s has missed the assessment for:\n\n" +
                        "Subject: %s\n" +
                        "Topic: %s\n" +
                        "Week: %d\n" +
                        "Period: %d of %d\n" +
                        "Class: %s\n\n" +
                        "The grace period has expired without submission. " +
                        "Please follow up with the student if necessary.",
                student.getUser().getFullName(),
                subject.getName(),
                lessonTopicTitle,
                weekNumber,
                periodSequence,
                totalPeriodsInSequence,
                student.getClassLevel() != null ? student.getClassLevel().getName() : "N/A"
        );

        String actionUrl = String.format("/teacher/assessments/incomplete/%d", progressId);

        notificationService.createNotification(
                teacherInfo.userId,
                NotificationType.SYSTEM_ALERT,
                NotificationPriority.MEDIUM,
                title,
                message,
                actionUrl,
                progressId,
                "STUDENT_ASSESSMENT_EXPIRED"
        );

        log.info("✅ Notified teacher {} about expired assessment", teacherInfo.email);
    }

    // ==================== HELPER METHODS ====================

    /**
     * Build title for assessment available notification
     */
    private String buildAssessmentAvailableTitle(
            String subjectName,
            String topicTitle,
            Integer periodSequence,
            Integer totalPeriods,
            boolean hasMultiplePeriods) {

        if (hasMultiplePeriods) {
            return String.format("Assessment Available: %s - %s (Period %d/%d)",
                    subjectName, topicTitle, periodSequence, totalPeriods);
        } else {
            return String.format("Assessment Available: %s - %s",
                    subjectName, topicTitle);
        }
    }

    /**
     * Build message for assessment available notification
     */
    private String buildAssessmentAvailableMessage(
            String subjectName,
            String topicTitle,
            Integer weekNumber,
            String dayOfWeek,
            String periodTimeSlot,
            LocalDateTime windowStart,
            LocalDateTime windowEnd,
            LocalDateTime graceDeadline,
            int durationMinutes,
            int graceMinutes,
            Integer periodSequence,
            Integer totalPeriods,
            boolean hasMultiplePeriods,
            TeacherInfo teacherInfo) {

        StringBuilder message = new StringBuilder();

        // Header
        message.append("Your assessment window is now open!\n\n");

        // Basic info
        message.append(String.format("Subject: %s\n", subjectName));
        message.append(String.format("Topic: %s\n", topicTitle));
        message.append(String.format("Week: %d\n", weekNumber));
        message.append(String.format("Day: %s\n", dayOfWeek));
        message.append(String.format("Period: %s\n\n", periodTimeSlot));

        // Multi-period info
        if (hasMultiplePeriods) {
            message.append(String.format("This is Period %d of %d for this topic.\n\n",
                    periodSequence, totalPeriods));
        }

        // Assessment window
        message.append("Assessment Window:\n");
        message.append(String.format("Opens: %s\n", windowStart.format(DATE_TIME_FORMATTER)));
        message.append(String.format("Closes: %s\n", windowEnd.format(DATE_TIME_FORMATTER)));
        message.append(String.format("Duration: %d minutes\n\n", durationMinutes));

        // Grace period
        message.append("Grace Period:\n");
        message.append(String.format("Ends: %s\n", graceDeadline.format(DATE_TIME_FORMATTER)));
        message.append(String.format("Additional time: %d minutes after window closes\n\n", graceMinutes));

        // Teacher info
        if (teacherInfo != null) {
            message.append(String.format("Teacher: %s\n", teacherInfo.name));
            message.append(String.format("Contact: %s\n\n", teacherInfo.email));
        }

        // Action prompt
        message.append("Click 'Start Assessment' to begin when you're ready.\n");
        message.append("Make sure to submit before the grace period ends!");

        return message.toString();
    }

    /**
     * Build title for assessment expired notification
     */
    private String buildAssessmentExpiredTitle(
            String subjectName,
            String topicTitle,
            Integer periodSequence,
            Integer totalPeriods,
            boolean hasMultiplePeriods) {

        if (hasMultiplePeriods) {
            return String.format("Assessment Expired: %s - %s (Period %d/%d)",
                    subjectName, topicTitle, periodSequence, totalPeriods);
        } else {
            return String.format("Assessment Expired: %s - %s",
                    subjectName, topicTitle);
        }
    }

    /**
     * Build message for assessment expired notification
     */
    private String buildAssessmentExpiredMessage(
            String subjectName,
            String topicTitle,
            Integer weekNumber,
            String dayOfWeek,
            String periodTimeSlot,
            LocalDateTime windowEnd,
            LocalDateTime graceDeadline,
            Integer periodSequence,
            Integer totalPeriods,
            Integer completedPeriodsCount,
            Integer remainingPeriodsCount,
            double completionPercentage,
            boolean hasMultiplePeriods,
            TeacherInfo teacherInfo) {

        StringBuilder message = new StringBuilder();

        // Header
        message.append("The grace period for this assessment has expired.\n\n");

        // Basic info
        message.append(String.format("Subject: %s\n", subjectName));
        message.append(String.format("Topic: %s\n", topicTitle));
        message.append(String.format("Week: %d\n", weekNumber));
        message.append(String.format("Day: %s\n", dayOfWeek));
        message.append(String.format("Period: %s\n\n", periodTimeSlot));

        // Multi-period progress
        if (hasMultiplePeriods) {
            message.append(String.format("Period %d of %d was missed.\n\n", periodSequence, totalPeriods));
            message.append("Topic Progress:\n");
            message.append(String.format("Completed Periods: %d\n", completedPeriodsCount));
            message.append(String.format("Remaining Periods: %d\n", remainingPeriodsCount));
            message.append(String.format("Completion: %.1f%%\n\n", completionPercentage));
        }

        // Expiration info
        message.append("Deadline Information:\n");
        message.append(String.format("Window Closed: %s\n", windowEnd.format(DATE_TIME_FORMATTER)));
        message.append(String.format("Grace Period Ended: %s\n\n", graceDeadline.format(DATE_TIME_FORMATTER)));

        // Next steps
        message.append("What's Next:\n");
        if (hasMultiplePeriods && remainingPeriodsCount > 0) {
            message.append(String.format("You still have %d more period(s) for this topic.\n", remainingPeriodsCount));
            message.append("Make sure to complete the remaining assessments on time.\n\n");
        } else {
            message.append("This assessment has been marked as incomplete.\n\n");
        }

        // Teacher contact
        if (teacherInfo != null) {
            message.append(String.format("If you need to discuss this, contact your teacher:\n"));
            message.append(String.format("%s (%s)\n", teacherInfo.name, teacherInfo.email));
        }

        return message.toString();
    }

    /**
     * Find teacher for a subject
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

    // ==================== INTERNAL DATA CLASSES ====================

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