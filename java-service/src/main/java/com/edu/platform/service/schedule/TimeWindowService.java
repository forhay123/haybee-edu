package com.edu.platform.service.schedule;

import com.edu.platform.dto.schedule.TimeWindow;
import com.edu.platform.model.Term;
import com.edu.platform.model.enums.StudentType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;

/**
 * Phase 2.4: Time Window Calculation Service
 * Calculates exact date-times for lesson periods and assessment windows
 * Supports different time windows for SCHOOL vs HOME students
 */
@Service
@Slf4j
public class TimeWindowService {
    
    /**
     * Grace period duration in minutes (30 minutes after lesson ends)
     */
    private static final int GRACE_PERIOD_MINUTES = 30;
    
    /**
     * Calculate time window for a lesson period
     * Handles SCHOOL vs HOME student types with different assessment windows
     * 
     * @param activeTerm The active term
     * @param weekNumber Week number in the term (1-16)
     * @param dayOfWeek Day of the week
     * @param periodNumber Period number in the day
     * @param startTime Lesson start time
     * @param endTime Lesson end time
     * @param studentType SCHOOL or HOME
     * @return TimeWindow with all calculated date-times
     */
    public TimeWindow calculateTimeWindow(
        Term activeTerm,
        Integer weekNumber,
        DayOfWeek dayOfWeek,
        Integer periodNumber,
        LocalTime startTime,
        LocalTime endTime,
        StudentType studentType
    ) {
        log.debug("Calculating time window: week={}, day={}, period={}, type={}", 
                  weekNumber, dayOfWeek, periodNumber, studentType);
        
        // Calculate the exact date for this week and day
        LocalDate lessonDate = calculateDateForWeekAndDay(activeTerm, weekNumber, dayOfWeek);
        
        // Build exact date-times for lesson
        LocalDateTime lessonStart = LocalDateTime.of(lessonDate, startTime);
        LocalDateTime lessonEnd = LocalDateTime.of(lessonDate, endTime);
        LocalDateTime graceEnd = lessonEnd.plusMinutes(GRACE_PERIOD_MINUTES);
        
        // Calculate assessment window based on student type
        LocalDateTime assessmentStart;
        LocalDateTime assessmentEnd;
        
        if (StudentType.SCHOOL.equals(studentType)) {
            // 🏫 SCHOOL students: Assessment available ONLY during lesson + grace period
            assessmentStart = lessonStart;
            assessmentEnd = graceEnd;
            
            log.debug("SCHOOL student window: {} to {}", assessmentStart, assessmentEnd);
        } else if (StudentType.HOME.equals(studentType)) {
            // 🏠 HOME students: Assessment available ALL DAY
            assessmentStart = lessonDate.atStartOfDay(); // 00:00:00
            assessmentEnd = lessonDate.atTime(23, 59, 59); // 23:59:59
            
            log.debug("HOME student window: {} to {}", assessmentStart, assessmentEnd);
        } else {
            // Default to SCHOOL behavior for INDIVIDUAL or other types
            assessmentStart = lessonStart;
            assessmentEnd = graceEnd;
            
            log.debug("Default window for type {}: {} to {}", studentType, assessmentStart, assessmentEnd);
        }
        
        return TimeWindow.builder()
            .lessonDate(lessonDate)
            .lessonStart(lessonStart)
            .lessonEnd(lessonEnd)
            .graceEnd(graceEnd)
            .assessmentWindowStart(assessmentStart)
            .assessmentWindowEnd(assessmentEnd)
            .studentType(studentType != null ? studentType.name() : "UNKNOWN")
            .build();
    }
    
    /**
     * Calculate the exact date for a given week number and day of week
     * 
     * @param term The term containing the start date
     * @param weekNumber Week number (1-16)
     * @param dayOfWeek Day of the week
     * @return The calculated date
     */
    public LocalDate calculateDateForWeekAndDay(Term term, Integer weekNumber, DayOfWeek dayOfWeek) {
        LocalDate termStart = term.getStartDate();
        
        // Calculate week offset (week 1 = 0 weeks offset, week 2 = 1 week offset, etc.)
        int weekOffset = weekNumber - 1;
        
        // Get to the start of the target week
        LocalDate weekStart = termStart.plusWeeks(weekOffset);
        
        // Adjust to the correct day of week
        DayOfWeek termStartDay = termStart.getDayOfWeek();
        int dayDifference = dayOfWeek.getValue() - termStartDay.getValue();
        
        LocalDate lessonDate = weekStart.plusDays(dayDifference);
        
        log.debug("Calculated lesson date: term_start={}, week={}, day={} => {}", 
                  termStart, weekNumber, dayOfWeek, lessonDate);
        
        return lessonDate;
    }
    
    /**
     * Check if current time is within assessment window
     */
    public boolean isAssessmentAccessible(TimeWindow window, LocalDateTime now) {
        return window.isAssessmentAccessible(now);
    }
    
    /**
     * Check if grace period has expired
     */
    public boolean isGracePeriodExpired(TimeWindow window, LocalDateTime now) {
        return window.isGracePeriodExpired(now);
    }
    
    /**
     * Calculate minutes until assessment opens
     */
    public long getMinutesUntilOpen(TimeWindow window, LocalDateTime now) {
        if (now.isBefore(window.getAssessmentWindowStart())) {
            return ChronoUnit.MINUTES.between(now, window.getAssessmentWindowStart());
        }
        return 0;
    }
    
    /**
     * Calculate minutes remaining before assessment closes
     */
    public long getMinutesRemaining(TimeWindow window, LocalDateTime now) {
        if (now.isAfter(window.getAssessmentWindowEnd())) {
            return 0;
        }
        if (now.isBefore(window.getAssessmentWindowStart())) {
            return 0;
        }
        return ChronoUnit.MINUTES.between(now, window.getAssessmentWindowEnd());
    }
    
    /**
     * Check if currently in grace period
     */
    public boolean isInGracePeriod(TimeWindow window, LocalDateTime now) {
        return now.isAfter(window.getLessonEnd()) && now.isBefore(window.getGraceEnd());
    }
}