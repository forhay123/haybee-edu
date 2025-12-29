package com.edu.platform.service.individual;

import com.edu.platform.dto.individual.*;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.model.DailySchedule;
import com.edu.platform.model.LessonTopic;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.DailyScheduleRepository;
import com.edu.platform.repository.StudentProfileRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ✅ SPRINT 8: Service for student dashboard
 * Provides comprehensive view of multi-assessment progress
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class StudentDashboardService {

    private final StudentProfileRepository studentProfileRepository;
    private final DailyScheduleRepository scheduleRepository;
    private final StudentLessonProgressRepository progressRepository;

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("h:mm a");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("MMM dd, yyyy");

    // ============================================================
    // MAIN DASHBOARD VIEWS
    // ============================================================

    /**
     * ✅ Get complete dashboard overview for student
     */
    public Map<String, Object> getDashboardOverview(Long studentProfileId) {
        log.info("📊 Getting dashboard overview for student {}", studentProfileId);

        StudentProfile student = studentProfileRepository.findById(studentProfileId)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        Map<String, Object> dashboard = new HashMap<>();

        // Current week assessments
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(java.time.DayOfWeek.MONDAY);
        LocalDate weekEnd = weekStart.plusDays(6);

        List<DailySchedule> currentWeekSchedules = scheduleRepository
            .findByStudentProfileAndScheduledDateBetweenAndScheduleSourceOrderByScheduledDateAscPeriodNumberAsc(
                student, weekStart, weekEnd, "INDIVIDUAL"
            );

        // Group by lesson topic for multi-assessment view
        Map<Long, List<DailySchedule>> schedulesByTopic = currentWeekSchedules.stream()
            .filter(s -> s.getLessonTopic() != null)
            .collect(Collectors.groupingBy(s -> s.getLessonTopic().getId()));

        List<MultiAssessmentProgressDto> topicProgress = new ArrayList<>();
        for (Map.Entry<Long, List<DailySchedule>> entry : schedulesByTopic.entrySet()) {
            MultiAssessmentProgressDto dto = buildMultiAssessmentProgress(entry.getValue(), student);
            topicProgress.add(dto);
        }

        // Statistics
        int totalAssessments = currentWeekSchedules.size();
        long completedCount = currentWeekSchedules.stream()
            .filter(s -> s.getScheduleStatus() != null 
                    && "COMPLETED".equals(s.getScheduleStatus().name()))
            .count();
        long availableCount = currentWeekSchedules.stream()
            .filter(this::isAssessmentAvailable)
            .count();

        dashboard.put("currentWeek", Map.of(
            "weekNumber", getWeekNumber(weekStart),
            "dateRange", weekStart.format(DATE_FORMAT) + " - " + weekEnd.format(DATE_FORMAT),
            "totalAssessments", totalAssessments,
            "completedAssessments", completedCount,
            "availableAssessments", availableCount,
            "completionPercentage", totalAssessments > 0 ? 
                (completedCount * 100.0 / totalAssessments) : 0.0
        ));

        dashboard.put("topicProgress", topicProgress);
        dashboard.put("upcomingDeadlines", getUpcomingDeadlines(student, 3));
        dashboard.put("recentCompletions", getRecentCompletions(student, 5));

        log.info("✅ Dashboard overview built: {} topics, {} assessments", 
            topicProgress.size(), totalAssessments);

        return dashboard;
    }

    /**
     * ✅ Get multi-assessment progress for a specific lesson topic
     */
    public MultiAssessmentProgressDto getTopicProgress(Long studentProfileId, Long lessonTopicId) {
        log.info("📊 Getting topic progress: student={}, topic={}", studentProfileId, lessonTopicId);

        StudentProfile student = studentProfileRepository.findById(studentProfileId)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        // Get all schedules for this topic
        List<DailySchedule> schedules = scheduleRepository
            .findByStudentProfileOrderByScheduledDateAscPeriodNumberAsc(student)
            .stream()
            .filter(s -> s.getLessonTopic() != null 
                    && s.getLessonTopic().getId().equals(lessonTopicId))
            .collect(Collectors.toList());

        if (schedules.isEmpty()) {
            throw new ResourceNotFoundException("No schedules found for this topic");
        }

        return buildMultiAssessmentProgress(schedules, student);
    }

    /**
     * ✅ Get all lesson topics with completion status
     */
    public List<LessonTopicCompletionDto> getTopicCompletionSummary(Long studentProfileId) {
        log.info("📋 Getting topic completion summary for student {}", studentProfileId);

        StudentProfile student = studentProfileRepository.findById(studentProfileId)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        List<DailySchedule> allSchedules = scheduleRepository
            .findByStudentProfileAndScheduleSourceOrderByScheduledDateAscPeriodNumberAsc(
                student, "INDIVIDUAL"
            );

        // Group by lesson topic
        Map<LessonTopic, List<DailySchedule>> schedulesByTopic = allSchedules.stream()
            .filter(s -> s.getLessonTopic() != null)
            .collect(Collectors.groupingBy(DailySchedule::getLessonTopic));

        return schedulesByTopic.entrySet().stream()
            .map(entry -> buildTopicCompletionDto(entry.getKey(), entry.getValue()))
            .sorted(Comparator.comparing(LessonTopicCompletionDto::getWeekNumber).reversed())
            .collect(Collectors.toList());
    }

    /**
     * ✅ Get assessment availability for a specific period
     */
    public AssessmentAvailabilityDto getAssessmentAvailability(Long scheduleId) {
        log.info("🕒 Checking availability for schedule {}", scheduleId);

        DailySchedule schedule = scheduleRepository.findById(scheduleId)
            .orElseThrow(() -> new ResourceNotFoundException("Schedule not found"));

        return buildAvailabilityDto(schedule);
    }

    /**
     * ✅ Get today's assessments
     */
    public List<AssessmentPeriodDto> getTodaysAssessments(Long studentProfileId) {
        log.info("📅 Getting today's assessments for student {}", studentProfileId);

        StudentProfile student = studentProfileRepository.findById(studentProfileId)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        LocalDate today = LocalDate.now();
        List<DailySchedule> todaySchedules = scheduleRepository
            .findByStudentProfileAndScheduledDateAndScheduleSource(student, today, "INDIVIDUAL");

        return todaySchedules.stream()
            .map(this::buildPeriodDto)
            .sorted(Comparator.comparing(AssessmentPeriodDto::getStartTime))
            .collect(Collectors.toList());
    }

    /**
     * ✅ Get upcoming assessments (next 7 days)
     */
    public List<AssessmentPeriodDto> getUpcomingAssessments(Long studentProfileId, Integer days) {
        log.info("📅 Getting upcoming assessments for student {} ({} days)", 
            studentProfileId, days);

        StudentProfile student = studentProfileRepository.findById(studentProfileId)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        LocalDate today = LocalDate.now();
        LocalDate endDate = today.plusDays(days != null ? days : 7);

        List<DailySchedule> upcomingSchedules = scheduleRepository
            .findByStudentProfileAndScheduledDateBetweenAndScheduleSourceOrderByScheduledDateAscPeriodNumberAsc(
                student, today, endDate, "INDIVIDUAL"
            );

        return upcomingSchedules.stream()
            .map(this::buildPeriodDto)
            .collect(Collectors.toList());
    }

    // ============================================================
    // HELPER METHODS - BUILD DTOs
    // ============================================================

    private MultiAssessmentProgressDto buildMultiAssessmentProgress(
            List<DailySchedule> schedules, StudentProfile student) {
        
        if (schedules.isEmpty()) {
            return null;
        }

        DailySchedule firstSchedule = schedules.get(0);
        LessonTopic topic = firstSchedule.getLessonTopic();

        // Build period DTOs
        List<AssessmentPeriodDto> periodDtos = schedules.stream()
            .map(this::buildPeriodDto)
            .sorted(Comparator.comparing(AssessmentPeriodDto::getPeriodSequence))
            .collect(Collectors.toList());

        // Calculate statistics
        int totalPeriods = schedules.size();
        long completedCount = periodDtos.stream().filter(AssessmentPeriodDto::getCompleted).count();
        long missedCount = periodDtos.stream().filter(AssessmentPeriodDto::getIsMissed).count();
        long pendingCount = totalPeriods - completedCount - missedCount;

        // Calculate average score
        OptionalDouble avgScore = periodDtos.stream()
            .filter(p -> p.getCompleted() && p.getScore() != null)
            .mapToDouble(AssessmentPeriodDto::getScore)
            .average();

        // Determine overall status
        String status;
        if (completedCount == totalPeriods) {
            status = "COMPLETED";
        } else if (completedCount > 0 || missedCount > 0) {
            status = "IN_PROGRESS";
        } else {
            status = "NOT_STARTED";
        }

        // Find next period
        Optional<AssessmentPeriodDto> nextPeriod = periodDtos.stream()
            .filter(p -> !p.getCompleted() && !p.getIsMissed())
            .findFirst();

        return MultiAssessmentProgressDto.builder()
            .lessonTopicId(topic.getId())
            .lessonTopicTitle(topic.getTitle())
            .description(topic.getDescription())
            .weekNumber(topic.getWeekNumber())
            .subjectId(topic.getSubject().getId())
            .subjectName(topic.getSubject().getName())
            .subjectCode(topic.getSubject().getCode())
            .completionStatus(status)
            .completionPercentage((completedCount * 100.0) / totalPeriods)
            .totalPeriods(totalPeriods)
            .completedPeriods((int) completedCount)
            .pendingPeriods((int) pendingCount)
            .missedPeriods((int) missedCount)
            .periods(periodDtos)
            .averageScore(avgScore.isPresent() ? avgScore.getAsDouble() : null)
            .firstPeriodDate(schedules.get(0).getScheduledDate())
            .lastPeriodDate(schedules.get(schedules.size() - 1).getScheduledDate())
            .nextPeriodDate(nextPeriod.map(AssessmentPeriodDto::getScheduledDate).orElse(null))
            .hasUpcomingDeadline(hasDeadlineWithin24Hours(schedules))
            .hasMissedPeriods(missedCount > 0)
            .allPeriodsCompleted(completedCount == totalPeriods)
            .statusMessage(buildStatusMessage(status, completedCount, totalPeriods, missedCount))
            .canStartNextPeriod(nextPeriod.map(AssessmentPeriodDto::getCanStart).orElse(false))
            .nextPeriodScheduleId(nextPeriod.map(AssessmentPeriodDto::getScheduleId).orElse(null))
            .nextPeriodActionUrl(nextPeriod.map(AssessmentPeriodDto::getActionUrl).orElse(null))
            .build();
    }

    private AssessmentPeriodDto buildPeriodDto(DailySchedule schedule) {
        // Get progress record if exists
        Optional<StudentLessonProgress> progressOpt = progressRepository
            .findByStudentProfileAndScheduledDateAndPeriodNumber(
                schedule.getStudentProfile(),
                schedule.getScheduledDate(),
                schedule.getPeriodNumber()
            );

        StudentLessonProgress progress = progressOpt.orElse(null);

        // Calculate window times
        LocalDateTime windowStart = calculateWindowStart(schedule);
        LocalDateTime windowEnd = calculateWindowEnd(schedule);
        LocalDateTime graceDeadline = calculateGraceDeadline(schedule);
        LocalDateTime now = LocalDateTime.now();

        boolean isWindowOpen = now.isAfter(windowStart) && now.isBefore(windowEnd);
        boolean isGracePeriod = now.isAfter(windowEnd) && now.isBefore(graceDeadline);
        long minutesUntilDeadline = ChronoUnit.MINUTES.between(now, windowEnd);

        // Determine status
        String status;
        boolean completed = progress != null && progress.isCompleted(); // ✅ FIXED: Use isCompleted()
        boolean isMissed = progress != null && !completed && now.isAfter(graceDeadline);

        if (completed) {
            status = "COMPLETED";
        } else if (isMissed) {
            status = "MISSED";
        } else if (isGracePeriod) {
            status = "GRACE_PERIOD";
        } else if (isWindowOpen) {
            status = "AVAILABLE";
        } else if (now.isBefore(windowStart)) {
            status = "PENDING";
        } else {
            status = "EXPIRED";
        }

        // Build period DTO
        return AssessmentPeriodDto.builder()
            .scheduleId(schedule.getId())
            .progressId(progress != null ? progress.getId() : null)
            .periodSequence(schedule.getPeriodSequence())
            .totalPeriodsInSequence(schedule.getTotalPeriodsForTopic())
            .scheduledDate(schedule.getScheduledDate())
            .dayOfWeek(schedule.getScheduledDate().getDayOfWeek().toString())
            .startTime(schedule.getStartTime())
            .endTime(schedule.getEndTime())
            .timeSlot(formatTimeSlot(schedule.getStartTime(), schedule.getEndTime()))
            .periodNumber(schedule.getPeriodNumber())
            .windowStart(windowStart)
            .windowEnd(windowEnd)
            .graceDeadline(graceDeadline)
            .isWindowOpen(isWindowOpen)
            .isGracePeriodActive(isGracePeriod)
            .minutesUntilDeadline((int) minutesUntilDeadline)
            .status(status)
            .completed(completed)
            .completedAt(progress != null ? progress.getCompletedAt() : null)
            .submittedAt(progress != null ? progress.getCompletedAt() : null) // ✅ FIXED: Use completedAt as submittedAt
            .assessmentTitle(schedule.getLessonTopic() != null ? 
                schedule.getLessonTopic().getTitle() : "Assessment")
            .score(progress != null && progress.getAssessmentScore() != null ? 
                progress.getAssessmentScore().doubleValue() : null) // ✅ FIXED: Convert BigDecimal to Double
            .isMissed(isMissed)
            .incompleteReason(progress != null ? progress.getIncompleteReason() : null)
            .markedIncompleteAt(progress != null ? progress.getAutoMarkedIncompleteAt() : null)
            .canStart(isWindowOpen && !completed)
            .actionUrl(buildActionUrl(schedule, status))
            .actionLabel(buildActionLabel(status))
            .statusIcon(getStatusIcon(status))
            .statusColor(getStatusColor(status))
            .progressLabel(buildProgressLabel(status, progress))
            .build();
    }

    private LessonTopicCompletionDto buildTopicCompletionDto(
            LessonTopic topic, List<DailySchedule> schedules) {
        
        int totalPeriods = schedules.size();
        long completedCount = schedules.stream()
            .filter(s -> s.getScheduleStatus() != null && 
                        "COMPLETED".equals(s.getScheduleStatus().name()))
            .count();

        // Calculate average score - ✅ FIXED: Explicit type specification
        List<StudentLessonProgress> progressRecords = schedules.stream()
            .map(s -> progressRepository.findByStudentProfileAndScheduledDateAndPeriodNumber(
                s.getStudentProfile(), s.getScheduledDate(), s.getPeriodNumber()))
            .filter(Optional::isPresent)
            .map(Optional::get)
            .collect(Collectors.toList());

        OptionalDouble avgScore = progressRecords.stream()
            .filter(p -> p.isCompleted() && p.getAssessmentScore() != null) // ✅ FIXED: Use isCompleted()
            .mapToDouble(p -> p.getAssessmentScore().doubleValue())
            .average();

        String status = completedCount == totalPeriods ? "COMPLETED" :
                       completedCount > 0 ? "IN_PROGRESS" : "NOT_STARTED";

        return LessonTopicCompletionDto.builder()
            .lessonTopicId(topic.getId())
            .topicTitle(topic.getTitle())
            .weekNumber(topic.getWeekNumber())
            .subjectId(topic.getSubject().getId())
            .subjectName(topic.getSubject().getName())
            .completionStatus(status)
            .completionPercentage((completedCount * 100.0) / totalPeriods)
            .totalPeriods(totalPeriods)
            .completedPeriods((int) completedCount)
            .averageScore(avgScore.isPresent() ? avgScore.getAsDouble() : null)
            .isFullyCompleted(completedCount == totalPeriods)
            .statusBadge(status)
            .statusColor(getStatusColor(status))
            .progressBar(String.format("%d/%d", completedCount, totalPeriods))
            .build();
    }


    private AssessmentAvailabilityDto buildAvailabilityDto(DailySchedule schedule) {
        LocalDateTime windowStart = calculateWindowStart(schedule);
        LocalDateTime windowEnd = calculateWindowEnd(schedule);
        LocalDateTime graceDeadline = calculateGraceDeadline(schedule);
        LocalDateTime now = LocalDateTime.now();

        boolean isAvailable = now.isAfter(windowStart) && now.isBefore(windowEnd);
        boolean isExpired = now.isAfter(graceDeadline);
        boolean isInGracePeriod = now.isAfter(windowEnd) && now.isBefore(graceDeadline);

        String status;
        if (isExpired) {
            status = "EXPIRED";
        } else if (isInGracePeriod) {
            status = "GRACE_PERIOD";
        } else if (isAvailable) {
            status = "AVAILABLE";
        } else if (now.isBefore(windowStart)) {
            status = "NOT_YET_AVAILABLE";
        } else {
            status = "DEADLINE_APPROACHING";
        }

        return AssessmentAvailabilityDto.builder()
            .scheduleId(schedule.getId())
            .subjectName(schedule.getSubject().getName())
            .lessonTopicTitle(schedule.getLessonTopic() != null ? 
                schedule.getLessonTopic().getTitle() : "Assessment")
            .windowStart(windowStart)
            .windowEnd(windowEnd)
            .graceDeadline(graceDeadline)
            .currentTime(now)
            .availabilityStatus(status)
            .isAvailable(isAvailable)
            .isExpired(isExpired)
            .isInGracePeriod(isInGracePeriod)
            .minutesUntilDeadline(ChronoUnit.MINUTES.between(now, windowEnd))
            .statusMessage(buildAvailabilityMessage(status, windowStart, windowEnd))
            .statusColor(getStatusColor(status))
            .build();
    }

    // ============================================================
    // HELPER METHODS - CALCULATIONS
    // ============================================================

    private LocalDateTime calculateWindowStart(DailySchedule schedule) {
        // 30 minutes before period start
        return LocalDateTime.of(schedule.getScheduledDate(), 
            schedule.getStartTime().minusMinutes(30));
    }

    private LocalDateTime calculateWindowEnd(DailySchedule schedule) {
        // 2 hours after period end
        return LocalDateTime.of(schedule.getScheduledDate(), 
            schedule.getEndTime().plusHours(2));
    }

    private LocalDateTime calculateGraceDeadline(DailySchedule schedule) {
        // 2 hours + 5 minutes grace
        return calculateWindowEnd(schedule).plusMinutes(5);
    }

    private boolean isAssessmentAvailable(DailySchedule schedule) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime windowStart = calculateWindowStart(schedule);
        LocalDateTime windowEnd = calculateWindowEnd(schedule);
        return now.isAfter(windowStart) && now.isBefore(windowEnd);
    }

    private boolean hasDeadlineWithin24Hours(List<DailySchedule> schedules) {
        LocalDateTime threshold = LocalDateTime.now().plusHours(24);
        return schedules.stream()
            .anyMatch(s -> {
                LocalDateTime deadline = calculateWindowEnd(s);
                return deadline.isBefore(threshold);
            });
    }

    private int getWeekNumber(LocalDate date) {
        // Placeholder - should use TermWeekCalculator
        return date.get(java.time.temporal.WeekFields.ISO.weekOfWeekBasedYear());
    }

    // ============================================================
    // HELPER METHODS - FORMATTING
    // ============================================================

    private String formatTimeSlot(LocalTime start, LocalTime end) {
        return start.format(TIME_FORMAT) + " - " + end.format(TIME_FORMAT);
    }

    private String buildStatusMessage(String status, long completed, int total, long missed) {
        if ("COMPLETED".equals(status)) {
            return String.format("All %d assessments completed! 🎉", total);
        } else if ("IN_PROGRESS".equals(status)) {
            if (missed > 0) {
                return String.format("Progress: %d/%d completed, %d missed", 
                    completed, total, missed);
            }
            return String.format("Progress: %d/%d assessments completed", completed, total);
        } else {
            return String.format("Ready to start! %d assessments total", total);
        }
    }

    private String buildActionUrl(DailySchedule schedule, String status) {
        if ("AVAILABLE".equals(status)) {
            return "/student/assessment/start/" + schedule.getId();
        } else if ("COMPLETED".equals(status)) {
            return "/student/assessment/results/" + schedule.getId();
        }
        return null;
    }

    private String buildActionLabel(String status) {
        switch (status) {
            case "AVAILABLE": return "Start Assessment";
            case "COMPLETED": return "View Results";
            case "GRACE_PERIOD": return "Submit Now (Grace Period)";
            case "PENDING": return "Not Yet Available";
            case "MISSED": return "Missed";
            default: return "View";
        }
    }

    private String getStatusIcon(String status) {
        switch (status) {
            case "COMPLETED": return "✅";
            case "AVAILABLE": return "🟢";
            case "GRACE_PERIOD": return "🟠";
            case "PENDING": return "⏳";
            case "MISSED": return "❌";
            default: return "🔘";
        }
    }

    private String getStatusColor(String status) {
        switch (status) {
            case "COMPLETED": return "success";
            case "AVAILABLE": return "info";
            case "GRACE_PERIOD": return "warning";
            case "PENDING": return "secondary";
            case "MISSED": case "EXPIRED": return "danger";
            case "IN_PROGRESS": return "primary";
            default: return "secondary";
        }
    }

    private String buildProgressLabel(String status, StudentLessonProgress progress) {
        if ("COMPLETED".equals(status) && progress != null && progress.getAssessmentScore() != null) {
            return String.format("Completed (%d%%)", progress.getAssessmentScore().intValue());
        }
        return status.replace("_", " ");
    }

    private String buildAvailabilityMessage(String status, LocalDateTime start, LocalDateTime end) {
        switch (status) {
            case "AVAILABLE":
                return "Assessment is available now! Due by " + end.format(TIME_FORMAT);
            case "NOT_YET_AVAILABLE":
                return "Opens at " + start.format(TIME_FORMAT);
            case "GRACE_PERIOD":
                return "Grace period active - submit soon!";
            case "EXPIRED":
                return "Assessment window has closed";
            default:
                return "Status: " + status;
        }
    }

    private List<Map<String, Object>> getUpcomingDeadlines(StudentProfile student, int limit) {
        // Placeholder implementation
        return Collections.emptyList();
    }

    private List<Map<String, Object>> getRecentCompletions(StudentProfile student, int limit) {
        // Placeholder implementation
        return Collections.emptyList();
    }
}