package com.edu.platform.dto.individual;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;



/**
 * Processing result details
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProcessingResultDto {
    private Integer itemsExtracted;
    private Integer itemsMapped;
    private BigDecimal overallConfidence;
    private List<String> warnings;
    private List<String> errors;
}