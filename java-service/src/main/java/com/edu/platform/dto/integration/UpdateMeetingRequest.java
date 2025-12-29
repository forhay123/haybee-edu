package com.edu.platform.dto.integration;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
//Request to update meeting
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMeetingRequest {
 private String topic;
 private Instant startTime;
 private Integer duration;
 private String timezone;
 private String agenda;
}