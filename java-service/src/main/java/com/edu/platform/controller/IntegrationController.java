package com.edu.platform.controller;

import com.edu.platform.service.IntegrationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/integration")
@RequiredArgsConstructor
@Slf4j
public class IntegrationController {

    private final IntegrationService integrationService;

    /**
     * ✅ Manually trigger assessment creation for all lessons with questions
     * POST /api/v1/integration/assessments/create-missing
     */
    @PostMapping("/assessments/create-missing")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> createMissingAssessments() {
        log.info("🎯 Admin manually triggered assessment creation");
        
        Map<String, Object> result = integrationService.createMissingAssessmentsForAllLessons();
        
        return ResponseEntity.ok(result);
    }
    
    /**
     * ✅ Create assessment for a specific lesson topic
     * POST /api/v1/integration/assessments/create/{lessonTopicId}
     */
    @PostMapping("/assessments/create/{lessonTopicId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> createAssessmentForLesson(
            @PathVariable Long lessonTopicId) {
        
        log.info("🎯 Admin manually triggered assessment creation for lesson {}", lessonTopicId);
        
        Map<String, Object> result = integrationService.createAssessmentForLesson(lessonTopicId);
        
        return ResponseEntity.ok(result);
    }
}