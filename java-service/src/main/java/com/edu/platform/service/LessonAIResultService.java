package com.edu.platform.service;

import com.edu.platform.model.LessonAIResult;
import com.edu.platform.repository.LessonAIResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class LessonAIResultService {

    private final LessonAIResultRepository aiResultRepository;

    public Optional<LessonAIResult> findById(Long id) {
        return aiResultRepository.findById(id);
    }

    // Add more methods as needed
}
