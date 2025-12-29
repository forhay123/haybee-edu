package com.edu.platform.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.ToString;

import java.util.Set;

/**
 * Response sent after successful authentication.
 * Contains access and refresh tokens with user context.
 */
@Getter
@AllArgsConstructor
@ToString
public class JwtResponse {

    private final String accessToken;
    private final String refreshToken;
    private final String tokenType = "Bearer";
    private final Long expiresInMs;
    private final Long userId;
    private final String email;
    private final Set<String> roles;
}
