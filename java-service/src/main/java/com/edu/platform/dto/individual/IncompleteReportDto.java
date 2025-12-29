package com.edu.platform.dto.individual;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * DTO for incomplete lesson report
 * SPRINT 11: Incomplete Tracking
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IncompleteReportDto {

    /**
     * Report metadata
     */
    private LocalDateTime generatedAt;
    private LocalDate reportStartDate;
    private LocalDate reportEndDate;
    private String reportType; // "STUDENT", "TEACHER", "SUBJECT", "ADMIN"
    private Long requestedById;
    private String requestedByName;

    /**
     * Summary statistics
     */
    private IncompleteStatisticsDto statistics;

    /**
     * List of incomplete progress records
     */
    @Builder.Default
    private List<IncompleteProgressDto> incompleteRecords = new ArrayList<>();

    /**
     * Breakdown by reason
     */
    @Builder.Default
    private Map<String, Long> incompleteByReason = new HashMap<>();

    /**
     * Breakdown by subject
     */
    @Builder.Default
    private Map<String, SubjectIncompleteBreakdown> incompleteBySubject = new HashMap<>();

    /**
     * Breakdown by student (for teacher/admin views)
     */
    @Builder.Default
    private Map<Long, StudentIncompleteBreakdown> incompleteByStudent = new HashMap<>();

    /**
     * Breakdown by week
     */
    @Builder.Default
    private Map<Integer, WeekIncompleteBreakdown> incompleteByWeek = new HashMap<>();

    /**
     * Most affected students (top 10)
     */
    @Builder.Default
    private List<StudentIncompleteBreakdown> mostAffectedStudents = new ArrayList<>();

    /**
     * Most affected subjects (top 10)
     */
    @Builder.Default
    private List<SubjectIncompleteBreakdown> mostAffectedSubjects = new ArrayList<>();

    /**
     * Filter criteria applied
     */
    private ReportFilters filters;

    /**
     * Inner class for subject breakdown
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SubjectIncompleteBreakdown {
        private Long subjectId;
        private String subjectName;
        private long incompleteCount;
        private long totalLessons;
        private double incompletePercentage;
        
        @Builder.Default
        private Map<String, Long> reasonBreakdown = new HashMap<>();
    }

    /**
     * Inner class for student breakdown
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StudentIncompleteBreakdown {
        private Long studentId;
        private String studentName;
        private String studentEmail;
        private long incompleteCount;
        private long totalLessons;
        private double incompletePercentage;
        
        @Builder.Default
        private Map<String, Long> reasonBreakdown = new HashMap<>();
        
        @Builder.Default
        private List<String> affectedSubjects = new ArrayList<>();
    }

    /**
     * Inner class for week breakdown
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WeekIncompleteBreakdown {
        private Integer weekNumber;
        private LocalDate weekStartDate;
        private LocalDate weekEndDate;
        private long incompleteCount;
        private long totalLessons;
        private double incompletePercentage;
    }

    /**
     * Inner class for report filters
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReportFilters {
        private Long studentId;
        private Long subjectId;
        private Long teacherId;
        private String incompleteReason;
        private LocalDate startDate;
        private LocalDate endDate;
        private Integer weekNumber;
        private String scheduleSource;
        private Integer minDaysOverdue;
        private String urgencyLevel;
    }

    /**
     * Add incomplete record
     */
    public void addIncompleteRecord(IncompleteProgressDto record) {
        this.incompleteRecords.add(record);
    }

    /**
     * Get total incomplete count
     */
    public long getTotalIncompleteCount() {
        return incompleteRecords.size();
    }

    /**
     * Get completion rate (percentage of completed lessons)
     */
    public double getCompletionRate() {
        if (statistics == null || statistics.getTotalLessons() == 0) {
            return 0.0;
        }
        long completed = statistics.getTotalLessons() - statistics.getTotalIncomplete();
        return (completed * 100.0) / statistics.getTotalLessons();
    }
}