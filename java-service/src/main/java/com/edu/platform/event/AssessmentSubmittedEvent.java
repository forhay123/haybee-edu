package com.edu.platform.event;

import com.edu.platform.model.assessment.AssessmentSubmission;
import com.edu.platform.model.enums.NotificationPriority;
import com.edu.platform.model.enums.NotificationType;

/**
 * Event fired when a student submits an assessment.
 * Notifies the teacher who created the assessment.
 * ✅ FIXED: Uses SUBMISSION_RECEIVED and handles null scores properly
 */
public class AssessmentSubmittedEvent extends NotificationEvent {

    private final AssessmentSubmission submission;
    private final String studentName;

    private AssessmentSubmittedEvent(
            Long teacherUserId,
            AssessmentSubmission submission,
            String studentName) {
        super(
            teacherUserId,
            NotificationType.SUBMISSION_RECEIVED, // ✅ Changed from ASSIGNMENT_SUBMITTED
            // High priority if needs manual grading, medium if auto-graded
            Boolean.TRUE.equals(submission.getGraded())
                ? NotificationPriority.MEDIUM
                : NotificationPriority.HIGH,
            String.format("%s submitted: %s", studentName, submission.getAssessment().getTitle()),
            buildMessage(submission, studentName),
            "/teacher/assessments/" + submission.getAssessment().getId() + "/submissions",
            submission.getId(),
            "ASSESSMENT_SUBMISSION"
        );
        this.submission = submission;
        this.studentName = studentName;
    }

    /**
     * ✅ FIXED: Properly handles null values and correct format specifiers
     */
    private static String buildMessage(AssessmentSubmission submission, String studentName) {
        StringBuilder msg = new StringBuilder();
        msg.append(String.format("%s has submitted their answers for '%s' in %s.",
                studentName,
                submission.getAssessment().getTitle(),
                submission.getAssessment().getSubject().getName()));

        // ✅ Check ALL conditions before formatting scores
        if (Boolean.TRUE.equals(submission.getGraded())
                && submission.getScore() != null
                && submission.getTotalMarks() != null
                && submission.getPercentage() != null) {

            // Auto-graded with valid scores
            // ✅ CRITICAL: Use %d for Integer, %.1f for Double
            msg.append(String.format(" Score: %.1f/%d (%.1f%%)",
                    submission.getScore(),          // Double - use %.1f
                    submission.getTotalMarks(),     // Integer - use %d
                    submission.getPercentage()));   // Double - use %.1f
        } else {
            // Needs manual grading or scores not yet calculated
            msg.append(" ⚠️ Requires manual grading.");
        }

        return msg.toString();
    }

    public AssessmentSubmission getSubmission() {
        return submission;
    }

    public String getStudentName() {
        return studentName;
    }

    /**
     * Factory method to create event from submission
     */
    public static AssessmentSubmittedEvent fromSubmission(
            AssessmentSubmission submission,
            Long teacherUserId,
            String studentName) {
        return new AssessmentSubmittedEvent(teacherUserId, submission, studentName);
    }
}