package com.edu.platform.dto.progress;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProgressUpdateRequest {
    private Long lessonId;         // lessonTopic ID
    private String scheduledDate;  // yyyy-MM-dd
    private Integer periodNumber;
}