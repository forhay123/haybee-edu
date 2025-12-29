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
public class UploadVideoRequest {
    private String title;
    private String description;
    private List<String> tags;
    private String privacyStatus; // public, private, unlisted
    private Long subjectId;
    private Long lessonTopicId;
    private Boolean isAspirantMaterial;
    private Boolean isPublic;
}