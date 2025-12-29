package com.edu.platform.dto.individual;

import lombok.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.time.LocalDate;

/**
 * DTO for Public Holiday
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicHolidayDto {

    private Long id;

    // Holiday details
    @NotNull(message = "Holiday date is required")
    private LocalDate holidayDate;

    @NotBlank(message = "Holiday name is required")
    private String holidayName;

    private Boolean isSchoolClosed;

    // Audit fields
    private Long createdByUserId;
    private Instant createdAt;
    private Instant updatedAt;
}
