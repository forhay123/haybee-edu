package com.edu.platform.service.individual;

import com.edu.platform.model.DailySchedule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * ✅ SPRINT 5: Assessment Window Calculator
 * Calculates strict per-period assessment windows with grace periods
 * 
 * Key Rules:
 * - Window starts: 30 minutes before period start
 * - Window ends: 2 hours after period end
 * - 5-minute grace tolerance for late submissions
 * - No cross-day submissions allowed
 * - Saturday: 12pm-3pm, ends at 5pm (with grace)
 * - Mon-Fri: 4pm-6pm, ends at 8pm (with grace)
 */
@Service
@Slf4j
public class AssessmentWindowCalculator {

    @Value("${individual.assessment.pre-window.minutes:30}")
    private int preWindowMinutes;

    @Value("${individual.assessment.grace-period.hours:2}")
    private int gracePeriodHours;

    @Value("${individual.assessment.late-submission.tolerance.minutes:5}")
    private int lateSubmissionToleranceMinutes;

    @Value("${individual.schedule.weekday.start:16:00}")
    private String weekdayStartTime;

    @Value("${individual.schedule.weekday.end:18:00}")
    private String weekdayEndTime;

    @Value("${individual.schedule.saturday.start:12:00}")
    private String saturdayStartTime;

    @Value("${individual.schedule.saturday.end:15:00}")
    private String saturdayEndTime;

    /**
     * Calculate assessment window for a schedule
     * Returns AssessmentWindow with start, end, and grace deadline
     */
    public AssessmentWindow calculateWindow(DailySchedule schedule) {
        LocalDate scheduleDate = schedule.getScheduledDate();
        LocalTime periodStart = schedule.getStartTime();
        LocalTime periodEnd = schedule.getEndTime();

        // Window start: 30 minutes before period start
        LocalDateTime windowStart = LocalDateTime.of(scheduleDate, periodStart)
                .minusMinutes(preWindowMinutes);

        // Window end: period end + 2 hours grace
        LocalDateTime windowEnd = LocalDateTime.of(scheduleDate, periodEnd)
                .plusHours(gracePeriodHours);

        // Grace deadline: window end + 5 minutes
        LocalDateTime graceDeadline = windowEnd.plusMinutes(lateSubmissionToleranceMinutes);

        log.debug("📅 Window calculated for schedule {}: start={}, end={}, grace={}", 
                schedule.getId(), windowStart, windowEnd, graceDeadline);

        return new AssessmentWindow(windowStart, windowEnd, graceDeadline);
    }

    /**
     * Check if assessment is currently accessible
     */
    public boolean isAccessible(AssessmentWindow window) {
        LocalDateTime now = LocalDateTime.now();
        return !now.isBefore(window.windowStart()) && !now.isAfter(window.windowEnd());
    }

    /**
     * Check if submission is within grace period
     */
    public boolean isWithinGracePeriod(AssessmentWindow window, LocalDateTime submissionTime) {
        return submissionTime.isAfter(window.windowEnd()) 
                && !submissionTime.isAfter(window.graceDeadline());
    }

    /**
     * Check if submission is late (after grace period)
     */
    public boolean isLate(AssessmentWindow window, LocalDateTime submissionTime) {
        return submissionTime.isAfter(window.graceDeadline());
    }

    /**
     * Get time remaining until deadline (in minutes)
     */
    public long getMinutesRemaining(AssessmentWindow window) {
        LocalDateTime now = LocalDateTime.now();
        if (now.isAfter(window.windowEnd())) {
            return 0;
        }
        return java.time.Duration.between(now, window.windowEnd()).toMinutes();
    }

    /**
     * Get window status for display
     */
    public WindowStatus getWindowStatus(AssessmentWindow window) {
        LocalDateTime now = LocalDateTime.now();
        
        if (now.isBefore(window.windowStart())) {
            return WindowStatus.NOT_YET_OPEN;
        } else if (now.isAfter(window.graceDeadline())) {
            return WindowStatus.EXPIRED;
        } else if (now.isAfter(window.windowEnd())) {
            return WindowStatus.GRACE_PERIOD;
        } else {
            return WindowStatus.OPEN;
        }
    }

    /**
     * Validate time window for schedule generation
     */
    public boolean isValidTimeWindow(LocalDate date, LocalTime startTime, LocalTime endTime) {
        DayOfWeek dayOfWeek = date.getDayOfWeek();

        // Sunday not allowed
        if (dayOfWeek == DayOfWeek.SUNDAY) {
            return false;
        }

        // Saturday validation
        if (dayOfWeek == DayOfWeek.SATURDAY) {
            LocalTime satStart = LocalTime.parse(saturdayStartTime);
            LocalTime satEnd = LocalTime.parse(saturdayEndTime);
            return !startTime.isBefore(satStart) && !endTime.isAfter(satEnd);
        }

        // Weekday validation
        LocalTime weekStart = LocalTime.parse(weekdayStartTime);
        LocalTime weekEnd = LocalTime.parse(weekdayEndTime);
        return !startTime.isBefore(weekStart) && !endTime.isAfter(weekEnd);
    }

    /**
     * Assessment window data structure
     */
    public record AssessmentWindow(
            LocalDateTime windowStart,
            LocalDateTime windowEnd,
            LocalDateTime graceDeadline
    ) {}

    /**
     * Window status enum
     */
    public enum WindowStatus {
        NOT_YET_OPEN,
        OPEN,
        GRACE_PERIOD,
        EXPIRED
    }
}