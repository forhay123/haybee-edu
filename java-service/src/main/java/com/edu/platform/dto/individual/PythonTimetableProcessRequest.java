package com.edu.platform.dto.individual;

import lombok.*;

/**
 * DTO for Python service timetable processing request
 * This is what gets sent to the Python AI service
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PythonTimetableProcessRequest {
    private Long timetableId;
    private Long studentId;
    private String fileUrl;
    
    /**
     * NEW: Class ID to filter subjects in Python
     * This helps the AI match extracted subjects only to those
     * that belong to the student's class
     */
    private Long classId;
    
    private String originalFilename;
    private String academicYear;
    private Long termId;
}