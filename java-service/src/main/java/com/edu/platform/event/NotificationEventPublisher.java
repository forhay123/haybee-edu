package com.edu.platform.event;

import com.edu.platform.model.Announcement;
import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.model.assessment.AssessmentSubmission;
import com.edu.platform.model.chat.ChatMessage;
import com.edu.platform.model.enums.NotificationPriority;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Wrapper around Spring's ApplicationEventPublisher for notification events.
 * Provides type-safe methods for publishing notification events.
 * 
 * IMPORTANT: For bulk notifications (like assessment published), this class
 * creates multiple individual events (one per student) and publishes them.
 * The listener will be called once for each event.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventPublisher {

    private final ApplicationEventPublisher eventPublisher;

    /**
     * Publish assessment published events for multiple students.
     * Creates one event per student and publishes them individually.
     * 
     * @param assessment The published assessment
     * @param studentUserIds List of user IDs to notify
     */
    public void publishAssessmentPublished(Assessment assessment, List<Long> studentUserIds) {
        if (studentUserIds == null || studentUserIds.isEmpty()) {
            log.warn("⚠️ No students to notify for assessment: {}", assessment.getTitle());
            return;
        }

        log.info("📢 Publishing {} assessment published events for: {}", 
                 studentUserIds.size(), assessment.getTitle());
        
        // Create list of events using factory method
        List<AssessmentPublishedEvent> events = AssessmentPublishedEvent.forStudents(assessment, studentUserIds);
        
        // Publish each event individually
        int successCount = 0;
        for (AssessmentPublishedEvent event : events) {
            try {
                eventPublisher.publishEvent(event);
                successCount++;
            } catch (Exception e) {
                log.error("❌ Failed to publish assessment published event for user: {}", 
                         event.getUserId(), e);
            }
        }
        
        log.info("✅ Published {}/{} assessment published events", successCount, events.size());
    }

    /**
     * Publish grade released event for a single student.
     * 
     * @param submission The graded submission
     */
    public void publishGradeReleased(AssessmentSubmission submission) {
        if (submission == null || submission.getStudent() == null) {
            log.warn("⚠️ Cannot publish grade released event: submission or student is null");
            return;
        }

        // Create event using factory method
        GradeReleasedEvent event = GradeReleasedEvent.fromSubmission(submission);
        
        log.info("📢 Publishing grade released event for user: {} (Assessment: {}, Score: {}/{})", 
                 event.getUserId(), 
                 submission.getAssessment().getTitle(),
                 submission.getScore(),
                 submission.getAssessment().getTotalMarks());
        
        try {
            eventPublisher.publishEvent(event);
            log.debug("✅ Grade released event published successfully");
        } catch (Exception e) {
            log.error("❌ Failed to publish grade released event for submission: {}", 
                     submission.getId(), e);
        }
    }

    // ==================== FUTURE EVENT TYPES ====================
    
    /**
     * Placeholder for future announcement events.
     * TODO: Implement when announcement feature is added
     */
    public void publishAnnouncement(String title, String message, List<Long> userIds) {
        log.info("📢 Announcement feature coming soon: {}", title);
        // TODO: Create AnnouncementEvent and publish
    }

    /**
     * Placeholder for future live class events.
     * TODO: Implement when live class feature is added
     */
    public void publishLiveClassScheduled(Long classId, List<Long> studentUserIds) {
        log.info("📢 Live class notification feature coming soon");
        // TODO: Create LiveClassScheduledEvent and publish
    }
    
    
    /**
     * ✅ NEW: Publish assessment submitted event for teacher.
     * 
     * @param submission The submitted assessment
     * @param teacherUserId The teacher who created the assessment
     * @param studentName Name of the student who submitted
     */
    public void publishAssessmentSubmitted(
            AssessmentSubmission submission,
            Long teacherUserId,
            String studentName) {
        
        if (teacherUserId == null) {
            log.warn("⚠️ Cannot publish assessment submitted event: teacher ID is null");
            return;
        }

        log.info("📢 Publishing assessment submitted event for teacher {} (Student: {}, Assessment: {})", 
                 teacherUserId, studentName, submission.getAssessment().getTitle());
        
        try {
            AssessmentSubmittedEvent event = AssessmentSubmittedEvent.fromSubmission(
                    submission, teacherUserId, studentName);
            eventPublisher.publishEvent(event);
            log.debug("✅ Assessment submitted event published successfully");
        } catch (Exception e) {
            log.error("❌ Failed to publish assessment submitted event for submission: {}", 
                     submission.getId(), e);
        }
    }
    
    
    
    /**
     * ✅ NEW: Publish chat message event for recipient(s).
     * 
     * @param message The chat message that was sent
     * @param recipientUserIds List of user IDs who should be notified
     */
    public void publishChatMessage(ChatMessage message, List<Long> recipientUserIds) {
        if (recipientUserIds == null || recipientUserIds.isEmpty()) {
            log.warn("⚠️ No recipients to notify for chat message: {}", message.getId());
            return;
        }

        log.info("📢 Publishing {} chat message events for message from: {}", 
                 recipientUserIds.size(), message.getSenderName());
        
        // Create and publish events for each recipient
        int successCount = 0;
        for (Long recipientId : recipientUserIds) {
            // Don't notify the sender
            if (recipientId.equals(message.getSenderId())) {
                continue;
            }
            
            try {
                ChatMessageEvent event = ChatMessageEvent.forRecipient(message, recipientId);
                eventPublisher.publishEvent(event);
                successCount++;
            } catch (Exception e) {
                log.error("❌ Failed to publish chat message event for user: {}", recipientId, e);
            }
        }
        
        log.info("✅ Published {}/{} chat message events", successCount, recipientUserIds.size());
    }
    
    
    
    
    /**
     * ✅ NEW: Publish announcement to multiple users
     * 
     * @param announcement The announcement to publish
     * @param userIds List of user IDs to notify
     */
    public void publishAnnouncement(Announcement announcement, List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            log.warn("⚠️ No users to notify for announcement: {}", announcement.getTitle());
            return;
        }

        log.info("📢 Publishing {} announcement events for: {}", 
                 userIds.size(), announcement.getTitle());
        
        // Create list of events using factory method
        List<AnnouncementPublishedEvent> events = 
                AnnouncementPublishedEvent.forUsers(announcement, userIds);
        
        // Publish each event individually
        int successCount = 0;
        for (AnnouncementPublishedEvent event : events) {
            try {
                eventPublisher.publishEvent(event);
                successCount++;
            } catch (Exception e) {
                log.error("❌ Failed to publish announcement event for user: {}", 
                         event.getUserId(), e);
            }
        }
        
        log.info("✅ Published {}/{} announcement events", successCount, events.size());
    }

    /**
     * ✅ NEW: Publish system alert to multiple users
     * System alerts are always HIGH priority
     * 
     * @param title Alert title
     * @param message Alert message
     * @param actionUrl Optional action URL
     * @param alertId ID of the announcement/alert
     * @param userIds List of user IDs to notify
     */
    public void publishSystemAlert(
            String title,
            String message,
            String actionUrl,
            Long alertId,
            List<Long> userIds) {
        
        if (userIds == null || userIds.isEmpty()) {
            log.warn("⚠️ No users to notify for system alert: {}", title);
            return;
        }

        log.info("🚨 Publishing {} system alert events for: {}", userIds.size(), title);
        
        // Create list of events using factory method
        List<SystemAlertEvent> events = 
                SystemAlertEvent.forUsers(title, message, actionUrl, alertId, userIds);
        
        // Publish each event individually
        int successCount = 0;
        for (SystemAlertEvent event : events) {
            try {
                eventPublisher.publishEvent(event);
                successCount++;
            } catch (Exception e) {
                log.error("❌ Failed to publish system alert event for user: {}", 
                         event.getUserId(), e);
            }
        }
        
        log.info("✅ Published {}/{} system alert events", successCount, events.size());
    }
    
    
    /**
     * ✅ SPRINT 5: Publish assessment available event
     * Called when assessment window opens (30 mins before period)
     */
    public void publishAssessmentAvailable(
            Long userId,
            Long progressId,
            String title,
            String message,
            LocalDateTime deadline) {
        
        if (userId == null) {
            log.warn("⚠️ Cannot publish assessment available event: user ID is null");
            return;
        }

        log.info("📢 Publishing assessment available event for user {} (Progress: {})", 
                 userId, progressId);
        
        try {
            SystemNotificationEvent event = SystemNotificationEvent.assessmentAvailable(
                    userId,
                    progressId,
                    title,
                    message,
                    "/student/assessments/" + progressId,
                    deadline
            );
            
            eventPublisher.publishEvent(event);
            log.debug("✅ Assessment available event published successfully");
        } catch (Exception e) {
            log.error("❌ Failed to publish assessment available event for user: {}", userId, e);
        }
    }

    /**
     * ✅ SPRINT 5: Publish assessment expired event
     * Called when grace period expires and student hasn't submitted
     */
    public void publishAssessmentExpired(
            Long userId,
            Long progressId,
            String title,
            String message) {
        
        if (userId == null) {
            log.warn("⚠️ Cannot publish assessment expired event: user ID is null");
            return;
        }

        log.info("📢 Publishing assessment expired event for user {} (Progress: {})", 
                 userId, progressId);
        
        try {
            SystemNotificationEvent event = SystemNotificationEvent.assessmentExpired(
                    userId,
                    progressId,
                    title,
                    message,
                    "/student/progress"
            );
            
            eventPublisher.publishEvent(event);
            log.debug("✅ Assessment expired event published successfully");
        } catch (Exception e) {
            log.error("❌ Failed to publish assessment expired event for user: {}", userId, e);
        }
    }

    /**
     * ✅ SPRINT 5: Publish student missed assessment event (for teachers)
     * Notifies teacher when student misses assessment deadline
     */
    public void publishStudentMissedAssessment(
            Long teacherUserId,
            Long studentProfileId,
            Long progressId,
            String title,
            String message) {
        
        if (teacherUserId == null) {
            log.warn("⚠️ Cannot publish student missed assessment event: teacher ID is null");
            return;
        }

        log.info("📢 Publishing student missed assessment event for teacher {} (Student: {})", 
                 teacherUserId, studentProfileId);
        
        try {
            SystemNotificationEvent event = SystemNotificationEvent.studentMissedAssessment(
                    teacherUserId,
                    studentProfileId,
                    progressId,
                    title,
                    message,
                    "/teacher/progress/student/" + studentProfileId
            );
            
            eventPublisher.publishEvent(event);
            log.debug("✅ Student missed assessment event published successfully");
        } catch (Exception e) {
            log.error("❌ Failed to publish student missed assessment event for teacher: {}", 
                     teacherUserId, e);
        }
    }
	    
	
	/**
	 * ✅ NEW: Publish a custom notification event
	 * Used for notifications that don't fit standard event types
	 * 
	 * @param userId User to notify
	 * @param type Notification type string (will be mapped to enum or kept as custom)
	 * @param title Notification title
	 * @param message Notification message
	 * @param priority Notification priority
	 * @param data Additional data/metadata for the notification
	 */
	public void publishCustomNotification(
	        Long userId,
	        String type,
	        String title,
	        String message,
	        NotificationPriority priority,
	        Map<String, Object> data) {
	    
	    if (userId == null) {
	        log.warn("⚠️ Cannot publish custom notification: user ID is null");
	        return;
	    }
	
	    log.info("📢 Publishing custom notification for user {} (Type: {})", userId, type);
	    
	    try {
	        // Extract common fields from data
	        String actionUrl = data != null ? (String) data.get("actionUrl") : null;
	        Long relatedEntityId = data != null ? (Long) data.get("relatedEntityId") : null;
	        String relatedEntityType = data != null ? (String) data.get("relatedEntityType") : null;
	        
	        // Create custom notification event
	        CustomNotificationEvent event = CustomNotificationEvent.builder()
	                .userId(userId)
	                .type(type)
	                .title(title)
	                .message(message)
	                .priority(priority)
	                .actionUrl(actionUrl)
	                .relatedEntityId(relatedEntityId)
	                .relatedEntityType(relatedEntityType)
	                .data(data)
	                .build();
	        
	        eventPublisher.publishEvent(event);
	        log.debug("✅ Custom notification event published successfully");
	    } catch (Exception e) {
	        log.error("❌ Failed to publish custom notification event for user: {}", userId, e);
	    }
	}
	
	

    // ==================== CUSTOM ASSESSMENT NOTIFICATION HELPERS ====================
    
    /**
     * ✅ NEW: Notify teacher that custom assessment is needed for Period 2/3
     * Called when student completes Period 1 and Period 2 needs teacher-created assessment
     */
    public void publishCustomAssessmentNeeded(
            Long teacherUserId,
            Long studentProfileId,
            String studentName,
            Long subjectId,
            String subjectName,
            Integer periodNumber,
            java.time.LocalDate scheduledDate,
            Long previousSubmissionId,
            Long progressId) {
        
        if (teacherUserId == null) {
            log.warn("⚠️ Cannot publish custom assessment needed: teacher ID is null");
            return;
        }

        log.info("📢 Notifying teacher {} - Custom assessment needed (Student: {}, Subject: {}, Period: {})", 
                 teacherUserId, studentName, subjectName, periodNumber);
        
        // Build metadata
        Map<String, Object> data = new java.util.HashMap<>();
        data.put("studentProfileId", studentProfileId);
        data.put("studentName", studentName);
        data.put("subjectId", subjectId);
        data.put("subjectName", subjectName);
        data.put("periodNumber", periodNumber);
        data.put("scheduledDate", scheduledDate);
        data.put("previousSubmissionId", previousSubmissionId);
        data.put("actionUrl", "/teacher/custom-assessments/create?student=" + studentProfileId + 
                              "&subject=" + subjectId + "&period=" + periodNumber);
        data.put("relatedEntityId", progressId);
        data.put("relatedEntityType", "PROGRESS");
        
        // Use existing publishCustomNotification method
        publishCustomNotification(
            teacherUserId,
            "CUSTOM_ASSESSMENT_NEEDED",
            "Custom Assessment Needed - Period " + periodNumber,
            String.format("%s completed Period %d in %s. Create custom Period %d assessment by %s.", 
                         studentName, periodNumber - 1, subjectName, periodNumber, scheduledDate),
            NotificationPriority.HIGH,
            data
        );
    }

    /**
     * ✅ NEW: Notify student that custom assessment is ready
     * Called when teacher creates Period 2/3 custom assessment
     */
    public void publishCustomAssessmentCreated(
            Long studentUserId,
            Long assessmentId,
            String assessmentTitle,
            Long subjectId,
            String subjectName,
            Integer periodNumber,
            java.time.LocalDate availableDate,
            Long progressId) {
        
        if (studentUserId == null) {
            log.warn("⚠️ Cannot publish custom assessment created: student ID is null");
            return;
        }

        log.info("📢 Notifying student {} - Custom assessment created (Subject: {}, Period: {})", 
                 studentUserId, subjectName, periodNumber);
        
        // Build metadata
        Map<String, Object> data = new java.util.HashMap<>();
        data.put("assessmentId", assessmentId);
        data.put("assessmentTitle", assessmentTitle);
        data.put("subjectId", subjectId);
        data.put("subjectName", subjectName);
        data.put("periodNumber", periodNumber);
        data.put("availableDate", availableDate);
        data.put("actionUrl", "/student/assessments/" + assessmentId);
        data.put("relatedEntityId", assessmentId);
        data.put("relatedEntityType", "ASSESSMENT");
        
        // Use existing publishCustomNotification method
        publishCustomNotification(
            studentUserId,
            "CUSTOM_ASSESSMENT_CREATED",
            "Custom Assessment Ready - Period " + periodNumber,
            String.format("Your teacher created a custom Period %d assessment for %s: %s", 
                         periodNumber, subjectName, assessmentTitle),
            NotificationPriority.MEDIUM,
            data
        );
    }

    /**
     * ✅ NEW: Notify teacher about multiple pending custom assessments
     * Called to remind teacher about pending assessments (e.g., scheduled task)
     */
    public void publishPendingCustomAssessmentsReminder(
            Long teacherUserId,
            int pendingCount,
            List<String> studentSubjectList) {
        
        if (teacherUserId == null || pendingCount == 0) {
            return;
        }

        log.info("📢 Notifying teacher {} - {} pending custom assessments", 
                 teacherUserId, pendingCount);
        
        // Build metadata
        Map<String, Object> data = new java.util.HashMap<>();
        data.put("pendingCount", pendingCount);
        data.put("studentSubjectList", studentSubjectList);
        data.put("actionUrl", "/teacher/custom-assessments/pending");
        data.put("relatedEntityType", "CUSTOM_ASSESSMENT_LIST");
        
        String message = pendingCount == 1 
            ? "You have 1 student waiting for a custom assessment."
            : String.format("You have %d students waiting for custom assessments.", pendingCount);
        
        // Use existing publishCustomNotification method
        publishCustomNotification(
            teacherUserId,
            "PENDING_CUSTOM_ASSESSMENTS_REMINDER",
            "Pending Custom Assessments",
            message,
            NotificationPriority.MEDIUM,
            data
        );
    }

    /**
     * ✅ NEW: Notify student when previous period must be completed first
     * Called when student tries to access locked period
     */
    public void publishPeriodLockedNotification(
            Long studentUserId,
            Long subjectId,
            String subjectName,
            Integer currentPeriod,
            Integer requiredPeriod,
            Long blockedProgressId) {
        
        if (studentUserId == null) {
            log.warn("⚠️ Cannot publish period locked notification: student ID is null");
            return;
        }

        log.info("📢 Notifying student {} - Period {} locked (must complete Period {} first)", 
                 studentUserId, currentPeriod, requiredPeriod);
        
        // Build metadata
        Map<String, Object> data = new java.util.HashMap<>();
        data.put("subjectId", subjectId);
        data.put("subjectName", subjectName);
        data.put("currentPeriod", currentPeriod);
        data.put("requiredPeriod", requiredPeriod);
        data.put("actionUrl", "/student/progress");
        data.put("relatedEntityId", blockedProgressId);
        data.put("relatedEntityType", "PROGRESS");
        
        // Use existing publishCustomNotification method
        publishCustomNotification(
            studentUserId,
            "PERIOD_LOCKED",
            "Complete Previous Period First",
            String.format("You must complete Period %d in %s before accessing Period %d.", 
                         requiredPeriod, subjectName, currentPeriod),
            NotificationPriority.LOW,
            data
        );
    }

    
}