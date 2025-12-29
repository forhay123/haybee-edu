package com.edu.platform.dto.session;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiveSessionJoinDto {
    private Long sessionId;
    private String joinUrl;
    private String meetingPassword;
}