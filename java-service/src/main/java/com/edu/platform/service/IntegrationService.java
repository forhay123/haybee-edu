package com.edu.platform.service;

import com.edu.platform.dto.classdata.LessonAiStatusDto;
import com.edu.platform.model.LessonAIResult;
import com.edu.platform.model.User;
import com.edu.platform.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * Handles integration between the Java backend and the Python AI service.
 * ✅ UPDATED: Now works with S3 URLs instead of local file paths
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IntegrationService {

    private final RestTemplate restTemplate;
    private final JdbcTemplate jdbcTemplate;
    private final LessonAIQuestionService aiQuestionService;
    private final UserRepository userRepository;

    @Value("${python.service.url:http://python-service:8000}")
    private String pythonServiceUrl;

    @Value("${system.token:replace_with_system_jwt}")
    private String systemToken;

    // ==========================================================
    // Helper methods to build URLs dynamically
    // ==========================================================
    private String getAiSyncUrl() {
        return pythonServiceUrl + "/ai/lessons/sync";
    }

    private String getAiProcessUrl() {
        return pythonServiceUrl + "/ai/process-lesson";
    }

    private String getAiResultUrl(Long lessonTopicId) {
        return pythonServiceUrl + "/api/ai-results/" + lessonTopicId;
    }

    private String getAiStatusUrl(Long lessonId) {
        return pythonServiceUrl + "/ai/lessons/" + lessonId + "/status";
    }

    private String getAiRegenerateUrl(Long lessonTopicId) {
        return pythonServiceUrl + "/ai/regenerate/" + lessonTopicId;
    }

    // ==========================================================
    // 1️⃣ Sync Lesson Metadata with Python
    // ==========================================================

    private boolean syncLessonWithPython(Long lessonTopicId, Long subjectId, int weekNumber) {
        try {
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("lesson_topic_id", lessonTopicId);
            body.add("subject_id", subjectId);
            body.add("week_number", weekNumber);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            headers.setBearerAuth(systemToken);

            HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(getAiSyncUrl(), request, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String status = (String) response.getBody().get("status");
                log.info("✅ Lesson sync with Python successful (status = {}) for topic {}", status, lessonTopicId);
                return true;
            }
            log.warn("⚠️ Unexpected response syncing lesson {}: {}", lessonTopicId, response);
            return false;

        } catch (HttpStatusCodeException e) {
            log.error("❌ Python sync failed for lesson {} → {}", lessonTopicId, e.getResponseBodyAsString());
            return false;
        } catch (Exception e) {
            log.error("❌ Exception during Python sync for lesson {}: {}", lessonTopicId, e.getMessage(), e);
            return false;
        }
    }

    // ==========================================================
    // ✅ 2️⃣ UPDATED: Send S3 URL to Python AI (Async)
    // ==========================================================

    @Async
    public void processLessonWithPython(Long lessonTopicId, Long subjectId, int weekNumber, String s3Url) {
        try {
            // Sync lesson metadata first
            boolean synced = syncLessonWithPython(lessonTopicId, subjectId, weekNumber);
            if (!synced) {
                log.error("❌ Aborting AI upload — sync failed for lesson {}", lessonTopicId);
                return;
            }

            log.info("📤 Sending S3 URL to Python AI service for lesson {}", lessonTopicId);
            log.info("   S3 URL: {}", s3Url);

            // ✅ Send S3 URL instead of file upload
            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("lesson_topic_id", lessonTopicId.toString());
            body.add("subject_id", subjectId.toString());
            body.add("week_number", String.valueOf(weekNumber));
            body.add("file_url", s3Url);  // ✅ Send S3 URL

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.setBearerAuth(systemToken);

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(getAiProcessUrl(), request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("✅ Python AI processing started for lesson {} (status: {})", 
                        lessonTopicId, response.getStatusCode());
            } else {
                log.warn("⚠️ Python AI returned unexpected status: {}", response.getStatusCode());
            }

        } catch (HttpStatusCodeException e) {
            log.error("❌ Python AI returned error for lesson {} → {}",
                    lessonTopicId, e.getResponseBodyAsString());
        } catch (Exception e) {
            log.error("❌ Failed to send S3 URL to Python AI for lesson {}: {}", 
                    lessonTopicId, e.getMessage(), e);
        }
    }

    // ==========================================================
    // 3️⃣ Fetch AI Result from Python
    // ==========================================================

    public LessonAIResult getLessonAIResultByTopic(Long lessonTopicId) {
        try {
            String url = getAiResultUrl(lessonTopicId);
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(systemToken);
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<LessonAIResult> response =
                    restTemplate.exchange(url, HttpMethod.GET, entity, LessonAIResult.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
            throw new RuntimeException("No AI result found for topic " + lessonTopicId);

        } catch (Exception e) {
            log.error("⚠️ Failed fetching AI result for topic {}: {}", lessonTopicId, e.getMessage());
            throw new RuntimeException("AI result not found for topic " + lessonTopicId, e);
        }
    }

    // ==========================================================
    // 4️⃣ Delete AI Records (DB Cleanup)
    // ==========================================================

    public void deleteAIResultsForLesson(Long lessonTopicId) {
        String sql = "DELETE FROM ai.lesson_ai_results WHERE lesson_topic_id = ?";
        jdbcTemplate.update(sql, lessonTopicId);
        log.info("🗑 Deleted AI DB records for lesson {}", lessonTopicId);
    }

    // ==========================================================
    // 5️⃣ Get AI Status (Progress)
    // ==========================================================

    public LessonAiStatusDto getLessonAiStatus(Long lessonId) {
        try {
            String url = getAiStatusUrl(lessonId);
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(systemToken);
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<LessonAiStatusDto> response =
                    restTemplate.exchange(url, HttpMethod.GET, entity, LessonAiStatusDto.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
            return new LessonAiStatusDto("PENDING", 0, 0);

        } catch (Exception e) {
            log.warn("⚠️ Python AI status unavailable for lesson {} → returning PENDING", lessonId);
            return new LessonAiStatusDto("PENDING", 0, 0);
        }
    }

    // ==========================================================
    // 6️⃣ Regenerate Lesson AI Data
    // ==========================================================

    @Async
    public void regenerateAIForLesson(Long lessonTopicId) {
        try {
            String url = getAiRegenerateUrl(lessonTopicId);
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(systemToken);
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("🔁 AI regeneration triggered for lesson {}", lessonTopicId);
            } else {
                log.error("❌ Python regeneration returned: {}", response.getStatusCode());
            }

        } catch (Exception e) {
            log.error("❌ Failed to regenerate AI for lesson {}", lessonTopicId, e);
        }
    }

    // ==========================================================
    // ✅ 7️⃣ Auto-Create Assessment Methods
    // ==========================================================

    @Transactional
    public Map<String, Object> createMissingAssessmentsForAllLessons() {
        log.info("🔍 Checking for lesson topics with questions but no assessment...");
        
        try {
            String sql = "SELECT * FROM create_missing_assessments()";
            
            List<Map<String, Object>> results = jdbcTemplate.query(sql, (rs, rowNum) -> {
                Map<String, Object> result = new HashMap<>();
                result.put("assessmentId", rs.getLong("assessment_id"));
                result.put("lessonTopicId", rs.getLong("lesson_topic_id"));
                result.put("topicTitle", rs.getString("topic_title"));
                result.put("subjectName", rs.getString("subject_name"));
                result.put("questionsAdded", rs.getInt("questions_added"));
                result.put("totalMarks", rs.getInt("total_marks"));
                return result;
            });
            
            int assessmentsCreated = results.size();
            
            if (assessmentsCreated > 0) {
                log.info("✅ Created {} assessments successfully", assessmentsCreated);
                results.forEach(result -> {
                    log.info("  - Assessment {} for topic {} '{}': {} questions, {} marks",
                        result.get("assessmentId"),
                        result.get("lessonTopicId"),
                        result.get("topicTitle"),
                        result.get("questionsAdded"),
                        result.get("totalMarks")
                    );
                });
            } else {
                log.info("ℹ️ No missing assessments found - all topics are up to date");
            }
            
            String countSql = """
                SELECT COUNT(DISTINCT lt.id) 
                FROM academic.lesson_topics lt
                INNER JOIN ai.lesson_ai_results lar ON lar.lesson_topic_id = lt.id
                WHERE lar.status = 'done'
                """;
            Integer totalTopics = jdbcTemplate.queryForObject(countSql, Integer.class);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("assessmentsCreated", assessmentsCreated);
            response.put("totalTopics", totalTopics != null ? totalTopics : 0);
            response.put("skipped", (totalTopics != null ? totalTopics : 0) - assessmentsCreated);
            response.put("details", results);
            
            return response;
            
        } catch (Exception e) {
            log.error("❌ Failed to create missing assessments: {}", e.getMessage(), e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage());
            errorResponse.put("assessmentsCreated", 0);
            
            return errorResponse;
        }
    }

    @Transactional
    public Map<String, Object> createAssessmentForLesson(Long lessonTopicId) {
        log.info("🎯 Creating assessment for lesson topic {}", lessonTopicId);
        
        try {
            String checkSql = """
                SELECT COUNT(*) 
                FROM academic.assessments 
                WHERE lesson_topic_id = ? 
                AND type = 'LESSON_TOPIC_ASSESSMENT'
                """;
            
            Integer existingCount = jdbcTemplate.queryForObject(checkSql, Integer.class, lessonTopicId);
            
            if (existingCount != null && existingCount > 0) {
                log.info("ℹ️ Assessment already exists for lesson topic {}", lessonTopicId);
                return Map.of(
                    "success", true,
                    "message", "Assessment already exists",
                    "lessonTopicId", lessonTopicId,
                    "created", false
                );
            }
            
            String questionCheckSql = """
                SELECT COUNT(*) 
                FROM ai.lesson_questions lq
                INNER JOIN ai.lesson_ai_results lar ON lq.lesson_id = lar.id
                WHERE lar.lesson_topic_id = ?
                AND lar.status = 'done'
                """;
            
            Integer questionCount = jdbcTemplate.queryForObject(questionCheckSql, Integer.class, lessonTopicId);
            
            if (questionCount == null || questionCount == 0) {
                log.warn("⚠️ No questions found for lesson topic {}", lessonTopicId);
                return Map.of(
                    "success", false,
                    "message", "No questions found for this lesson topic",
                    "lessonTopicId", lessonTopicId,
                    "created", false
                );
            }
            
            Map<String, Object> fullResult = createMissingAssessmentsForAllLessons();
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> details = (List<Map<String, Object>>) fullResult.get("details");
            
            if (details != null) {
                Optional<Map<String, Object>> topicResult = details.stream()
                    .filter(d -> lessonTopicId.equals(d.get("lessonTopicId")))
                    .findFirst();
                
                if (topicResult.isPresent()) {
                    Map<String, Object> result = topicResult.get();
                    log.info("✅ Created assessment {} for lesson topic {}", 
                        result.get("assessmentId"), lessonTopicId);
                    
                    return Map.of(
                        "success", true,
                        "message", "Assessment created successfully",
                        "lessonTopicId", lessonTopicId,
                        "created", true,
                        "assessment", result
                    );
                }
            }
            
            log.warn("⚠️ Could not create assessment for lesson topic {}", lessonTopicId);
            return Map.of(
                "success", false,
                "message", "Could not create assessment - topic may not have questions or already has assessment",
                "lessonTopicId", lessonTopicId,
                "created", false
            );
            
        } catch (Exception e) {
            log.error("❌ Failed to create assessment for lesson {}: {}", lessonTopicId, e.getMessage(), e);
            
            return Map.of(
                "success", false,
                "error", e.getMessage(),
                "lessonTopicId", lessonTopicId,
                "created", false
            );
        }
    }

    public void onAIProcessingComplete(Long lessonTopicId) {
        log.info("🎯 AI processing completed for lesson {}, triggering assessment creation", lessonTopicId);
        
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        createAssessmentForLesson(lessonTopicId);
    }

    private User getSystemAdminUser() {
        return userRepository.findAll().stream()
            .filter(u -> u.getRoles().stream()
                .anyMatch(r -> "ADMIN".equals(r.getName())))
            .findFirst()
            .orElseGet(() -> {
                log.error("❌ No admin user found in system!");
                return null;
            });
    }

    public void triggerAssessmentCreationForLesson(Long lessonTopicId) {
        log.info("🔧 Manually triggering assessment creation for lesson {}", lessonTopicId);
        onAIProcessingComplete(lessonTopicId);
    }
}