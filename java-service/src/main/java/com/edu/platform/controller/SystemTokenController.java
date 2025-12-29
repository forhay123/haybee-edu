package com.edu.platform.controller;

import com.edu.platform.security.JwtTokenUtil;
import io.swagger.v3.oas.annotations.Hidden;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Used for internal system token generation.
 * You can disable/remove this after generating the system token.
 */
@RestController
@RequestMapping("/internal")
@RequiredArgsConstructor
@Hidden // hides it from Swagger UI
public class SystemTokenController {

    private final JwtTokenUtil jwtTokenUtil;

    @GetMapping("/generate-system-token")
    public Map<String, String> generateSystemToken() {
        // Generate a long-lived system token valid for ~10 years
        String token = jwtTokenUtil.generateNonExpiringSystemToken();
        return Map.of("system_token", token);
    }
}
