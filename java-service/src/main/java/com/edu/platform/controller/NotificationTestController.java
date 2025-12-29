package com.edu.platform.controller;

import com.edu.platform.event.NotificationEventPublisher;
import com.edu.platform.model.Notification;
import com.edu.platform.model.enums.NotificationPriority;
import com.edu.platform.model.enums.NotificationType;
import com.edu.platform.repository.UserRepository;
import com.edu.platform.repository.assessment.AssessmentRepository;
import com.edu.platform.repository.assessment.AssessmentSubmissionRepository;
import com.edu.platform.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * TEST CONTROLLER - For Phase 3 testing only.
 * DELETE THIS AFTER PHASE 3 IS COMPLETE.
 * 
 * Endpoints to manually test notification creation and event publishing.
 */
@RestController
@RequestMapping("/api/test/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationTestController {

    private final NotificationService notificationService;
    private final NotificationEventPublisher eventPublisher;
    private final AssessmentRepository assessmentRepository;
    private final AssessmentSubmissionRepository submissionRepository;
    private final UserRepository userRepository;

    /**
     * Test creating a single notification directly.
     * GET /api/test/notifications/create-single?userId=1
     */
    @GetMapping("/create-single")
    public ResponseEntity<?> createSingleNotification(@RequestParam Long userId) {
        log.info("🧪 TEST: Creating single notification for user {}", userId);

        try {
            Notification notification = notificationService.createNotification(
                userId,
                NotificationType.SYSTEM_ALERT,
                NotificationPriority.MEDIUM,
                "Test Notification",
                "This is a test notification created via API",
                "/test",
                999L,
                "TEST"
            );

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Notification created",
                "notificationId", notification.getId(),
                "title", notification.getTitle(),
                "isRead", notification.isRead()
            ));
        } catch (Exception e) {
            log.error("❌ Failed to create notification: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Test creating bulk notifications.
     * GET /api/test/notifications/create-bulk?userIds=1,2,3
     */
    @GetMapping("/create-bulk")
    public ResponseEntity<?> createBulkNotifications(@RequestParam List<Long> userIds) {
        log.info("🧪 TEST: Creating bulk notifications for {} users", userIds.size());

        try {
            List<Notification> notifications = notificationService.createBulkNotifications(
                userIds,
                NotificationType.SYSTEM_ALERT,
                NotificationPriority.LOW,
                "Bulk Test Notification",
                "This is a bulk test notification",
                "/test",
                null,
                null
            );

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Bulk notifications created",
                "count", notifications.size(),
                "userIds", userIds
            ));
        } catch (Exception e) {
            log.error("❌ Failed to create bulk notifications: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Test publishing AssessmentPublishedEvent using a REAL assessment from database.
     * GET /api/test/notifications/event-assessment?assessmentId=1&studentIds=1,2,3
     * 
     * OR if you want to test without a real assessment:
     * GET /api/test/notifications/event-assessment-mock?studentIds=1,2,3
     */
    @GetMapping("/event-assessment")
    public ResponseEntity<?> publishAssessmentEvent(
        @RequestParam Long assessmentId,
        @RequestParam List<Long> studentIds
    ) {
        log.info("🧪 TEST: Publishing AssessmentPublishedEvent for assessment {} to {} students", 
            assessmentId, studentIds.size());

        try {
            // Fetch real assessment from database
            var assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new RuntimeException("Assessment not found: " + assessmentId));

            // Publish events (one per student)
            eventPublisher.publishAssessmentPublished(assessment, studentIds);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "AssessmentPublishedEvent published",
                "eventType", "ASSESSMENT_PUBLISHED",
                "assessmentId", assessmentId,
                "assessmentTitle", assessment.getTitle(),
                "studentCount", studentIds.size(),
                "note", "Check logs for '🔔 Processing assessment published event' messages"
            ));
        } catch (Exception e) {
            log.error("❌ Failed to publish assessment event: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage(),
                "hint", "Make sure assessment exists in database or use /event-assessment-mock endpoint"
            ));
        }
    }

    /**
     * Test publishing GradeReleasedEvent using a REAL submission from database.
     * GET /api/test/notifications/event-grade?submissionId=1
     * 
     * This will notify the student who made the submission.
     */
    @GetMapping("/event-grade")
    public ResponseEntity<?> publishGradeEvent(@RequestParam Long submissionId) {
        log.info("🧪 TEST: Publishing GradeReleasedEvent for submission {}", submissionId);

        try {
            // Fetch real submission from database
            var submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Submission not found: " + submissionId));

            // Publish event using factory method
            eventPublisher.publishGradeReleased(submission);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "GradeReleasedEvent published",
                "eventType", "GRADE_RELEASED",
                "submissionId", submissionId,
                "assessmentTitle", submission.getAssessment().getTitle(),
                "studentUserId", submission.getStudent().getUser().getId(),
                "score", submission.getScore() != null ? submission.getScore() : "Not graded yet",
                "note", "Check logs for '🔔 Processing grade released event' message"
            ));
        } catch (Exception e) {
            log.error("❌ Failed to publish grade event: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage(),
                "hint", "Make sure submission exists in database and is graded"
            ));
        }
    }

    /**
     * Test getting recent notifications.
     * GET /api/test/notifications/recent?userId=1
     */
    @GetMapping("/recent")
    public ResponseEntity<?> getRecentNotifications(@RequestParam Long userId) {
        log.info("🧪 TEST: Getting recent notifications for user {}", userId);

        try {
            List<Notification> notifications = notificationService.getRecentNotifications(userId);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "count", notifications.size(),
                "notifications", notifications.stream().map(n -> Map.of(
                    "id", n.getId(),
                    "title", n.getTitle(),
                    "message", n.getMessage(),
                    "type", n.getType(),
                    "isRead", n.isRead(),
                    "createdAt", n.getCreatedAt()
                )).toList()
            ));
        } catch (Exception e) {
            log.error("❌ Failed to get recent notifications: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Test getting unread count.
     * GET /api/test/notifications/unread-count?userId=1
     */
    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(@RequestParam Long userId) {
        log.info("🧪 TEST: Getting unread count for user {}", userId);

        try {
            long count = notificationService.getUnreadCount(userId);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "userId", userId,
                "unreadCount", count
            ));
        } catch (Exception e) {
            log.error("❌ Failed to get unread count: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Test marking notification as read.
     * POST /api/test/notifications/mark-read?notificationId=1&userId=1
     */
    @PostMapping("/mark-read")
    public ResponseEntity<?> markAsRead(
        @RequestParam Long notificationId,
        @RequestParam Long userId
    ) {
        log.info("🧪 TEST: Marking notification {} as read for user {}", notificationId, userId);

        try {
            Notification notification = notificationService.markAsRead(notificationId, userId);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Notification marked as read",
                "notificationId", notification.getId(),
                "isRead", notification.isRead(),
                "readAt", notification.getReadAt()
            ));
        } catch (Exception e) {
            log.error("❌ Failed to mark as read: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Test marking all as read.
     * POST /api/test/notifications/mark-all-read?userId=1
     */
    @PostMapping("/mark-all-read")
    public ResponseEntity<?> markAllAsRead(@RequestParam Long userId) {
        log.info("🧪 TEST: Marking all notifications as read for user {}", userId);

        try {
            int count = notificationService.markAllAsRead(userId);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "All notifications marked as read",
                "count", count,
                "userId", userId
            ));
        } catch (Exception e) {
            log.error("❌ Failed to mark all as read: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Test deleting a notification.
     * DELETE /api/test/notifications/delete?notificationId=1&userId=1
     */
    @DeleteMapping("/delete")
    public ResponseEntity<?> deleteNotification(
        @RequestParam Long notificationId,
        @RequestParam Long userId
    ) {
        log.info("🧪 TEST: Deleting notification {} for user {}", notificationId, userId);

        try {
            notificationService.deleteNotification(notificationId, userId);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Notification deleted",
                "notificationId", notificationId
            ));
        } catch (Exception e) {
            log.error("❌ Failed to delete notification: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }
}