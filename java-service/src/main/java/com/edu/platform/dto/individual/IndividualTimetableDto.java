package com.edu.platform.dto.individual;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
/**
 * DTO for IndividualStudentTimetable entity
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IndividualTimetableDto {
    private Long id;
    private Long studentProfileId;
    private String studentName;
    
    // File metadata
    private String originalFilename;
    private String fileUrl;
    private String fileType;
    private Long fileSizeBytes;
    
    // Processing info
    private String processingStatus;
    private String processingError;
    private Integer totalPeriodsExtracted;
    private Integer subjectsIdentified;
    private BigDecimal confidenceScore;
    
    // Academic context
    private Long termId;
    private String termName;
    private String academicYear;
    
    // Timestamps
    private Instant uploadedAt;
    private Instant processedAt;
    private Instant createdAt;
    private List<TimetableEntryDto> entries;
    private List<String> matchingSubjectsForTeacher;
}