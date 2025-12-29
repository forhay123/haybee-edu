package com.edu.platform.controller.test;

import com.edu.platform.dto.session.CreateLiveSessionRequest;
import com.edu.platform.dto.session.UpdateSessionRequest;
import com.edu.platform.dto.session.LiveSessionDto;
import com.edu.platform.dto.session.SessionDetailsDto;
import com.edu.platform.service.LiveSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/test/live-session")
@RequiredArgsConstructor
public class LiveSessionTestController {

    private final LiveSessionService liveSessionService;

    // 1. Create dummy session
    @PostMapping("/create")
    public LiveSessionDto create(@RequestParam String teacherEmail) {

        CreateLiveSessionRequest req = new CreateLiveSessionRequest();
        req.setTitle("Test Live Class");
        req.setDescription("Testing Zoom Integration");
        req.setSubjectId(1L);   // change to existing subject
        req.setClassId(1L);     // change to existing class
        req.setTermId(1L);      // change to existing term
        req.setLessonTopicId(null);
        req.setScheduledStartTime(Instant.now().plusSeconds(3600));
        req.setScheduledDurationMinutes(30);
        req.setTimezone("UTC");
        req.setMeetingPassword("123456");
        req.setMaxParticipants(50);

        return liveSessionService.createSession(req, teacherEmail);
    }

    // 2. Start session
    @PostMapping("/{id}/start")
    public LiveSessionDto start(@PathVariable Long id, @RequestParam String teacherEmail) {
        return liveSessionService.startSession(id, teacherEmail);
    }

    // 3. End session
    @PostMapping("/{id}/end")
    public LiveSessionDto end(@PathVariable Long id, @RequestParam String teacherEmail) {
        return liveSessionService.endSession(id, teacherEmail);
    }

    // 4. Cancel session
    @PostMapping("/{id}/cancel")
    public String cancel(@PathVariable Long id, @RequestParam String teacherEmail) {
        liveSessionService.cancelSession(id, teacherEmail);
        return "Session cancelled";
    }

    // 5. Update session
    @PostMapping("/{id}/update")
    public LiveSessionDto update(
            @PathVariable Long id,
            @RequestParam String teacherEmail) {

        UpdateSessionRequest req = new UpdateSessionRequest();
        req.setTitle("UPDATED TITLE");
        req.setDescription("Updated description");
        req.setScheduledStartTime(Instant.now().plusSeconds(7200));
        req.setScheduledDurationMinutes(45);
        req.setMaxParticipants(100);

        return liveSessionService.updateSession(id, req, teacherEmail);
    }

    // 6. Get session details
    @GetMapping("/{id}")
    public SessionDetailsDto details(@PathVariable Long id, @RequestParam String userEmail) {
        return liveSessionService.getSessionDetails(id, userEmail);
    }

    // 7. Record attendance
    @PostMapping("/{id}/attendance")
    public String attendance(@PathVariable Long id, @RequestParam String studentEmail) {
        liveSessionService.recordAttendance(id, studentEmail);
        return "Attendance recorded";
    }
}
