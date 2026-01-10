package com.edu.platform.dto.assessment;

import com.edu.platform.model.assessment.AssessmentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

/**
 * 📚 Subject Gradebook DTO
 * Contains weighted grade calculation for ONE subject
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubjectGradebookDto {
    
    private Long subjectId;
    private String subjectName;
    private String subjectCode;
    
    // Component scores (Quiz, Exam, etc.)
    private Map<AssessmentType, ComponentScoreDto> components;
    
    // Calculated totals
    private Double totalWeightedScore;  // Sum of all weighted scores
    private Integer totalWeightCovered; // Total weight of submitted components
    private Double finalPercentage;     // Final calculated percentage
    
    private String gradeLetter;         // A, B, C, D, F
    private String status;              // PASS, FAIL, INCOMPLETE
    
    private Boolean isComplete;         // All components submitted?
    private Integer componentsSubmitted;
    private Integer totalComponents;
    
    /**
     * Create empty subject report
     */
    public static SubjectGradebookDto empty(Long subjectId) {
        return SubjectGradebookDto.builder()
            .subjectId(subjectId)
            .components(new HashMap<>())
            .totalWeightedScore(0.0)
            .totalWeightCovered(0)
            .finalPercentage(0.0)
            .gradeLetter("N/A")
            .status("INCOMPLETE")
            .isComplete(false)
            .componentsSubmitted(0)
            .totalComponents(6)
            .build();
    }
}