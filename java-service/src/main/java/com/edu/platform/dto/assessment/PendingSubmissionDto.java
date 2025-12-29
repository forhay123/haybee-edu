package com.edu.platform.dto.assessment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for submissions pending grading
 * Used in admin and teacher grading interfaces
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PendingSubmissionDto {
    
    private Long id;
    private Long assessmentId;
    private String assessmentTitle;
    
    private Long studentId;
    private String studentName;
    
    // ✅ NEW: Additional fields for frontend
    private Long subjectId;
    private String subjectName;
    private String teacherName;
    
    private LocalDateTime submittedAt;
    
    private Double score;
    private Double totalMarks;
    private Double percentage;
    
    private Boolean passed;
    private Boolean graded;
    
    // Number of questions pending grading (essay/short answer)
    private Integer pendingAnswersCount;
}