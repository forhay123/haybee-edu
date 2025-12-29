package com.edu.platform.dto.session;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


import java.time.Instant;


//Recording DTO
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecordingDto {
 private Long id;
 private Long sessionId;
 private String zoomRecordingId;
 private String zoomDownloadUrl;
 private String status;
 private String fileType;
 private Long fileSizeBytes;
 private Integer durationSeconds;
 private String youtubeVideoId;
 private Instant downloadStartedAt;
 private Instant downloadCompletedAt;
 private Instant processingCompletedAt;
 private Instant createdAt;
}