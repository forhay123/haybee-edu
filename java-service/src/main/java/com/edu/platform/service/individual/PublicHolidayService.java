package com.edu.platform.service.individual;

import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.model.PublicHoliday;
import com.edu.platform.repository.PublicHolidayRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ✅ SPRINT 10: Complete service for managing public holidays and schedule rescheduling
 * Handles holiday detection, rescheduling logic for Saturday periods
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class PublicHolidayService {

    private final PublicHolidayRepository publicHolidayRepository;

    // ============================================================
    // HOLIDAY QUERY METHODS
    // ============================================================

    /**
     * Get all public holidays
     */
    public List<PublicHoliday> getAllHolidays() {
        return publicHolidayRepository.findAll();
    }

    /**
     * Get holiday by ID
     */
    public PublicHoliday getHolidayById(Long holidayId) {
        return publicHolidayRepository.findById(holidayId)
            .orElseThrow(() -> new ResourceNotFoundException("Holiday not found: " + holidayId));
    }

    /**
     * Check if a specific date is a public holiday with school closure
     */
    public boolean isPublicHolidayWithClosure(LocalDate date) {
        return publicHolidayRepository.existsByHolidayDateAndIsSchoolClosedTrue(date);
    }

    /**
     * Get holiday details for a specific date
     */
    public Optional<PublicHoliday> getHolidayForDate(LocalDate date) {
        return publicHolidayRepository.findByHolidayDate(date);
    }

    /**
     * Check if Saturday in a given week is a holiday
     */
    public boolean isSaturdayHoliday(LocalDate weekStartDate) {
        // Calculate Saturday of the week (Monday + 5 days)
        LocalDate saturday = weekStartDate.plusDays(5);
        
        if (saturday.getDayOfWeek() != DayOfWeek.SATURDAY) {
            log.warn("Calculated date {} is not a Saturday", saturday);
            return false;
        }

        return isPublicHolidayWithClosure(saturday);
    }

    /**
     * Get the Saturday date for a given week
     */
    public LocalDate getSaturdayOfWeek(LocalDate weekStartDate) {
        return weekStartDate.plusDays(5);
    }

    /**
     * Find all holidays in a date range
     */
    public List<PublicHoliday> findHolidaysInRange(LocalDate startDate, LocalDate endDate) {
        return publicHolidayRepository.findByHolidayDateBetweenOrderByHolidayDateAsc(startDate, endDate);
    }

    /**
     * Find all upcoming holidays
     */
    public List<PublicHoliday> findUpcomingHolidays() {
        return publicHolidayRepository.findByHolidayDateGreaterThanEqualOrderByHolidayDateAsc(LocalDate.now());
    }

    /**
     * Get all holidays for a specific year
     */
    public List<PublicHoliday> getHolidaysForYear(int year) {
        LocalDate startOfYear = LocalDate.of(year, 1, 1);
        LocalDate endOfYear = LocalDate.of(year, 12, 31);
        return findHolidaysInRange(startOfYear, endOfYear);
    }

    // ============================================================
    // HOLIDAY MANAGEMENT (CRUD)
    // ============================================================

    /**
     * Create a new public holiday
     */
    @Transactional
    public PublicHoliday createHoliday(LocalDate holidayDate,
                                       String holidayName,
                                       boolean isSchoolClosed,
                                       Long createdByUserId) {
        log.info("Creating public holiday: {} on {}", holidayName, holidayDate);

        // Check if holiday already exists for this date
        Optional<PublicHoliday> existingOpt = publicHolidayRepository.findByHolidayDate(holidayDate);
        if (existingOpt.isPresent()) {
            log.warn("Holiday already exists for date {}: {}", 
                holidayDate, existingOpt.get().getHolidayName());
            throw new IllegalArgumentException("Holiday already exists for date: " + holidayDate);
        }

        PublicHoliday holiday = PublicHoliday.builder()
            .holidayDate(holidayDate)
            .holidayName(holidayName)
            .isSchoolClosed(isSchoolClosed)
            .createdByUserId(createdByUserId)
            .build();

        PublicHoliday saved = publicHolidayRepository.save(holiday);
        log.info("✅ Created holiday {}: {}", saved.getId(), saved.getHolidayName());

        return saved;
    }

    /**
     * Update an existing holiday
     */
    @Transactional
    public PublicHoliday updateHoliday(Long holidayId, 
                                       String holidayName, 
                                       boolean isSchoolClosed) {
        log.info("Updating holiday {}", holidayId);

        PublicHoliday holiday = publicHolidayRepository.findById(holidayId)
            .orElseThrow(() -> new ResourceNotFoundException("Holiday not found: " + holidayId));

        holiday.setHolidayName(holidayName);
        holiday.setIsSchoolClosed(isSchoolClosed);

        PublicHoliday saved = publicHolidayRepository.save(holiday);
        log.info("✅ Updated holiday {}: {}", saved.getId(), saved.getHolidayName());

        return saved;
    }

    /**
     * Delete a holiday
     */
    @Transactional
    public void deleteHoliday(Long holidayId) {
        log.info("Deleting holiday {}", holidayId);

        if (!publicHolidayRepository.existsById(holidayId)) {
            throw new ResourceNotFoundException("Holiday not found: " + holidayId);
        }

        publicHolidayRepository.deleteById(holidayId);
        log.info("✅ Deleted holiday {}", holidayId);
    }

    // ============================================================
    // RESCHEDULING LOGIC
    // ============================================================

    /**
     * Check if rescheduling is needed for a specific week
     * Returns rescheduling info if Saturday is a holiday
     */
    public ReschedulingInfo checkReschedulingNeeded(LocalDate weekStartDate) {
        LocalDate saturday = getSaturdayOfWeek(weekStartDate);
        
        Optional<PublicHoliday> holidayOpt = getHolidayForDate(saturday);
        
        if (holidayOpt.isEmpty() || !holidayOpt.get().getIsSchoolClosed()) {
            return null; // No rescheduling needed
        }

        PublicHoliday holiday = holidayOpt.get();
        
        ReschedulingInfo info = new ReschedulingInfo();
        info.setSaturday(saturday);
        info.setHoliday(holiday);
        info.setReschedulingRequired(true);
        
        log.info("🔄 Rescheduling required for Saturday {} due to holiday: {}", 
            saturday, holiday.getHolidayName());

        return info;
    }

    /**
     * ✅ NEW: Find best alternate day for Saturday rescheduling
     * Strategy: Find weekday with fewest scheduled periods
     */
    public LocalDate findBestRescheduleDay(LocalDate weekStartDate, 
                                          Map<DayOfWeek, Integer> dailyPeriodCounts) {
        // Search Monday through Friday
        LocalDate bestDay = null;
        int minPeriods = Integer.MAX_VALUE;

        for (int i = 0; i < 5; i++) { // Monday to Friday
            LocalDate candidate = weekStartDate.plusDays(i);
            DayOfWeek dayOfWeek = candidate.getDayOfWeek();
            
            // Skip if it's also a holiday
            if (isPublicHolidayWithClosure(candidate)) {
                log.debug("Skipping {} as alternate - also a holiday", candidate);
                continue;
            }
            
            int periodCount = dailyPeriodCounts.getOrDefault(dayOfWeek, 0);
            
            if (periodCount < minPeriods) {
                minPeriods = periodCount;
                bestDay = candidate;
            }
        }

        if (bestDay == null) {
            log.warn("⚠️ No suitable reschedule day found for week starting {}", weekStartDate);
            // Default to Friday if no better option
            bestDay = weekStartDate.plusDays(4);
        }

        log.info("✅ Best reschedule day: {} with {} existing periods", bestDay, minPeriods);
        return bestDay;
    }

    /**
     * ✅ NEW: Find best reschedule day without period counts (simplified)
     * Defaults to Friday as the alternate day
     */
    public LocalDate findBestRescheduleDaySimple(LocalDate weekStartDate) {
        // Try Friday first (day 4 from Monday)
        LocalDate friday = weekStartDate.plusDays(4);
        if (!isPublicHolidayWithClosure(friday)) {
            return friday;
        }

        // Try Thursday
        LocalDate thursday = weekStartDate.plusDays(3);
        if (!isPublicHolidayWithClosure(thursday)) {
            return thursday;
        }

        // Try Wednesday
        LocalDate wednesday = weekStartDate.plusDays(2);
        if (!isPublicHolidayWithClosure(wednesday)) {
            return wednesday;
        }

        // Try Tuesday
        LocalDate tuesday = weekStartDate.plusDays(1);
        if (!isPublicHolidayWithClosure(tuesday)) {
            return tuesday;
        }

        // Last resort: Monday
        return weekStartDate;
    }

    /**
     * ✅ NEW: Validate if a date can accept additional periods
     * Based on time window constraints (4-6pm weekdays)
     */
    public boolean canAcceptAdditionalPeriod(LocalDate date, int currentPeriodCount) {
        // Weekday window is 2 hours (4-6pm)
        // Assuming each period is ~1 hour, max 2-3 periods per day
        final int MAX_PERIODS_PER_WEEKDAY = 3;
        
        return currentPeriodCount < MAX_PERIODS_PER_WEEKDAY;
    }

    /**
     * ✅ NEW: Calculate rescheduling time slot
     * Suggests a time slot for the rescheduled period
     */
    public ReschedulingTimeSlot calculateReschedulingTimeSlot(
            LocalDate alternateDay,
            int existingPeriodsCount,
            String originalStartTime,
            String originalEndTime) {
        
        // Weekday slots: 16:00-17:00, 17:00-18:00
        List<String[]> availableSlots = new ArrayList<>();
        availableSlots.add(new String[]{"16:00", "17:00"});
        availableSlots.add(new String[]{"17:00", "18:00"});

        // Use slot based on existing periods
        int slotIndex = Math.min(existingPeriodsCount, availableSlots.size() - 1);
        String[] selectedSlot = availableSlots.get(slotIndex);

        ReschedulingTimeSlot timeSlot = new ReschedulingTimeSlot();
        timeSlot.setAlternateDay(alternateDay);
        timeSlot.setSuggestedStartTime(selectedSlot[0]);
        timeSlot.setSuggestedEndTime(selectedSlot[1]);
        timeSlot.setOriginalStartTime(originalStartTime);
        timeSlot.setOriginalEndTime(originalEndTime);
        timeSlot.setExistingPeriodsOnDay(existingPeriodsCount);

        log.debug("📅 Calculated time slot for {}: {}-{}", 
            alternateDay, selectedSlot[0], selectedSlot[1]);

        return timeSlot;
    }

    /**
     * ✅ NEW: Get rescheduling statistics
     */
    public Map<String, Object> getReschedulingStats(LocalDate startDate, LocalDate endDate) {
        log.info("📊 Computing rescheduling statistics from {} to {}", startDate, endDate);

        List<PublicHoliday> holidays = findHolidaysInRange(startDate, endDate);
        
        // Count Saturday holidays
        long saturdayHolidays = holidays.stream()
            .filter(h -> h.getHolidayDate().getDayOfWeek() == DayOfWeek.SATURDAY)
            .filter(PublicHoliday::getIsSchoolClosed)
            .count();

        // Count weekday holidays
        long weekdayHolidays = holidays.stream()
            .filter(h -> {
                DayOfWeek day = h.getHolidayDate().getDayOfWeek();
                return day != DayOfWeek.SATURDAY && day != DayOfWeek.SUNDAY;
            })
            .filter(PublicHoliday::getIsSchoolClosed)
            .count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalHolidays", holidays.size());
        stats.put("saturdayHolidays", saturdayHolidays);
        stats.put("weekdayHolidays", weekdayHolidays);
        stats.put("reschedulingRequired", saturdayHolidays > 0);
        stats.put("affectedWeeks", saturdayHolidays);
        stats.put("dateRange", Map.of("start", startDate, "end", endDate));

        // List Saturday holidays with dates
        List<Map<String, Object>> saturdayHolidayList = holidays.stream()
            .filter(h -> h.getHolidayDate().getDayOfWeek() == DayOfWeek.SATURDAY)
            .filter(PublicHoliday::getIsSchoolClosed)
            .map(h -> {
                Map<String, Object> holidayMap = new HashMap<>();
                holidayMap.put("date", h.getHolidayDate());
                holidayMap.put("name", h.getHolidayName());
                holidayMap.put("id", h.getId());
                return holidayMap;
            })
            .collect(Collectors.toList());
        
        stats.put("saturdayHolidaysList", saturdayHolidayList);

        return stats;
    }

    // ============================================================
    // DTO CLASSES
    // ============================================================

    /**
     * Information about rescheduling requirements
     */
    public static class ReschedulingInfo {
        private LocalDate saturday;
        private PublicHoliday holiday;
        private boolean reschedulingRequired;
        private LocalDate suggestedAlternateDay;
        private String reschedulingStrategy;

        // Getters and setters
        public LocalDate getSaturday() {
            return saturday;
        }

        public void setSaturday(LocalDate saturday) {
            this.saturday = saturday;
        }

        public PublicHoliday getHoliday() {
            return holiday;
        }

        public void setHoliday(PublicHoliday holiday) {
            this.holiday = holiday;
        }

        public boolean isReschedulingRequired() {
            return reschedulingRequired;
        }

        public void setReschedulingRequired(boolean reschedulingRequired) {
            this.reschedulingRequired = reschedulingRequired;
        }

        public LocalDate getSuggestedAlternateDay() {
            return suggestedAlternateDay;
        }

        public void setSuggestedAlternateDay(LocalDate suggestedAlternateDay) {
            this.suggestedAlternateDay = suggestedAlternateDay;
        }

        public String getReschedulingStrategy() {
            return reschedulingStrategy;
        }

        public void setReschedulingStrategy(String reschedulingStrategy) {
            this.reschedulingStrategy = reschedulingStrategy;
        }
    }

    /**
     * ✅ NEW: Time slot information for rescheduling
     */
    public static class ReschedulingTimeSlot {
        private LocalDate alternateDay;
        private String suggestedStartTime;
        private String suggestedEndTime;
        private String originalStartTime;
        private String originalEndTime;
        private int existingPeriodsOnDay;

        // Getters and setters
        public LocalDate getAlternateDay() {
            return alternateDay;
        }

        public void setAlternateDay(LocalDate alternateDay) {
            this.alternateDay = alternateDay;
        }

        public String getSuggestedStartTime() {
            return suggestedStartTime;
        }

        public void setSuggestedStartTime(String suggestedStartTime) {
            this.suggestedStartTime = suggestedStartTime;
        }

        public String getSuggestedEndTime() {
            return suggestedEndTime;
        }

        public void setSuggestedEndTime(String suggestedEndTime) {
            this.suggestedEndTime = suggestedEndTime;
        }

        public String getOriginalStartTime() {
            return originalStartTime;
        }

        public void setOriginalStartTime(String originalStartTime) {
            this.originalStartTime = originalStartTime;
        }

        public String getOriginalEndTime() {
            return originalEndTime;
        }

        public void setOriginalEndTime(String originalEndTime) {
            this.originalEndTime = originalEndTime;
        }

        public int getExistingPeriodsOnDay() {
            return existingPeriodsOnDay;
        }

        public void setExistingPeriodsOnDay(int existingPeriodsOnDay) {
            this.existingPeriodsOnDay = existingPeriodsOnDay;
        }
    }
}