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
public class VideoUpdateRequest {
    private String title;
    private String description;
    private Long lessonTopicId;
    private Boolean isAspirantMaterial;
    private Boolean isPublic;
    private String privacyStatus;
}