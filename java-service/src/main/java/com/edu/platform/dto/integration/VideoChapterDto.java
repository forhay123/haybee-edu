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
public class VideoChapterDto {
    private Long id;
    private Integer chapterNumber;
    private String title;
    private Integer startTimeSeconds;
    private Integer endTimeSeconds;
    private List<String> keyConcepts;
    private String summary;
}