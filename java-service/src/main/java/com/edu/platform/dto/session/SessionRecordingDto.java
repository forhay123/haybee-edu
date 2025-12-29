package com.edu.platform.dto.session;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionRecordingDto {
    private Long id;
    private Long sessionId;
    private String recordingUrl;
    private String downloadUrl;
    private Integer durationSeconds;
    private Long fileSizeBytes;
    private Boolean hasTranscript;
    private Instant recordedAt;
    private Instant createdAt;
}