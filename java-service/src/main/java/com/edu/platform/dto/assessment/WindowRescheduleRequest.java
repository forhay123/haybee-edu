package com.edu.platform.dto.assessment;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Request DTO for rescheduling assessment window
 * Teacher sets NEW start time, system auto-calculates 1-hour window
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WindowRescheduleRequest {
    
    @NotNull(message = "Daily schedule ID is required")
    private Long dailyScheduleId;
    
    @NotNull(message = "New window start time is required")
    private LocalDateTime newWindowStart;
    
    // Note: newWindowEnd is AUTO-CALCULATED (newWindowStart + 1 hour)
    // No need to send it from frontend
    
    @Size(min = 10, max = 500, message = "Reason must be between 10 and 500 characters")
    @NotNull(message = "Reason is required")
    private String reason;
}