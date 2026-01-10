package com.edu.platform.dto.assessment;

import com.edu.platform.model.assessment.AssessmentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * 📝 Component Score DTO
 * Represents score for ONE assessment type (e.g., all QUIZes)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComponentScoreDto {
    
    private AssessmentType type;        // QUIZ, EXAM, etc.
    private Integer weight;             // 20, 40, etc. (percentage)
    
    private Double score;               // Points earned
    private Double totalPossible;       // Total points possible
    private Double percentage;          // (score / total) * 100
    
    private Double weightedScore;       // Contribution to final grade
    
    private Boolean submitted;          // Has student submitted?
    private Integer count;              // Number of assessments (if multiple)
    
    private List<Long> assessmentIds;   // IDs of assessments in this component
    
    /**
     * Create DTO for pending component (exists but not submitted)
     */
    public static ComponentScoreDto pending(AssessmentType type, int weight, int count) {
        return ComponentScoreDto.builder()
            .type(type)
            .weight(weight)
            .score(0.0)
            .totalPossible(0.0)
            .percentage(0.0)
            .weightedScore(0.0)
            .submitted(false)
            .count(count)
            .assessmentIds(new ArrayList<>())
            .build();
    }
    
    /**
     * Create DTO for component that doesn't exist
     */
    public static ComponentScoreDto notAvailable(AssessmentType type, int weight) {
        return ComponentScoreDto.builder()
            .type(type)
            .weight(weight)
            .score(0.0)
            .totalPossible(0.0)
            .percentage(0.0)
            .weightedScore(0.0)
            .submitted(false)
            .count(0)
            .assessmentIds(new ArrayList<>())
            .build();
    }
}