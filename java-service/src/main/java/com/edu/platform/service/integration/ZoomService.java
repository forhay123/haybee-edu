package com.edu.platform.service.integration;

import com.edu.platform.config.ZoomConfig;
import com.edu.platform.dto.integration.*;
import com.edu.platform.exception.ZoomApiException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class ZoomService {

    private final ZoomConfig zoomConfig;
    private final OkHttpClient zoomHttpClient;
    private final ObjectMapper objectMapper;
    private final RedisTemplate<String, String> redisTemplate;

    private static final String REDIS_TOKEN_KEY = "zoom:access_token";
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");

    /**
     * Get Zoom access token (server-to-server OAuth)
     * Caches token in Redis for 1 hour
     */
    public String getAccessToken() {
        // Check cache first
        String cachedToken = redisTemplate.opsForValue().get(REDIS_TOKEN_KEY);
        if (cachedToken != null) {
            log.debug("Using cached Zoom access token");
            return cachedToken;
        }

        log.info("Fetching new Zoom access token");

        try {
            // Prepare credentials for Basic Auth
            String credentials = zoomConfig.getClientId() + ":" + zoomConfig.getClientSecret();
            String basicAuth = "Basic " + Base64.getEncoder().encodeToString(credentials.getBytes());

            // Build request body
            FormBody requestBody = new FormBody.Builder()
                    .add("grant_type", "account_credentials")
                    .add("account_id", zoomConfig.getAccountId())
                    .build();

            // Make request
            Request request = new Request.Builder()
                    .url(zoomConfig.getOauthTokenUrl())
                    .post(requestBody)
                    .addHeader("Authorization", basicAuth)
                    .build();

            Response response = zoomHttpClient.newCall(request).execute();

            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "No error details";
                log.error("Failed to get Zoom access token. Status: {}, Body: {}", response.code(), errorBody);
                throw new ZoomApiException("Failed to get Zoom access token", response.code());
            }

            String responseBody = response.body().string();
            JsonNode jsonNode = objectMapper.readTree(responseBody);
            String accessToken = jsonNode.get("access_token").asText();
            long expiresIn = jsonNode.get("expires_in").asLong();

            // Cache token in Redis (expires in 1 hour, but we set 55 min to be safe)
            redisTemplate.opsForValue().set(REDIS_TOKEN_KEY, accessToken, expiresIn - 300, TimeUnit.SECONDS);

            log.info("✅ Successfully obtained Zoom access token (expires in {} seconds)", expiresIn);
            return accessToken;

        } catch (IOException e) {
            log.error("Error fetching Zoom access token", e);
            throw new ZoomApiException("Error fetching Zoom access token", e);
        }
    }

    /**
     * Create a scheduled Zoom meeting
     */
    public ZoomMeetingResponse createMeeting(CreateMeetingRequest request) {
        log.info("Creating Zoom meeting: {}", request.getTopic());

        String accessToken = getAccessToken();

        try {
            // Format start time (ISO 8601)
            String startTimeStr = request.getStartTime()
                    .atZone(ZoneId.systemDefault())
                    .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);

            // Build JSON request body
            String jsonBody = String.format("""
                {
                    "topic": "%s",
                    "type": 2,
                    "start_time": "%s",
                    "duration": %d,
                    "timezone": "%s",
                    "password": "%s",
                    "settings": {
                        "join_before_host": %b,
                        "mute_upon_entry": %b,
                        "waiting_room": %b,
                        "auto_recording": "%s"
                    }
                }
                """,
                    request.getTopic(),
                    startTimeStr,
                    request.getDuration(),
                    request.getTimezone() != null ? request.getTimezone() : "UTC",
                    request.getPassword() != null ? request.getPassword() : "",
                    request.getSettings() != null && request.getSettings().getJoinBeforeHost() != null
                            ? request.getSettings().getJoinBeforeHost() : true,
                    request.getSettings() != null && request.getSettings().getMuteUponEntry() != null
                            ? request.getSettings().getMuteUponEntry() : false,
                    request.getSettings() != null && request.getSettings().getWaitingRoom() != null
                            ? request.getSettings().getWaitingRoom() : false,
                    request.getSettings() != null && request.getSettings().getAutoRecording() != null
                            && request.getSettings().getAutoRecording() ? "cloud" : "none"
            );

            RequestBody body = RequestBody.create(jsonBody, JSON);

            Request httpRequest = new Request.Builder()
                    .url(zoomConfig.getApiBaseUrl() + "/users/me/meetings")
                    .post(body)
                    .addHeader("Authorization", "Bearer " + accessToken)
                    .addHeader("Content-Type", "application/json")
                    .build();

            Response response = executeWithRetry(httpRequest, 3);

            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "No error details";
                log.error("Failed to create Zoom meeting. Status: {}, Body: {}", response.code(), errorBody);
                throw new ZoomApiException("Failed to create Zoom meeting", response.code());
            }

            String responseBody = response.body().string();
            ZoomMeetingResponse meetingResponse = objectMapper.readValue(responseBody, ZoomMeetingResponse.class);

            log.info("✅ Successfully created Zoom meeting. ID: {}, Join URL: {}",
                    meetingResponse.getId(), meetingResponse.getJoinUrl());

            return meetingResponse;

        } catch (IOException e) {
            log.error("Error creating Zoom meeting", e);
            throw new ZoomApiException("Error creating Zoom meeting", e);
        }
    }

    /**
     * Get meeting details
     */
    public ZoomMeetingResponse getMeetingDetails(String meetingId) {
        log.info("Fetching Zoom meeting details for ID: {}", meetingId);

        String accessToken = getAccessToken();

        try {
            Request request = new Request.Builder()
                    .url(zoomConfig.getApiBaseUrl() + "/meetings/" + meetingId)
                    .get()
                    .addHeader("Authorization", "Bearer " + accessToken)
                    .build();

            Response response = executeWithRetry(request, 3);

            if (!response.isSuccessful()) {
                if (response.code() == 404) {
                    log.warn("Zoom meeting not found: {}", meetingId);
                    return null;
                }
                String errorBody = response.body() != null ? response.body().string() : "No error details";
                log.error("Failed to get Zoom meeting details. Status: {}, Body: {}", response.code(), errorBody);
                throw new ZoomApiException("Failed to get Zoom meeting details", response.code());
            }

            String responseBody = response.body().string();
            return objectMapper.readValue(responseBody, ZoomMeetingResponse.class);

        } catch (IOException e) {
            log.error("Error fetching Zoom meeting details", e);
            throw new ZoomApiException("Error fetching Zoom meeting details", e);
        }
    }

    /**
     * Update an existing meeting
     */
    public ZoomMeetingResponse updateMeeting(String meetingId, UpdateMeetingRequest request) {
        log.info("Updating Zoom meeting: {}", meetingId);

        String accessToken = getAccessToken();

        try {
            String startTimeStr = request.getStartTime()
                    .atZone(ZoneId.systemDefault())
                    .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);

            String jsonBody = String.format("""
                {
                    "topic": "%s",
                    "start_time": "%s",
                    "duration": %d,
                    "timezone": "%s"
                }
                """,
                    request.getTopic(),
                    startTimeStr,
                    request.getDuration(),
                    request.getTimezone() != null ? request.getTimezone() : "UTC"
            );

            RequestBody body = RequestBody.create(jsonBody, JSON);

            Request httpRequest = new Request.Builder()
                    .url(zoomConfig.getApiBaseUrl() + "/meetings/" + meetingId)
                    .patch(body)
                    .addHeader("Authorization", "Bearer " + accessToken)
                    .addHeader("Content-Type", "application/json")
                    .build();

            Response response = executeWithRetry(httpRequest, 3);

            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "No error details";
                log.error("Failed to update Zoom meeting. Status: {}, Body: {}", response.code(), errorBody);
                throw new ZoomApiException("Failed to update Zoom meeting", response.code());
            }

            log.info("✅ Successfully updated Zoom meeting: {}", meetingId);

            // Return updated meeting details
            return getMeetingDetails(meetingId);

        } catch (IOException e) {
            log.error("Error updating Zoom meeting", e);
            throw new ZoomApiException("Error updating Zoom meeting", e);
        }
    }

    /**
     * Delete a Zoom meeting
     */
    public void deleteMeeting(String meetingId) {
        log.info("Deleting Zoom meeting: {}", meetingId);

        String accessToken = getAccessToken();

        try {
            Request request = new Request.Builder()
                    .url(zoomConfig.getApiBaseUrl() + "/meetings/" + meetingId)
                    .delete()
                    .addHeader("Authorization", "Bearer " + accessToken)
                    .build();

            Response response = zoomHttpClient.newCall(request).execute();

            if (!response.isSuccessful() && response.code() != 404) {
                String errorBody = response.body() != null ? response.body().string() : "No error details";
                log.error("Failed to delete Zoom meeting. Status: {}, Body: {}", response.code(), errorBody);
                throw new ZoomApiException("Failed to delete Zoom meeting", response.code());
            }

            log.info("✅ Successfully deleted Zoom meeting: {}", meetingId);

        } catch (IOException e) {
            log.error("Error deleting Zoom meeting", e);
            throw new ZoomApiException("Error deleting Zoom meeting", e);
        }
    }

    /**
     * List all recordings for a meeting
     */
    public ZoomRecordingResponse listRecordings(String meetingId) {
        log.info("Fetching Zoom recordings for meeting: {}", meetingId);

        String accessToken = getAccessToken();

        try {
            Request request = new Request.Builder()
                    .url(zoomConfig.getApiBaseUrl() + "/meetings/" + meetingId + "/recordings")
                    .get()
                    .addHeader("Authorization", "Bearer " + accessToken)
                    .build();

            Response response = executeWithRetry(request, 3);

            if (!response.isSuccessful()) {
                if (response.code() == 404) {
                    log.warn("No recordings found for meeting: {}", meetingId);
                    return null;
                }
                String errorBody = response.body() != null ? response.body().string() : "No error details";
                log.error("Failed to list recordings. Status: {}, Body: {}", response.code(), errorBody);
                throw new ZoomApiException("Failed to list recordings", response.code());
            }

            String responseBody = response.body().string();
            ZoomRecordingResponse recordingResponse = objectMapper.readValue(responseBody, ZoomRecordingResponse.class);

            log.info("✅ Found {} recording files for meeting {}", 
                    recordingResponse.getRecordingFiles() != null ? recordingResponse.getRecordingFiles().size() : 0,
                    meetingId);

            return recordingResponse;

        } catch (IOException e) {
            log.error("Error listing Zoom recordings", e);
            throw new ZoomApiException("Error listing Zoom recordings", e);
        }
    }

    /**
     * Download a recording file from Zoom
     * Returns the local file path where the recording is saved
     */
    public String downloadRecording(String downloadUrl, String destinationPath) {
        log.info("Downloading Zoom recording from: {}", downloadUrl);

        String accessToken = getAccessToken();

        try {
            Request request = new Request.Builder()
                    .url(downloadUrl)
                    .get()
                    .addHeader("Authorization", "Bearer " + accessToken)
                    .build();

            Response response = zoomHttpClient.newCall(request).execute();

            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "No error details";
                log.error("Failed to download recording. Status: {}, Body: {}", response.code(), errorBody);
                throw new ZoomApiException("Failed to download recording", response.code());
            }

            // Save to file
            java.io.File destFile = new java.io.File(destinationPath);
            destFile.getParentFile().mkdirs(); // Create directories if needed

            try (java.io.InputStream inputStream = response.body().byteStream();
                 java.io.FileOutputStream outputStream = new java.io.FileOutputStream(destFile)) {
                
                byte[] buffer = new byte[8192];
                int bytesRead;
                long totalBytesRead = 0;
                
                while ((bytesRead = inputStream.read(buffer)) != -1) {
                    outputStream.write(buffer, 0, bytesRead);
                    totalBytesRead += bytesRead;
                }

                log.info("✅ Successfully downloaded recording. Size: {} MB, Path: {}", 
                        totalBytesRead / (1024 * 1024), destinationPath);
                
                return destinationPath;
            }

        } catch (IOException e) {
            log.error("Error downloading Zoom recording", e);
            throw new ZoomApiException("Error downloading Zoom recording", e);
        }
    }

    /**
     * Execute HTTP request with retry logic
     */
    private Response executeWithRetry(Request request, int maxRetries) throws IOException {
        int attempt = 0;
        IOException lastException = null;

        while (attempt < maxRetries) {
            try {
                Response response = zoomHttpClient.newCall(request).execute();

                // Retry on 5xx errors
                if (response.code() >= 500 && response.code() < 600) {
                    log.warn("Zoom API returned 5xx error (attempt {}/{}). Retrying...", attempt + 1, maxRetries);
                    attempt++;
                    Thread.sleep((long) Math.pow(2, attempt) * 1000); // Exponential backoff
                    continue;
                }

                return response;

            } catch (IOException e) {
                lastException = e;
                attempt++;
                if (attempt < maxRetries) {
                    log.warn("Request failed (attempt {}/{}). Retrying...", attempt, maxRetries);
                    try {
                        Thread.sleep((long) Math.pow(2, attempt) * 1000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new ZoomApiException("Retry interrupted", ie);
                    }
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new ZoomApiException("Retry interrupted", e);
            }
        }

        throw lastException;
    }
}