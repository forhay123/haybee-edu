package com.edu.platform.controller;

import com.edu.platform.dto.classdata.LessonAiQuestionDto;
import com.edu.platform.dto.classdata.LessonAiStatusDto;
import com.edu.platform.dto.classdata.LessonTopicDto;
import com.edu.platform.model.LessonTopic;
import com.edu.platform.service.IntegrationService;
import com.edu.platform.service.LessonTopicService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/lesson-topics")
@RequiredArgsConstructor
@Validated
@Slf4j
public class LessonTopicController {

    private final LessonTopicService lessonService;
    private final IntegrationService integrationService;

    // -------------------- CRUD --------------------

    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<LessonTopicDto> createLesson(
            @RequestPart("metadata") LessonTopicDto lessonDto,
            @RequestPart(value = "file", required = false) MultipartFile file,
            Authentication authentication) {
        String email = authentication.getName();
        LessonTopic created = lessonService.createLesson(lessonDto, file, email);

        return ResponseEntity.status(HttpStatus.CREATED).body(convertToDto(created));
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public ResponseEntity<List<LessonTopicDto>> getLessons(
            @RequestParam(required = false) Long subjectId,
            Authentication authentication) {
        String email = authentication.getName();
        boolean isTeacher = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_TEACHER"));
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (isTeacher) {
            if (subjectId != null) {
                return ResponseEntity.ok(lessonService.getLessonsBySubjectAsDto(subjectId, email));
            }
            return ResponseEntity.ok(lessonService.getAllLessonsAsDto(email));
        }

        if (isAdmin) {
            if (subjectId != null) {
                return ResponseEntity.ok(lessonService.getLessonsBySubjectAsDto(subjectId, null));
            }
            return ResponseEntity.ok(lessonService.getAllLessonsAsDto(null));
        }

        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/student")
    public ResponseEntity<List<LessonTopicDto>> getStudentLessons(
            @RequestParam Set<Long> subjectIds,
            @RequestParam String studentType) {
        return ResponseEntity.ok(lessonService.getLessonsForStudent(subjectIds, studentType));
    }

    /**
     * Get lessons for a student by their profile ID
     * GET /api/v1/lesson-topics/by-student/{studentProfileId}
     */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/by-student/{studentProfileId}")
    public ResponseEntity<List<LessonTopicDto>> getLessonsByStudent(
            @PathVariable Long studentProfileId,
            Authentication authentication) {
        
        log.info("📚 Fetching lessons for student profile: {}", studentProfileId);
        
        try {
            List<LessonTopicDto> lessons = lessonService.getLessonsForStudent(studentProfileId);
            
            log.info("✅ Found {} lessons for student {}", lessons.size(), studentProfileId);
            
            return ResponseEntity.ok(lessons);
            
        } catch (Exception e) {
            log.error("❌ Error fetching lessons for student {}: {}", studentProfileId, e.getMessage());
            throw e;
        }
    }

    /**
     * Get lessons for a student filtered by subject
     * GET /api/v1/lesson-topics/by-student/{studentProfileId}/subject/{subjectId}
     */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/by-student/{studentProfileId}/subject/{subjectId}")
    public ResponseEntity<List<LessonTopicDto>> getLessonsByStudentAndSubject(
            @PathVariable Long studentProfileId,
            @PathVariable Long subjectId,
            Authentication authentication) {
        
        log.info("📚 Fetching lessons for student {} in subject {}", studentProfileId, subjectId);
        
        try {
            List<LessonTopicDto> lessons = lessonService.getLessonsForStudentAndSubject(
                    studentProfileId, 
                    subjectId
            );
            
            log.info("✅ Found {} lessons for student {} in subject {}", 
                    lessons.size(), studentProfileId, subjectId);
            
            return ResponseEntity.ok(lessons);
            
        } catch (Exception e) {
            log.error("❌ Error fetching lessons for student {} in subject {}: {}", 
                    studentProfileId, subjectId, e.getMessage());
            throw e;
        }
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/questions")
    public ResponseEntity<List<LessonAiQuestionDto>> getQuestionsForLessons(
            @RequestParam Set<Long> lessonTopicIds) {
        return ResponseEntity.ok(lessonService.getAIQuestionsByLessonTopicIds(lessonTopicIds));
    }

    // ✅ REMOVED: serveLessonFile endpoint
    // Files are now served directly from S3 URLs
    // No backend proxying needed - S3 handles file serving
    
    // -------------------- AI Integration --------------------

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}/ai-result")
    public ResponseEntity<?> getLessonAIResult(@PathVariable Long id) {
        return ResponseEntity.ok(integrationService.getLessonAIResultByTopic(id));
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}/ai-status")
    public ResponseEntity<?> getLessonAIStatus(@PathVariable Long id) {
        return ResponseEntity.ok(integrationService.getLessonAiStatus(id));
    }

    @PostMapping("/{id}/ai-status")
    public ResponseEntity<Map<String, Object>> updateAIStatus(
            @PathVariable Long id,
            @RequestBody LessonAiStatusDto statusUpdate) {
        try {
            log.info("📡 Received AI status update for lesson_topic_id {}: status={}, progress={}, questionCount={}",
                    id, statusUpdate.getStatus(), statusUpdate.getProgress(), statusUpdate.getQuestionCount());

            lessonService.getLessonById(id); // will throw if not found

            if (statusUpdate.getQuestionCount() != null && statusUpdate.getQuestionCount() > 0) {
                lessonService.updateQuestionCount(id, statusUpdate.getQuestionCount());
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "AI status updated successfully",
                    "lessonTopicId", id,
                    "status", statusUpdate.getStatus(),
                    "progress", statusUpdate.getProgress()
            ));
        } catch (Exception e) {
            log.error("❌ Failed to update AI status for lesson {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "success", false,
                            "message", "Failed to update AI status: " + e.getMessage()
                    ));
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PostMapping("/{id}/regenerate-ai")
    public ResponseEntity<String> regenerateLessonAI(
            @PathVariable Long id,
            Authentication authentication) {
        String email = authentication.getName();
        lessonService.regenerateLessonAI(id, email);
        return ResponseEntity.ok("AI regeneration started");
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PutMapping("/{id}")
    public ResponseEntity<LessonTopicDto> updateLesson(
            @PathVariable Long id,
            @RequestBody LessonTopic updated,
            Authentication authentication) {
        String email = authentication.getName();
        LessonTopic updatedLesson = lessonService.updateLesson(id, updated, email);
        return ResponseEntity.ok(convertToDto(updatedLesson));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLesson(
            @PathVariable Long id,
            Authentication authentication) {
        String email = authentication.getName();
        lessonService.deleteLesson(id, email);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("✔ LessonTopicController running");
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}")
    public ResponseEntity<LessonTopicDto> getLessonTopicById(@PathVariable Long id) {
        LessonTopic lesson = lessonService.getLessonById(id);
        return ResponseEntity.ok(convertToDto(lesson));
    }

    // -------------------- Private helper --------------------
    private LessonTopicDto convertToDto(LessonTopic lesson) {
        LessonTopicDto dto = new LessonTopicDto();
        dto.setId(lesson.getId());
        dto.setTopicTitle(lesson.getTopicTitle());
        dto.setDescription(lesson.getDescription());
        dto.setWeekNumber(lesson.getWeekNumber());
        if (lesson.getSubject() != null) {
            dto.setSubjectId(lesson.getSubject().getId());
            dto.setSubjectName(lesson.getSubject().getName());
        }
        if (lesson.getTerm() != null) {
            dto.setTermId(lesson.getTerm().getId());
            dto.setTermName(lesson.getTerm().getName());
        }
        dto.setFileUrl(lesson.getFileUrl());
        dto.setQuestionCount(lesson.getQuestionCount() != null ? lesson.getQuestionCount() : 0);
        dto.setAspirantMaterial(lesson.isAspirantMaterial());

        dto.setStatus("pending");
        dto.setProgress(0.0);

        return dto;
    }
}