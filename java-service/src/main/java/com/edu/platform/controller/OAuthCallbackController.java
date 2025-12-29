package com.edu.platform.controller;

import com.edu.platform.service.VideoLessonService;
import com.edu.platform.service.integration.YouTubeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * ✅ OAuth callback handler for YouTube integration
 * 
 * ⚠️ IMPORTANT: State management is handled ONLY in YouTubeService
 * Do NOT store state again in this controller - it will cause race conditions!
 */
@Slf4j
@Controller
@RequestMapping("/oauth")
@RequiredArgsConstructor
@Tag(name = "OAuth", description = "OAuth callback endpoints")
public class OAuthCallbackController {

    private final VideoLessonService videoLessonService;
    private final YouTubeService youtubeService;
    private final RedisTemplate<String, String> redisTemplate;
    
    private static final String REDIS_STATE_PREFIX = "youtube:oauth:state:";

    /**
     * ✅ PUBLIC endpoint - handles Google OAuth callback
     * 
     * This endpoint is called by Google after the user authorizes the app.
     * It receives the authorization code and state parameter, then redirects
     * the user back to the frontend with these parameters so they can be exchanged.
     */
    @GetMapping("/youtube/callback")
    @Operation(summary = "Handle YouTube OAuth callback from Google")
    public String handleYouTubeCallback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            @RequestParam(required = false) String error_description
    ) {
        log.info("YouTube OAuth callback received - code present: {}, state: {}, error: {}", 
            code != null, state, error);

        StringBuilder redirectUrl = new StringBuilder("http://localhost:5173/oauth/callback");
        StringBuilder params = new StringBuilder();
        
        if (code != null && state != null) {
            params.append("?code=").append(URLEncoder.encode(code, StandardCharsets.UTF_8));
            params.append("&state=").append(URLEncoder.encode(state, StandardCharsets.UTF_8));
            log.info("✅ OAuth successful, redirecting with code and state");
        } else if (error != null) {
            params.append("?error=").append(URLEncoder.encode(error, StandardCharsets.UTF_8));
            if (error_description != null) {
                params.append("&error_description=").append(
                    URLEncoder.encode(error_description, StandardCharsets.UTF_8)
                );
            }
            log.warn("❌ OAuth error: {} - {}", error, error_description);
        } else {
            params.append("?error=invalid_request&error_description=Missing%20required%20parameters");
            log.error("❌ Missing OAuth parameters");
        }

        redirectUrl.append(params);
        log.info("Redirecting to frontend: {}", redirectUrl);
        return "redirect:" + redirectUrl.toString();
    }

    /**
     * ✅ PUBLIC endpoint - Exchange OAuth code for tokens
     * 
     * Called from frontend after redirect from Google.
     * The frontend passes the code and state back, and we exchange it for tokens.
     * 
     * ⚠️ State is retrieved from Redis (stored by YouTubeService.getAuthorizationUrl)
     */
    @PostMapping("/youtube/exchange")
    @Operation(summary = "Exchange YouTube OAuth code for tokens")
    public ResponseEntity<Map<String, Object>> exchangeYouTubeCode(
            @RequestParam String code,
            @RequestParam String state
    ) {
        log.info("=== Exchange Request Started ===");
        log.info("Exchanging OAuth code with state: {}", state);

        try {
            // ✅ Retrieve teacher email from Redis
            // ⚠️ This was stored by YouTubeService.getAuthorizationUrl() - don't store again!
            String stateKey = REDIS_STATE_PREFIX + state;
            String teacherEmail = redisTemplate.opsForValue().get(stateKey);
            
            if (teacherEmail == null) {
                log.error("❌ State not found in Redis: {}", state);
                log.error("Redis key checked: {}", stateKey);
                
                // Debug: Check if any states exist
                try {
                    var keys = redisTemplate.keys(REDIS_STATE_PREFIX + "*");
                    log.error("Available state keys in Redis: {}", keys);
                } catch (Exception e) {
                    log.error("Error listing Redis keys", e);
                }
                
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "error", "Invalid or expired OAuth state. Please try connecting again."
                ));
            }
            
            log.info("✅ Found teacher email for state: {}", teacherEmail);

            // ✅ Delete state immediately to prevent reuse (one-time use)
            Boolean deleted = redisTemplate.delete(stateKey);
            log.info("✅ Deleted state from Redis (deleted: {})", deleted);

            // ✅ Exchange code for tokens
            // YouTubeService.handleOAuthCallback will:
            // 1. Exchange code for access token
            // 2. Fetch YouTube channel info
            // 3. Save token to database
            youtubeService.handleOAuthCallback(code, state, teacherEmail);

            log.info("✅ Successfully exchanged OAuth code for: {}", teacherEmail);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "YouTube account connected successfully",
                "email", teacherEmail
            ));

        } catch (Exception e) {
            log.error("❌ Failed to exchange OAuth code", e);
            
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        } finally {
            log.info("=== Exchange Request Completed ===");
        }
    }

    /**
     * ✅ PROTECTED endpoint - Check YouTube auth status
     * 
     * Returns whether the current user has connected YouTube,
     * and details about their connection if they have.
     */
    @GetMapping("/youtube/auth/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Check YouTube connection status")
    public ResponseEntity<Map<String, Object>> getYouTubeAuthStatus(Authentication auth) {
        String email = auth.getName();
        log.info("Checking YouTube auth status for: {}", email);

        try {
            var authStatus = videoLessonService.getYouTubeAuthStatus(email);
            
            Map<String, Object> response = new HashMap<>();
            response.put("connected", authStatus.getConnected() != null && authStatus.getConnected());
            response.put("expired", authStatus.getExpired() != null && authStatus.getExpired());
            response.put("channelName", authStatus.getChannelName());
            response.put("channelId", authStatus.getChannelId());
            response.put("connectedAt", authStatus.getConnectedAt());
            response.put("expiresAt", authStatus.getExpiresAt());
            
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error checking YouTube auth status", e);
            return ResponseEntity.ok(Map.of(
                "connected", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * ✅ PROTECTED endpoint - Initiate YouTube OAuth
     * 
     * Generates an OAuth authorization URL for the user to visit.
     * The user clicks this link, authorizes the app on Google,
     * and Google redirects back to /oauth/youtube/callback
     * 
     * ⚠️ FIXED: Do NOT store state in this controller!
     * YouTubeService.getAuthorizationUrl() already stores it.
     */
    @GetMapping("/youtube/auth/initiate")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Initiate YouTube OAuth flow")
    public ResponseEntity<Map<String, Object>> initiateYouTubeAuth(Authentication auth) {
        String email = auth.getName();
        log.info("Initiating YouTube OAuth for: {}", email);

        try {
            var authStatus = videoLessonService.initiateYouTubeAuth(email);
            
            // ✅ REMOVED: Do NOT store state here!
            // YouTubeService.getAuthorizationUrl() already stored it in Redis
            // Storing it again causes race conditions and conflicts
            
            return ResponseEntity.ok(Map.of(
                "connected", authStatus.getConnected() != null && authStatus.getConnected(),
                "authUrl", authStatus.getAuthUrl() != null ? authStatus.getAuthUrl() : "",
                "channelName", authStatus.getChannelName() != null ? authStatus.getChannelName() : ""
            ));

        } catch (Exception e) {
            log.error("Error initiating YouTube OAuth", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * ✅ PROTECTED endpoint - Disconnect YouTube
     * 
     * Removes the YouTube token from the database,
     * disconnecting the user's YouTube account.
     */
    @DeleteMapping("/youtube/auth/disconnect")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Disconnect YouTube account")
    public ResponseEntity<Map<String, Object>> disconnectYouTube(Authentication auth) {
        String email = auth.getName();
        log.info("Disconnecting YouTube for: {}", email);

        try {
            videoLessonService.disconnectYouTube(email);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Successfully disconnected YouTube account"
            ));

        } catch (Exception e) {
            log.error("Error disconnecting YouTube", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Helper: Extract state parameter from OAuth URL
     */
    private String extractStateFromUrl(String url) {
        try {
            String[] parts = url.split("state=");
            if (parts.length > 1) {
                String state = parts[1].split("&")[0];
                return java.net.URLDecoder.decode(state, StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            log.error("Failed to extract state from URL", e);
        }
        return null;
    }

    /**
     * ✅ Health check
     */
    @GetMapping("/health")
    @Operation(summary = "OAuth health check")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of(
            "status", "healthy",
            "service", "oauth-callback",
            "timestamp", String.valueOf(System.currentTimeMillis())
        ));
    }
}