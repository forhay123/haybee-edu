package com.edu.platform.controller;

import com.edu.platform.dto.classdata.LessonAiQuestionDto;
import com.edu.platform.model.LessonAIQuestion;
import com.edu.platform.model.LessonTopic;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.service.LessonAIQuestionService;
import com.edu.platform.repository.LessonTopicRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/debug")
@RequiredArgsConstructor
public class LessonAIQuestionDebugController {

    private final LessonTopicRepository lessonTopicRepository;
    private final LessonAIQuestionService lessonAIQuestionService;

    @GetMapping("/lesson-topics")
    public List<LessonTopic> getLessonTopics(@RequestParam Set<Long> subjectIds) {
        // Return all normal lesson topics for given subjectIds
        return lessonTopicRepository.findBySubjectIdInAndIsAspirantMaterialFalse(subjectIds);
    }

    @GetMapping("/lesson-topic-ids")
    public Set<Long> getLessonTopicIds(@RequestParam Set<Long> subjectIds) {
        List<LessonTopic> topics = lessonTopicRepository.findBySubjectIdInAndIsAspirantMaterialFalse(subjectIds);
        return topics.stream().map(LessonTopic::getId).collect(java.util.stream.Collectors.toSet());
    }

    @GetMapping("/questions-raw")
    public List<LessonAiQuestionDto> getRawQuestions(@RequestParam Set<Long> topicIds) {
        return lessonAIQuestionService.toDtoList(
                lessonAIQuestionService.getQuestionsByLessonTopicIds(topicIds)
        );
    }

    @GetMapping("/questions-filtered")
    public List<LessonAiQuestionDto> getFilteredQuestions(
            @RequestParam String studentType,
            @RequestParam Set<Long> subjectIds
    ) {
        StudentType st;
        try {
            st = StudentType.valueOf(studentType.toUpperCase());
        } catch (Exception e) {
            st = StudentType.SCHOOL;
        }

        return lessonAIQuestionService.toDtoList(
                lessonAIQuestionService.getFilteredQuestions(st, subjectIds)
        );
    }

}
