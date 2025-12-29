package com.edu.platform.dto.individual;

import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Request DTO for camera/file upload processing from Python service
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CameraUploadProcessRequest {
    private Long studentId;
    private Long classId;
    private String documentType;  // "timetable" or "scheme"
    private String uploadType;    // "camera" or "file"
    private String filename;
    private String fileUrl;
    private Double confidence;
    private List<CameraUploadEntry> extractedEntries;
    private List<String> warnings;
}