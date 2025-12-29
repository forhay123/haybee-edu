package com.edu.platform.dto.session;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.edu.platform.model.enums.SessionStatus;

import java.time.Instant;
import java.util.List;

//Detailed session view
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionDetailsDto {
 private Long id;
 private String title;
 private String description;
 private SessionStatus status;
 
 // Timing
 private Instant scheduledStartTime;
 private Instant actualStartTime;
 private Instant actualEndTime;
 private Integer scheduledDurationMinutes;
 private Integer actualDurationMinutes;
 
 // Zoom details
 private String zoomMeetingId;
 private String joinUrl;
 private String startUrl;
 private String meetingPassword;
 
 // Relationships
 private Long teacherId;
 private String teacherName;
 private String teacherEmail;
 private Long subjectId;
 private String subjectName;
 private Long classId;
 private String className;
 private Long lessonTopicId;
 private String lessonTopicTitle;
 private Long termId;
 private String termName;
 
 // Attendance (for teachers)
 private Integer attendanceCount;
 private Integer enrolledStudentsCount;
 private Integer maxParticipants;
 private Boolean hasRecording;
 
 // ✅ CRITICAL FIX: Change from SessionRecordingDto to RecordingDto
 private List<SessionAttendanceDto> attendanceList;
 private List<RecordingDto> recordings;
 
 // Metadata
 private Instant createdAt;
 private Instant updatedAt;
}