package com.edu.platform.controller;

import com.edu.platform.dto.progress.ComprehensiveLessonsReport;
import com.edu.platform.dto.progress.DailyProgressDto;
import com.edu.platform.dto.progress.IncompleteLessonsReport;
import com.edu.platform.dto.progress.LessonProgressDto;
import com.edu.platform.dto.progress.ProgressUpdateRequest;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.TeacherProfile;
import com.edu.platform.model.User;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.TeacherProfileRepository;
import com.edu.platform.repository.UserRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import com.edu.platform.service.StudentProfileService;
import com.edu.platform.service.progress.ComprehensiveLessonService;
import com.edu.platform.service.progress.DailyPlannerService;
import com.edu.platform.service.progress.IncompleteLessonService;
import com.edu.platform.service.progress.LessonProgressService;
import com.edu.platform.service.progress.ProgressReportService;
import com.edu.platform.service.individual.PeriodDependencyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/progress")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Lesson Progress", description = "APIs for tracking student lesson progress")
public class LessonProgressController {

    private final LessonProgressService lessonProgressService;
    private final DailyPlannerService dailyPlannerService;
    private final ProgressReportService progressReportService;
    private final IncompleteLessonService incompleteLessonService;
    private final ComprehensiveLessonService comprehensiveLessonService;
    private final StudentProfileService studentProfileService;
    private final UserRepository userRepository;
    private final TeacherProfileRepository teacherProfileRepository;
    private final StudentLessonProgressRepository progressRepository;
    private final PeriodDependencyService periodDependencyService;

    // ======================================================
    // 📌 NEW: MULTI-PERIOD ACCESS CHECK ENDPOINT
    // ======================================================

    /**
     * ✅ NEW: Check if student can access a specific progress/period
     * Returns detailed information about access restrictions
     * 
     * Used by frontend to determine if student can start a period's assessment
     * Checks:
     * - Multi-period dependencies (previous period completion)
     * - Custom assessment creation status (waiting for teacher)
     * - Assessment window timing
     * 
     * @param progressId The progress record ID to check
     * @return Access check result with canAccess boolean and detailed reason
     */
    @GetMapping("/{progressId}/can-access")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(
        summary = "Check if student can access this period",
        description = "Checks multi-period dependencies and custom assessment status. " +
                      "Returns { canAccess: false, reason: '...' } if blocked."
    )
    public ResponseEntity<Map<String, Object>> checkPeriodAccess(
            @PathVariable Long progressId,
            Authentication auth) {

        log.info("🔍 Checking access for progress ID: {}", progressId);

        try {
            // Get the progress record
            StudentLessonProgress progress = progressRepository.findById(progressId)
                    .orElseThrow(() -> new EntityNotFoundException(
                            "Progress record not found: " + progressId));

            // ✅ If requesting user is a student, verify they own this progress
            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            boolean isStudent = user.getRoles().stream()
                    .anyMatch(role -> role.getName().equals("STUDENT"));

            if (isStudent) {
                StudentProfile student = studentProfileService.getStudentProfile(user.getId())
                        .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

                if (!progress.getStudentProfile().getId().equals(student.getId())) {
                    log.warn("❌ Student {} attempted to check access for progress {} owned by another student",
                            student.getId(), progressId);
                    throw new IllegalArgumentException("This progress record does not belong to you");
                }
            }

            // ✅ Use PeriodDependencyService to check access
            PeriodDependencyService.DependencyCheckResult checkResult =
                    periodDependencyService.checkAccess(progress);

            // Build response
            Map<String, Object> response = new HashMap<>();
            response.put("progressId", progress.getId());
            response.put("canAccess", checkResult.canAccess());
            response.put("reason", checkResult.getBlockingReason());
            
            // Add period context
            response.put("periodNumber", progress.getPeriodSequence());
            response.put("totalPeriods", progress.getTotalPeriodsInSequence());
            response.put("isMultiPeriod", progress.getTotalPeriodsInSequence() != null && 
                                          progress.getTotalPeriodsInSequence() > 1);
            
            // Add dependency details if applicable
            if (progress.hasPreviousPeriod()) {
                response.put("hasPreviousPeriod", true);
                response.put("previousPeriodCompleted", progress.isPreviousPeriodCompleted());
                if (progress.getPreviousPeriodProgress() != null) {
                    response.put("previousPeriodId", progress.getPreviousPeriodProgress().getId());
                }
            } else {
                response.put("hasPreviousPeriod", false);
            }
            
            // Add custom assessment status
            response.put("requiresCustomAssessment", Boolean.TRUE.equals(
                    progress.getRequiresCustomAssessment()));
            response.put("assessmentCreated", progress.getAssessment() != null);
            
            if (Boolean.TRUE.equals(progress.getRequiresCustomAssessment()) && 
                progress.getAssessment() == null) {
                response.put("waitingForTeacher", true);
                response.put("needsTeacherAssessment", true);
            } else {
                response.put("waitingForTeacher", false);
                response.put("needsTeacherAssessment", false);
            }
            
            // Add assessment details if available
            if (progress.getAssessment() != null) {
                Map<String, Object> assessmentInfo = new HashMap<>();
                assessmentInfo.put("id", progress.getAssessment().getId());
                assessmentInfo.put("title", progress.getAssessment().getTitle());
                assessmentInfo.put("isCustomAssessment", progress.getAssessment().isCustomAssessment());
                response.put("assessment", assessmentInfo);
            }
            
            // Add timing information
            response.put("assessmentAccessible", progress.isAssessmentAccessible());
            response.put("assessmentWindowStart", progress.getAssessmentWindowStart());
            response.put("assessmentWindowEnd", progress.getAssessmentWindowEnd());
            response.put("scheduledDate", progress.getScheduledDate());
            
            // Add completion status
            response.put("completed", progress.isCompleted());
            if (progress.isCompleted()) {
                response.put("completedAt", progress.getCompletedAt());
            }

            // Log result
            if (checkResult.canAccess()) {
                log.info("✅ Access granted for progress {}: Period {} of {}", 
                        progressId, progress.getPeriodSequence(), progress.getTotalPeriodsInSequence());
            } else {
                log.info("🔒 Access denied for progress {}: {}", 
                        progressId, checkResult.getBlockingReason());
            }

            return ResponseEntity.ok(response);

        } catch (EntityNotFoundException | IllegalArgumentException e) {
            log.error("❌ Error checking access: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "error", e.getMessage(),
                            "canAccess", false,
                            "reason", e.getMessage()
                    ));

        } catch (Exception e) {
            log.error("❌ Unexpected error checking progress access: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "error", "Failed to check access",
                            "message", e.getMessage(),
                            "canAccess", false,
                            "reason", "System error - please try again"
                    ));
        }
    }

    // ======================================================
    // 📌 NEW: TEACHER-SPECIFIC ENDPOINTS (VIEW SPECIFIC STUDENT)
    // ======================================================

    /**
     * ✅ NEW: Teacher views comprehensive lessons for a specific student
     * Only shows lessons for subjects the teacher teaches to this student
     */
    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/lessons/teacher/students/{studentId}/comprehensive")
    @Operation(summary = "Teacher: Get student's comprehensive lessons", 
               description = "Teacher views lessons for subjects they teach this student")
    public ResponseEntity<ComprehensiveLessonsReport> getTeacherStudentLessons(
            Authentication auth,
            @PathVariable Long studentId,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String status) {
        
        User teacher = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("Teacher not found"));
        
        // ✅ FIX: Get TeacherProfile ID, not User ID
        TeacherProfile teacherProfile = teacherProfileRepository.findByUserId(teacher.getId())
                .orElseThrow(() -> new IllegalArgumentException("Teacher profile not found"));
        
        log.info("📚 Teacher {} (profile ID: {}) fetching comprehensive lessons for student {} (subjects they teach)", 
                teacher.getEmail(), teacherProfile.getId(), studentId);
        
        // Use service method that filters by teacher's subjects
        ComprehensiveLessonsReport report = comprehensiveLessonService
                .getTeacherStudentLessons(teacherProfile.getId(), studentId, fromDate, toDate, status);
        
        log.info("✅ Teacher comprehensive report: Total={}, Completed={}, Missed={}",
                report.getTotalLessons(), report.getCompletedCount(), report.getMissedCount());
        
        return ResponseEntity.ok(report);
    }

    /**
     * ✅ NEW: Teacher views statistics for a specific student
     * Only includes subjects the teacher teaches to this student
     */
    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/lessons/teacher/students/{studentId}/stats")
    @Operation(summary = "Teacher: Get student's lesson statistics", 
               description = "Statistics for subjects the teacher teaches this student")
    public ResponseEntity<Map<String, Object>> getTeacherStudentStats(
            Authentication auth,
            @PathVariable Long studentId,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        
        User teacher = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("Teacher not found"));
        
        // ✅ FIX: Get TeacherProfile ID, not User ID
        TeacherProfile teacherProfile = teacherProfileRepository.findByUserId(teacher.getId())
                .orElseThrow(() -> new IllegalArgumentException("Teacher profile not found"));
        
        log.info("📊 Teacher {} (profile ID: {}) fetching stats for student {} (subjects they teach)", 
                teacher.getEmail(), teacherProfile.getId(), studentId);
        
        // Use service method that filters by teacher's subjects
        Map<String, Object> stats = comprehensiveLessonService
                .getTeacherStudentStats(teacherProfile.getId(), studentId, fromDate, toDate);
        
        return ResponseEntity.ok(stats);
    }

    // ======================================================
    // 📌 COMPREHENSIVE LESSON TRACKING ENDPOINTS
    // ======================================================

    /**
     * ✅ Admin/Teacher views comprehensive lessons for any student
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    @GetMapping("/students/{id}/comprehensive")
    @Operation(summary = "Get comprehensive lesson report", 
               description = "Get all lessons (completed, missed, in-progress, scheduled) for a student")
    public ResponseEntity<ComprehensiveLessonsReport> getComprehensiveLessons(
            @PathVariable Long id,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String statusFilter) {
        
        log.info("📚 Fetching comprehensive lessons for student {} (from: {}, to: {}, status: {})", 
                id, fromDate, toDate, statusFilter);
        
        ComprehensiveLessonsReport report = comprehensiveLessonService
                .getComprehensiveLessons(id, fromDate, toDate, statusFilter);
        
        log.info("✅ Comprehensive report generated: Total={}, Completed={}, Missed={}, InProgress={}, Scheduled={}",
                report.getTotalLessons(), report.getCompletedCount(), 
                report.getMissedCount(), report.getInProgressCount(), report.getScheduledCount());
        
        return ResponseEntity.ok(report);
    }

    /**
     * ✅ Student views their own comprehensive lessons
     */
    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/comprehensive/me")
    @Operation(summary = "Get my comprehensive lesson report", 
               description = "Student views all their lessons with status tracking")
    public ResponseEntity<ComprehensiveLessonsReport> getMyComprehensiveLessons(
            Authentication auth,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String statusFilter) {
        
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        StudentProfile student = studentProfileService.getStudentProfile(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));
        
        log.info("📚 Student {} fetching comprehensive lessons", user.getEmail());
        
        ComprehensiveLessonsReport report = comprehensiveLessonService
                .getComprehensiveLessons(student.getId(), fromDate, toDate, statusFilter);
        
        log.info("✅ Found {} total lessons for student", report.getTotalLessons());
        
        return ResponseEntity.ok(report);
    }

    /**
     * ✅ Get urgent lessons requiring immediate attention
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    @GetMapping("/students/{id}/urgent")
    @Operation(summary = "Get urgent lessons", 
               description = "Get lessons requiring immediate attention (missed + overdue)")
    public ResponseEntity<?> getUrgentLessons(@PathVariable Long id) {
        log.info("🚨 Fetching urgent lessons for student {}", id);
        return ResponseEntity.ok(comprehensiveLessonService.getUrgentLessons(id));
    }

    /**
     * ✅ Student views their urgent lessons
     */
    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/urgent/me")
    @Operation(summary = "Get my urgent lessons", 
               description = "Student views lessons needing immediate attention")
    public ResponseEntity<?> getMyUrgentLessons(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        StudentProfile student = studentProfileService.getStudentProfile(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));
        
        log.info("🚨 Student {} fetching urgent lessons", user.getEmail());
        return ResponseEntity.ok(comprehensiveLessonService.getUrgentLessons(student.getId()));
    }

    /**
     * ✅ Get lessons grouped by subject
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    @GetMapping("/students/{id}/by-subject")
    @Operation(summary = "Get lessons grouped by subject", 
               description = "Get all lessons organized by subject")
    public ResponseEntity<?> getLessonsBySubject(
            @PathVariable Long id,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        
        log.info("📖 Fetching lessons by subject for student {}", id);
        return ResponseEntity.ok(comprehensiveLessonService.getLessonsBySubject(id, fromDate, toDate));
    }

    /**
     * ✅ Get status statistics
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    @GetMapping("/students/{id}/stats")
    @Operation(summary = "Get lesson statistics", 
               description = "Get statistical overview of student's lesson progress")
    public ResponseEntity<Map<String, Object>> getStatusStats(
            @PathVariable Long id,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        
        log.info("📊 Fetching statistics for student {}", id);
        return ResponseEntity.ok(comprehensiveLessonService.getStatusStats(id, fromDate, toDate));
    }

    /**
     * ✅ Student views their own statistics
     */
    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/stats/me")
    @Operation(summary = "Get my lesson statistics", 
               description = "Student views their progress statistics")
    public ResponseEntity<Map<String, Object>> getMyStats(
            Authentication auth,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        StudentProfile student = studentProfileService.getStudentProfile(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));
        
        log.info("📊 Student {} fetching their statistics", user.getEmail());
        return ResponseEntity.ok(comprehensiveLessonService.getStatusStats(student.getId(), fromDate, toDate));
    }

    // ======================================================
    // 📌 INCOMPLETE LESSONS REPORT ENDPOINTS
    // ======================================================
    
    /**
     * Admin/Teacher views incomplete lessons for any student
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    @GetMapping("/students/{id}/incomplete-lessons")
    @Operation(summary = "Get incomplete lessons", 
               description = "Get all incomplete lessons for a student with reasons")
    public ResponseEntity<IncompleteLessonsReport> getIncompleteLessons(
            @PathVariable Long id,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        
        log.info("📊 Fetching incomplete lessons for student {} (from: {}, to: {})", 
                id, fromDate, toDate);
        
        StudentProfile student = studentProfileService.getById(id)
                .orElseThrow(() -> new IllegalArgumentException("Student not found: " + id));
        
        IncompleteLessonsReport report = buildIncompleteLessonsReport(student, fromDate, toDate);
        
        log.info("✅ Found {} incomplete lessons for student {}", 
                report.getTotalIncomplete(), id);
        
        return ResponseEntity.ok(report);
    }
    
    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/incomplete-lessons/me")
    @Operation(summary = "Get my incomplete lessons", 
               description = "Student views their own incomplete lessons")
    public ResponseEntity<IncompleteLessonsReport> getMyIncompleteLessons(
            Authentication auth,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        StudentProfile student = studentProfileService.getStudentProfile(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));
        
        log.info("📊 Student {} fetching their incomplete lessons", user.getEmail());
        
        IncompleteLessonsReport report = buildIncompleteLessonsReport(student, fromDate, toDate);
        
        log.info("✅ Found {} incomplete lessons", report.getTotalIncomplete());
        
        return ResponseEntity.ok(report);
    }

    /**
     * Helper method to build incomplete lessons report
     */
    private IncompleteLessonsReport buildIncompleteLessonsReport(
            StudentProfile student, LocalDate fromDate, LocalDate toDate) {
        
        List<StudentLessonProgress> incompleteLessons = 
                incompleteLessonService.getIncompleteLessons(student.getId());
        
        // Filter by date range if provided
        if (fromDate != null || toDate != null) {
            incompleteLessons = incompleteLessons.stream()
                    .filter(progress -> {
                        LocalDate scheduledDate = progress.getScheduledDate();
                        if (fromDate != null && scheduledDate.isBefore(fromDate)) {
                            return false;
                        }
                        if (toDate != null && scheduledDate.isAfter(toDate)) {
                            return false;
                        }
                        return true;
                    })
                    .collect(Collectors.toList());
        }
        
        // Group by incomplete reason
        Map<String, List<IncompleteLessonsReport.IncompleteLessonDto>> incompleteByReason = 
                incompleteLessons.stream()
                        .collect(Collectors.groupingBy(
                                progress -> progress.getIncompleteReason() != null 
                                        ? progress.getIncompleteReason() 
                                        : "UNKNOWN",
                                Collectors.mapping(
                                        this::convertToIncompleteLessonDto,
                                        Collectors.toList()
                                )
                        ));
        
        return IncompleteLessonsReport.builder()
                .studentId(student.getId())
                .studentName(student.getUser().getFullName())
                .totalIncomplete(incompleteLessons.size())
                .incompleteByReason(incompleteByReason)
                .fromDate(fromDate)
                .toDate(toDate)
                .build();
    }
    
    /**
     * Convert StudentLessonProgress to IncompleteLessonDto
     */
    private IncompleteLessonsReport.IncompleteLessonDto convertToIncompleteLessonDto(
            StudentLessonProgress progress) {
        
        return IncompleteLessonsReport.IncompleteLessonDto.builder()
                .progressId(progress.getId())
                .lessonTopicId(progress.getLessonTopic() != null 
                        ? progress.getLessonTopic().getId() : null)
                .lessonTopicTitle(progress.getLessonTopic() != null 
                        ? progress.getLessonTopic().getTopicTitle() : "N/A")
                .subjectName(progress.getSubject() != null 
                        ? progress.getSubject().getName() : "N/A")
                .scheduledDate(progress.getScheduledDate())
                .periodNumber(progress.getPeriodNumber())
                .incompleteReason(progress.getIncompleteReason())
                .autoMarkedIncompleteAt(progress.getAutoMarkedIncompleteAt())
                .assessmentWindowStart(progress.getAssessmentWindowStart())
                .assessmentWindowEnd(progress.getAssessmentWindowEnd())
                .canStillComplete(false)
                .build();
    }

    // ======================================================
    // EXISTING ENDPOINTS (PRESERVED)
    // ======================================================

    /**
     * Logged-in student gets own daily plan
     */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/daily/me")
    @Operation(summary = "Get my daily plan", description = "Get lesson plan for a specific date")
    public ResponseEntity<DailyProgressDto> getMyDailyProgress(
            Authentication auth,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        if (date == null) date = LocalDate.now();

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        StudentProfile student = studentProfileService.getStudentProfile(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        return ResponseEntity.ok(buildDailyProgress(student, date));
    }

    /**
     * Admin can view any student daily progress
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/daily")
    @Operation(summary = "Get student daily plan", description = "Admin views student's daily plan")
    public ResponseEntity<DailyProgressDto> getDailyProgressAdmin(
            @RequestParam Long studentProfileId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        if (date == null) date = LocalDate.now();

        StudentProfile student = studentProfileService.getById(studentProfileId)
                .orElseThrow(() -> new IllegalArgumentException("StudentProfile not found"));

        return ResponseEntity.ok(buildDailyProgress(student, date));
    }

    /**
     * Shared internal mapper for daily progress
     */
    private DailyProgressDto buildDailyProgress(StudentProfile student, LocalDate date) {
        List<StudentLessonProgress> daily = dailyPlannerService.generateDailyPlan(student, date);
        List<LessonProgressDto> lessons = daily.stream().map(LessonProgressDto::fromEntity).toList();
        return new DailyProgressDto(date, lessons);
    }

    /**
     * Mark lesson complete
     */
    @PreAuthorize("isAuthenticated()")
    @PostMapping("/complete")
    @Operation(summary = "Mark lesson complete", description = "Student marks a lesson as completed")
    public ResponseEntity<LessonProgressDto> markComplete(
            @RequestBody ProgressUpdateRequest request, 
            Authentication auth) {

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        StudentProfile student = studentProfileService.getStudentProfile(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        StudentLessonProgress progress = lessonProgressService.markPeriodComplete(request, student);
        return ResponseEntity.ok(LessonProgressDto.fromEntity(progress));
    }

    /**
     * Admin view progress history
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/history")
    @Operation(summary = "Get progress history", description = "Admin views student's progress history")
    public ResponseEntity<List<LessonProgressDto>> getHistory(
            @RequestParam Long studentProfileId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        return ResponseEntity.ok(
                progressReportService.getProgressHistory(studentProfileId, from, to)
                        .stream()
                        .map(LessonProgressDto::fromEntity)
                        .toList()
        );
    }

    /**
     * Student view own history
     */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/history/me")
    @Operation(summary = "Get my progress history", description = "Student views their own progress history")
    public ResponseEntity<List<LessonProgressDto>> getMyHistory(
            Authentication auth,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        StudentProfile student = studentProfileService.getStudentProfile(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        return ResponseEntity.ok(
                progressReportService.getProgressHistory(student.getId(), from, to)
                        .stream()
                        .map(LessonProgressDto::fromEntity)
                        .toList()
        );
    }

    @PreAuthorize("isAuthenticated()")
    @PostMapping("/sync-incomplete")
    @Operation(summary = "Sync incomplete lessons", 
               description = "Ensures all missed lessons are properly marked as incomplete")
    public ResponseEntity<Map<String, Object>> syncIncompleteLessons(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        StudentProfile student = studentProfileService.getStudentProfile(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));
        
        log.info("🔄 Syncing incomplete lessons for student {}", student.getId());
        
        comprehensiveLessonService.syncIncompleteLessons(student.getId());
        
        // Fetch updated incomplete lessons report
        IncompleteLessonsReport report = buildIncompleteLessonsReport(student, null, null);
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "totalIncomplete", report.getTotalIncomplete(),
            "message", "Successfully synced incomplete lessons"
        ));
    }
	    
	
    /**
     * ✅ NEW: Get lesson progress by ID (for assessment start page)
     * Students need this to view assessment details before starting
     */
    @GetMapping("/{progressId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Get lesson progress by ID", 
               description = "Get detailed progress information including assessment windows")
    public ResponseEntity<LessonProgressDto> getProgressById(@PathVariable Long progressId) {
        log.info("📖 Fetching lesson progress by ID: {}", progressId);
        
        StudentLessonProgress progress = progressRepository.findById(progressId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Lesson progress not found with ID: " + progressId
                ));
        
        LessonProgressDto dto = LessonProgressDto.fromEntity(progress);
        
        log.info("✅ Successfully fetched progress {} for subject: {}, topic: {}", 
                progressId, dto.subjectName(), dto.lessonTitle());
        
        return ResponseEntity.ok(dto);
    }

    /**
     * ✅ FIXED: Start assessment for a lesson progress
     * Creates or retrieves the assessment instance for the student
     */
    @PostMapping("/{progressId}/start-assessment")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Start assessment", 
               description = "Initialize assessment for this progress record")
    public ResponseEntity<Map<String, Object>> startAssessment(
            @PathVariable Long progressId,
            Authentication auth) {

        log.info("🚀 Starting assessment for progress ID: {}", progressId);

        // Get the progress record
        StudentLessonProgress progress = progressRepository.findById(progressId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Lesson progress not found: " + progressId
                ));

        // Verify the student owns this progress
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        StudentProfile student = studentProfileService.getStudentProfile(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        if (!progress.getStudentProfile().getId().equals(student.getId())) {
            throw new IllegalArgumentException("This progress record does not belong to you");
        }

        // ✅ CRITICAL FIX: Check if lessonTopic exists
        if (progress.getLessonTopic() == null) {
            log.error("❌ LessonTopic is null for progress ID: {}. Student: {}, Subject: {}, Date: {}, Period: {}", 
                    progressId,
                    student.getId(),
                    progress.getSubject() != null ? progress.getSubject().getName() : "null",
                    progress.getScheduledDate(),
                    progress.getPeriodNumber());
            
            // Check if this is an INDIVIDUAL student
            if (student.getStudentType() == com.edu.platform.model.enums.StudentType.INDIVIDUAL) {
                throw new IllegalStateException(
                        "This lesson has not been assigned a topic yet. " +
                        "Your INDIVIDUAL timetable schedule needs content assignment. " +
                        "Please contact your administrator to assign lesson materials for: " +
                        (progress.getSubject() != null ? progress.getSubject().getName() : "this subject") +
                        " on " + progress.getScheduledDate()
                );
            } else {
                throw new IllegalStateException(
                        "This lesson has not been assigned a topic yet. " +
                        "Please contact your administrator to assign lesson content for this time slot."
                );
            }
        }

        LocalDateTime now = LocalDateTime.now();

        // ✅ Validate assessment window is open
        if (now.isAfter(progress.getAssessmentWindowEnd())) {
            throw new IllegalStateException("Assessment window has closed");
        }

        // ✅ Build response with null-safe access
        Map<String, Object> response = new HashMap<>();
        response.put("progressId", progress.getId());
        response.put("lessonTopicId", progress.getLessonTopic().getId());
        response.put("lessonTopicTitle", progress.getLessonTopic().getTitle());
        response.put("subjectName", progress.getSubject() != null ? progress.getSubject().getName() : "Unknown");
        response.put("assessmentWindowStart", progress.getAssessmentWindowStart());
        response.put("assessmentWindowEnd", progress.getAssessmentWindowEnd());
        response.put("gracePeriodEnd", progress.getAssessmentWindowEnd());
        response.put("assessmentAccessible", progress.isAssessmentAccessible());
        response.put("message", "Assessment ready to start");

        log.info("✅ Assessment ready for progress {}, lessonTopicId: {}, topic: {}", 
                progressId, 
                progress.getLessonTopic().getId(),
                progress.getLessonTopic().getTitle());

        return ResponseEntity.ok(response);
    }
    
    

/**
 * ✅ NEW: DIAGNOSTIC ENDPOINT - Get progress by student and lesson topic
 * Used by the Assessment Diagnostic Tool to check progress records
 */
@GetMapping("/student/{studentId}/lesson-topic/{lessonTopicId}")
@PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
@Operation(summary = "Get progress by student and lesson topic (diagnostic)", 
           description = "Get student's progress record for a specific lesson topic - used for diagnostics")
public ResponseEntity<Map<String, Object>> getProgressByStudentAndLesson(
        @PathVariable Long studentId,
        @PathVariable Long lessonTopicId) {
    
    log.info("🔍 DIAGNOSTIC: Getting progress for student {} lesson topic {}", 
        studentId, lessonTopicId);
    
    try {
        // Find progress records matching student and lesson topic
        List<StudentLessonProgress> progressList = progressRepository
            .findByStudentProfileIdAndLessonTopicId(studentId, lessonTopicId);
        
        if (progressList.isEmpty()) {
            log.warn("❌ No progress found for student {} lesson topic {}", 
                studentId, lessonTopicId);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Progress not found");
            errorResponse.put("message", "No progress record exists for this student and lesson topic");
            errorResponse.put("studentId", studentId);
            errorResponse.put("lessonTopicId", lessonTopicId);
            errorResponse.put("found", false);
            
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
        }
        
        // Get the most recent progress record
        StudentLessonProgress progress = progressList.stream()
            .sorted((p1, p2) -> {
                int dateCompare = p2.getScheduledDate().compareTo(p1.getScheduledDate());
                if (dateCompare != 0) return dateCompare;
                return Integer.compare(p2.getPeriodNumber(), p1.getPeriodNumber());
            })
            .findFirst()
            .orElseThrow();
        
        // Build detailed response
        Map<String, Object> response = new HashMap<>();
        response.put("id", progress.getId());
        response.put("studentProfileId", progress.getStudentProfile().getId());
        response.put("lessonTopicId", progress.getLessonTopic() != null ? progress.getLessonTopic().getId() : null);
        response.put("assessmentId", progress.getAssessment() != null ? progress.getAssessment().getId() : null);
        //response.put("status", progress.getStatus());
        response.put("assessmentAccessible", progress.isAssessmentAccessible());
        response.put("scheduledDate", progress.getScheduledDate());
        response.put("periodNumber", progress.getPeriodNumber());
        response.put("createdAt", progress.getCreatedAt());
        //response.put("updatedAt", progress.getUpdatedAt());
        
        // Lesson topic details
        if (progress.getLessonTopic() != null) {
            response.put("topicTitle", progress.getLessonTopic().getTopicTitle());
        }
        
        // Subject details
        if (progress.getSubject() != null) {
            response.put("subjectName", progress.getSubject().getName());
            response.put("subjectId", progress.getSubject().getId());
        }
        
        // Assessment details
        if (progress.getAssessment() != null) {
            Map<String, Object> assessmentInfo = new HashMap<>();
            assessmentInfo.put("id", progress.getAssessment().getId());
            assessmentInfo.put("title", progress.getAssessment().getTitle());
            assessmentInfo.put("totalMarks", progress.getAssessment().getTotalMarks());
            assessmentInfo.put("passingMarks", progress.getAssessment().getPassingMarks());
            assessmentInfo.put("published", progress.getAssessment().isPublished());
            response.put("assessment", assessmentInfo);
        }
        
        // Diagnostic info
        Map<String, Object> diagnostic = new HashMap<>();
        diagnostic.put("hasAssessment", progress.getAssessment() != null);
        diagnostic.put("assessmentAccessible", progress.isAssessmentAccessible());
        //diagnostic.put("status", progress.getStatus());
        diagnostic.put("hasLessonTopic", progress.getLessonTopic() != null);
        diagnostic.put("totalRecordsFound", progressList.size());
        response.put("diagnostic", diagnostic);
        
        log.info("✅ Found progress record {} for student {} lesson topic {}", 
            progress.getId(), studentId, lessonTopicId);
        
        return ResponseEntity.ok(response);
        
    } catch (Exception e) {
        log.error("❌ Error fetching progress for student {} lesson topic {}: {}", 
            studentId, lessonTopicId, e.getMessage(), e);
        
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("error", "Server error");
        errorResponse.put("message", e.getMessage());
        errorResponse.put("studentId", studentId);
        errorResponse.put("lessonTopicId", lessonTopicId);
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }
}
}
