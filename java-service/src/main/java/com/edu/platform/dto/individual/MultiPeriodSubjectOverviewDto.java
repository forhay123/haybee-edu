package com.edu.platform.dto.individual;

import lombok.*;

import java.time.LocalDate;
import java.util.List;

/**
 * DTO for teacher's overview of a multi-period subject.
 * Shows all students, their progress, and pending assessments.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MultiPeriodSubjectOverviewDto {

    /**
     * Subject information
     */
    private Long subjectId;
    private String subjectName;

    /**
     * Overall statistics
     */
    private Integer totalStudents;
    private Integer totalPeriods;
    private Integer completedPeriods;
    private Integer pendingAssessments;

    /**
     * Completion rate
     */
    private Double completionRate;

    /**
     * List of students and their progress
     */
    private List<StudentProgressSummary> students;

    /**
     * Period-by-period breakdown
     */
    private PeriodBreakdown periodBreakdown;

    /**
     * Urgent items needing attention
     */
    private List<UrgentItem> urgentItems;

    /**
     * Date range for this overview
     */
    private LocalDate fromDate;
    private LocalDate toDate;

    /**
     * Summary for one student
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentProgressSummary {
        private Long studentId;
        private String studentName;
        private Integer totalPeriods;
        private Integer completedPeriods;
        private Integer pendingAssessments;
        private Double averageScore;
        private List<PeriodProgressDto> periods;
        private LocalDate nextScheduledDate;
        private String currentStatus;
    }

    /**
     * Breakdown by period number
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PeriodBreakdown {
        private PeriodStats period1;
        private PeriodStats period2;
        private PeriodStats period3;
    }

    /**
     * Statistics for a specific period
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PeriodStats {
        private Integer periodNumber;
        private Integer totalCount;
        private Integer completedCount;
        private Integer waitingForAssessment;
        private Integer locked;
        private Double averageScore;
    }

    /**
     * Urgent item needing attention
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UrgentItem {
        private Long progressId;
        private Long studentId;
        private String studentName;
        private Integer periodNumber;
        private LocalDate scheduledDate;
        private UrgencyType urgencyType;
        private String message;
        private String action;
    }

    /**
     * Type of urgency
     */
    public enum UrgencyType {
        ASSESSMENT_NEEDED_TODAY,      // Custom assessment needed for today
        ASSESSMENT_NEEDED_SOON,       // Custom assessment needed within 3 days
        PERIOD_OVERDUE,               // Student missed their window
        STUDENT_STRUGGLING            // Student scored low, needs attention
    }
}
