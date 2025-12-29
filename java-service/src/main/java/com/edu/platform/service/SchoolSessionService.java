package com.edu.platform.service;

import com.edu.platform.model.SchoolSession;
import com.edu.platform.repository.SchoolSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SchoolSessionService {

    private final SchoolSessionRepository schoolSessionRepository;

    public SchoolSession save(SchoolSession session) {
        return schoolSessionRepository.save(session);
    }

    public void delete(Long id) {
        schoolSessionRepository.deleteById(id);
    }

    public Optional<SchoolSession> getById(Long id) {
        return schoolSessionRepository.findById(id);
    }

    public List<SchoolSession> getAll() {
        return schoolSessionRepository.findAll();
    }
}
