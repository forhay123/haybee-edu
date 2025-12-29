package com.edu.platform.service;

import com.edu.platform.dto.integration.CreateMeetingRequest;
import com.edu.platform.dto.integration.UpdateMeetingRequest;
import com.edu.platform.dto.integration.ZoomMeetingResponse;
import com.edu.platform.dto.session.*;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.exception.ValidationException;
import com.edu.platform.model.*;
import com.edu.platform.model.enums.NotificationPriority;
import com.edu.platform.model.enums.NotificationType;
import com.edu.platform.model.enums.SessionStatus;
import com.edu.platform.repository.*;
import com.edu.platform.service.integration.ZoomService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LiveSessionService {

    private final LiveSessionRepository liveSessionRepository;
    private final UserRepository userRepository;
    private final SubjectRepository subjectRepository;
    private final ClassRepository classRepository;
    private final TermRepository termRepository;
    private final LessonTopicRepository lessonTopicRepository;
    private final SessionAttendanceRepository sessionAttendanceRepository;
    private final SessionRecordingRepository sessionRecordingRepository;
    private final ZoomService zoomService;
    private final NotificationService notificationService;

    /**
     * ✅ ENHANCED: Create a new live session WITH NOTIFICATIONS
     */
    @Transactional
    public LiveSessionDto createSession(CreateLiveSessionRequest request, String teacherEmail) {
        log.info("Creating live session for teacher: {}", teacherEmail);

        // 1. Validate teacher
        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));

        boolean isTeacher = teacher.getRoles().stream()
                .anyMatch(role -> "TEACHER".equalsIgnoreCase(role.getName()));
        
        if (!isTeacher) {
            log.error("❌ User {} does not have TEACHER role. Roles: {}", 
                      teacherEmail, 
                      teacher.getRoles().stream()
                          .map(Role::getName)
                          .collect(Collectors.toList()));
            throw new ValidationException("Only teachers can create live sessions");
        }

        // 2. Validate subject and teacher's permission
        Subject subject = subjectRepository.findById(request.getSubjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));

        // 3. Validate class
        ClassEntity classEntity = classRepository.findById(request.getClassId())
                .orElseThrow(() -> new ResourceNotFoundException("Class not found"));

        // 4. Validate term
        Term term = termRepository.findById(request.getTermId())
                .orElseThrow(() -> new ResourceNotFoundException("Term not found"));

        // 5. Validate scheduled time is in future
        if (request.getScheduledStartTime().isBefore(Instant.now())) {
            throw new ValidationException("Scheduled start time must be in the future");
        }

        // 6. Validate lesson topic (if provided)
        LessonTopic lessonTopic = null;
        if (request.getLessonTopicId() != null) {
            lessonTopic = lessonTopicRepository.findById(request.getLessonTopicId())
                    .orElseThrow(() -> new ResourceNotFoundException("Lesson topic not found"));

            if (!lessonTopic.getSubject().getId().equals(subject.getId())) {
                throw new ValidationException("Lesson topic does not belong to the specified subject");
            }
        }

        // 7. Create Zoom meeting
        CreateMeetingRequest zoomRequest = CreateMeetingRequest.builder()
                .topic(request.getTitle())
                .startTime(request.getScheduledStartTime())
                .duration(request.getScheduledDurationMinutes())
                .timezone(request.getTimezone() != null ? request.getTimezone() : "UTC")
                .password(request.getMeetingPassword() != null ? request.getMeetingPassword() : generatePassword())
                .settings(CreateMeetingRequest.MeetingSettings.builder()
                        .joinBeforeHost(true)
                        .muteUponEntry(false)
                        .waitingRoom(false)
                        .autoRecording(true)
                        .build())
                .build();

        ZoomMeetingResponse zoomMeeting = zoomService.createMeeting(zoomRequest);

        // 8. Create LiveSession entity
        LiveSession session = new LiveSession();
        session.setTeacher(teacher);
        session.setSubject(subject);
        session.setClassEntity(classEntity);
        session.setTerm(term);
        session.setLessonTopic(lessonTopic);
        session.setTitle(request.getTitle());
        session.setDescription(request.getDescription());
        session.setStatus(SessionStatus.SCHEDULED);
        session.setScheduledStartTime(request.getScheduledStartTime());
        session.setScheduledDurationMinutes(request.getScheduledDurationMinutes());
        session.setMaxParticipants(request.getMaxParticipants());
        session.setZoomMeetingId(zoomMeeting.getId());
        session.setJoinUrl(zoomMeeting.getJoinUrl());
        session.setStartUrl(zoomMeeting.getStartUrl());
        session.setMeetingPassword(zoomMeeting.getPassword());
        session.setCreatedBy(teacher);

        session = liveSessionRepository.save(session);

        log.info("✅ Successfully created live session. ID: {}, Zoom Meeting: {}", 
                session.getId(), zoomMeeting.getId());

        // ✅ 9. SEND NOTIFICATIONS TO ALL STUDENTS IN THE CLASS
        notifyStudentsAboutNewSession(session);

        return mapToDto(session);
    }
    
    /**
     * Get all sessions for a teacher (no date range)
     */
    @Transactional(readOnly = true)
    public List<LiveSessionDto> getSessionsForTeacher(String teacherEmail) {
        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));

        List<LiveSession> sessions = liveSessionRepository.findByTeacherId(teacher.getId());
        return sessions.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    /**
     * Get sessions for teacher with date range
     */
    @Transactional(readOnly = true)
    public List<LiveSessionDto> getSessionsForTeacher(String teacherEmail, Instant startDate, Instant endDate) {
        log.info("Fetching sessions for teacher: {} between {} and {}", teacherEmail, startDate, endDate);
        
        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        
        List<LiveSession> sessions = liveSessionRepository
                .findByTeacherIdAndScheduledStartTimeBetween(teacher.getId(), startDate, endDate);
        
        return sessions.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    /**
     * Get all sessions for a student (based on enrolled subjects)
     */
    @Transactional(readOnly = true)
    public List<LiveSessionDto> getSessionsForStudent(String studentEmail) {
        // TODO: Get StudentProfile and enrolled subjects
        log.warn("getSessionsForStudent not fully implemented yet");
        return List.of();
    }

    /**
     * Get past sessions for a student
     */
    @Transactional(readOnly = true)
    public List<LiveSessionDto> getPastSessionsForStudent(String studentEmail, int limit) {
        log.info("Fetching past sessions for student: {}", studentEmail);
        
        User student = userRepository.findByEmail(studentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        
        Instant now = Instant.now();
        
        // TODO: Get student's class ID from StudentProfile
        // Long classId = student.getStudentProfile().getClassEntity().getId();
        // List<LiveSession> sessions = liveSessionRepository.findPastSessionsByClassId(classId, now);
        
        return List.of(); // Placeholder until StudentProfile is available
    }

    @Transactional(readOnly = true)
    public List<LiveSessionDto> getUpcomingSessionsForStudent(String studentEmail) {
        log.info("Fetching upcoming and LIVE sessions for student: {}", studentEmail);

        User student = userRepository.findByEmailWithStudentProfile(studentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        StudentProfile studentProfile = student.getStudentProfile();
        if (studentProfile == null) {
            log.warn("Student {} has no profile assigned", studentEmail);
            return List.of();
        }

        ClassEntity classLevel = studentProfile.getClassLevel();
        if (classLevel == null) {
            log.warn("Student {} has no class assigned", studentEmail);
            return List.of();
        }

        Long classId = classLevel.getId();

        // ✅ FIXED: Query for BOTH SCHEDULED and LIVE sessions using Specification
        List<LiveSession> sessions = liveSessionRepository.findAll((Specification<LiveSession>) (root, query, cb) -> {
            var predicates = cb.conjunction();

            // Filter by class
            predicates = cb.and(predicates, cb.equal(root.get("classEntity").get("id"), classId));

            // ✅ FIXED: Include both SCHEDULED and LIVE statuses (exclude ENDED and CANCELLED)
            predicates = cb.and(predicates, root.get("status").in(
                List.of(SessionStatus.SCHEDULED, SessionStatus.LIVE)
            ));

            // Order by scheduled start time (upcoming first)
            query.orderBy(cb.asc(root.get("scheduledStartTime")));

            return predicates;
        });

        log.info("✅ Found {} sessions (SCHEDULED + LIVE) for student's class: {}", sessions.size(), classId);

        return sessions.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }


    /**
     * Get upcoming sessions for a class
     */
    @Transactional(readOnly = true)
    public List<LiveSessionDto> getUpcomingSessions(Long classId) {
        Instant now = Instant.now();
        Instant weekFromNow = now.plusSeconds(7 * 24 * 60 * 60);

        List<LiveSession> sessions = liveSessionRepository
                .findByStatusAndScheduledStartTimeBetween(SessionStatus.SCHEDULED, now, weekFromNow);

        return sessions.stream()
                .filter(s -> s.getClassEntity().getId().equals(classId))
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    /**
     * Get sessions by subject
     */
    @Transactional(readOnly = true)
    public List<LiveSessionDto> getSessionsBySubject(Long subjectId, Instant startDate, Instant endDate) {
        log.info("Fetching sessions for subject: {}", subjectId);
        
        List<LiveSession> sessions = liveSessionRepository
                .findBySubjectIdAndScheduledStartTimeBetween(subjectId, startDate, endDate);
        
        return sessions.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    /**
     * Get sessions by class
     */
    @Transactional(readOnly = true)
    public List<LiveSessionDto> getSessionsByClass(Long classId, Instant startDate, Instant endDate) {
        log.info("Fetching sessions for class: {}", classId);
        
        List<LiveSession> sessions = liveSessionRepository
                .findByClassEntityIdAndScheduledStartTimeBetween(classId, startDate, endDate);
        
        return sessions.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    /**
     * Join a session
     */
    @Transactional
    public LiveSessionJoinDto joinSession(Long sessionId, String userEmail) {
        log.info("User {} joining session {}", userEmail, sessionId);
        
        LiveSession session = liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        // TODO: Validate user can join (enrollment, timing, etc.)
        
        return LiveSessionJoinDto.builder()
                .sessionId(sessionId)
                .joinUrl(session.getJoinUrl())
                .meetingPassword(session.getMeetingPassword())
                .build();
    }


    /**
     * ✅ ENHANCED: Start a live session WITH NOTIFICATIONS
     */
    @Transactional
    public LiveSessionDto startSession(Long sessionId, String teacherEmail) {
        log.info("Starting session: {}", sessionId);

        LiveSession session = liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));

        if (!session.getTeacher().getId().equals(teacher.getId())) {
            throw new ValidationException("You can only start your own sessions");
        }

        if (session.getStatus() != SessionStatus.SCHEDULED) {
            throw new ValidationException("Session must be in SCHEDULED status to start");
        }

        session.setStatus(SessionStatus.LIVE);
        session.setActualStartTime(Instant.now());
        session = liveSessionRepository.save(session);

        log.info("✅ Session started. ID: {}", sessionId);

        // ✅ SEND LIVE CLASS STARTING NOTIFICATIONS
        notifyStudentsSessionStarting(session);

        return mapToDto(session);
    }
    
    
    /**
     * End a live session
     */
    @Transactional
    public LiveSessionDto endSession(Long sessionId, String teacherEmail) {
        log.info("Ending session: {}", sessionId);

        LiveSession session = liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));

        if (!session.getTeacher().getId().equals(teacher.getId())) {
            throw new ValidationException("You can only end your own sessions");
        }

        if (session.getStatus() != SessionStatus.LIVE) {
            throw new ValidationException("Session must be LIVE to end");
        }

        session.setStatus(SessionStatus.ENDED);
        session.setActualEndTime(Instant.now());
        session = liveSessionRepository.save(session);

        log.info("✅ Session ended. ID: {}", sessionId);

        return mapToDto(session);
    }

    /**
     * ✅ ENHANCED: Cancel a scheduled session WITH NOTIFICATIONS
     */
    @Transactional
    public void cancelSession(Long sessionId, String teacherEmail) {
        log.info("Cancelling session: {}", sessionId);

        LiveSession session = liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));

        if (!session.getTeacher().getId().equals(teacher.getId())) {
            throw new ValidationException("You can only cancel your own sessions");
        }

        if (session.getStatus() != SessionStatus.SCHEDULED) {
            throw new ValidationException("Only scheduled sessions can be cancelled");
        }

        try {
            zoomService.deleteMeeting(session.getZoomMeetingId());
        } catch (Exception e) {
            log.warn("Failed to delete Zoom meeting: {}", e.getMessage());
        }

        session.setStatus(SessionStatus.CANCELLED);
        liveSessionRepository.save(session);

        log.info("✅ Session cancelled. ID: {}", sessionId);

        // ✅ NOTIFY STUDENTS ABOUT CANCELLATION
        notifyStudentsAboutCancellation(session);
    }
    

    /**
     * ✅ ENHANCED: Update session details WITH NOTIFICATIONS
     */
    @Transactional
    public LiveSessionDto updateSession(Long sessionId, UpdateSessionRequest request, String teacherEmail) {
        log.info("Updating session: {}", sessionId);

        LiveSession session = liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));

        if (!session.getTeacher().getId().equals(teacher.getId())) {
            throw new ValidationException("You can only update your own sessions");
        }

        if (session.getStatus() != SessionStatus.SCHEDULED) {
            throw new ValidationException("Only scheduled sessions can be updated");
        }

        if (request.getScheduledStartTime() != null 
                && request.getScheduledStartTime().isBefore(Instant.now())) {
            throw new ValidationException("Scheduled start time must be in the future");
        }

        boolean needsZoomUpdate = false;
        boolean notifyStudents = false;
        UpdateMeetingRequest zoomUpdateRequest = UpdateMeetingRequest.builder().build();

        if (request.getTitle() != null && !request.getTitle().equals(session.getTitle())) {
            session.setTitle(request.getTitle());
            zoomUpdateRequest.setTopic(request.getTitle());
            needsZoomUpdate = true;
            notifyStudents = true;
        }

        if (request.getScheduledStartTime() != null 
                && !request.getScheduledStartTime().equals(session.getScheduledStartTime())) {
            session.setScheduledStartTime(request.getScheduledStartTime());
            zoomUpdateRequest.setStartTime(request.getScheduledStartTime());
            needsZoomUpdate = true;
            notifyStudents = true;
        }

        if (request.getScheduledDurationMinutes() != null 
                && !request.getScheduledDurationMinutes().equals(session.getScheduledDurationMinutes())) {
            session.setScheduledDurationMinutes(request.getScheduledDurationMinutes());
            zoomUpdateRequest.setDuration(request.getScheduledDurationMinutes());
            needsZoomUpdate = true;
        }

        if (needsZoomUpdate) {
            zoomUpdateRequest.setTimezone("UTC");
            zoomService.updateMeeting(session.getZoomMeetingId(), zoomUpdateRequest);
        }

        if (request.getDescription() != null) {
            session.setDescription(request.getDescription());
        }

        if (request.getMaxParticipants() != null) {
            session.setMaxParticipants(request.getMaxParticipants());
        }

        session = liveSessionRepository.save(session);

        log.info("✅ Session updated. ID: {}", sessionId);

        // ✅ NOTIFY STUDENTS IF MAJOR CHANGES OCCURRED
        if (notifyStudents) {
            notifyStudentsAboutSessionUpdate(session);
        }

        return mapToDto(session);
    }
    
    
    /**
     * Get detailed session information
     */
    @Transactional(readOnly = true)
    public SessionDetailsDto getSessionDetails(Long sessionId, String userEmail) {
        LiveSession session = liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        SessionDetailsDto dto = SessionDetailsDto.builder()
                .id(session.getId())
                .title(session.getTitle())
                .description(session.getDescription())
                .status(session.getStatus())
                .scheduledStartTime(session.getScheduledStartTime())
                .actualStartTime(session.getActualStartTime())
                .actualEndTime(session.getActualEndTime())
                .scheduledDurationMinutes(session.getScheduledDurationMinutes())
                .zoomMeetingId(session.getZoomMeetingId())
                .joinUrl(session.getJoinUrl())
                .startUrl(session.getStartUrl())
                .meetingPassword(session.getMeetingPassword())
                .teacherId(session.getTeacher().getId())
                .teacherName(session.getTeacher().getFullName())
                .teacherEmail(session.getTeacher().getEmail())
                .subjectId(session.getSubject().getId())
                .subjectName(session.getSubject().getName())
                .classId(session.getClassEntity().getId())
                .className(session.getClassEntity().getName())
                .termId(session.getTerm().getId())
                .termName(session.getTerm().getName())
                .createdAt(session.getCreatedAt())
                .updatedAt(session.getUpdatedAt())
                .build();

        if (session.getLessonTopic() != null) {
            dto.setLessonTopicId(session.getLessonTopic().getId());
            dto.setLessonTopicTitle(session.getLessonTopic().getTopicTitle());
        }

        if (session.getActualStartTime() != null && session.getActualEndTime() != null) {
            long durationSeconds = session.getActualEndTime().getEpochSecond() 
                    - session.getActualStartTime().getEpochSecond();
            dto.setActualDurationMinutes((int) (durationSeconds / 60));
        }

        // ✅ FIXED: Check by Role entity
        boolean isTeacher = user.getRoles().stream()
                .anyMatch(role -> "TEACHER".equalsIgnoreCase(role.getName()));
        
        if (isTeacher && session.getTeacher().getId().equals(user.getId())) {
            List<SessionAttendance> attendanceList = sessionAttendanceRepository
                    .findByLiveSessionId(sessionId);
            dto.setAttendanceCount(attendanceList.size());
            dto.setAttendanceList(attendanceList.stream()
                    .map(this::mapToAttendanceDto)
                    .collect(Collectors.toList()));

            List<SessionRecording> recordings = sessionRecordingRepository
                    .findByLiveSessionId(sessionId);
            dto.setHasRecording(!recordings.isEmpty());
            dto.setRecordings(recordings.stream()
                    .map(this::mapToRecordingDto)
                    .collect(Collectors.toList()));

            dto.setEnrolledStudentsCount(0);
        }

        return dto;
    }

    /**
     * Record student attendance
     */
    @Transactional
    public void recordAttendance(Long sessionId, String studentEmail) {
        LiveSession session = liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        User student = userRepository.findByEmail(studentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        if (sessionAttendanceRepository.findByLiveSessionIdAndStudentId(sessionId, student.getId())
                .isPresent()) {
            log.debug("Attendance already recorded");
            return;
        }

        SessionAttendance attendance = new SessionAttendance();
        attendance.setLiveSession(session);
        attendance.setStudent(student);
        attendance.setJoinedAt(Instant.now());

        sessionAttendanceRepository.save(attendance);

        log.info("✅ Recorded attendance for student {}", studentEmail);
    }

    /**
     * Mark attendance (alias for recordAttendance)
     */
    @Transactional
    public void markAttendance(Long sessionId, String studentEmail) {
        recordAttendance(sessionId, studentEmail);
    }

    /**
     * Get session attendance
     */
    @Transactional(readOnly = true)
    public List<SessionAttendanceDto> getSessionAttendance(Long sessionId, String teacherEmail) {
        log.info("Fetching attendance for session: {}", sessionId);
        
        LiveSession session = liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        
        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        
        if (!session.getTeacher().getId().equals(teacher.getId())) {
            throw new ValidationException("You can only view attendance for your own sessions");
        }
        
        List<SessionAttendance> attendances = sessionAttendanceRepository.findByLiveSessionId(sessionId);
        
        return attendances.stream()
                .map(this::mapToAttendanceDto)
                .collect(Collectors.toList());
    }

    /**
     * Get session recordings
     */
    @Transactional(readOnly = true)
    public List<SessionRecordingDto> getSessionRecordings(Long sessionId, String userEmail) {
        log.info("Fetching recordings for session: {}", sessionId);
        
        LiveSession session = liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        
        List<SessionRecording> recordings = sessionRecordingRepository.findByLiveSessionId(sessionId);
        
        return recordings.stream()
                .map(this::mapToSessionRecordingDto)
                .collect(Collectors.toList());
    }
    
    
    /**
     * ✅ Get all sessions for admin (from all teachers)
     */
    @Transactional(readOnly = true)
    public List<LiveSessionDto> getAllSessionsForAdmin(
            List<SessionStatus> statuses,
            Long subjectId,
            Long teacherId,
            Instant startDate,
            Instant endDate
    ) {
        log.info("Fetching all sessions for admin - statuses: {}, subjectId: {}, teacherId: {}, dateFrom: {}, dateTo: {}",
                statuses, subjectId, teacherId, startDate, endDate);
        
        // Build dynamic query using Specification
        List<LiveSession> sessions = liveSessionRepository.findAll((Specification<LiveSession>) (root, query, cb) -> {
            var predicates = cb.conjunction();
            
            // Filter by teacher if specified
            if (teacherId != null) {
                predicates = cb.and(predicates, cb.equal(root.get("teacher").get("id"), teacherId));
            }
            
            // Filter by statuses if specified
            if (statuses != null && !statuses.isEmpty()) {
                predicates = cb.and(predicates, root.get("status").in(statuses));
            }
            
            // Filter by subject if specified
            if (subjectId != null) {
                predicates = cb.and(predicates, cb.equal(root.get("subject").get("id"), subjectId));
            }
            
            // Filter by date range if specified
            if (startDate != null) {
                predicates = cb.and(predicates, cb.greaterThanOrEqualTo(root.get("scheduledStartTime"), startDate));
            }
            if (endDate != null) {
                predicates = cb.and(predicates, cb.lessThan(root.get("scheduledStartTime"), endDate));
            }
            
            // Order by scheduled start time descending
            query.orderBy(cb.desc(root.get("scheduledStartTime")));
            
            return predicates;
        });
        
        log.info("Found {} sessions for admin", sessions.size());
        
        return sessions.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    /**
     * Process recordings after session ends
     */
    @Transactional
    public void processRecordings(Long sessionId, String teacherEmail) {
        log.info("Processing recordings for session: {}", sessionId);
        
        LiveSession session = liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        
        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        
        if (!session.getTeacher().getId().equals(teacher.getId())) {
            throw new ValidationException("You can only process recordings for your own sessions");
        }
        
        // TODO: Trigger recording processing pipeline
        
        log.info("✅ Recording processing triggered");
    }

    /**
     * Handle recording ready webhook
     */
    @Transactional
    public void handleRecordingReady(String sessionId, String recordingUrl) {
        log.info("Recording ready for session: {}", sessionId);
        
        // TODO: Update session with recording URL
        // TODO: Create SessionRecording record
        
        log.info("✅ Recording processed successfully");
    }

    /**
     * Handle transcript ready webhook
     */
    @Transactional
    public void handleTranscriptReady(String sessionId, String transcriptText) {
        log.info("Transcript ready for session: {}", sessionId);
        
        // TODO: Update session recording with transcript
        
        log.info("✅ Transcript processed successfully");
    }

    @Transactional(readOnly = true)
    public List<LiveSessionDto> getUpcomingSessionsForUser(String email) {
        log.info("Fetching upcoming sessions for user: {}", email);

        // 🔥 IMPORTANT: load full graph with studentProfile + classLevel
        User user = userRepository.findByEmailWithStudentProfile(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean isStudent = user.getRoles().stream()
                .anyMatch(role -> "STUDENT".equalsIgnoreCase(role.getName()));
        boolean isTeacher = user.getRoles().stream()
                .anyMatch(role -> "TEACHER".equalsIgnoreCase(role.getName()));
        boolean isAdmin = user.getRoles().stream()
                .anyMatch(role -> "ADMIN".equalsIgnoreCase(role.getName()));
        boolean isParent = user.getRoles().stream()
                .anyMatch(role -> "PARENT".equalsIgnoreCase(role.getName()));

        if (isStudent) {
            return getUpcomingSessionsForStudent(email);
        } else if (isTeacher) {
            Instant now = Instant.now();
            return getSessionsForTeacher(email).stream()
                .filter(session -> session.getScheduledStartTime().isAfter(now))
                .filter(session -> session.getStatus() == SessionStatus.SCHEDULED)
                .sorted(Comparator.comparing(LiveSessionDto::getScheduledStartTime))
                .collect(Collectors.toList());
        } else if (isAdmin) {
            Instant now = Instant.now();
            Instant futureTime = now.plusSeconds(7 * 24 * 60 * 60);

            return liveSessionRepository
                .findByStatusAndScheduledStartTimeBetween(SessionStatus.SCHEDULED, now, futureTime)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
        } else if (isParent) {
            log.warn("Parent session access not yet implemented");
            return List.of();
        }

        return List.of();
    }

    
    
    @Transactional(readOnly = true)
    public List<LiveSessionDto> getTeacherSessions(
            Long teacherId,
            List<SessionStatus> statuses,
            Long subjectId,
            Instant startDate,
            Instant endDate
    ) {
        log.info("Fetching sessions for teacher {} with filters - statuses: {}, subjectId: {}, dateFrom: {}, dateTo: {}",
                teacherId, statuses, subjectId, startDate, endDate);

        // Build dynamic query
        List<LiveSession> sessions = liveSessionRepository.findAll((Specification<LiveSession>) (root, query, cb) -> {
            var predicates = cb.conjunction();

            if (teacherId != null) {
                predicates = cb.and(predicates, cb.equal(root.get("teacher").get("id"), teacherId));
            }
            if (statuses != null && !statuses.isEmpty()) {
                predicates = cb.and(predicates, root.get("status").in(statuses));
            }
            if (subjectId != null) {
                predicates = cb.and(predicates, cb.equal(root.get("subject").get("id"), subjectId));
            }
            if (startDate != null) {
                predicates = cb.and(predicates, cb.greaterThanOrEqualTo(root.get("scheduledStartTime"), startDate));
            }
            if (endDate != null) {
                predicates = cb.and(predicates, cb.lessThan(root.get("scheduledStartTime"), endDate));
            }

            return predicates;
        });

        log.info("Found {} sessions", sessions.size());

        return sessions.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    
    // ===== Helper Methods =====

    /**
     * Helper method to check if user has a specific role
     */
    private boolean hasRole(User user, String roleName) {
        return user.getRoles().stream()
                .anyMatch(role -> roleName.equalsIgnoreCase(role.getName()));
    }

    private LiveSessionDto mapToDto(LiveSession session) {
        LiveSessionDto dto = LiveSessionDto.builder()
                .id(session.getId())
                .title(session.getTitle())
                .description(session.getDescription())
                .status(session.getStatus())
                .scheduledStartTime(session.getScheduledStartTime())
                .actualStartTime(session.getActualStartTime())
                .actualEndTime(session.getActualEndTime())
                .scheduledDurationMinutes(session.getScheduledDurationMinutes())
                .zoomMeetingId(session.getZoomMeetingId())
                .joinUrl(session.getJoinUrl())
                .startUrl(session.getStartUrl())
                .meetingPassword(session.getMeetingPassword())
                .teacherId(session.getTeacher().getId())
                .teacherName(session.getTeacher().getFullName())
                .subjectId(session.getSubject().getId())
                .subjectName(session.getSubject().getName())
                .classId(session.getClassEntity().getId())
                .className(session.getClassEntity().getName())
                .maxParticipants(session.getMaxParticipants())
                .createdAt(session.getCreatedAt())
                .updatedAt(session.getUpdatedAt())
                .build();

        if (session.getLessonTopic() != null) {
            dto.setLessonTopicId(session.getLessonTopic().getId());
            dto.setLessonTopicTitle(session.getLessonTopic().getTopicTitle());
        }

        int attendanceCount = sessionAttendanceRepository
                .findByLiveSessionId(session.getId()).size();
        dto.setAttendanceCount(attendanceCount);

        boolean hasRecording = !sessionRecordingRepository
                .findByLiveSessionId(session.getId()).isEmpty();
        dto.setHasRecording(hasRecording);

        return dto;
    }

    private SessionAttendanceDto mapToAttendanceDto(SessionAttendance attendance) {
        return SessionAttendanceDto.builder()
                .id(attendance.getId())
                .sessionId(attendance.getLiveSession().getId())
                .studentId(attendance.getStudent().getId())
                .studentName(attendance.getStudent().getFullName())
                .studentEmail(attendance.getStudent().getEmail())
                .joinedAt(attendance.getJoinedAt())
                .leftAt(attendance.getLeftAt())
                .durationMinutes(attendance.getDurationMinutes())
                .build();
    }

    private RecordingDto mapToRecordingDto(SessionRecording recording) {
        return RecordingDto.builder()
                .id(recording.getId())
                .sessionId(recording.getLiveSession().getId())
                .zoomRecordingId(recording.getZoomRecordingId())
                .zoomDownloadUrl(recording.getZoomDownloadUrl())
                .status(recording.getStatus().name())
                .fileType(recording.getFileType())
                .fileSizeBytes(recording.getFileSizeBytes())
                .durationSeconds(recording.getDurationSeconds())
                .youtubeVideoId(recording.getYoutubeVideoId())
                .downloadStartedAt(recording.getProcessingStartedAt())
                .downloadCompletedAt(recording.getDownloadCompletedAt())
                .processingCompletedAt(recording.getProcessingCompletedAt())
                .createdAt(recording.getCreatedAt())
                .build();
    }
    
    private SessionRecordingDto mapToSessionRecordingDto(SessionRecording recording) {
        return SessionRecordingDto.builder()
                .id(recording.getId())
                .sessionId(recording.getLiveSession().getId())
                .recordingUrl(recording.getZoomDownloadUrl())
                .downloadUrl(recording.getZoomDownloadUrl())
                .durationSeconds(recording.getDurationSeconds())
                .fileSizeBytes(recording.getFileSizeBytes())
                .hasTranscript(recording.getHasTranscript())
                .recordedAt(recording.getRecordedAt())
                .createdAt(recording.getCreatedAt())
                .build();
    }

    private String generatePassword() {
        return String.format("%06d", (int) (Math.random() * 1000000));
    }
    


    // ==================== NOTIFICATION METHODS ====================

    /**
     * ✅ Notify all students in a class about a new scheduled session
     */
    private void notifyStudentsAboutNewSession(LiveSession session) {
        try {
            List<Long> studentIds = getStudentIdsInClass(session.getClassEntity().getId());
            
            if (studentIds.isEmpty()) {
                log.warn("No students found in class {} for session notifications", 
                        session.getClassEntity().getId());
                return;
            }

            String formattedTime = formatInstant(session.getScheduledStartTime());
            
            String title = "New Live Class Scheduled";
            String message = String.format(
                "A new live class has been scheduled for %s: %s by %s at %s",
                session.getSubject().getName(),
                session.getTitle(),
                session.getTeacher().getFullName(),
                formattedTime
            );
            
            String actionUrl = "/student/live-sessions/" + session.getId();

            notificationService.createBulkNotifications(
                studentIds,
                NotificationType.LIVE_CLASS_SCHEDULED,
                NotificationPriority.MEDIUM,
                title,
                message,
                actionUrl,
                session.getId(),
                "LiveSession"
            );

            log.info("✅ Sent LIVE_CLASS_SCHEDULED notifications to {} students", studentIds.size());
        } catch (Exception e) {
            log.error("❌ Failed to send session scheduled notifications: {}", e.getMessage(), e);
        }
    }

    /**
     * ✅ Notify students when a session is starting
     */
    private void notifyStudentsSessionStarting(LiveSession session) {
        try {
            List<Long> studentIds = getStudentIdsInClass(session.getClassEntity().getId());
            
            if (studentIds.isEmpty()) {
                log.warn("No students found for LIVE_CLASS_STARTING notification");
                return;
            }

            String title = "Live Class Starting Now";
            String message = String.format(
                "%s - %s is starting now! Click to join.",
                session.getSubject().getName(),
                session.getTitle()
            );
            
            String actionUrl = "/student/live-sessions/" + session.getId() + "/join";

            notificationService.createBulkNotifications(
                studentIds,
                NotificationType.LIVE_CLASS_STARTING,
                NotificationPriority.HIGH,
                title,
                message,
                actionUrl,
                session.getId(),
                "LiveSession"
            );

            log.info("✅ Sent LIVE_CLASS_STARTING notifications to {} students", studentIds.size());
        } catch (Exception e) {
            log.error("❌ Failed to send session starting notifications: {}", e.getMessage(), e);
        }
    }

    /**
     * ✅ Notify students about session updates (time/title changes)
     */
    private void notifyStudentsAboutSessionUpdate(LiveSession session) {
        try {
            List<Long> studentIds = getStudentIdsInClass(session.getClassEntity().getId());
            
            if (studentIds.isEmpty()) {
                return;
            }

            String formattedTime = formatInstant(session.getScheduledStartTime());
            
            String title = "Live Class Updated";
            String message = String.format(
                "The live class '%s' has been updated. New time: %s",
                session.getTitle(),
                formattedTime
            );
            
            String actionUrl = "/student/live-sessions/" + session.getId();

            notificationService.createBulkNotifications(
                studentIds,
                NotificationType.LIVE_CLASS_SCHEDULED,
                NotificationPriority.MEDIUM,
                title,
                message,
                actionUrl,
                session.getId(),
                "LiveSession"
            );

            log.info("✅ Sent session update notifications to {} students", studentIds.size());
        } catch (Exception e) {
            log.error("❌ Failed to send session update notifications: {}", e.getMessage(), e);
        }
    }

    /**
     * ✅ Notify students about session cancellation
     */
    private void notifyStudentsAboutCancellation(LiveSession session) {
        try {
            List<Long> studentIds = getStudentIdsInClass(session.getClassEntity().getId());
            
            if (studentIds.isEmpty()) {
                return;
            }

            String title = "Live Class Cancelled";
            String message = String.format(
                "The live class '%s' scheduled for %s has been cancelled by %s",
                session.getTitle(),
                formatInstant(session.getScheduledStartTime()),
                session.getTeacher().getFullName()
            );
            
            String actionUrl = "/student/live-sessions";

            notificationService.createBulkNotifications(
                studentIds,
                NotificationType.SYSTEM_ALERT,
                NotificationPriority.HIGH,
                title,
                message,
                actionUrl,
                session.getId(),
                "LiveSession"
            );

            log.info("✅ Sent cancellation notifications to {} students", studentIds.size());
        } catch (Exception e) {
            log.error("❌ Failed to send cancellation notifications: {}", e.getMessage(), e);
        }
    }

    /**
     * ✅ Get all student IDs enrolled in a specific class
     */
    private List<Long> getStudentIdsInClass(Long classId) {
        // Query all users with STUDENT role in the specified class
        return userRepository.findAll().stream()
            .filter(user -> {
                boolean isStudent = user.getRoles().stream()
                    .anyMatch(role -> "STUDENT".equalsIgnoreCase(role.getName()));
                
                if (!isStudent) return false;
                
                StudentProfile profile = user.getStudentProfile();
                if (profile == null || profile.getClassLevel() == null) {
                    return false;
                }
                
                return profile.getClassLevel().getId().equals(classId);
            })
            .map(User::getId)
            .collect(Collectors.toList());
    }

    /**
     * ✅ Format Instant to readable date-time string
     */
    private String formatInstant(Instant instant) {
        DateTimeFormatter formatter = DateTimeFormatter
            .ofPattern("MMM dd, yyyy 'at' hh:mm a")
            .withZone(ZoneId.systemDefault());
        return formatter.format(instant);
    }

}