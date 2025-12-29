package com.edu.platform.dto.individual;

import lombok.*;
import java.time.LocalDate;

/**
 * DTO for rescheduled time slot information
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReschedulingTimeSlotDto {

    /**
     * The alternate day for the rescheduled period
     */
    private LocalDate alternateDay;

    /**
     * Suggested start time for rescheduled period (e.g., "16:00")
     */
    private String suggestedStartTime;

    /**
     * Suggested end time for rescheduled period (e.g., "17:00")
     */
    private String suggestedEndTime;

    /**
     * Original start time on Saturday
     */
    private String originalStartTime;

    /**
     * Original end time on Saturday
     */
    private String originalEndTime;

    /**
     * Number of existing periods on alternate day
     */
    private Integer existingPeriodsOnDay;

    /**
     * Day of week name (e.g., "FRIDAY")
     */
    private String dayOfWeek;

    /**
     * Is this time slot available?
     */
    private Boolean available;

    /**
     * Any conflicts or issues with this slot
     */
    private String conflictReason;
}