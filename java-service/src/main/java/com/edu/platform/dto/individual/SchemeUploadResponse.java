package com.edu.platform.dto.individual;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Response after uploading a scheme
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SchemeUploadResponse {
    private Long schemeId;
    private String filename;
    private String fileUrl;
    private Long subjectId;
    private String subjectName;
    private String processingStatus;
    private Instant uploadedAt;
    private String message;
}