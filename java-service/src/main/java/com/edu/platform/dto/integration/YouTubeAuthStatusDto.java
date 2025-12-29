package com.edu.platform.dto.integration;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

// ==================== OAuth DTOs ====================

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class YouTubeAuthStatusDto {
    private Boolean connected;
    private Boolean expired;
    private String authUrl;
    private String channelId;
    private String channelName;
    private Instant connectedAt;
    private Instant expiresAt;
}