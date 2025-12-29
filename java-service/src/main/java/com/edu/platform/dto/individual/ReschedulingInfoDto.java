package com.edu.platform.dto.individual;

import lombok.*;
import java.time.LocalDate;

/**
 * DTO for rescheduling information when Saturday is a holiday
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReschedulingInfoDto {

    /**
     * The Saturday date that is a holiday
     */
    private LocalDate saturdayDate;

    /**
     * Holiday details
     */
    private PublicHolidayDto holiday;

    /**
     * Is rescheduling required?
     */
    private boolean reschedulingRequired;

    /**
     * Suggested alternate day for the Saturday periods
     */
    private LocalDate suggestedAlternateDay;

    /**
     * Rescheduling strategy used
     * e.g., "LEAST_LOADED_DAY", "FRIDAY_DEFAULT", "MANUAL"
     */
    private String reschedulingStrategy;

    /**
     * Number of periods that need to be rescheduled
     */
    private Integer periodsToReschedule;

    /**
     * Can the alternate day accept more periods?
     */
    private Boolean canAcceptPeriods;

    /**
     * Current period count on alternate day
     */
    private Integer currentPeriodsOnAlternateDay;

    /**
     * Maximum periods allowed per day
     */
    private Integer maxPeriodsPerDay;

    /**
     * Time slot information for rescheduling
     */
    private ReschedulingTimeSlotDto timeSlot;

    /**
     * Week number affected
     */
    private Integer weekNumber;

    /**
     * Any warnings or notes
     */
    private String notes;
}