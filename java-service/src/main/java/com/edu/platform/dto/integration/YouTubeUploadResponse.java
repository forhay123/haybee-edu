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
public class YouTubeUploadResponse {
    private String videoId;
    private String videoUrl;
    private String embedUrl;
    private String thumbnailUrl;
    private String uploadStatus; // uploaded, processing, failed
}