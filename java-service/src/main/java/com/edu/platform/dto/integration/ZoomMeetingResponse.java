package com.edu.platform.dto.integration;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZoomMeetingResponse {
    private String id;
    private String uuid;
    
    @JsonProperty("host_id")
    private String hostId;
    
    private String topic;
    private Integer type;
    
    @JsonProperty("start_time")
    private Instant startTime;
    
    private Integer duration;
    private String timezone;
    private String agenda;
    
    @JsonProperty("start_url")  // ← FIX HERE
    private String startUrl;
    
    @JsonProperty("join_url")   // ← FIX HERE
    private String joinUrl;
    
    private String password;
    
    @JsonProperty("h323_password")
    private String h323Password;
    
    @JsonProperty("encrypted_password")
    private String encryptedPassword;
    
    private MeetingSettings settings;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MeetingSettings {
        @JsonProperty("join_before_host")
        private Boolean joinBeforeHost;
        
        @JsonProperty("mute_upon_entry")
        private Boolean muteUponEntry;
        
        @JsonProperty("waiting_room")
        private Boolean waitingRoom;
        
        @JsonProperty("auto_recording")
        private String autoRecording;
    }
}