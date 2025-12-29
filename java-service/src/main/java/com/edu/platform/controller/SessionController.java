package com.edu.platform.controller;

import com.edu.platform.dto.classdata.SchoolSessionDto;
import com.edu.platform.model.SchoolSession;
import com.edu.platform.service.SchoolSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final SchoolSessionService schoolSessionService;

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<SchoolSessionDto> createSession(@RequestBody SchoolSession session) {
        if (session.getName() == null || session.getName().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        SchoolSession saved = schoolSessionService.save(session);
        return ResponseEntity.created(URI.create("/api/sessions/" + saved.getId()))
                .body(toDto(saved));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<SchoolSessionDto> updateSession(@PathVariable Long id, @RequestBody SchoolSession updatedSession) {
        return schoolSessionService.getById(id)
                .map(existing -> {
                    existing.setName(updatedSession.getName());
                    SchoolSession saved = schoolSessionService.save(existing);
                    return ResponseEntity.ok(toDto(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSession(@PathVariable Long id) {
        if (schoolSessionService.getById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        schoolSessionService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public ResponseEntity<List<SchoolSessionDto>> getAllSessions() {
        List<SchoolSessionDto> dtos = schoolSessionService.getAll()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}")
    public ResponseEntity<SchoolSessionDto> getSessionById(@PathVariable Long id) {
        return schoolSessionService.getById(id)
                .map(session -> ResponseEntity.ok(toDto(session)))
                .orElse(ResponseEntity.notFound().build());
    }

    private SchoolSessionDto toDto(SchoolSession session) {
        return SchoolSessionDto.builder()
                .id(session.getId())
                .name(session.getName())
                .build();
    }
}
