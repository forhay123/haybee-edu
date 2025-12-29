package com.edu.platform.dto.individual;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
/**
 * Processing status response
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProcessingStatusDto {
    private Long documentId;
    private String documentType; // TIMETABLE, SCHEME
    private String status; // PENDING, PROCESSING, COMPLETED, FAILED
    private String error;
    private Integer progress; // 0-100
    private Instant startedAt;
    private Instant completedAt;
    private ProcessingResultDto result;
}