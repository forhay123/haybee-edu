package com.edu.platform.dto.integration;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VideoSearchRequest {
    private String query;
    private Long subjectId;
    private Long teacherId;
    private String studentType; // SCHOOL, HOME, ASPIRANT
    private Instant startDate;
    private Instant endDate;
    private Boolean hasTranscript;
    private Boolean hasChapters;
    private Integer page;
    private Integer size;
}