package com.edu.platform.dto.individual;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * DTO for IndividualLessonTopic entity
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IndividualLessonTopicDto {
    private Long id;
    private Long studentProfileId;
    
    // ✅ ADD THIS FIELD
    private String studentName;  
    
    private Long schemeId;
    private Long subjectId;
    private String subjectName;
    
    // Topic details
    private String topicTitle;
    private String description;
    private Integer weekNumber;
    
    // Mapping info
    private Long mappedSubjectId;
    private String mappedSubjectName;
    private BigDecimal mappingConfidence;
    
    // Resources
    private String fileName;
    private String fileUrl;
    
    // Academic context
    private Long termId;
    private String termName;
    
    // Timestamps
    private Instant createdAt;
    private Instant updatedAt;
}