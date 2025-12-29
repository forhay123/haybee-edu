package com.edu.platform.dto.individual;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Request for uploading a scheme of work document
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SchemeUploadRequest {
    private Long studentProfileId;
    private Long subjectId;
    private Long termId;
    private String academicYear;
    // File will be in MultipartFile parameter
}