// src/main/java/com/edu/platform/dto/assessment/GradingDtos.java

package com.edu.platform.dto.assessment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GradeAnswerRequest {
    private Double marksObtained;
    private String teacherFeedback;
}
