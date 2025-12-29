package com.edu.platform.dto.integration;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
//Zoom recording response
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZoomRecordingResponse {
 private String uuid;
 private String id;
 private String hostId;
 private String topic;
 private Instant startTime;
 private Integer duration;
 private Integer totalSize;
 private Integer recordingCount;
 private java.util.List<ZoomRecordingFile> recordingFiles;
}