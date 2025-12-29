package com.edu.platform.dto.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * ✅ SPRINT 6: DTO for missing lesson topic notifications.
 * Sent to admins and teachers when lesson topics are missing for a week.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MissingTopicNotificationDto {

    /**
     * Subject information
     */
    private Long subjectId;
    private String subjectName;

    /**
     * Week information
     */
    private Integer weekNumber;
    private LocalDate weekStartDate;
    private LocalDate weekEndDate;

    /**
     * Affected students count
     */
    private Integer affectedStudentCount;

    /**
     * Detailed student list
     */
    private List<StudentDetail> studentDetails;

    /**
     * Teacher information (for admin notifications)
     */
    private Long teacherId;
    private String teacherName;
    private String teacherEmail;

    /**
     * Action URLs
     */
    private String createTopicUrl;
    private String viewDetailsUrl;
    private String assignExistingTopicUrl;

    /**
     * Additional context
     */
    private Boolean hasExistingTopicsForOtherWeeks;
    private Integer totalPeriodsAffected;

    /**
     * Nested class for student details
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentDetail {
        private Long studentId;
        private String studentName;
        private String className;
        private String studentType;
        private List<String> scheduleSlots;
        private Integer totalPeriods;
    }
}