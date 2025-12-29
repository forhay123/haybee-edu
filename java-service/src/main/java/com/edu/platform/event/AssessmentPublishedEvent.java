package com.edu.platform.event;

import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.model.enums.NotificationPriority;
import com.edu.platform.model.enums.NotificationType;

import java.util.ArrayList;
import java.util.List;

/**
 * Event fired when an assessment is published.
 * Creates notifications for all students enrolled in the assessment's subject.
 */
public class AssessmentPublishedEvent extends NotificationEvent {

    private final Assessment assessment;

    private AssessmentPublishedEvent(Long userId, Assessment assessment) {
        super(
            userId,
            NotificationType.ASSESSMENT_PUBLISHED,
            NotificationPriority.MEDIUM,
            "New Assessment Published",
            String.format("A new assessment '%s' has been published for %s. Due: %s",
                assessment.getTitle(),
                assessment.getSubject().getName(),
                assessment.getDueDate() != null ? assessment.getDueDate().toString() : "No due date"),
            "/student/assessments/" + assessment.getId(),
            assessment.getId(),
            "ASSESSMENT"
        );
        this.assessment = assessment;
    }

    public Assessment getAssessment() {
        return assessment;
    }

    /**
     * Factory method to create events for multiple students
     * @param assessment The published assessment
     * @param studentUserIds List of user IDs to notify
     * @return List of events, one per student
     */
    public static List<AssessmentPublishedEvent> forStudents(Assessment assessment, List<Long> studentUserIds) {
        List<AssessmentPublishedEvent> events = new ArrayList<>();
        for (Long userId : studentUserIds) {
            events.add(new AssessmentPublishedEvent(userId, assessment));
        }
        return events;
    }
}