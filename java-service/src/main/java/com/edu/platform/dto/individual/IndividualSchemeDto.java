package com.edu.platform.dto.individual;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * DTO for IndividualStudentScheme entity
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IndividualSchemeDto {
    private Long id;
    private Long studentProfileId;
    private String studentName;
    private Long subjectId;
    private String subjectName;
    
    // File metadata
    private String originalFilename;
    private String fileUrl;
    private String fileType;
    private Long fileSizeBytes;
    
    // Processing info
    private String processingStatus;
    private String processingError;
    private Integer totalTopicsExtracted;
    private Integer weeksCovered;
    private BigDecimal confidenceScore;
    
    // Academic context
    private Long termId;
    private String termName;
    private String academicYear;
    
    // Timestamps
    private Instant uploadedAt;
    private Instant processedAt;
    private Instant createdAt;
}