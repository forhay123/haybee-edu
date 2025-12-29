package com.edu.platform.dto.individual;

import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

// ============================================================
// REQUEST DTOs
// ============================================================

/**
 * Request for uploading a timetable document
 * ✅ NOW INCLUDES: classId for accurate subject mapping
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimetableUploadRequest {
    private Long studentProfileId;
    
    /**
     * ✅ NEW: Student's class ID for filtering subjects during AI mapping
     * This dramatically improves subject matching accuracy by limiting
     * the search space to only subjects belonging to the student's class.
     */
    private Long classId;
    
    private Long termId;
    private String academicYear;
    

    /**
     * ✅ NEW: Upload source type for analytics and processing
     * - "file" = traditional file upload (PDF, Excel)
     * - "camera" = mobile camera capture (image)
     */
    private String uploadType;
}