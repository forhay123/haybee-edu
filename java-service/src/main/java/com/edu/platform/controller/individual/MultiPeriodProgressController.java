package com.edu.platform.controller.individual;

import com.edu.platform.dto.ApiResponse;
import com.edu.platform.model.LessonTopic;
import com.edu.platform.model.TeacherProfile;
import com.edu.platform.model.User;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.assessment.AssessmentAnswerRepository;
import com.edu.platform.repository.assessment.AssessmentSubmissionRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import com.edu.platform.service.UserService;
import com.edu.platform.service.individual.MultiPeriodDetectionService;
import com.edu.platform.service.individual.PendingAssessmentTracker;
import com.edu.platform.service.individual.PeriodDependencyService;
import com.edu.platform.service.individual.PeriodDependencyService.DependencyCheckResult;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ✅ FIXED: Multi-Period Progress Management
 * ✅ Filters to CURRENT WEEK ONLY (no mixing of weeks)
 * ✅ Filters to TEACHER'S SUBJECTS ONLY
 */
@RestController
@RequestMapping("/individual/multi-period")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Multi-Period Progress", description = "Progress tracking for multi-period lessons")
@SecurityRequirement(name = "bearerAuth")
public class MultiPeriodProgressController {

    private final StudentLessonProgressRepository progressRepository;
    private final MultiPeriodDetectionService multiPeriodDetectionService;
    private final PeriodDependencyService periodDependencyService;
    private final PendingAssessmentTracker pendingAssessmentTracker;
    private final UserService userService;
    private final AssessmentAnswerRepository assessmentAnswerRepository;
    private final AssessmentSubmissionRepository assessmentSubmissionRepository;

    /**
     * ✅ FIXED: GET /api/v1/individual/multi-period/teacher/overview
     * Teacher dashboard: Overview of CURRENT WEEK's multi-period subjects
     * ✅ NOW FILTERS TO TEACHER'S SUBJECTS ONLY
     */
    @GetMapping("/teacher/overview")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Get teacher multi-period overview",
               description = "Dashboard view of current week's multi-period subjects and pending assessments")
    public ResponseEntity<ApiResponse<TeacherMultiPeriodOverview>> getTeacherOverview(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) List<Long> subjectIds) {
        
        try {
            log.info("📊 GET /teacher/overview - User: {}", userDetails.getUsername());

            // ✅ Get user and determine role
            User user = userService.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            // ✅ Check if user has ADMIN role by examining their roles
            boolean isAdmin = user.getRoles().stream()
                    .anyMatch(role -> "ADMIN".equalsIgnoreCase(role.getName()));
            
            // ✅ FIXED: Declare as final and initialize conditionally
            final Set<String> teacherSubjectNames;
            
            // ✅ If TEACHER (not admin), get their subjects
            if (!isAdmin) {
                TeacherProfile teacherProfile = user.getTeacherProfile();
                if (teacherProfile == null) {
                    return ResponseEntity.badRequest()
                            .body(ApiResponse.error("Teacher profile not found"));
                }
                
                // Parse teacher's subjects from specialization string
                teacherSubjectNames = new HashSet<>(
                    Arrays.asList(teacherProfile.getSpecialization().split(", "))
                );
                
                log.info("👨‍🏫 TEACHER mode: {} subjects", teacherSubjectNames.size());
            } else {
                // ✅ For admin, create empty set (won't be used in filtering)
                teacherSubjectNames = new HashSet<>();
                log.info("👑 ADMIN mode: Can see ALL subjects");
            }

            // ✅ Calculate current week
            LocalDate today = LocalDate.now();
            LocalDate weekStart = today.with(DayOfWeek.MONDAY);
            LocalDate weekEnd = weekStart.plusDays(6);
            
            log.info("🗓️ Filtering to current week: {} to {}", weekStart, weekEnd);

            // ✅ Get ONLY current week's multi-period progress
            List<StudentLessonProgress> allProgress = progressRepository.findAll().stream()
                    .filter(p -> p.getTotalPeriodsInSequence() != null 
                            && p.getTotalPeriodsInSequence() > 1)
                    // ✅ CONDITIONAL: Apply teacher subject filter ONLY if not admin
                    .filter(p -> {
                        if (isAdmin) {
                            return true; // Admin sees everything
                        }
                        // Teacher filter
                        return p.getSubject() != null 
                                && teacherSubjectNames.contains(p.getSubject().getName());
                    })
                    // Filter to current week ONLY
                    .filter(p -> p.getScheduledDate() != null 
                            && !p.getScheduledDate().isBefore(weekStart)
                            && !p.getScheduledDate().isAfter(weekEnd))
                    // Apply optional subject filter if provided
                    .filter(p -> subjectIds == null || subjectIds.isEmpty() 
                            || (p.getSubjectId() != null && subjectIds.contains(p.getSubjectId())))
                    .collect(Collectors.toList());

            log.info("📚 Found {} multi-period progress records in current week", allProgress.size());

            // ✅ Group by subject first, then build subject overviews
            Map<Long, List<StudentLessonProgress>> progressBySubject = allProgress.stream()
                    .filter(p -> p.getSubject() != null && p.getSubjectId() != null)
                    .collect(Collectors.groupingBy(StudentLessonProgress::getSubjectId));

            log.info("📊 Grouped into {} subjects", progressBySubject.size());

            // ✅ Build subject overviews with actual data
            List<SubjectOverviewDto> subjectOverviews = new ArrayList<>();
            
            for (Map.Entry<Long, List<StudentLessonProgress>> entry : progressBySubject.entrySet()) {
                Long subjectId = entry.getKey();
                List<StudentLessonProgress> subjectProgress = entry.getValue();
                
                // Get subject name from first progress record
                String subjectName = subjectProgress.get(0).getSubject().getName();
                
                // Count unique students in this subject
                int studentCount = (int) subjectProgress.stream()
                        .map(p -> p.getStudentProfile().getId())
                        .distinct()
                        .count();
                
                // Count periods and completion
                int totalPeriods = subjectProgress.size();
                int completedPeriods = (int) subjectProgress.stream()
                        .filter(StudentLessonProgress::isCompleted)
                        .count();
                
                // Count pending assessments for this subject
                int pendingAssessments = (int) subjectProgress.stream()
                        .filter(p -> Boolean.TRUE.equals(p.getRequiresCustomAssessment()) 
                                && p.getAssessment() == null)
                        .count();
                
                // ✅ Build student summaries for this subject
                Map<Long, List<StudentLessonProgress>> studentProgressMap = subjectProgress.stream()
                        .collect(Collectors.groupingBy(p -> p.getStudentProfile().getId()));
                
                List<StudentPeriodSummary> studentSummaries = new ArrayList<>();
                
                for (Map.Entry<Long, List<StudentLessonProgress>> studentEntry : studentProgressMap.entrySet()) {
                    Long studentId = studentEntry.getKey();
                    List<StudentLessonProgress> studentPeriods = studentEntry.getValue();
                    
                    String studentName = studentPeriods.get(0).getStudentProfile().getUser().getFullName();
                    int studentTotalPeriods = studentPeriods.size();
                    int studentCompletedPeriods = (int) studentPeriods.stream()
                            .filter(StudentLessonProgress::isCompleted)
                            .count();
                    int studentPendingAssessments = (int) studentPeriods.stream()
                            .filter(p -> Boolean.TRUE.equals(p.getRequiresCustomAssessment()) 
                                    && p.getAssessment() == null)
                            .count();
                    double studentCompletionRate = studentTotalPeriods > 0 
                            ? ((double) studentCompletedPeriods / studentTotalPeriods) * 100 
                            : 0.0;
                    
                    // Build period details
                    List<PeriodDetail> periodDetails = studentPeriods.stream()
                            .sorted(Comparator.comparing(StudentLessonProgress::getPeriodSequence,
                                    Comparator.nullsLast(Comparator.naturalOrder())))
                            .map(p -> {
                                String status;
                                if (p.isCompleted()) {
                                    status = "COMPLETED";
                                } else if (p.needsTeacherAssessment()) {
                                    status = "WAITING_ASSESSMENT";
                                } else {
                                    DependencyCheckResult accessCheck = periodDependencyService.checkAccess(p);
                                    if (accessCheck.canAccess()) {
                                        status = "AVAILABLE";
                                    } else {
                                        status = "LOCKED";
                                    }
                                }
                                
                                // Fetch submission stats if completed
                                Integer totalQuestions = null;
                                Integer correctAnswers = null;
                                Integer incorrectAnswers = null;
                                Integer pendingGrading = null;
                                Double percentage = null;
                                Boolean passed = null;
                                String submittedAt = null;
                                Boolean graded = null;
                                List<String> weakTopics = new ArrayList<>();
                                
                                if (p.isCompleted() && p.getAssessmentSubmissionId() != null) {
                                    try {
                                        var submissionOpt = assessmentSubmissionRepository.findById(p.getAssessmentSubmissionId());
                                        if (submissionOpt.isPresent()) {
                                            var submission = submissionOpt.get();
                                            
                                            // ✅ FIX: Query answers separately to avoid lazy loading issues
                                            var answers = assessmentAnswerRepository.findBySubmissionId(p.getAssessmentSubmissionId());
                                            
                                            if (!answers.isEmpty()) {
                                                totalQuestions = answers.size();
                                                correctAnswers = (int) answers.stream()
                                                        .filter(a -> Boolean.TRUE.equals(a.getIsCorrect()))
                                                        .count();
                                                pendingGrading = (int) answers.stream()
                                                        .filter(a -> a.getMarksObtained() == null)
                                                        .count();
                                                incorrectAnswers = totalQuestions - correctAnswers - pendingGrading;
                                                
                                                percentage = submission.getPercentage();
                                                passed = submission.getPassed();
                                                submittedAt = submission.getSubmittedAt() != null ? 
                                                        submission.getSubmittedAt().toString() : null;
                                                graded = submission.getGraded();
                                                
                                                // Check for weak topics
                                                if (p.getAssessment() != null && p.getAssessment().getLessonTopic() != null) {
                                                    double successRate = totalQuestions > 0 ? 
                                                            (double) correctAnswers / totalQuestions * 100 : 0.0;
                                                    if (successRate < 70.0) {
                                                        weakTopics.add(p.getAssessment().getLessonTopic().getTopicTitle());
                                                    }
                                                }
                                            } else {
                                                // ✅ No answers found - log warning but don't fail
                                                log.warn("⚠️ Submission {} has no answers", p.getAssessmentSubmissionId());
                                            }
                                        }
                                    } catch (Exception e) {
                                        log.warn("⚠️ Could not fetch submission details: {}", e.getMessage());
                                    }
                                }
                                
                                PeriodDetail detail = new PeriodDetail();
                                detail.setProgressId(p.getId());
                                detail.setPeriodNumber(p.getPeriodSequence());
                                detail.setStatus(status);
                                detail.setScore(p.getAssessmentScoreAsDouble());
                                detail.setScheduledDate(p.getScheduledDate() != null ? p.getScheduledDate().toString() : null);
                                detail.setCompletedAt(p.getCompletedAt() != null ? p.getCompletedAt().toString() : null);
                                detail.setAssessmentId(p.getAssessment() != null ? p.getAssessment().getId() : null);
                                detail.setAssessmentTitle(p.getAssessment() != null ? p.getAssessment().getTitle() : null);
                                detail.setSubmissionId(p.getAssessmentSubmissionId());
                                detail.setCanAccess(p.isAssessmentAccessible());
                                detail.setBlockingReason(periodDependencyService.checkAccess(p).getBlockingReason());
                                detail.setRequiresCustomAssessment(p.getRequiresCustomAssessment());
                             // ✅ FIXED: Check if custom assessment is actually created when required
                                if (Boolean.TRUE.equals(p.getRequiresCustomAssessment())) {
                                    detail.setAssessmentCreated(p.getAssessment() != null);  // ← FIX: Check assessment directly
                                } else {
                                    detail.setAssessmentCreated(p.getAssessment() != null);
                                }
                                detail.setTotalQuestions(totalQuestions);
                                detail.setCorrectAnswers(correctAnswers);
                                detail.setIncorrectAnswers(incorrectAnswers);
                                detail.setPendingGrading(pendingGrading);
                                detail.setPercentage(percentage);
                                detail.setPassed(passed);
                                detail.setSubmittedAt(submittedAt);
                                detail.setGraded(graded);
                                detail.setWeakTopics(weakTopics);
                                
                                return detail;
                            })
                            .collect(Collectors.toList());
                    
                    studentSummaries.add(StudentPeriodSummary.builder()
                            .studentId(studentId)
                            .studentName(studentName)
                            .totalPeriods(studentTotalPeriods)
                            .completedPeriods(studentCompletedPeriods)
                            .pendingAssessments(studentPendingAssessments)
                            .completionRate(studentCompletionRate)
                            .periods(periodDetails)
                            .build());
                }
                
                // Sort students by name
                studentSummaries.sort(Comparator.comparing(StudentPeriodSummary::getStudentName));
                
                // Calculate average completion for subject
                double averageCompletion = studentSummaries.stream()
                        .mapToDouble(StudentPeriodSummary::getCompletionRate)
                        .average()
                        .orElse(0.0);
                
                SubjectOverviewDto subjectOverview = SubjectOverviewDto.builder()
                        .subjectId(subjectId)
                        .subjectName(subjectName)
                        .studentCount(studentCount)
                        .totalPeriods(totalPeriods)
                        .completedPeriods(completedPeriods)
                        .pendingAssessments(pendingAssessments)
                        .averageCompletion(averageCompletion)
                        .students(studentSummaries)
                        .build();
                
                subjectOverviews.add(subjectOverview);
                
                log.info("✅ Subject {}: {} students, {} periods, {}% completion", 
                        subjectName, studentCount, totalPeriods, String.format("%.1f", averageCompletion));
            }
            
            // Sort subjects by name
            subjectOverviews.sort(Comparator.comparing(SubjectOverviewDto::getSubjectName));

            // Calculate overall statistics
            int totalStudents = (int) allProgress.stream()
                    .map(p -> p.getStudentProfile().getId())
                    .distinct()
                    .count();
            
            int totalPeriods = allProgress.size();
            int completedPeriods = (int) allProgress.stream()
                    .filter(StudentLessonProgress::isCompleted)
                    .count();

            // Get pending assessments
            List<PendingAssessmentTracker.PendingAssessmentInfo> pending = 
                    subjectIds != null && !subjectIds.isEmpty() ?
                    pendingAssessmentTracker.getPendingAssessmentsBySubjects(subjectIds) :
                    pendingAssessmentTracker.getAllPendingAssessments();

            TeacherMultiPeriodOverview overview = TeacherMultiPeriodOverview.builder()
                    .totalStudents(totalStudents)
                    .totalPeriods(totalPeriods)
                    .completedPeriods(completedPeriods)
                    .pendingAssessments(pending.size())
                    .subjectOverviews(subjectOverviews)
                    .build();

            String accessLevel = isAdmin ? "ALL SUBJECTS (ADMIN)" : "TEACHER'S SUBJECTS ONLY";
            log.info("✅ Overview (CURRENT WEEK, {}): {} students, {} periods, {} subjects, {} pending",
                    accessLevel, totalStudents, totalPeriods, subjectOverviews.size(), pending.size());

            return ResponseEntity.ok(ApiResponse.success(
                    "Multi-period overview retrieved successfully",
                    overview
            ));

        } catch (Exception e) {
            log.error("❌ Error fetching teacher overview: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to fetch overview: " + e.getMessage()));
        }
    }


    /**
     * ✅ GET /api/v1/individual/multi-period/teacher/students/{studentId}/subjects/{subjectId}/periods
     * Get all periods for one student/subject combination (timeline view)
     * ✅ FIXED: Only show CURRENT WEEK's periods (not mixing weeks)
     */
    @GetMapping("/teacher/students/{studentId}/subjects/{subjectId}/periods")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Get student subject period timeline",
               description = "View all periods for a specific student and subject in current week")
    public ResponseEntity<ApiResponse<StudentSubjectPeriodsDto>> getStudentSubjectPeriods(
            @PathVariable Long studentId,
            @PathVariable Long subjectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        try {
            log.info("📋 GET /teacher/students/{}/subjects/{}/periods - Teacher: {}",
                    studentId, subjectId, userDetails.getUsername());

            // ✅ Get current week
            LocalDate today = LocalDate.now();
            LocalDate weekStart = today.with(java.time.DayOfWeek.MONDAY);
            LocalDate weekEnd = weekStart.plusDays(6);

            log.info("🗓️ Filtering to current week: {} to {}", weekStart, weekEnd);

            // ✅ Get periods ONLY for current week
            List<StudentLessonProgress> periods = progressRepository
                    .findByStudentProfileIdAndSubjectId(studentId, subjectId).stream()
                    .filter(p -> p.getTotalPeriodsInSequence() != null 
                            && p.getTotalPeriodsInSequence() > 1)
                    // ✅ Filter to current week only
                    .filter(p -> p.getScheduledDate() != null 
                            && !p.getScheduledDate().isBefore(weekStart)
                            && !p.getScheduledDate().isAfter(weekEnd))
                    .sorted(Comparator.comparing(StudentLessonProgress::getPeriodSequence, 
                            Comparator.nullsLast(Comparator.naturalOrder())))
                    .collect(Collectors.toList());

            if (periods.isEmpty()) {
                log.info("❌ No multi-period lessons found for current week");
                return ResponseEntity.ok(ApiResponse.success(
                        "No multi-period lessons found for this student/subject in current week",
                        null
                ));
            }

            log.info("✅ Found {} periods in current week", periods.size());

            // Build period DTOs
            List<PeriodProgressDto> periodDtos = periods.stream()
                    .map(this::convertToPeriodDto)
                    .collect(Collectors.toList());

            // Calculate statistics
            int completedCount = (int) periods.stream()
                    .filter(StudentLessonProgress::isCompleted)
                    .count();
            int pendingAssessmentCount = (int) periods.stream()
                    .filter(p -> Boolean.TRUE.equals(p.getRequiresCustomAssessment()) 
                            && p.getAssessment() == null)
                    .count();

            StudentSubjectPeriodsDto result = StudentSubjectPeriodsDto.builder()
                    .studentId(studentId)
                    .studentName(periods.get(0).getStudentProfile().getUser().getFullName())
                    .subjectId(subjectId)
                    .subjectName(periods.get(0).getSubject().getName())
                    .totalPeriods(periods.size())
                    .completedPeriods(completedCount)
                    .pendingAssessments(pendingAssessmentCount)
                    .periods(periodDtos)
                    .build();

            log.info("✅ Current week: {} periods ({} completed, {} pending assessments)",
                    periods.size(), completedCount, pendingAssessmentCount);

            return ResponseEntity.ok(ApiResponse.success(
                    "Period timeline retrieved successfully",
                    result
            ));

        } catch (Exception e) {
            log.error("❌ Error fetching student subject periods: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to fetch periods: " + e.getMessage()));
        }
    }
    

    /**
     * ✅ GET /api/v1/individual/multi-period/admin/system-overview
     * Admin view: System-wide multi-period statistics
     */
    @GetMapping("/admin/system-overview")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get system-wide multi-period overview",
               description = "Admin dashboard showing all multi-period lessons across system")
    public ResponseEntity<ApiResponse<SystemMultiPeriodStats>> getSystemOverview(
            @AuthenticationPrincipal UserDetails userDetails) {
        
        try {
            log.info("🔧 GET /admin/system-overview - Admin: {}", userDetails.getUsername());

            // Get all multi-period progress
            List<StudentLessonProgress> allProgress = progressRepository.findAll().stream()
                    .filter(p -> p.getTotalPeriodsInSequence() != null 
                            && p.getTotalPeriodsInSequence() > 1)
                    .collect(Collectors.toList());

            // Calculate system-wide statistics
            int totalStudents = (int) allProgress.stream()
                    .map(p -> p.getStudentProfile().getId())
                    .distinct()
                    .count();

            int totalSubjects = (int) allProgress.stream()
                    .map(StudentLessonProgress::getSubjectId)
                    .filter(Objects::nonNull)
                    .distinct()
                    .count();

            int totalPeriods = allProgress.size();
            
            int completedPeriods = (int) allProgress.stream()
                    .filter(StudentLessonProgress::isCompleted)
                    .count();

            int waitingForAssessment = (int) allProgress.stream()
                    .filter(p -> Boolean.TRUE.equals(p.getRequiresCustomAssessment()) 
                            && p.getAssessment() == null)
                    .count();

            int blockedByDependency = (int) allProgress.stream()
                    .filter(p -> !p.isCompleted() 
                            && p.hasPreviousPeriod() 
                            && !p.isPreviousPeriodCompleted())
                    .count();

            SystemMultiPeriodStats stats = SystemMultiPeriodStats.builder()
                    .totalStudents(totalStudents)
                    .totalSubjects(totalSubjects)
                    .totalPeriods(totalPeriods)
                    .completedPeriods(completedPeriods)
                    .waitingForCustomAssessment(waitingForAssessment)
                    .blockedByDependency(blockedByDependency)
                    .completionRate(totalPeriods > 0 ? 
                            (double) completedPeriods / totalPeriods * 100 : 0.0)
                    .build();

            log.info("✅ System stats: {} students, {} subjects, {} periods",
                    totalStudents, totalSubjects, totalPeriods);

            return ResponseEntity.ok(ApiResponse.success(
                    "System overview retrieved successfully",
                    stats
            ));

        } catch (Exception e) {
            log.error("❌ Error fetching system overview: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to fetch system overview: " + e.getMessage()));
        }
    }

    /**
     * ✅ GET /api/v1/individual/multi-period/student/my-periods/{subjectId}
     * Student's view of their own multi-period progress
     */
    @GetMapping("/student/my-periods/{subjectId}")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Get student's own period progress",
               description = "Student view of their multi-period lessons for a subject")
    public ResponseEntity<ApiResponse<StudentPeriodsViewDto>> getMyPeriods(
            @PathVariable Long subjectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        try {
            log.info("👤 GET /student/my-periods/{} - Student: {}",
                    subjectId, userDetails.getUsername());

            User student = userService.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            if (student.getStudentProfile() == null) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Student profile not found"));
            }
            
            // Get student's periods for this subject
            List<StudentLessonProgress> periods = progressRepository
                    .findByStudentProfileIdAndSubjectId(
                            student.getStudentProfile().getId(), 
                            subjectId)
                    .stream()
                    .filter(p -> p.getTotalPeriodsInSequence() != null 
                            && p.getTotalPeriodsInSequence() > 1)
                    .sorted(Comparator.comparing(StudentLessonProgress::getPeriodSequence,
                            Comparator.nullsLast(Comparator.naturalOrder())))
                    .collect(Collectors.toList());

            if (periods.isEmpty()) {
                return ResponseEntity.ok(ApiResponse.success(
                        "No multi-period lessons found for this subject",
                        null
                ));
            }

            // Build student-friendly view
            List<StudentPeriodDto> periodDtos = periods.stream()
                    .map(this::convertToStudentPeriodDto)
                    .collect(Collectors.toList());

            // Find next accessible period
            StudentLessonProgress nextAccessible = periodDependencyService
                    .getNextAccessiblePeriod(
                            student.getStudentProfile().getId(),
                            subjectId,
                            periods.get(0).getTopicId()
                    );

            StudentPeriodsViewDto view = StudentPeriodsViewDto.builder()
                    .subjectId(subjectId)
                    .subjectName(periods.get(0).getSubject().getName())
                    .topicName(periods.get(0).getTopic() != null ? 
                            periods.get(0).getTopic().getTitle() : null)
                    .totalPeriods(periods.size())
                    .completedPeriods((int) periods.stream()
                            .filter(StudentLessonProgress::isCompleted).count())
                    .nextAccessiblePeriod(nextAccessible != null ? 
                            nextAccessible.getPeriodSequence() : null)
                    .periods(periodDtos)
                    .build();

            log.info("✅ Student view: {} periods, {} completed",
                    periods.size(), view.getCompletedPeriods());

            return ResponseEntity.ok(ApiResponse.success(
                    "Your period progress retrieved successfully",
                    view
            ));

        } catch (Exception e) {
            log.error("❌ Error fetching student periods: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to fetch your periods: " + e.getMessage()));
        }
    }

    // ============================================================
    // DTOs
    // ============================================================

    @Data
    @Builder
    @AllArgsConstructor
    public static class TeacherMultiPeriodOverview {
        private int totalStudents;
        private int totalPeriods;
        private int completedPeriods;
        private int pendingAssessments;
        private List<SubjectOverviewDto> subjectOverviews;
    }
    
	
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PeriodDetail {
        private Long progressId;
        private Integer periodNumber;
        private String status;
        private Double score;
        private String scheduledDate;
        private String completedAt;
        private Long assessmentId;
        private String assessmentTitle;
        private Long submissionId;
        private Boolean canAccess;
        private String blockingReason;
        private Boolean requiresCustomAssessment;
        private Boolean assessmentCreated;
        
        // Submission statistics
        private Integer totalQuestions;
        private Integer correctAnswers;
        private Integer incorrectAnswers;
        private Integer pendingGrading;
        private Double percentage;
        private Boolean passed;
        private String submittedAt;
        private Boolean graded;
        
        // Topic performance
        private List<String> weakTopics;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class SubjectOverviewDto {
        private Long subjectId;
        private String subjectName;
        private int studentCount;
        private int totalPeriods;
        private int completedPeriods;
        private int pendingAssessments;
        private double averageCompletion;
        private List<StudentPeriodSummary> students;
    }
    

	@Data
	@Builder
	@AllArgsConstructor
	public static class StudentPeriodSummary {
	    private Long studentId;
	    private String studentName;
	    private int totalPeriods;
	    private int completedPeriods;
	    private int pendingAssessments;
	    private double completionRate;
	    private List<PeriodDetail> periods;
	}


    @Data
    @Builder
    @AllArgsConstructor
    public static class StudentSubjectPeriodsDto {
        private Long studentId;
        private String studentName;
        private Long subjectId;
        private String subjectName;
        private int totalPeriods;
        private int completedPeriods;
        private int pendingAssessments;
        private List<PeriodProgressDto> periods;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class PeriodProgressDto {
        private Long progressId;
        private Integer periodNumber;
        private String status;
        private LocalDate scheduledDate;
        private LocalDateTime completedAt;
        private Double score;
        private Long assessmentId;
        private String assessmentTitle;
        private Long submissionId;
        private boolean canAccess;
        private String blockingReason;
        private boolean requiresCustomAssessment;
        private boolean assessmentCreated;
        
        private Integer totalQuestions;
        private Integer correctAnswers;
        private Integer incorrectAnswers;
        private Integer pendingGrading;
        private Double percentage;
        private Boolean passed;
        private LocalDateTime submittedAt;
        private Boolean graded;
        
        private List<String> weakTopics;
        private Map<String, TopicPerformance> topicPerformance;
        
        @Data
        @Builder
        @AllArgsConstructor
        @NoArgsConstructor
        public static class TopicPerformance {
            private String topicName;
            private Integer totalQuestions;
            private Integer correctAnswers;
            private Double successRate;
        }
    }
    
 
    @Data
    @Builder
    @AllArgsConstructor
    public static class SystemMultiPeriodStats {
        private int totalStudents;
        private int totalSubjects;
        private int totalPeriods;
        private int completedPeriods;
        private int waitingForCustomAssessment;
        private int blockedByDependency;
        private double completionRate;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class StudentPeriodsViewDto {
        private Long subjectId;
        private String subjectName;
        private String topicName;
        private int totalPeriods;
        private int completedPeriods;
        private Integer nextAccessiblePeriod;
        private List<StudentPeriodDto> periods;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class StudentPeriodDto {
        private Integer periodNumber;
        private String status;
        private String statusMessage;
        private LocalDate scheduledDate;
        private boolean canAccess;
        private Long assessmentId;
        private boolean hasSubmitted;
    }

    // ============================================================
    // HELPER METHODS
    // ============================================================

    private PeriodProgressDto convertToPeriodDto(StudentLessonProgress progress) {
        String status;
        if (progress.isCompleted()) {
            status = "COMPLETED";
        } else if (progress.needsTeacherAssessment()) {
            status = "WAITING_ASSESSMENT";
        } else if (progress.isAssessmentAccessible()) {
            status = "AVAILABLE";
        } else {
            status = "LOCKED";
        }

        PeriodDependencyService.DependencyCheckResult accessCheck = 
                periodDependencyService.checkAccess(progress);

        // Fetch submission stats with topic analysis
        Integer totalQuestions = null;
        Integer correctAnswers = null;
        Integer incorrectAnswers = null;
        Integer pendingGrading = null;
        Double percentage = null;
        Boolean passed = null;
        LocalDateTime submittedAt = null;
        Boolean graded = null;
        List<String> weakTopics = new ArrayList<>();
        Map<String, PeriodProgressDto.TopicPerformance> topicPerformance = new HashMap<>();
        
        if (progress.isCompleted() && progress.getAssessmentSubmissionId() != null) {
            try {
                Long submissionId = progress.getAssessmentSubmissionId();
                
                var submissionOpt = assessmentSubmissionRepository.findById(submissionId);
                
                if (submissionOpt.isPresent()) {
                    var submission = submissionOpt.get();
                    
                    // ✅ FIX: Query answers separately to avoid lazy loading issues
                    var answers = assessmentAnswerRepository.findBySubmissionId(submissionId);
                    
                    if (!answers.isEmpty()) {
                        totalQuestions = answers.size();
                        correctAnswers = (int) answers.stream()
                                .filter(a -> Boolean.TRUE.equals(a.getIsCorrect()))
                                .count();
                        pendingGrading = (int) answers.stream()
                                .filter(a -> a.getMarksObtained() == null)
                                .count();
                        incorrectAnswers = totalQuestions - correctAnswers - pendingGrading;
                        
                        percentage = submission.getPercentage();
                        passed = submission.getPassed();
                        submittedAt = submission.getSubmittedAt();
                        graded = submission.getGraded();
                        
                        if (progress.getAssessment() != null) {
                            LessonTopic assessmentTopic = progress.getAssessment().getLessonTopic();
                            
                            if (assessmentTopic != null) {
                                String topicName = assessmentTopic.getTopicTitle();
                                
                                int topicCorrect = (int) answers.stream()
                                        .filter(a -> Boolean.TRUE.equals(a.getIsCorrect()))
                                        .count();
                                
                                double successRate = totalQuestions > 0 
                                        ? (double) topicCorrect / totalQuestions * 100 
                                        : 0.0;
                                
                                var performance = PeriodProgressDto.TopicPerformance.builder()
                                        .topicName(topicName)
                                        .totalQuestions(totalQuestions)
                                        .correctAnswers(topicCorrect)
                                        .successRate(successRate)
                                        .build();
                                
                                topicPerformance.put(topicName, performance);
                                
                                if (successRate < 70.0) {
                                    weakTopics.add(topicName);
                                }
                            }
                        }
                    } else {
                        log.warn("⚠️ Submission {} has no answers", submissionId);
                    }
                }
            } catch (Exception e) {
                log.warn("⚠️ Could not fetch submission details for progress {}: {}", 
                        progress.getId(), e.getMessage());
            }
        }

        return PeriodProgressDto.builder()
                .progressId(progress.getId())
                .periodNumber(progress.getPeriodSequence())
                .status(status)
                .scheduledDate(progress.getScheduledDate())
                .completedAt(progress.getCompletedAt())
                .score(progress.getAssessmentScoreAsDouble())
                .assessmentId(progress.getAssessment() != null ? 
                        progress.getAssessment().getId() : null)
                .assessmentTitle(progress.getAssessment() != null ? 
                        progress.getAssessment().getTitle() : null)
                .submissionId(progress.getAssessmentSubmissionId())
                .canAccess(accessCheck.canAccess())
                .blockingReason(accessCheck.getBlockingReason())
                .requiresCustomAssessment(Boolean.TRUE.equals(
                        progress.getRequiresCustomAssessment()))
                .assessmentCreated(
                    Boolean.TRUE.equals(progress.getRequiresCustomAssessment()) 
                        ? progress.getCustomAssessmentCreatedAt() != null 
                        : progress.getAssessment() != null
                )
                .totalQuestions(totalQuestions)
                .correctAnswers(correctAnswers)
                .incorrectAnswers(incorrectAnswers)
                .pendingGrading(pendingGrading)
                .percentage(percentage)
                .passed(passed)
                .submittedAt(submittedAt)
                .graded(graded)
                .weakTopics(weakTopics)
                .topicPerformance(topicPerformance)
                .build();
    }


    private StudentPeriodDto convertToStudentPeriodDto(StudentLessonProgress progress) {
        String status;
        String statusMessage;
        
        if (progress.isCompleted()) {
            status = "Completed";
            statusMessage = "Completed on " + progress.getCompletedAt().toLocalDate();
        } else if (progress.needsTeacherAssessment()) {
            status = "Waiting for Teacher";
            statusMessage = "Teacher is preparing your custom assessment";
        } else if (progress.isAssessmentAccessible()) {
            status = "Available";
            statusMessage = "Ready to start";
        } else {
            status = "Locked";
            statusMessage = "Complete previous period first";
        }

        return StudentPeriodDto.builder()
                .periodNumber(progress.getPeriodSequence())
                .status(status)
                .statusMessage(statusMessage)
                .scheduledDate(progress.getScheduledDate())
                .canAccess(periodDependencyService.checkAccess(progress).canAccess())
                .assessmentId(progress.getAssessment() != null ? 
                        progress.getAssessment().getId() : null)
                .hasSubmitted(progress.getAssessmentSubmissionId() != null)
                .build();
    }
}