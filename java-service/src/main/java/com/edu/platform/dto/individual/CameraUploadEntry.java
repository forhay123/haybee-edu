package com.edu.platform.dto.individual;

import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;


/**
 * Entry DTO from camera/file extraction
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CameraUploadEntry {
    private String day;
    private Integer periodNumber;
    private String startTime;
    private String endTime;
    private String subject;
    private Long subjectId;
    private BigDecimal mappingConfidence;
    private String room;
    private String teacher;
}
