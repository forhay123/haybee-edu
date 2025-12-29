package com.edu.platform.service.individual;

import com.edu.platform.model.Term;
import com.edu.platform.repository.TermRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

/**
 * SPRINT 1: Term Week Calculator Service
 * Handles all term week calculations and time window validations
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class TermWeekCalculator {

    private final TermRepository termRepository;

    // Time window constants
    private static final LocalTime WEEKDAY_START = LocalTime.of(16, 0);  // 4:00 PM
    private static final LocalTime WEEKDAY_END = LocalTime.of(18, 0);    // 6:00 PM
    private static final LocalTime SATURDAY_START = LocalTime.of(12, 0);  // 12:00 PM
    private static final LocalTime SATURDAY_END = LocalTime.of(15, 0);    // 3:00 PM

    // Assessment window settings
    private static final int PRE_WINDOW_MINUTES = 30;
    private static final int GRACE_PERIOD_HOURS = 2;

    // ============================================================
    // TERM OPERATIONS
    // ============================================================

    /**
     * Get the currently active term
     */
    public Optional<Term> getActiveTerm() {
        return termRepository.findByIsActiveTrue();
    }

    /**
     * Check if a term is currently active
     */
    public boolean isTermActive() {
        Optional<Term> termOpt = getActiveTerm();
        if (termOpt.isEmpty()) {
            return false;
        }

        Term term = termOpt.get();
        LocalDate today = LocalDate.now();
        return !today.isBefore(term.getStartDate()) && !today.isAfter(term.getEndDate());
    }

    // ============================================================
    // WEEK NUMBER CALCULATIONS
    // ============================================================

    /**
     * Get the current week number within the active term
     * Returns null if no active term or if current date is outside term
     */
    public Integer getCurrentTermWeek() {
        Optional<Term> termOpt = getActiveTerm();
        if (termOpt.isEmpty()) {
            return null;
        }

        Term term = termOpt.get();
        LocalDate today = LocalDate.now();

        return getWeekNumberForDate(term, today);
    }

    /**
     * Get the next week number to generate
     * This is called by the Sunday midnight task
     */
    public Integer getNextWeekNumber() {
        Optional<Term> termOpt = getActiveTerm();
        if (termOpt.isEmpty()) {
            return null;
        }

        Term term = termOpt.get();
        LocalDate nextMonday = LocalDate.now().with(DayOfWeek.MONDAY).plusWeeks(1);

        Integer weekNumber = getWeekNumberForDate(term, nextMonday);
        
        // Validate week number doesn't exceed term weeks
        if (weekNumber != null && weekNumber > term.getWeekCount()) {
            log.info("Week {} exceeds term week count {}. Term has ended.", 
                weekNumber, term.getWeekCount());
            return null;
        }

        return weekNumber;
    }

    /**
     * Get week number for a specific date within a term
     * Returns null if date is outside term boundaries
     */
    public Integer getWeekNumberForDate(Term term, LocalDate date) {
        if (date.isBefore(term.getStartDate()) || date.isAfter(term.getEndDate())) {
            return null;
        }

        long daysBetween = ChronoUnit.DAYS.between(term.getStartDate(), date);
        return (int) (daysBetween / 7) + 1;
    }

    /**
     * Check if a week number is valid for the current term
     */
    public boolean isValidWeekNumber(Integer weekNumber) {
        Optional<Term> termOpt = getActiveTerm();
        if (termOpt.isEmpty()) {
            return false;
        }

        Term term = termOpt.get();
        return weekNumber != null && weekNumber >= 1 && weekNumber <= term.getWeekCount();
    }

    // ============================================================
    // WEEK DATE RANGE CALCULATIONS
    // ============================================================

    /**
     * Get the date range for a specific week number
     * Returns [Monday, Sunday] for the week
     */
    public LocalDate[] getWeekDateRange(Integer weekNumber) {
        Optional<Term> termOpt = getActiveTerm();
        if (termOpt.isEmpty()) {
            return null;
        }

        Term term = termOpt.get();
        
        if (weekNumber < 1 || weekNumber > term.getWeekCount()) {
            return null;
        }

        LocalDate weekStart = term.getStartDate().plusWeeks(weekNumber - 1);
        
        // Ensure week starts on Monday
        if (weekStart.getDayOfWeek() != DayOfWeek.MONDAY) {
            weekStart = weekStart.with(DayOfWeek.MONDAY);
        }

        LocalDate weekEnd = weekStart.plusDays(6); // Sunday

        return new LocalDate[]{weekStart, weekEnd};
    }

    /**
     * Get the start date (Monday) of a specific week
     */
    public LocalDate getWeekStartDate(Integer weekNumber) {
        LocalDate[] range = getWeekDateRange(weekNumber);
        return range != null ? range[0] : null;
    }

    /**
     * Get the end date (Sunday) of a specific week
     */
    public LocalDate getWeekEndDate(Integer weekNumber) {
        LocalDate[] range = getWeekDateRange(weekNumber);
        return range != null ? range[1] : null;
    }

    // ============================================================
    // TIME WINDOW VALIDATION
    // ============================================================

    /**
     * Check if a date and time fall within allowed schedule windows
     * Mon-Fri: 4:00pm - 6:00pm
     * Saturday: 12:00pm - 3:00pm
     * Sunday: NOT ALLOWED
     */
    public boolean isDateInAllowedTimeWindow(LocalDate date, LocalTime time) {
        DayOfWeek dayOfWeek = date.getDayOfWeek();

        // Sunday is never allowed
        if (dayOfWeek == DayOfWeek.SUNDAY) {
            return false;
        }

        // Saturday has different window
        if (dayOfWeek == DayOfWeek.SATURDAY) {
            return !time.isBefore(SATURDAY_START) && !time.isAfter(SATURDAY_END);
        }

        // Monday - Friday
        return !time.isBefore(WEEKDAY_START) && !time.isAfter(WEEKDAY_END);
    }

    /**
     * Validate if a time slot is within allowed windows for a given day
     */
    public boolean isTimeSlotValid(DayOfWeek dayOfWeek, LocalTime startTime, LocalTime endTime) {
        if (dayOfWeek == DayOfWeek.SUNDAY) {
            return false;
        }

        if (dayOfWeek == DayOfWeek.SATURDAY) {
            return !startTime.isBefore(SATURDAY_START) && !endTime.isAfter(SATURDAY_END);
        }

        // Weekdays
        return !startTime.isBefore(WEEKDAY_START) && !endTime.isAfter(WEEKDAY_END);
    }

    // ============================================================
    // ASSESSMENT WINDOW CALCULATIONS
    // ============================================================

    /**
     * Calculate assessment window start time
     * Window opens 30 minutes before period start
     */
    public LocalDateTime calculateAssessmentWindowStart(LocalDate date, LocalTime periodStart) {
        return LocalDateTime.of(date, periodStart).minusMinutes(PRE_WINDOW_MINUTES);
    }

    /**
     * Calculate assessment window end time
     * Window closes 2 hours after period end (grace period)
     */
    public LocalDateTime calculateAssessmentWindowEnd(LocalDate date, LocalTime periodEnd) {
        return LocalDateTime.of(date, periodEnd).plusHours(GRACE_PERIOD_HOURS);
    }

    /**
     * Calculate both window start and end
     * Returns [windowStart, windowEnd]
     */
    public LocalDateTime[] calculateAssessmentWindow(LocalDate date, 
                                                     LocalTime periodStart, 
                                                     LocalTime periodEnd) {
        LocalDateTime windowStart = calculateAssessmentWindowStart(date, periodStart);
        LocalDateTime windowEnd = calculateAssessmentWindowEnd(date, periodEnd);
        
        return new LocalDateTime[]{windowStart, windowEnd};
    }

    /**
     * Check if current time is within assessment window
     */
    public boolean isWithinAssessmentWindow(LocalDateTime windowStart, LocalDateTime windowEnd) {
        LocalDateTime now = LocalDateTime.now();
        return !now.isBefore(windowStart) && !now.isAfter(windowEnd);
    }

    /**
     * Check if assessment window has expired
     */
    public boolean hasAssessmentWindowExpired(LocalDateTime windowEnd) {
        return LocalDateTime.now().isAfter(windowEnd);
    }

    // ============================================================
    // SCHEDULE SLOT UTILITIES
    // ============================================================

    /**
     * Get the next allowed schedule slot after a given date/time
     * Useful for holiday rescheduling
     */
    public LocalDateTime getNextAllowedScheduleSlot(LocalDateTime from) {
        LocalDate date = from.toLocalDate();
        LocalTime time = from.toLocalTime();

        // Try same day first
        if (isDateInAllowedTimeWindow(date, time)) {
            return from;
        }

        // Try next days
        for (int i = 1; i <= 7; i++) {
            LocalDate nextDate = date.plusDays(i);
            DayOfWeek dayOfWeek = nextDate.getDayOfWeek();

            if (dayOfWeek == DayOfWeek.SUNDAY) {
                continue; // Skip Sunday
            }

            LocalTime slotStart = dayOfWeek == DayOfWeek.SATURDAY ? SATURDAY_START : WEEKDAY_START;
            return LocalDateTime.of(nextDate, slotStart);
        }

        return null; // No valid slot found in next 7 days
    }

    /**
     * Find available time slots on a specific date
     * Returns list of available start times
     */
    public java.util.List<LocalTime> getAvailableTimeSlots(LocalDate date) {
        DayOfWeek dayOfWeek = date.getDayOfWeek();
        java.util.List<LocalTime> slots = new java.util.ArrayList<>();

        if (dayOfWeek == DayOfWeek.SUNDAY) {
            return slots; // No slots on Sunday
        }

        LocalTime start, end;
        if (dayOfWeek == DayOfWeek.SATURDAY) {
            start = SATURDAY_START;
            end = SATURDAY_END;
        } else {
            start = WEEKDAY_START;
            end = WEEKDAY_END;
        }

        // Generate 30-minute slots
        LocalTime current = start;
        while (current.isBefore(end)) {
            slots.add(current);
            current = current.plusMinutes(30);
        }

        return slots;
    }

    // ============================================================
    // GETTERS FOR CONSTANTS
    // ============================================================

    public LocalTime getWeekdayStart() {
        return WEEKDAY_START;
    }

    public LocalTime getWeekdayEnd() {
        return WEEKDAY_END;
    }

    public LocalTime getSaturdayStart() {
        return SATURDAY_START;
    }

    public LocalTime getSaturdayEnd() {
        return SATURDAY_END;
    }

    public int getPreWindowMinutes() {
        return PRE_WINDOW_MINUTES;
    }

    public int getGracePeriodHours() {
        return GRACE_PERIOD_HOURS;
    }
}