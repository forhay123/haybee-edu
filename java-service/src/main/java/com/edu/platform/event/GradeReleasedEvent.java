package com.edu.platform.event;

import com.edu.platform.model.assessment.AssessmentSubmission;
import com.edu.platform.model.enums.NotificationPriority;
import com.edu.platform.model.enums.NotificationType;

/**
 * Event fired when a submission is graded.
 * Creates a notification for the student who submitted.
 */
public class GradeReleasedEvent extends NotificationEvent {

    private final AssessmentSubmission submission;

    private GradeReleasedEvent(AssessmentSubmission submission) {
        super(
            submission.getStudent().getUser().getId(),
            NotificationType.GRADE_RELEASED,
            NotificationPriority.HIGH,
            "Your Submission Has Been Graded",
            String.format("Your submission for '%s' has been graded. Score: %.2f/%d",
                submission.getAssessment().getTitle(),
                submission.getScore() != null ? submission.getScore() : 0.0,
                submission.getAssessment().getTotalMarks()),
            "/student/assessments/" + submission.getAssessment().getId() + "/result",
            submission.getId(),
            "SUBMISSION"
        );
        this.submission = submission;
    }

    public AssessmentSubmission getSubmission() {
        return submission;
    }

    /**
     * Factory method to create event from submission
     * @param submission The graded submission
     * @return Event for the student
     */
    public static GradeReleasedEvent fromSubmission(AssessmentSubmission submission) {
        return new GradeReleasedEvent(submission);
    }
}