package com.edu.platform.service.integration;

import com.edu.platform.config.YouTubeConfig;
import com.edu.platform.dto.integration.*;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.exception.ValidationException;
import com.edu.platform.exception.YouTubeApiException;
import com.edu.platform.model.TeacherYouTubeToken;
import com.edu.platform.model.User;
import com.edu.platform.repository.TeacherYouTubeTokenRepository;
import com.edu.platform.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.LinkedHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class YouTubeService {

    private final YouTubeConfig youtubeConfig;
    private final OkHttpClient youtubeHttpClient;
    private final ObjectMapper objectMapper;
    private final RedisTemplate<String, String> redisTemplate;
    private final TeacherYouTubeTokenRepository tokenRepository;
    private final UserRepository userRepository;

    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");
    private static final String REDIS_STATE_PREFIX = "youtube:oauth:state:";
    private static final long STATE_EXPIRY_MINUTES = 10;

    public String getAuthorizationUrl(String teacherEmail, String state) {
        log.info("Generating YouTube authorization URL for teacher: {}", teacherEmail);

        String stateKey = REDIS_STATE_PREFIX + state;
        redisTemplate.opsForValue().set(stateKey, teacherEmail, STATE_EXPIRY_MINUTES, TimeUnit.MINUTES);
        log.info("✅ Stored state in Redis: {} -> {} (expires in {} minutes)", 
                 state, teacherEmail, STATE_EXPIRY_MINUTES);

        String authUrl = String.format(
                "%s?client_id=%s&redirect_uri=%s&response_type=code&scope=%s&access_type=offline&state=%s&prompt=consent",
                youtubeConfig.getAuthorizationUrl(),
                youtubeConfig.getClientId(),
                youtubeConfig.getRedirectUri(),
                youtubeConfig.getFullScope(),
                state
        );

        log.info("✅ Generated authorization URL");
        return authUrl;
    }

    @Transactional
    public void handleOAuthCallback(String code, String state, String teacherEmail) {
        log.info("=== OAuth Callback Handler Started ===");
        log.info("Handling OAuth callback for teacher: {}", teacherEmail);

        String stateKey = REDIS_STATE_PREFIX + state;
        String storedEmail = redisTemplate.opsForValue().get(stateKey);

        if (storedEmail != null && !storedEmail.equals(teacherEmail)) {
            log.error("❌ Email mismatch! Stored: {}, Provided: {}", storedEmail, teacherEmail);
            throw new YouTubeApiException("Email mismatch in OAuth state");
        }

        try {
            FormBody requestBody = new FormBody.Builder()
                    .add("code", code)
                    .add("client_id", youtubeConfig.getClientId())
                    .add("client_secret", youtubeConfig.getClientSecret())
                    .add("redirect_uri", youtubeConfig.getRedirectUri())
                    .add("grant_type", "authorization_code")
                    .build();

            Request request = new Request.Builder()
                    .url(youtubeConfig.getTokenUrl())
                    .post(requestBody)
                    .build();

            log.info("Exchanging code for tokens with Google...");
            Response response = youtubeHttpClient.newCall(request).execute();

            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "No error details";
                log.error("❌ Token exchange failed. Status: {}, Body: {}", response.code(), errorBody);
                throw new YouTubeApiException("Failed to exchange OAuth code: " + errorBody, response.code());
            }

            String responseBody = response.body().string();
            JsonNode jsonNode = objectMapper.readTree(responseBody);

            String accessToken = jsonNode.get("access_token").asText();
            String refreshToken = jsonNode.has("refresh_token") ? jsonNode.get("refresh_token").asText() : null;
            long expiresIn = jsonNode.get("expires_in").asLong();
            String scope = jsonNode.has("scope") ? jsonNode.get("scope").asText() : youtubeConfig.getFullScope();

            log.info("✅ Token exchange successful, fetching channel info...");

            YouTubeChannelResponse channelInfo = fetchChannelInfo(accessToken);

            User teacher = userRepository.findByEmail(teacherEmail)
                    .orElseThrow(() -> new ResourceNotFoundException("Teacher not found: " + teacherEmail));

            TeacherYouTubeToken token = tokenRepository.findByTeacherId(teacher.getId())
                    .orElseGet(() -> {
                        log.info("Creating new YouTube token entry for teacher: {}", teacherEmail);
                        TeacherYouTubeToken newToken = new TeacherYouTubeToken();
                        newToken.setTeacher(teacher);
                        return newToken;
                    });

            token.setAccessToken(accessToken);
            if (refreshToken != null) {
                token.setRefreshToken(refreshToken);
            }
            token.setTokenType("Bearer");
            token.setExpiresAt(Instant.now().plusSeconds(expiresIn));
            token.setScope(scope);
            token.setYoutubeChannelId(channelInfo.getId());
            token.setYoutubeChannelName(channelInfo.getTitle());
            token.setLastUsedAt(Instant.now());

            tokenRepository.save(token);

            if ("pending".equals(channelInfo.getId())) {
                log.warn("⚠️ YouTube connected but user has no channel. Channel ID: pending");
            } else {
                log.info("✅ Successfully connected YouTube account. Channel: {}", channelInfo.getTitle());
            }

        } catch (IOException e) {
            log.error("❌ Error handling OAuth callback", e);
            throw new YouTubeApiException("Error handling OAuth callback: " + e.getMessage(), e);
        } finally {
            log.info("=== OAuth Callback Handler Completed ===");
        }
    }

    private YouTubeChannelResponse fetchChannelInfo(String accessToken) throws IOException {
        Request request = new Request.Builder()
                .url(youtubeConfig.getApiBaseUrl() + "/channels?part=snippet&mine=true")
                .get()
                .addHeader("Authorization", "Bearer " + accessToken)
                .build();

        Response response = youtubeHttpClient.newCall(request).execute();

        if (!response.isSuccessful()) {
            String errorBody = response.body() != null ? response.body().string() : "No error details";
            log.error("Failed to fetch channel info. Status: {}, Body: {}", response.code(), errorBody);
            throw new YouTubeApiException("Failed to fetch channel info", response.code());
        }

        String responseBody = response.body().string();
        JsonNode jsonNode = objectMapper.readTree(responseBody);
        JsonNode items = jsonNode.get("items");

        if (items == null || items.size() == 0) {
            log.warn("⚠️ User has no YouTube channel. Creating placeholder entry.");
            return YouTubeChannelResponse.builder()
                    .id("pending")
                    .title("No Channel Yet")
                    .description("Please create a YouTube channel at youtube.com")
                    .thumbnailUrl(null)
                    .build();
        }

        JsonNode channel = items.get(0);
        JsonNode snippet = channel.get("snippet");

        return YouTubeChannelResponse.builder()
                .id(channel.get("id").asText())
                .title(snippet.get("title").asText())
                .description(snippet.has("description") ? snippet.get("description").asText() : "")
                .thumbnailUrl(snippet.get("thumbnails").get("default").get("url").asText())
                .build();
    }

    @Transactional
    public String refreshAccessToken(Long teacherId) {
        log.info("Refreshing YouTube access token for teacher: {}", teacherId);

        TeacherYouTubeToken token = tokenRepository.findByTeacherId(teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("YouTube token not found"));

        if (token.getRefreshToken() == null) {
            throw new ValidationException("No refresh token available. Please reconnect your YouTube account.");
        }

        try {
            FormBody requestBody = new FormBody.Builder()
                    .add("refresh_token", token.getRefreshToken())
                    .add("client_id", youtubeConfig.getClientId())
                    .add("client_secret", youtubeConfig.getClientSecret())
                    .add("grant_type", "refresh_token")
                    .build();

            Request request = new Request.Builder()
                    .url(youtubeConfig.getTokenUrl())
                    .post(requestBody)
                    .build();

            Response response = youtubeHttpClient.newCall(request).execute();

            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "No error details";
                log.error("Failed to refresh token. Status: {}, Body: {}", response.code(), errorBody);
                throw new YouTubeApiException("Failed to refresh token", response.code());
            }

            String responseBody = response.body().string();
            JsonNode jsonNode = objectMapper.readTree(responseBody);

            String newAccessToken = jsonNode.get("access_token").asText();
            long expiresIn = jsonNode.get("expires_in").asLong();

            token.setAccessToken(newAccessToken);
            token.setExpiresAt(Instant.now().plusSeconds(expiresIn));
            token.setLastUsedAt(Instant.now());

            tokenRepository.save(token);

            log.info("✅ Successfully refreshed access token");
            return newAccessToken;

        } catch (IOException e) {
            log.error("Error refreshing access token", e);
            throw new YouTubeApiException("Error refreshing access token", e);
        }
    }

    @Transactional
    public String getValidToken(Long teacherId) {
        TeacherYouTubeToken token = tokenRepository.findByTeacherId(teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("YouTube token not found. Please reconnect."));

        if (token.needsRefresh()) {
            return refreshAccessToken(teacherId);
        }

        token.setLastUsedAt(Instant.now());
        tokenRepository.save(token);

        return token.getAccessToken();
    }

    /**
     * ✅ FIXED: Parse ISO 8601 duration with proper P0D handling
     */
    private int parseDuration(String duration) {
        if (duration == null || duration.isEmpty()) {
            return 0;
        }
        
        // ✅ Handle "P0D" case (video still processing)
        if ("P0D".equals(duration) || "PT0S".equals(duration)) {
            return 0;
        }
        
        // ✅ Only remove "PT" if it exists
        if (duration.startsWith("PT")) {
            duration = duration.substring(2);
        } else if (duration.startsWith("P")) {
            return 0;
        }
        
        int hours = 0, minutes = 0, seconds = 0;
        
        try {
            if (duration.contains("H")) {
                String[] parts = duration.split("H");
                hours = Integer.parseInt(parts[0]);
                duration = parts[1];
            }
            
            if (duration.contains("M")) {
                String[] parts = duration.split("M");
                minutes = Integer.parseInt(parts[0]);
                duration = parts[1];
            }
            
            if (duration.contains("S")) {
                seconds = Integer.parseInt(duration.replace("S", ""));
            }
        } catch (NumberFormatException e) {
            log.warn("⚠️ Failed to parse duration: {}. Returning 0.", duration);
            return 0;
        }
        
        return (hours * 3600) + (minutes * 60) + seconds;
    }
    
    
    public YouTubeUploadResponse uploadVideo(MultipartFile file, UploadVideoRequest request, Long teacherId) {
        log.info("Uploading video to YouTube: {}", request.getTitle());

        String accessToken = getValidToken(teacherId);
        
        TeacherYouTubeToken token = tokenRepository.findByTeacherId(teacherId)
                .orElseThrow(() -> new ValidationException("YouTube token not found"));
        
        if ("pending".equals(token.getYoutubeChannelId())) {
            throw new ValidationException(
                "YouTube channel not created yet. Please visit youtube.com and create a channel before uploading videos."
            );
        }

        try {
            String uploadUrl = initializeResumableUpload(accessToken, request, file);
            String videoId = uploadVideoFile(uploadUrl, file);
            
            log.info("✅ Video uploaded successfully. Video ID: {}", videoId);

            YouTubeVideoResponse videoDetails = null;
            int maxRetries = 3;
            int retryDelay = 2000;
            
            for (int attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    log.info("Fetching video details (attempt {}/{})", attempt, maxRetries);
                    videoDetails = getVideoDetails(videoId, teacherId);
                    break;
                } catch (YouTubeApiException e) {
                    if (attempt < maxRetries) {
                        log.warn("⚠️ Video details not ready yet. Retrying in {}ms...", retryDelay);
                        Thread.sleep(retryDelay);
                        retryDelay *= 2;
                    } else {
                        log.warn("⚠️ Could not fetch video details after {} attempts. Using defaults.", maxRetries);
                        videoDetails = YouTubeVideoResponse.builder()
                                .videoId(videoId)
                                .videoUrl("https://www.youtube.com/watch?v=" + videoId)
                                .embedUrl("https://www.youtube.com/embed/" + videoId)
                                .title(request.getTitle())
                                .description(request.getDescription())
                                .thumbnailUrl("https://i.ytimg.com/vi/" + videoId + "/default.jpg")
                                .durationSeconds(0)
                                .privacyStatus(request.getPrivacyStatus())
                                .viewCount(0L)
                                .publishedAt(Instant.now())
                                .build();
                    }
                }
            }

            log.info("✅ Successfully uploaded video to YouTube. Video ID: {}", videoId);

            return YouTubeUploadResponse.builder()
                    .videoId(videoId)
                    .videoUrl(videoDetails.getVideoUrl())
                    .embedUrl(videoDetails.getEmbedUrl())
                    .thumbnailUrl(videoDetails.getThumbnailUrl())
                    .uploadStatus("uploaded")
                    .build();

        } catch (IOException e) {
            log.error("Error uploading video to YouTube", e);
            throw new YouTubeApiException("Error uploading video to YouTube", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new YouTubeApiException("Video upload interrupted", e);
        }
    }

    private String initializeResumableUpload(String accessToken, UploadVideoRequest request, MultipartFile file) throws IOException {
        Map<String, Object> metadata = new LinkedHashMap<>();
        
        Map<String, Object> snippet = new LinkedHashMap<>();
        
        String cleanTitle = request.getTitle()
                .replaceAll("[\\n\\r\\t]", " ")
                .replaceAll("[\"\']", "")
                .replaceAll("[^\\p{L}\\p{N}\\s\\-_,.]", "")
                .trim();
        
        if (cleanTitle.length() > 100) {
            cleanTitle = cleanTitle.substring(0, 97) + "...";
        }
        
        if (cleanTitle.isEmpty()) {
            throw new YouTubeApiException("Title cannot be empty after cleaning");
        }
        
        snippet.put("title", cleanTitle);
        
        if (request.getDescription() != null && !request.getDescription().trim().isEmpty()) {
            String cleanDescription = request.getDescription()
                    .replaceAll("[\"\']", "")
                    .replaceAll("[\\n\\r]", " ")
                    .trim();
            
            if (cleanDescription.length() > 5000) {
                cleanDescription = cleanDescription.substring(0, 4997) + "...";
            }
            
            if (!cleanDescription.isEmpty()) {
                snippet.put("description", cleanDescription);
            }
        }
        
        snippet.put("categoryId", "27");
        
        metadata.put("snippet", snippet);
        
        Map<String, Object> status = new LinkedHashMap<>();
        
        String privacyStatus = request.getPrivacyStatus();
        if (privacyStatus == null || 
            (!privacyStatus.equals("private") && 
             !privacyStatus.equals("unlisted") && 
             !privacyStatus.equals("public"))) {
            privacyStatus = "private";
        }
        
        status.put("privacyStatus", privacyStatus);
        status.put("selfDeclaredMadeForKids", false);
        
        metadata.put("status", status);

        if (file.isEmpty()) {
            throw new YouTubeApiException("Video file is empty");
        }
        
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("video/")) {
            throw new YouTubeApiException("Invalid file type: " + contentType + ". Must be a video file.");
        }
        
        long fileSize = file.getSize();
        if (fileSize == 0) {
            throw new YouTubeApiException("Video file size is 0 bytes");
        }
        
        log.info("📹 Video file: name={}, type={}, size={} bytes ({}MB)", 
                 file.getOriginalFilename(), 
                 contentType, 
                 fileSize,
                 String.format("%.2f", fileSize / (1024.0 * 1024.0)));

        String metadataJson = objectMapper.writeValueAsString(metadata);
        log.info("📤 Sending YouTube upload metadata: {}", metadataJson);

        RequestBody body = RequestBody.create(metadataJson, JSON);

        Request httpRequest = new Request.Builder()
                .url(youtubeConfig.getUploadBaseUrl() + "/videos?uploadType=resumable&part=snippet,status")
                .post(body)
                .addHeader("Authorization", "Bearer " + accessToken)
                .addHeader("Content-Type", "application/json; charset=UTF-8")
                .addHeader("X-Upload-Content-Type", contentType)
                .addHeader("X-Upload-Content-Length", String.valueOf(fileSize))
                .build();

        log.info("🚀 Sending resumable upload initialization request to YouTube...");
        
        Response response = youtubeHttpClient.newCall(httpRequest).execute();

        if (!response.isSuccessful()) {
            String errorBody = response.body() != null ? response.body().string() : "No error details";
            
            log.error("❌ YouTube API Error - Status: {}", response.code());
            log.error("📄 Error Response Body: {}", errorBody);

            String errorMessage = buildErrorMessage(response.code(), errorBody);
            throw new YouTubeApiException(errorMessage + "\n\nFull YouTube error: " + errorBody);
        }

        String uploadUrl = response.header("Location");
        if (uploadUrl == null || uploadUrl.isEmpty()) {
            log.error("❌ No Location header in YouTube response");
            throw new YouTubeApiException("No upload URL returned by YouTube API");
        }

        log.info("✅ Got resumable upload URL from YouTube");
        
        return uploadUrl;
    }

    private String buildErrorMessage(int statusCode, String errorBody) {
        String baseMessage = "YouTube upload failed (HTTP " + statusCode + "): ";
        
        try {
            JsonNode errorNode = objectMapper.readTree(errorBody);
            JsonNode errors = errorNode.path("error").path("errors");
            
            if (errors.isArray() && errors.size() > 0) {
                String errorReason = errors.get(0).path("reason").asText("");
                String errorMessage = errors.get(0).path("message").asText("");
                
                log.error("🔍 YouTube Error Details - Reason: {}, Message: {}", errorReason, errorMessage);
                
                switch (statusCode) {
                    case 400:
                        if (errorReason.contains("invalidVideoMetadata") || errorReason.contains("invalidMetadata")) {
                            return baseMessage + "Invalid video metadata. Possible issues:\n" +
                                   "1. Title/description contains unsupported characters\n" +
                                   "2. Category ID is invalid\n" +
                                   "3. Privacy status is invalid\n" +
                                   "Error: " + errorMessage;
                        } else if (errorReason.contains("forbidden") || errorReason.contains("uploadLimitExceeded")) {
                            return baseMessage + "Upload limit exceeded or restrictions. Actions:\n" +
                                   "1. Verify channel at https://www.youtube.com/verify\n" +
                                   "2. Check daily upload quota (may be limited for new channels)\n" +
                                   "3. Ensure channel is in good standing\n" +
                                   "Error: " + errorMessage;
                        } else if (errorReason.contains("quotaExceeded")) {
                            return baseMessage + "YouTube API quota exceeded. Wait or increase quota.\n" +
                                   "Error: " + errorMessage;
                        } else if (errorReason.equals("badRequest")) {
                            return baseMessage + "Bad request - YouTube rejected the upload parameters.\n" +
                                   "Common causes:\n" +
                                   "1. Invalid categoryId (must be a valid YouTube category)\n" +
                                   "2. Missing required fields in metadata\n" +
                                   "3. Invalid privacy status\n" +
                                   "4. Account/channel restrictions\n" +
                                   "Error: " + errorMessage;
                        } else {
                            return baseMessage + "Invalid request: " + errorMessage;
                        }
                        
                    case 401:
                        return baseMessage + "Authentication expired. Please reconnect YouTube account.";
                        
                    case 403:
                        return baseMessage + "Access forbidden. Your channel needs:\n" +
                               "1. Email/phone verification at https://www.youtube.com/verify\n" +
                               "2. Upload permissions (new channels have 24-hour wait)\n" +
                               "3. No strikes or restrictions\n" +
                               "Error: " + errorMessage;
                        
                    case 404:
                        return baseMessage + "YouTube API endpoint not found.";
                        
                    case 429:
                        return baseMessage + "Rate limit exceeded. Wait before retrying.";
                        
                    case 500:
                    case 503:
                        return baseMessage + "YouTube service unavailable. Try later.";
                        
                    default:
                        return baseMessage + errorMessage;
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse YouTube error response", e);
        }
        
        return baseMessage + "Unknown error. Raw response: " + errorBody;
    }

    private String uploadVideoFile(String uploadUrl, MultipartFile file) throws IOException {
        byte[] fileBytes = file.getBytes();

        String contentType = file.getContentType();
        if (contentType == null) {
            contentType = "application/octet-stream";
        }

        log.info("Uploading file {} ({} bytes) to YouTube with MIME type {}",
                file.getOriginalFilename(), fileBytes.length, contentType);

        MediaType videoType = MediaType.parse(contentType);
        RequestBody body = RequestBody.create(fileBytes, videoType);

        Request request = new Request.Builder()
                .url(uploadUrl)
                .put(body)
                .addHeader("Content-Type", contentType)
                .addHeader("Content-Length", String.valueOf(fileBytes.length))
                .build();

        Response response = youtubeHttpClient.newCall(request).execute();

        if (!response.isSuccessful()) {
            String errorBody = response.body() != null ? response.body().string() : "No error details";
            log.error("Failed to upload video file. Status: {}, Body: {}", response.code(), errorBody);
            throw new YouTubeApiException("Failed to upload video file (HTTP " + response.code() + "): " + errorBody);
        }

        String responseBody = response.body().string();
        JsonNode jsonNode = objectMapper.readTree(responseBody);

        String videoId = jsonNode.get("id").asText();
        log.info("✅ Video file uploaded successfully. Video ID: {}", videoId);

        return videoId;
    }

    public YouTubeVideoResponse getVideoDetails(String videoId, Long teacherId) {
        log.info("Fetching YouTube video details: {}", videoId);

        String accessToken = getValidToken(teacherId);

        try {
            Request request = new Request.Builder()
                    .url(youtubeConfig.getApiBaseUrl() + "/videos?part=snippet,contentDetails,statistics,status&id=" + videoId)
                    .get()
                    .addHeader("Authorization", "Bearer " + accessToken)
                    .build();

            Response response = youtubeHttpClient.newCall(request).execute();

            if (!response.isSuccessful()) {
                throw new YouTubeApiException("Failed to fetch video details", response.code());
            }

            String responseBody = response.body().string();
            log.info("YouTube API Response: {}", responseBody);
            
            JsonNode jsonNode = objectMapper.readTree(responseBody);
            JsonNode items = jsonNode.get("items");

            if (items == null || items.size() == 0) {
                throw new YouTubeApiException("Video not found or still processing");
            }

            JsonNode video = items.get(0);
            JsonNode snippet = video.get("snippet");
            JsonNode contentDetails = video.get("contentDetails");
            JsonNode statistics = video.get("statistics");
            
            if (snippet == null) {
                log.warn("⚠️ Video snippet not available yet. Video may still be processing: {}", videoId);
                throw new YouTubeApiException("Video is still processing. Please try again in a moment.");
            }
            
            if (contentDetails == null) {
                log.warn("⚠️ Video content details not available yet: {}", videoId);
                throw new YouTubeApiException("Video details not available yet. Please try again in a moment.");
            }

            String duration = contentDetails.has("duration") ? contentDetails.get("duration").asText() : "PT0S";
            int durationSeconds = parseDuration(duration);

            String thumbnailUrl = null;
            if (snippet.has("thumbnails")) {
                JsonNode thumbnails = snippet.get("thumbnails");
                if (thumbnails.has("high")) {
                    thumbnailUrl = thumbnails.get("high").get("url").asText();
                } else if (thumbnails.has("default")) {
                    thumbnailUrl = thumbnails.get("default").get("url").asText();
                }
            }
            
            String privacyStatus = "unlisted";
            if (video.has("status") && video.get("status").has("privacyStatus")) {
                privacyStatus = video.get("status").get("privacyStatus").asText();
            }

            return YouTubeVideoResponse.builder()
                    .videoId(videoId)
                    .videoUrl("https://www.youtube.com/watch?v=" + videoId)
                    .embedUrl("https://www.youtube.com/embed/" + videoId)
                    .title(snippet.has("title") ? snippet.get("title").asText() : "Untitled")
                    .description(snippet.has("description") ? snippet.get("description").asText() : "")
                    .thumbnailUrl(thumbnailUrl)
                    .durationSeconds(durationSeconds)
                    .privacyStatus(privacyStatus)
                    .viewCount(statistics != null && statistics.has("viewCount") ? statistics.get("viewCount").asLong() : 0L)
                    .publishedAt(snippet.has("publishedAt") ? Instant.parse(snippet.get("publishedAt").asText()) : Instant.now())
                    .build();

        } catch (IOException e) {
            log.error("Error fetching video details", e);
            throw new YouTubeApiException("Error fetching video details", e);
        }
    }

    public void updateVideoMetadata(String videoId, VideoUpdateRequest request, Long teacherId) {
        log.info("Updating YouTube video metadata: {}", videoId);

        String accessToken = getValidToken(teacherId);

        try {
            String metadata = String.format("""
                    {
                        "id": "%s",
                        "snippet": {
                            "title": "%s",
                            "description": "%s",
                            "categoryId": "27"
                        },
                        "status": {
                            "privacyStatus": "%s"
                        }
                    }
                    """,
                    videoId,
                    request.getTitle(),
                    request.getDescription() != null ? request.getDescription() : "",
                    request.getPrivacyStatus() != null ? request.getPrivacyStatus() : "unlisted"
            );

            RequestBody body = RequestBody.create(metadata, JSON);

            Request httpRequest = new Request.Builder()
                    .url(youtubeConfig.getApiBaseUrl() + "/videos?part=snippet,status")
                    .put(body)
                    .addHeader("Authorization", "Bearer " + accessToken)
                    .addHeader("Content-Type", "application/json")
                    .build();

            Response response = youtubeHttpClient.newCall(httpRequest).execute();

            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "No error details";
                log.error("Failed to update video metadata. Status: {}, Body: {}", response.code(), errorBody);
                throw new YouTubeApiException("Failed to update video metadata", response.code());
            }

            log.info("✅ Successfully updated video metadata");

        } catch (IOException e) {
            log.error("Error updating video metadata", e);
            throw new YouTubeApiException("Error updating video metadata", e);
        }
    }

    public void deleteVideo(String videoId, Long teacherId) {
        log.info("Deleting YouTube video: {}", videoId);

        String accessToken = getValidToken(teacherId);

        try {
            Request request = new Request.Builder()
                    .url(youtubeConfig.getApiBaseUrl() + "/videos?id=" + videoId)
                    .delete()
                    .addHeader("Authorization", "Bearer " + accessToken)
                    .build();

            Response response = youtubeHttpClient.newCall(request).execute();

            if (!response.isSuccessful() && response.code() != 404) {
                String errorBody = response.body() != null ? response.body().string() : "No error details";
                log.error("Failed to delete video. Status: {}, Body: {}", response.code(), errorBody);
                throw new YouTubeApiException("Failed to delete video", response.code());
            }

            log.info("✅ Successfully deleted video from YouTube");

        } catch (IOException e) {
            log.error("Error deleting video", e);
            throw new YouTubeApiException("Error deleting video", e);
        }
    }
}