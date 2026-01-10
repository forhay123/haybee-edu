package com.edu.platform.dto.assessment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * 📊 Complete Gradebook Report DTO
 * Contains all subjects with weighted grades for a student
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GradebookReportDto {
    
    private Long studentId;
    private String studentName;
    private String termName;
    
    // Subject-level data
    private List<SubjectGradebookDto> subjects;
    
    // Overall statistics
    private Integer totalSubjects;
    private Integer completeSubjects;
    private Integer incompleteSubjects;
    private Integer passedSubjects;
    private Integer failedSubjects;
    
    private Double overallAverage;  // Average of all complete subjects
    private String overallGrade;    // Letter grade (A, B, C, etc.)
    
    /**
     * Create empty report
     */
    public static GradebookReportDto empty(Long studentId) {
        return GradebookReportDto.builder()
            .studentId(studentId)
            .subjects(new ArrayList<>())
            .totalSubjects(0)
            .completeSubjects(0)
            .incompleteSubjects(0)
            .passedSubjects(0)
            .failedSubjects(0)
            .overallAverage(0.0)
            .overallGrade("N/A")
            .build();
    }
}
