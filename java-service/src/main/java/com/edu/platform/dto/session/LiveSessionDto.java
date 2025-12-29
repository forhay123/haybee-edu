package com.edu.platform.dto.session;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.edu.platform.model.enums.SessionStatus;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiveSessionDto {
    private Long id;
    private String title;
    private String description;
    private SessionStatus status;
    
    // Timing
    private Instant scheduledStartTime;
    private Instant actualStartTime;
    private Instant actualEndTime;
    private Integer scheduledDurationMinutes;
    
    // Zoom details
    private String zoomMeetingId;
    private String joinUrl;
    private String startUrl;
    private String meetingPassword;
    
    // Relationships
    private Long teacherId;
    private String teacherName;
    private Long subjectId;
    private String subjectName;
    private Long classId;
    private String className;
    private Long lessonTopicId;
    private String lessonTopicTitle;
    
    // Stats
    private Integer attendanceCount;
    private Integer maxParticipants;
    private Boolean hasRecording;
    
    // Metadata
    private Instant createdAt;
    private Instant updatedAt;
}