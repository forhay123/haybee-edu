package com.edu.platform.dto.classdata;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LessonAiStatusDto {
    private String status;         // e.g. "PROCESSING", "COMPLETED", "FAILED"
    private Integer progress;      // e.g. 0–100 (percent)
    private Integer questionCount; // number of generated or validated questions
}
