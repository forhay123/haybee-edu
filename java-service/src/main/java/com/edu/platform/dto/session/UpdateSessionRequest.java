package com.edu.platform.dto.session;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

//Request to update a session
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateSessionRequest {
 private String title;
 private String description;
 private Instant scheduledStartTime;
 private Integer scheduledDurationMinutes;
 private Integer maxParticipants;
}