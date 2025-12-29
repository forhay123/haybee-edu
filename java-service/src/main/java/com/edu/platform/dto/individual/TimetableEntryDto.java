package com.edu.platform.dto.individual;

import lombok.*;

import java.math.BigDecimal;

/**
 * DTO for a single timetable entry (extracted from AI processing)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimetableEntryDto {
    private String dayOfWeek;        // MONDAY, TUESDAY, etc.
    private Integer periodNumber;    // 1, 2, 3...
    private String startTime;        // "09:00"
    private String endTime;          // "10:00"
    private String subjectName;      // "Mathematics"
    private Long subjectId;          // Mapped platform subject ID
    private String subjectCode;
    private BigDecimal mappingConfidence;  // 0.0 to 1.0
    private String room;             // "A101" (optional)
    private String teacher;          // "Mr. Smith" (optional)
}