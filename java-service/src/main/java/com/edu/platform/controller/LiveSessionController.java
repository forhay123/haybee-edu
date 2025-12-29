package com.edu.platform.controller;

import com.edu.platform.dto.session.*;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.model.LiveSession;
import com.edu.platform.model.User;
import com.edu.platform.model.enums.SessionStatus;
import com.edu.platform.repository.LiveSessionRepository;
import com.edu.platform.repository.UserRepository;
import com.edu.platform.service.LiveSessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/live-sessions")
@RequiredArgsConstructor
@Tag(name = "Live Sessions", description = "Live session management for teachers and students")
public class LiveSessionController {

    private final LiveSessionService liveSessionService;
    private final UserRepository userRepository;
    private final LiveSessionRepository liveSessionRepository;

    // ==================== CREATE SESSION ====================

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Create a new live session", description = "Teachers can create live sessions with Zoom integration")
    public ResponseEntity<LiveSessionDto> createSession(
            @Valid @RequestBody CreateLiveSessionRequest request,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Creating live session for teacher: {}, subject: {}", email, request.getSubjectId());
        
        LiveSessionDto session = liveSessionService.createSession(request, email);
        return ResponseEntity.status(HttpStatus.CREATED).body(session);
    }

    // ==================== GET SESSIONS - ROLE-AWARE ====================

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get all sessions with optional filters (role-aware)")
    public ResponseEntity<List<LiveSessionDto>> getAllSessions(
            @RequestParam(required = false) String[] status,
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) Long teacherId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("GET /live-sessions - Fetching sessions for user: {} with filters", email);
        
        try {
            // Convert LocalDate to Instant
            Instant startDate = null;
            Instant endDate = null;
            
            if (dateFrom != null) {
                startDate = dateFrom.atStartOfDay(ZoneId.systemDefault()).toInstant();
            }
            if (dateTo != null) {
                endDate = dateTo.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
            }
            
            // Parse status strings to SessionStatus enums
            List<SessionStatus> statuses = null;
            if (status != null && status.length > 0) {
                statuses = Arrays.stream(status)
                        .map(s -> SessionStatus.valueOf(s.toUpperCase()))
                        .collect(Collectors.toList());
            }
            
            // ✅ FIXED: Different logic based on role
            boolean isTeacher = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_TEACHER"));
            boolean isAdmin = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            boolean isStudent = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_STUDENT"));
            
            List<LiveSessionDto> sessions;
            
            if (isAdmin) {
                // ✅ Admins get ALL sessions from ALL teachers
                sessions = liveSessionService.getAllSessionsForAdmin(statuses, subjectId, teacherId, startDate, endDate);
            } else if (isTeacher) {
                // Teachers get only their own sessions
                User teacher = userRepository.findByEmail(email)
                        .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
                sessions = liveSessionService.getTeacherSessions(teacher.getId(), statuses, subjectId, startDate, endDate);
            } else if (isStudent) {
                // Students get upcoming sessions only
                sessions = liveSessionService.getUpcomingSessionsForStudent(email);
            } else {
                sessions = List.of();
            }
            
            log.info("Returning {} sessions for user: {}", sessions.size(), email);
            return ResponseEntity.ok(sessions);
            
        } catch (Exception e) {
            log.error("Error fetching sessions for user: {}", email, e);
            throw e;
        }
    }

    @GetMapping("/upcoming")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT', 'PARENT')")
    @Operation(summary = "Get upcoming sessions for current user (role-aware)")
    public ResponseEntity<List<LiveSessionDto>> getUpcomingSessionsGeneric(Authentication auth) {
        String email = auth.getName();
        log.info("Fetching upcoming sessions for user: {}", email);
        
        List<LiveSessionDto> sessions = liveSessionService.getUpcomingSessionsForUser(email);
        return ResponseEntity.ok(sessions);
    }

    @GetMapping("/teacher/my-sessions")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get my sessions as teacher")
    public ResponseEntity<List<LiveSessionDto>> getTeacherSessions(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Fetching sessions for teacher: {} between {} and {}", email, dateFrom, dateTo);

        Instant startDate = null;
        Instant endDate = null;

        if (dateFrom != null) {
            startDate = dateFrom.atStartOfDay(ZoneId.systemDefault()).toInstant();
        }
        if (dateTo != null) {
            endDate = dateTo.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        }

        List<LiveSessionDto> sessions = liveSessionService.getSessionsForTeacher(email, startDate, endDate);
        log.info("Found {} sessions for teacher: {}", sessions.size(), email);

        return ResponseEntity.ok(sessions);
    }

    @GetMapping("/{sessionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get session details by ID")
    public ResponseEntity<SessionDetailsDto> getSessionDetails(
            @PathVariable Long sessionId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Fetching session details: {} for user: {}", sessionId, email);
        
        SessionDetailsDto session = liveSessionService.getSessionDetails(sessionId, email);
        return ResponseEntity.ok(session);
    }

    // ==================== UPDATE SESSIONS ====================

    @PutMapping("/{sessionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Update session details")
    public ResponseEntity<LiveSessionDto> updateSession(
            @PathVariable Long sessionId,
            @Valid @RequestBody UpdateSessionRequest request,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Updating session: {} by teacher: {}", sessionId, email);
        
        LiveSessionDto updated = liveSessionService.updateSession(sessionId, request, email);
        return ResponseEntity.ok(updated);
    }

    // ==================== START/END SESSIONS ====================

    @PostMapping("/{sessionId}/start")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Start a live session")
    public ResponseEntity<LiveSessionDto> startSession(
            @PathVariable Long sessionId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Starting session: {} by teacher: {}", sessionId, email);
        
        LiveSessionDto session = liveSessionService.startSession(sessionId, email);
        return ResponseEntity.ok(session);
    }

    @PostMapping("/{sessionId}/end")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "End a live session")
    public ResponseEntity<LiveSessionDto> endSession(
            @PathVariable Long sessionId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Ending session: {} by teacher: {}", sessionId, email);
        
        LiveSessionDto session = liveSessionService.endSession(sessionId, email);
        return ResponseEntity.ok(session);
    }

    @DeleteMapping("/{sessionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Cancel/Delete a session")
    public ResponseEntity<Void> cancelSession(
            @PathVariable Long sessionId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Canceling session: {} by teacher: {}", sessionId, email);
        
        liveSessionService.cancelSession(sessionId, email);
        return ResponseEntity.noContent().build();
    }

    // ==================== STUDENT ENDPOINTS ====================

    @PostMapping("/{sessionId}/join")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER')")
    @Operation(summary = "Join a live session")
    public ResponseEntity<LiveSessionJoinDto> joinSession(
            @PathVariable Long sessionId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("User {} joining session: {}", email, sessionId);
        
        LiveSessionJoinDto session = liveSessionService.joinSession(sessionId, email);
        return ResponseEntity.ok(session);
    }

    // ==================== ATTENDANCE ENDPOINTS ====================

    @PostMapping("/{sessionId}/attendance")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Mark attendance for a session")
    public ResponseEntity<Void> markAttendance(
            @PathVariable Long sessionId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Marking attendance for session: {} by student: {}", sessionId, email);
        
        liveSessionService.markAttendance(sessionId, email);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{sessionId}/attendance")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get attendance list for a session")
    public ResponseEntity<List<SessionAttendanceDto>> getSessionAttendance(
            @PathVariable Long sessionId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Fetching attendance for session: {} by teacher: {}", sessionId, email);
        
        List<SessionAttendanceDto> attendance = liveSessionService.getSessionAttendance(sessionId, email);
        return ResponseEntity.ok(attendance);
    }

    // ==================== RECORDING ENDPOINTS ====================

    @GetMapping("/{sessionId}/recordings")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get recordings for a session")
    public ResponseEntity<List<SessionRecordingDto>> getSessionRecordings(
            @PathVariable Long sessionId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Fetching recordings for session: {}", sessionId);
        
        List<SessionRecordingDto> recordings = liveSessionService.getSessionRecordings(sessionId, email);
        return ResponseEntity.ok(recordings);
    }

    @PostMapping("/{sessionId}/recordings/process")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Trigger recording processing")
    public ResponseEntity<Void> processRecordings(
            @PathVariable Long sessionId,
            Authentication auth
    ) {
        String email = auth.getName();
        log.info("Processing recordings for session: {} by teacher: {}", sessionId, email);
        
        liveSessionService.processRecordings(sessionId, email);
        return ResponseEntity.accepted().build();
    }

    // ==================== SUBJECT & CLASS QUERIES ====================

    @GetMapping("/subject/{subjectId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    @Operation(summary = "Get sessions for a subject")
    public ResponseEntity<List<LiveSessionDto>> getSessionsBySubject(
            @PathVariable Long subjectId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant endDate
    ) {
        log.info("Fetching sessions for subject: {}", subjectId);
        
        List<LiveSessionDto> sessions = liveSessionService.getSessionsBySubject(subjectId, startDate, endDate);
        return ResponseEntity.ok(sessions);
    }

    @GetMapping("/class/{classId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get sessions for a class")
    public ResponseEntity<List<LiveSessionDto>> getSessionsByClass(
            @PathVariable Long classId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant endDate
    ) {
        log.info("Fetching sessions for class: {}", classId);
        
        List<LiveSessionDto> sessions = liveSessionService.getSessionsByClass(classId, startDate, endDate);
        return ResponseEntity.ok(sessions);
    }

    // ==================== STATISTICS ====================

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get platform-wide session statistics")
    public ResponseEntity<Map<String, Object>> getSessionStats() {
        log.info("Fetching platform-wide session statistics");
        
        List<LiveSession> allSessions = liveSessionRepository.findAll();
        
        long totalSessions = allSessions.size();
        long activeSessions = allSessions.stream()
                .filter(s -> s.getStatus() == SessionStatus.LIVE)
                .count();
        long scheduledSessions = allSessions.stream()
                .filter(s -> s.getStatus() == SessionStatus.SCHEDULED)
                .count();
        long endedSessions = allSessions.stream()
                .filter(s -> s.getStatus() == SessionStatus.ENDED)
                .count();
        
        Map<String, Object> stats = Map.of(
            "totalSessions", totalSessions,
            "activeSessions", activeSessions,
            "scheduledSessions", scheduledSessions,
            "endedSessions", endedSessions
        );
        
        return ResponseEntity.ok(stats);
    }
}