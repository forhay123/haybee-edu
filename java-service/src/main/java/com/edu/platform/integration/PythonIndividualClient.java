package com.edu.platform.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * Client for calling Python AI service for INDIVIDUAL student processing
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PythonIndividualClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${PYTHON_SERVICE_URL:http://ai-service:8000}")
    private String pythonServiceUrl;

    @Value("${SYSTEM_TOKEN}")
    private String systemToken;

    /**
     * ✅ NEW: Process timetable with class ID for accurate subject mapping
     */
    public Map<String, Object> processTimetableWithClass(
            Long timetableId, 
            Long studentId, 
            String filePath,
            Long classId) {
        
        log.info("🚀 Triggering timetable processing for ID: {}, Student: {}, Class: {}", 
                 timetableId, studentId, classId);
        
        try {
            String url = pythonServiceUrl + "/individual/process-timetable";
            
            Map<String, Object> request = new HashMap<>();
            request.put("timetable_id", timetableId);
            request.put("student_id", studentId);
            request.put("file_url", filePath);
            request.put("class_id", classId); // ✅ Include class ID
            
            log.info("📤 Sending to Python:");
            log.info("   URL: {}", url);
            log.info("   Timetable ID: {}", timetableId);
            log.info("   Student ID: {}", studentId);
            log.info("   File: {}", filePath);
            log.info("   Class ID: {}", classId);
            
            HttpHeaders headers = createHeaders();
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("✅ Timetable processing triggered successfully");
                return response.getBody();
            } else {
                log.error("❌ Failed to trigger timetable processing: {}", response.getStatusCode());
                throw new RuntimeException("Failed to trigger processing: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            log.error("❌ Error triggering timetable processing", e);
            // Don't throw - we don't want to fail the upload if Python is temporarily down
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "ERROR");
            errorResponse.put("message", e.getMessage());
            return errorResponse;
        }
    }
    
    /**
     * @deprecated Use processTimetableWithClass instead
     * This method is kept for backward compatibility
     */
    @Deprecated
    public Map<String, Object> processTimetable(Long timetableId, Long studentId, String fileUrl) {
        log.warn("⚠️ Using deprecated processTimetable without class ID - " +
                 "subject mapping may be less accurate");
        
        return processTimetableWithClass(timetableId, studentId, fileUrl, null);
    }

    /**
     * Trigger Python AI to process uploaded scheme of work
     */
    public Map<String, Object> processScheme(Long schemeId, Long studentId, Long subjectId, String fileUrl) {
        log.info("🚀 Triggering scheme processing for ID: {}, Student: {}, Subject: {}", 
                 schemeId, studentId, subjectId);
        
        try {
            String url = pythonServiceUrl + "/individual/process-scheme";
            
            Map<String, Object> request = new HashMap<>();
            request.put("scheme_id", schemeId);
            request.put("student_id", studentId);
            request.put("subject_id", subjectId);
            request.put("file_url", fileUrl);
            
            HttpHeaders headers = createHeaders();
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("✅ Scheme processing triggered successfully");
                return response.getBody();
            } else {
                log.error("❌ Failed to trigger scheme processing: {}", response.getStatusCode());
                throw new RuntimeException("Failed to trigger processing: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            log.error("❌ Error triggering scheme processing", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "ERROR");
            errorResponse.put("message", e.getMessage());
            return errorResponse;
        }
    }

    /**
     * Map extracted subjects to platform subjects using fuzzy matching
     */
    public Map<String, Object> mapSubjects(Long studentId, String[] extractedSubjects) {
        log.info("🔍 Triggering subject mapping for {} subjects", extractedSubjects.length);
        
        try {
            String url = pythonServiceUrl + "/individual/map-subjects";
            
            Map<String, Object> request = new HashMap<>();
            request.put("student_id", studentId);
            request.put("extracted_subjects", extractedSubjects);
            
            HttpHeaders headers = createHeaders();
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("✅ Subject mapping completed successfully");
                return response.getBody();
            } else {
                log.error("❌ Failed to map subjects: {}", response.getStatusCode());
                throw new RuntimeException("Failed to map subjects: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            log.error("❌ Error mapping subjects", e);
            throw new RuntimeException("Failed to map subjects", e);
        }
    }

    /**
     * Get timetable processing status
     */
    public Map<String, Object> getTimetableStatus(Long timetableId) {
        log.info("📊 Fetching timetable processing status: {}", timetableId);
        
        try {
            String url = pythonServiceUrl + "/individual/timetable/" + timetableId + "/status";
            
            HttpHeaders headers = createHeaders();
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                return response.getBody();
            } else {
                log.error("Failed to fetch status: {}", response.getStatusCode());
                throw new RuntimeException("Failed to fetch status: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            log.error("Error fetching timetable status", e);
            throw new RuntimeException("Failed to get status", e);
        }
    }

    /**
     * Get scheme processing status
     */
    public Map<String, Object> getSchemeStatus(Long schemeId) {
        log.info("📊 Fetching scheme processing status: {}", schemeId);
        
        try {
            String url = pythonServiceUrl + "/individual/scheme/" + schemeId + "/status";
            
            HttpHeaders headers = createHeaders();
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                return response.getBody();
            } else {
                log.error("Failed to fetch status: {}", response.getStatusCode());
                throw new RuntimeException("Failed to fetch status: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            log.error("Error fetching scheme status", e);
            throw new RuntimeException("Failed to get status", e);
        }
    }

    /**
     * Create HTTP headers with system token
     */
    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-System-Token", systemToken);
        headers.set("Authorization", "Bearer " + systemToken);
        return headers;
    }
}