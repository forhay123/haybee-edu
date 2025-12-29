package com.edu.platform.scheduler;

import com.edu.platform.model.LiveSession;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.User;
import com.edu.platform.model.enums.NotificationPriority;
import com.edu.platform.model.enums.NotificationType;
import com.edu.platform.model.enums.SessionStatus;
import com.edu.platform.repository.LiveSessionRepository;
import com.edu.platform.repository.UserRepository;
import com.edu.platform.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

/**
 * ✅ Scheduled task to send reminders for upcoming live sessions
 * Runs every 5 minutes to check for sessions starting in 10 minutes
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LiveSessionReminderScheduler {

    private final LiveSessionRepository liveSessionRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /**
     * ✅ Send reminders for sessions starting in 10 minutes
     * Runs every 5 minutes: "
     */
    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    public void sendSessionReminders() {
        log.debug("🔔 Running session reminder check...");

        try {
            Instant now = Instant.now();
            Instant tenMinutesFromNow = now.plusSeconds(10 * 60);
            Instant fifteenMinutesFromNow = now.plusSeconds(15 * 60);

            // Find sessions starting between 10-15 minutes from now
            List<LiveSession> upcomingSessions = liveSessionRepository
                    .findByStatusAndScheduledStartTimeBetween(
                            SessionStatus.SCHEDULED,
                            tenMinutesFromNow,
                            fifteenMinutesFromNow
                    );

            if (upcomingSessions.isEmpty()) {
                log.debug("No sessions starting in the next 10-15 minutes");
                return;
            }

            log.info("📢 Found {} sessions starting soon", upcomingSessions.size());

            for (LiveSession session : upcomingSessions) {
                sendReminderForSession(session);
            }

        } catch (Exception e) {
            log.error("❌ Error in session reminder scheduler: {}", e.getMessage(), e);
        }
    }

    /**
     * ✅ Send reminder notification for a specific session
     */
    private void sendReminderForSession(LiveSession session) {
        try {
            List<Long> studentIds = getStudentIdsInClass(session.getClassEntity().getId());

            if (studentIds.isEmpty()) {
                log.warn("No students found in class {} for session {}", 
                        session.getClassEntity().getId(), session.getId());
                return;
            }

            String formattedTime = formatInstant(session.getScheduledStartTime());

            String title = "Live Class Starting Soon!";
            String message = String.format(
                    "Reminder: Your %s class '%s' starts in 10 minutes at %s. Get ready to join!",
                    session.getSubject().getName(),
                    session.getTitle(),
                    formattedTime
            );

            String actionUrl = "/student/live-sessions/" + session.getId() + "/join";

            notificationService.createBulkNotifications(
                    studentIds,
                    NotificationType.LIVE_CLASS_STARTING,
                    NotificationPriority.HIGH,
                    title,
                    message,
                    actionUrl,
                    session.getId(),
                    "LiveSession"
            );

            log.info("✅ Sent reminders to {} students for session {} ({})",
                    studentIds.size(), session.getId(), session.getTitle());

        } catch (Exception e) {
            log.error("❌ Failed to send reminder for session {}: {}",
                    session.getId(), e.getMessage(), e);
        }
    }

    /**
     * ✅ Get all student IDs enrolled in a specific class
     */
    private List<Long> getStudentIdsInClass(Long classId) {
        return userRepository.findAll().stream()
                .filter(user -> {
                    boolean isStudent = user.getRoles().stream()
                            .anyMatch(role -> "STUDENT".equalsIgnoreCase(role.getName()));

                    if (!isStudent) return false;

                    StudentProfile profile = user.getStudentProfile();
                    if (profile == null || profile.getClassLevel() == null) {
                        return false;
                    }

                    return profile.getClassLevel().getId().equals(classId);
                })
                .map(User::getId)
                .collect(Collectors.toList());
    }

    /**
     * ✅ Format Instant to readable date-time string
     */
    private String formatInstant(Instant instant) {
        DateTimeFormatter formatter = DateTimeFormatter
                .ofPattern("MMM dd, yyyy 'at' hh:mm a")
                .withZone(ZoneId.systemDefault());
        return formatter.format(instant);
    }

    /**
     * ✅ Optional: Daily cleanup of old notifications (runs at 2 AM daily)
     */
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void cleanupOldNotifications() {
        log.info("🧹 Running daily notification cleanup...");
        try {
            notificationService.cleanupOldNotifications(30); // Delete read notifications older than 30 days
            notificationService.deleteExpiredNotifications();
            log.info("✅ Notification cleanup completed");
        } catch (Exception e) {
            log.error("❌ Error during notification cleanup: {}", e.getMessage(), e);
        }
    }
}