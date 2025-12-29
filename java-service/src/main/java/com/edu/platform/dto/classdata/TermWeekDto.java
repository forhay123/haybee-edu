package com.edu.platform.dto.classdata;

import lombok.Builder;
import java.time.LocalDate;
/**
 * DTO for a specific week within a term
 * Used for schedule generation and week calculations
 */
@Builder
public record TermWeekDto(
        Integer weekNumber,
        LocalDate startDate,
        LocalDate endDate
) {
    /**
     * Format week information as string
     */
    public String getDisplayName() {
        return String.format("Week %d (%s - %s)", 
                weekNumber, 
                startDate, 
                endDate);
    }
}