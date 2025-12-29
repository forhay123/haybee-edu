package com.edu.platform.controller;

import com.edu.platform.dto.classdata.LessonAiQuestionDto;
import com.edu.platform.model.User;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.service.LessonAIQuestionService;
import com.edu.platform.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/ai-questions")
@RequiredArgsConstructor
public class LessonAIQuestionController {

    private final LessonAIQuestionService questionService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<LessonAiQuestionDto>> getQuestions(
            @RequestParam List<Long> subjectIds,
            @AuthenticationPrincipal(expression = "username") String username
    ) {
        StudentType studentType = userService.findByEmail(username)
                .map(User::getStudentType)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + username));

        Set<Long> subjects = new HashSet<>(subjectIds);
        var questions = questionService.getFilteredQuestions(studentType, subjects);
        return ResponseEntity.ok(questionService.toDtoList(questions));
    }
    
    
    /**
     * ✅ NEW: Get questions for a specific lesson topic
     */
    @GetMapping("/lesson-topic/{lessonTopicId}")
    public ResponseEntity<List<LessonAiQuestionDto>> getQuestionsByLessonTopic(
            @PathVariable Long lessonTopicId
    ) {
        var questions = questionService.getQuestionsByLessonTopicIds(Collections.singleton(lessonTopicId));
        return ResponseEntity.ok(questionService.toDtoList(questions));
    }
    

    @GetMapping("/test")
    public ResponseEntity<?> testAIQuestions(
            @RequestParam(defaultValue = "SCHOOL") String studentType,
            @RequestParam List<Long> subjectIds
    ) {
        StudentType type;
        try {
            type = StudentType.valueOf(studentType.toUpperCase());
        } catch (Exception e) {
            type = StudentType.SCHOOL;
        }

        Set<Long> subjects = new HashSet<>(subjectIds);
        var questions = questionService.getFilteredQuestions(type, subjects);
        var dto = questionService.toDtoList(questions);

        return ResponseEntity.ok(Map.of(
                "studentType", type,
                "subjectIds", subjectIds,
                "totalQuestions", dto.size(),
                "questions", dto
        ));
    }
}
