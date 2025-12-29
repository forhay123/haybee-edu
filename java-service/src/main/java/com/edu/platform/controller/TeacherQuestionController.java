package com.edu.platform.controller;

import com.edu.platform.dto.assessment.TeacherQuestionDto;
import com.edu.platform.model.User;
import com.edu.platform.repository.UserRepository;
import com.edu.platform.service.assessment.TeacherQuestionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/teacher-questions")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Teacher Questions", description = "Teacher question bank management")
public class TeacherQuestionController {

    private final TeacherQuestionService questionService;
    private final UserRepository userRepository;

    /**
     * ✅ Helper method to get current authenticated user
     * Same pattern as AssessmentGradingController
     */
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            log.error("❌ No authentication found in security context");
            throw new RuntimeException("User not authenticated");
        }
        
        String email = authentication.getName(); // Email from CustomUserDetailsService
        log.debug("🔍 Fetching user with email: {}", email);
        
        return userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.error("❌ User not found with email: {}", email);
                    return new RuntimeException("User not found: " + email);
                });
    }

    @PostMapping
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Create question", description = "Teacher creates a new question")
    public ResponseEntity<TeacherQuestionDto> createQuestion(
            @RequestBody TeacherQuestionDto dto) {
        
        User teacher = getCurrentUser();
        log.info("Teacher {} creating question", teacher.getId());
        TeacherQuestionDto created = questionService.createQuestion(dto, teacher);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Update question", description = "Teacher updates their question")
    public ResponseEntity<TeacherQuestionDto> updateQuestion(
            @PathVariable Long id,
            @RequestBody TeacherQuestionDto dto) {
        
        User teacher = getCurrentUser();
        TeacherQuestionDto updated = questionService.updateQuestion(id, dto, teacher);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Delete question", description = "Teacher deletes their question")
    public ResponseEntity<Void> deleteQuestion(@PathVariable Long id) {
        
        User teacher = getCurrentUser();
        questionService.deleteQuestion(id, teacher);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/my-questions")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Get my questions", description = "Get all questions created by the teacher")
    public ResponseEntity<List<TeacherQuestionDto>> getMyQuestions() {
        
        User teacher = getCurrentUser();
        log.info("✅ Teacher {} ({}) fetching their questions", teacher.getFullName(), teacher.getId());
        List<TeacherQuestionDto> questions = questionService.getTeacherQuestions(teacher.getId());
        log.info("📋 Found {} questions", questions.size());
        return ResponseEntity.ok(questions);
    }

    @GetMapping("/subject/{subjectId}")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Get questions by subject", description = "Get all questions for a subject")
    public ResponseEntity<List<TeacherQuestionDto>> getQuestionsBySubject(
            @PathVariable Long subjectId) {
        
        List<TeacherQuestionDto> questions = questionService.getQuestionsBySubject(subjectId);
        return ResponseEntity.ok(questions);
    }

    @GetMapping("/lesson/{lessonTopicId}")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Get questions by lesson", description = "Get all questions for a lesson topic")
    public ResponseEntity<List<TeacherQuestionDto>> getQuestionsByLesson(
            @PathVariable Long lessonTopicId) {
        
        List<TeacherQuestionDto> questions = questionService.getQuestionsByLessonTopic(lessonTopicId);
        return ResponseEntity.ok(questions);
    }

    @GetMapping("/teacher/{teacherId}/subject/{subjectId}")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Get questions by teacher and subject")
    public ResponseEntity<List<TeacherQuestionDto>> getQuestionsByTeacherAndSubject(
            @PathVariable Long teacherId,
            @PathVariable Long subjectId) {
        
        List<TeacherQuestionDto> questions = questionService
                .getQuestionsByTeacherAndSubject(teacherId, subjectId);
        return ResponseEntity.ok(questions);
    }
}