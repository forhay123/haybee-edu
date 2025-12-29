package com.edu.platform.dto.individual;

import lombok.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * DTO for holiday statistics and rescheduling impact
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HolidayStatisticsDto {

    /**
     * Date range for statistics
     */
    private LocalDate startDate;
    private LocalDate endDate;

    /**
     * Total number of holidays in range
     */
    private int totalHolidays;

    /**
     * Number of Saturday holidays
     */
    private long saturdayHolidays;

    /**
     * Number of weekday holidays
     */
    private long weekdayHolidays;

    /**
     * Is rescheduling required?
     */
    private boolean reschedulingRequired;

    /**
     * Number of weeks affected
     */
    private long affectedWeeks;

    /**
     * List of Saturday holidays with details
     */
    @Builder.Default
    private List<SaturdayHolidayInfo> saturdayHolidaysList = new ArrayList<>();

    /**
     * Inner class for Saturday holiday info
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SaturdayHolidayInfo {
        private Long holidayId;
        private LocalDate date;
        private String name;
        private Integer weekNumber;
        private boolean rescheduled;
    }
}