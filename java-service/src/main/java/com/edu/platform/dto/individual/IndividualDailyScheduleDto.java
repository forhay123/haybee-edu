package com.edu.platform.dto.individual;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IndividualDailyScheduleDto {
    private Long id;
    private Long studentProfileId;
    private LocalDate scheduledDate;
    private String dayOfWeek;
    private Integer periodNumber;
    private String startTime;
    private String endTime;
    private Long subjectId;
    private String subjectName;
    private String subjectCode;
    private Long lessonTopicId;
    private String lessonTopicTitle;
    private boolean completed;
    private String scheduleSource; // "INDIVIDUAL" or "CLASS"
    private Long individualTimetableId;

    // Assessment window timing fields
    private LocalDateTime assessmentWindowStart;
    private LocalDateTime assessmentWindowEnd;
    private LocalDateTime gracePeriodEnd;

    // Progress ID for navigation
    private Long progressId;

    // ✅ NEW: Completion tracking (CRITICAL for frontend status calculation)
    private LocalDateTime completedAt;  // Frontend checks this for COMPLETED status
    private String status;              // SCHEDULED, COMPLETED, MISSED, etc.

    // ✅ ADD THESE FIELDS
    private Long assessmentSubmissionId;    // To check if submission exists
    private String incompleteReason;        // To identify missed vs completed
    private BigDecimal assessmentScore;        // To show score in UI
    
    // ✅ NEW: Separate access controls
    private Boolean lessonContentAccessible;  // Always true - allows viewing lessons anytime
    private Boolean assessmentAccessible;     // Time-restricted - controls assessment taking
}