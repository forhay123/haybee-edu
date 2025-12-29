package com.edu.platform.dto.integration;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
//Zoom recording file
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZoomRecordingFile {
 private String id;
 private String meetingId;
 private Instant recordingStart;
 private Instant recordingEnd;
 private String fileType; // MP4, M4A, TIMELINE, TRANSCRIPT, CHAT
 private Long fileSize;
 private String downloadUrl;
 private String status;
 private String recordingType;
}