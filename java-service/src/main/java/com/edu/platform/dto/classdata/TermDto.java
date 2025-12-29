package com.edu.platform.dto.classdata;

import lombok.Builder;
import java.time.LocalDate;

/**
 * DTO for Term data transfer
 */
@Builder
public record TermDto(
        Long id,
        String name,
        LocalDate startDate,
        LocalDate endDate,
        Boolean isActive,
        Integer weekCount,
        Long sessionId,
        String sessionName
) {}