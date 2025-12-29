package com.edu.platform.dto.session;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


import java.time.Instant;

//Session attendance DTO
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionAttendanceDto {
 private Long id;
 private Long sessionId;
 private Long studentId;
 private String studentName;
 private String studentEmail;
 private Instant joinedAt;
 private Instant leftAt;
 private Integer durationMinutes;
 private Instant createdAt;
}
