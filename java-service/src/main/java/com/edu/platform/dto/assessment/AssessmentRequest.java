package com.edu.platform.dto.assessment;

import com.edu.platform.model.assessment.AssessmentType;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssessmentRequest {
    
    private String title;
    private String description;
    private AssessmentType type;
    private Long subjectId;
    private Long termId;
    private Long lessonTopicId;
    private Integer totalMarks;
    private Integer passingMarks;
    private Integer durationMinutes;
    private Boolean autoGrade;
    private Boolean published;
    private LocalDateTime dueDate;
    
    // Question selection
    private Integer numberOfAIQuestions;        // How many AI questions to auto-generate (fallback)
    private List<Long> aiQuestionIds;          // ✅ NEW: Specific AI questions selected by teacher
    private List<Long> teacherQuestionIds;     // Specific teacher questions to include
    private Boolean mixAIAndTeacherQuestions;
}