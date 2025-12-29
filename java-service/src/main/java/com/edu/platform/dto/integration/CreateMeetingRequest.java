package com.edu.platform.dto.integration;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

// Request to create Zoom meeting
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateMeetingRequest {
    private String topic;
    private Instant startTime;
    private Integer duration; // in minutes
    private String timezone;
    private String password;
    private MeetingSettings settings;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MeetingSettings {
        private Boolean joinBeforeHost;
        private Boolean muteUponEntry;
        private Boolean waitingRoom;
        private Boolean autoRecording; // "cloud" or "none"
    }
}
