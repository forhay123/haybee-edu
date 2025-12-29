package com.edu.platform.dto.individual;

import lombok.*;
import java.time.Instant;

/**
 * Response after uploading a timetable
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimetableUploadResponse {
    private Long timetableId;
    private String filename;
    private String fileUrl;
    private String processingStatus;
    private Instant uploadedAt;
    private String message;
    
    // ✅ Optional: Include class info in response for confirmation
    private Long classId;
    private String className;
}