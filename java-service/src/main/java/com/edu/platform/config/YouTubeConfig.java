package com.edu.platform.config;

import lombok.Getter;
import okhttp3.OkHttpClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
@Getter
public class YouTubeConfig {

    @Value("${youtube.client-id}")
    private String clientId;

    @Value("${youtube.client-secret}")
    private String clientSecret;

    @Value("${youtube.redirect-uri}")
    private String redirectUri;

    // ✅ FIXED: API URLs - now using correct endpoints
    // Data API: for reading/updating metadata, getting video details
    private final String apiBaseUrl = "https://www.googleapis.com/youtube/v3";
    
    // ✅ Upload API: CRITICAL - for resumable uploads ONLY
    private final String uploadBaseUrl = "https://www.googleapis.com/upload/youtube/v3";
    
    private final String authorizationUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    private final String tokenUrl = "https://oauth2.googleapis.com/token";
    private final String revokeUrl = "https://oauth2.googleapis.com/revoke";

    // OAuth Scopes
    // ⭐ IMPORTANT: __youtube__ scope is REQUIRED for video uploads!
    // youtube.upload alone is NOT sufficient for resumable uploads
    private final String youtubeScope = "https://www.googleapis.com/auth/youtube";
    private final String uploadScope = "https://www.googleapis.com/auth/youtube.upload";
    private final String readonlyScope = "https://www.googleapis.com/auth/youtube.readonly";

    /**
     * ⭐ Full scope for YouTube integration
     *
     * Order matters - include all three:
     * 1. __youtube__ - Full API access (REQUIRED for video.insert/resumable uploads)
     * 2. youtube.upload - Manage your YouTube videos
     * 3. youtube.readonly - View your YouTube account
     */
    public String getFullScope() {
        return youtubeScope + " " + uploadScope + " " + readonlyScope;
    }

    /**
     * ✅ Get API base URL for data operations
     * Use for: channels, video details, metadata updates, deletes
     */
    public String getApiBaseUrl() {
        return apiBaseUrl;
    }

    /**
     * ✅ Get UPLOAD base URL for resumable uploads
     * CRITICAL: Use ONLY for /videos?uploadType=resumable requests
     */
    public String getUploadBaseUrl() {
        return uploadBaseUrl;
    }

    public String getAuthorizationUrl() {
        return authorizationUrl;
    }

    public String getTokenUrl() {
        return tokenUrl;
    }

    public String getRevokeUrl() {
        return revokeUrl;
    }

    @Bean(name = "youtubeHttpClient")
    public OkHttpClient youtubeHttpClient() {
        return new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(120, TimeUnit.SECONDS) // Long timeout for video uploads
                .writeTimeout(120, TimeUnit.SECONDS)
                .retryOnConnectionFailure(true)
                .build();
    }
}