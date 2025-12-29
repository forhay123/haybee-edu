package com.edu.platform.service.schedule;

import com.edu.platform.model.DailySchedule;
import com.edu.platform.model.individual.IndividualStudentTimetable;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ✅ SPRINT 9: Enhanced conflict detection service
 * Detects overlapping time slots, validates schedules, and prevents conflicts
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ConflictDetectionService {

    private final ObjectMapper objectMapper;
    
    private static final DateTimeFormatter[] TIME_FORMATS = {
        DateTimeFormatter.ofPattern("HH:mm"),
        DateTimeFormatter.ofPattern("H:mm"),
        DateTimeFormatter.ofPattern("h:mm a"),
        DateTimeFormatter.ofPattern("h:mma")
    };

    /**
     * ✅ Detect all types of conflicts in a timetable
     */
    public List<ScheduleConflict> detectConflicts(IndividualStudentTimetable timetable) {
        log.debug("🔍 Detecting conflicts for timetable {}", timetable.getId());

        List<Map<String, Object>> entries = timetable.getExtractedEntries();
        
        if (entries == null || entries.isEmpty()) {
            log.debug("📭 No entries to check for conflicts");
            return Collections.emptyList();
        }

        List<ScheduleConflict> conflicts = new ArrayList<>();

        // 1. Check time overlaps (primary conflict type)
        conflicts.addAll(detectTimeOverlaps(entries, timetable));
        
        // 2. Check for duplicate subjects on same day
        conflicts.addAll(detectDuplicateSubjects(entries, timetable));
        
        // 3. Check for invalid time ranges
        conflicts.addAll(detectInvalidTimeRanges(entries, timetable));
        
        // 4. Check for unrealistic schedules (too many periods)
        conflicts.addAll(detectUnrealisticSchedules(entries, timetable));

        log.info("✅ Found {} total conflicts in timetable {}", conflicts.size(), timetable.getId());
        return conflicts;
    }

    /**
     * ✅ Detect time overlap conflicts
     */
    private List<ScheduleConflict> detectTimeOverlaps(
            List<Map<String, Object>> entries, 
            IndividualStudentTimetable timetable) {
        
        List<ScheduleConflict> conflicts = new ArrayList<>();

        // Group entries by day of week
        Map<String, List<Map<String, Object>>> entriesByDay = entries.stream()
            .filter(e -> e.containsKey("dayOfWeek"))
            .collect(Collectors.groupingBy(e -> (String) e.get("dayOfWeek")));

        // Check each day for conflicts
        for (Map.Entry<String, List<Map<String, Object>>> dayEntry : entriesByDay.entrySet()) {
            String dayStr = dayEntry.getKey();
            List<Map<String, Object>> dayEntries = dayEntry.getValue();
            
            DayOfWeek day;
            try {
                day = DayOfWeek.valueOf(dayStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("⚠️ Invalid day of week: {}", dayStr);
                continue;
            }

            // Sort by start time for efficient overlap detection
            List<Map<String, Object>> sortedEntries = new ArrayList<>(dayEntries);
            sortedEntries.sort(Comparator.comparing(e -> parseTime((String) e.get("startTime"))));

            // Check for overlaps
            for (int i = 0; i < sortedEntries.size() - 1; i++) {
                Map<String, Object> entry1 = sortedEntries.get(i);
                
                for (int j = i + 1; j < sortedEntries.size(); j++) {
                    Map<String, Object> entry2 = sortedEntries.get(j);
                    
                    if (hasTimeOverlap(entry1, entry2)) {
                        ScheduleConflict conflict = createConflict(
                            day, entry1, entry2, "TIME_OVERLAP", timetable);
                        conflicts.add(conflict);
                        
                        log.warn("⚠️ Overlap on {}: {} ({}-{}) ↔ {} ({}-{})",
                            day,
                            entry1.get("subjectName"), entry1.get("startTime"), entry1.get("endTime"),
                            entry2.get("subjectName"), entry2.get("startTime"), entry2.get("endTime"));
                    }
                }
            }
        }

        log.info("📊 Time overlap conflicts: {}", conflicts.size());
        return conflicts;
    }

    /**
     * ✅ Detect duplicate subjects on same day
     */
    private List<ScheduleConflict> detectDuplicateSubjects(
            List<Map<String, Object>> entries,
            IndividualStudentTimetable timetable) {
        
        List<ScheduleConflict> conflicts = new ArrayList<>();

        // Group by day
        Map<String, List<Map<String, Object>>> entriesByDay = entries.stream()
            .filter(e -> e.containsKey("dayOfWeek") && e.containsKey("subjectName"))
            .collect(Collectors.groupingBy(e -> (String) e.get("dayOfWeek")));

        for (Map.Entry<String, List<Map<String, Object>>> dayEntry : entriesByDay.entrySet()) {
            String dayStr = dayEntry.getKey();
            List<Map<String, Object>> dayEntries = dayEntry.getValue();
            
            DayOfWeek day;
            try {
                day = DayOfWeek.valueOf(dayStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                continue;
            }

            // Group by subject name
            Map<String, List<Map<String, Object>>> entriesBySubject = dayEntries.stream()
                .collect(Collectors.groupingBy(e -> (String) e.get("subjectName")));

            // Check for subjects appearing more than twice (reasonable for practical subjects)
            for (Map.Entry<String, List<Map<String, Object>>> subjectEntry : entriesBySubject.entrySet()) {
                String subjectName = subjectEntry.getKey();
                List<Map<String, Object>> subjectEntries = subjectEntry.getValue();

                if (subjectEntries.size() > 2) {
                    for (int i = 0; i < subjectEntries.size() - 1; i++) {
                        for (int j = i + 1; j < subjectEntries.size(); j++) {
                            ScheduleConflict conflict = createConflict(
                                day, 
                                subjectEntries.get(i), 
                                subjectEntries.get(j),
                                "DUPLICATE_SUBJECT",
                                timetable
                            );
                            conflict.setSeverity("MEDIUM");
                            conflict.setConflictDescription(String.format(
                                "%s appears %d times on %s - may be intentional for practical sessions",
                                subjectName, subjectEntries.size(), day
                            ));
                            conflicts.add(conflict);
                        }
                    }
                    
                    log.info("ℹ️ Subject '{}' appears {} times on {}", 
                        subjectName, subjectEntries.size(), day);
                }
            }
        }

        log.info("📊 Duplicate subject warnings: {}", conflicts.size());
        return conflicts;
    }

    /**
     * ✅ Detect invalid time ranges (end before start, unrealistic durations)
     */
    private List<ScheduleConflict> detectInvalidTimeRanges(
            List<Map<String, Object>> entries,
            IndividualStudentTimetable timetable) {
        
        List<ScheduleConflict> conflicts = new ArrayList<>();

        for (int i = 0; i < entries.size(); i++) {
            Map<String, Object> entry = entries.get(i);
            
            LocalTime startTime = parseTime((String) entry.get("startTime"));
            LocalTime endTime = parseTime((String) entry.get("endTime"));

            if (startTime == null || endTime == null) {
                continue;
            }

            // Check if end time is before start time
            if (endTime.isBefore(startTime) || endTime.equals(startTime)) {
                ScheduleConflict conflict = new ScheduleConflict();
                conflict.setConflictType("INVALID_TIME_RANGE");
                conflict.setSeverity("HIGH");
                conflict.setTimetableId(timetable.getId());
                conflict.setStudentId(timetable.getStudentProfile().getId());
                conflict.setStudentName(timetable.getStudentProfile().getUser().getFullName());
                conflict.setEntryIndex(i);
                
                String dayStr = (String) entry.get("dayOfWeek");
                try {
                    conflict.setDayOfWeek(DayOfWeek.valueOf(dayStr.toUpperCase()));
                } catch (Exception e) {
                    log.warn("⚠️ Invalid day: {}", dayStr);
                }
                
                conflict.setEntry1SubjectName((String) entry.get("subjectName"));
                conflict.setEntry1StartTime((String) entry.get("startTime"));
                conflict.setEntry1EndTime((String) entry.get("endTime"));
                conflict.setConflictDescription(String.format(
                    "Invalid time range for %s: end time (%s) is before or equal to start time (%s)",
                    entry.get("subjectName"), entry.get("endTime"), entry.get("startTime")
                ));
                conflicts.add(conflict);
                
                log.warn("⚠️ Invalid time range: {} ({} - {})",
                    entry.get("subjectName"), entry.get("startTime"), entry.get("endTime"));
            }

            // Check for unrealistic duration (> 2 hours for single period)
            long durationMinutes = java.time.Duration.between(startTime, endTime).toMinutes();
            if (durationMinutes > 120) {
                ScheduleConflict conflict = new ScheduleConflict();
                conflict.setConflictType("UNREALISTIC_DURATION");
                conflict.setSeverity("MEDIUM");
                conflict.setTimetableId(timetable.getId());
                conflict.setStudentId(timetable.getStudentProfile().getId());
                conflict.setStudentName(timetable.getStudentProfile().getUser().getFullName());
                conflict.setEntryIndex(i);
                
                String dayStr = (String) entry.get("dayOfWeek");
                try {
                    conflict.setDayOfWeek(DayOfWeek.valueOf(dayStr.toUpperCase()));
                } catch (Exception e) {
                    log.warn("⚠️ Invalid day: {}", dayStr);
                }
                
                conflict.setEntry1SubjectName((String) entry.get("subjectName"));
                conflict.setEntry1StartTime((String) entry.get("startTime"));
                conflict.setEntry1EndTime((String) entry.get("endTime"));
                conflict.setConflictDescription(String.format(
                    "Unusually long period for %s: %d minutes (%s - %s) - verify this is correct",
                    entry.get("subjectName"), durationMinutes, entry.get("startTime"), entry.get("endTime")
                ));
                conflicts.add(conflict);
                
                log.info("ℹ️ Long duration: {} = {} minutes",
                    entry.get("subjectName"), durationMinutes);
            }
        }

        log.info("📊 Invalid time range conflicts: {}", conflicts.size());
        return conflicts;
    }

    /**
     * ✅ Detect unrealistic schedules (too many periods per day)
     */
    private List<ScheduleConflict> detectUnrealisticSchedules(
            List<Map<String, Object>> entries,
            IndividualStudentTimetable timetable) {
        
        List<ScheduleConflict> conflicts = new ArrayList<>();

        // Group by day
        Map<String, List<Map<String, Object>>> entriesByDay = entries.stream()
            .filter(e -> e.containsKey("dayOfWeek"))
            .collect(Collectors.groupingBy(e -> (String) e.get("dayOfWeek")));

        for (Map.Entry<String, List<Map<String, Object>>> dayEntry : entriesByDay.entrySet()) {
            String dayStr = dayEntry.getKey();
            List<Map<String, Object>> dayEntries = dayEntry.getValue();
            
            // Most schools have max 8-9 periods per day
            if (dayEntries.size() > 10) {
                DayOfWeek day;
                try {
                    day = DayOfWeek.valueOf(dayStr.toUpperCase());
                } catch (IllegalArgumentException e) {
                    continue;
                }

                ScheduleConflict conflict = new ScheduleConflict();
                conflict.setConflictType("TOO_MANY_PERIODS");
                conflict.setSeverity("MEDIUM");
                conflict.setTimetableId(timetable.getId());
                conflict.setStudentId(timetable.getStudentProfile().getId());
                conflict.setStudentName(timetable.getStudentProfile().getUser().getFullName());
                conflict.setDayOfWeek(day);
                conflict.setConflictDescription(String.format(
                    "%s has %d periods scheduled - this seems unusually high. Please verify.",
                    day, dayEntries.size()
                ));
                conflicts.add(conflict);
                
                log.warn("⚠️ {} has {} periods - unusually high", day, dayEntries.size());
            }
        }

        log.info("📊 Unrealistic schedule warnings: {}", conflicts.size());
        return conflicts;
    }

    /**
     * ✅ Check if two entries have overlapping time slots
     */
    private boolean hasTimeOverlap(Map<String, Object> entry1, Map<String, Object> entry2) {
        LocalTime start1 = parseTime((String) entry1.get("startTime"));
        LocalTime end1 = parseTime((String) entry1.get("endTime"));
        LocalTime start2 = parseTime((String) entry2.get("startTime"));
        LocalTime end2 = parseTime((String) entry2.get("endTime"));

        if (start1 == null || end1 == null || start2 == null || end2 == null) {
            return false;
        }

        // Two intervals overlap if: start1 < end2 AND start2 < end1
        return start1.isBefore(end2) && start2.isBefore(end1);
    }

    /**
     * ✅ Parse time string with multiple format support
     */
    private LocalTime parseTime(String timeStr) {
        if (timeStr == null || timeStr.trim().isEmpty()) {
            return null;
        }
        
        String cleanedTime = timeStr.trim().toUpperCase();
        
        for (DateTimeFormatter formatter : TIME_FORMATS) {
            try {
                return LocalTime.parse(cleanedTime, formatter);
            } catch (DateTimeParseException e) {
                // Try next format
            }
        }
        
        log.warn("⚠️ Failed to parse time: {}", timeStr);
        return null;
    }

    /**
     * ✅ Create a conflict object from two overlapping entries
     */
    private ScheduleConflict createConflict(DayOfWeek day,
                                           Map<String, Object> entry1,
                                           Map<String, Object> entry2,
                                           String conflictType,
                                           IndividualStudentTimetable timetable) {
        ScheduleConflict conflict = new ScheduleConflict();
        conflict.setDayOfWeek(day);
        conflict.setConflictType(conflictType);
        conflict.setSeverity("HIGH");
        conflict.setTimetableId(timetable.getId());
        conflict.setStudentId(timetable.getStudentProfile().getId());
        conflict.setStudentName(timetable.getStudentProfile().getUser().getFullName());
        
        conflict.setEntry1SubjectName((String) entry1.get("subjectName"));
        conflict.setEntry1StartTime((String) entry1.get("startTime"));
        conflict.setEntry1EndTime((String) entry1.get("endTime"));
        
        conflict.setEntry2SubjectName((String) entry2.get("subjectName"));
        conflict.setEntry2StartTime((String) entry2.get("startTime"));
        conflict.setEntry2EndTime((String) entry2.get("endTime"));
        
        conflict.setConflictDescription(String.format(
            "%s (%s-%s) overlaps with %s (%s-%s) on %s",
            entry1.get("subjectName"), entry1.get("startTime"), entry1.get("endTime"),
            entry2.get("subjectName"), entry2.get("startTime"), entry2.get("endTime"),
            day
        ));
        
        return conflict;
    }

    /**
     * ✅ Get comprehensive conflict summary
     */
    public ConflictSummary getConflictSummary(IndividualStudentTimetable timetable) {
        List<ScheduleConflict> conflicts = detectConflicts(timetable);
        
        ConflictSummary summary = new ConflictSummary();
        summary.setTimetableId(timetable.getId());
        summary.setStudentId(timetable.getStudentProfile().getId());
        summary.setStudentName(timetable.getStudentProfile().getUser().getFullName());
        summary.setTotalConflicts(conflicts.size());
        summary.setConflicts(conflicts);
        summary.setHasConflicts(!conflicts.isEmpty());
        
        // Group by type
        Map<String, Long> conflictsByType = conflicts.stream()
            .collect(Collectors.groupingBy(
                ScheduleConflict::getConflictType,
                Collectors.counting()
            ));
        summary.setConflictsByType(conflictsByType);
        
        // Group by day
        Map<DayOfWeek, Long> conflictsByDay = conflicts.stream()
            .filter(c -> c.getDayOfWeek() != null)
            .collect(Collectors.groupingBy(
                ScheduleConflict::getDayOfWeek,
                Collectors.counting()
            ));
        summary.setConflictsByDay(conflictsByDay);
        
        // Group by severity
        Map<String, Long> conflictsBySeverity = conflicts.stream()
            .collect(Collectors.groupingBy(
                ScheduleConflict::getSeverity,
                Collectors.counting()
            ));
        summary.setConflictsBySeverity(conflictsBySeverity);
        
        return summary;
    }

    /**
     * ✅ Check if a timetable has any conflicts
     */
    public boolean hasConflicts(IndividualStudentTimetable timetable) {
        return !detectConflicts(timetable).isEmpty();
    }

    /**
     * ✅ Validate a single entry against existing entries
     */
    public List<ScheduleConflict> validateNewEntry(Map<String, Object> newEntry,
                                                   List<Map<String, Object>> existingEntries,
                                                   IndividualStudentTimetable timetable) {
        List<ScheduleConflict> conflicts = new ArrayList<>();
        
        String newDayStr = (String) newEntry.get("dayOfWeek");
        if (newDayStr == null) {
            return conflicts;
        }
        
        DayOfWeek newDay;
        try {
            newDay = DayOfWeek.valueOf(newDayStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            return conflicts;
        }
        
        for (Map<String, Object> existing : existingEntries) {
            String existingDayStr = (String) existing.get("dayOfWeek");
            
            // Only check same day
            if (!newDayStr.equalsIgnoreCase(existingDayStr)) {
                continue;
            }
            
            if (hasTimeOverlap(newEntry, existing)) {
                ScheduleConflict conflict = createConflict(newDay, newEntry, existing, 
                    "TIME_OVERLAP", timetable);
                conflicts.add(conflict);
            }
        }
        
        return conflicts;
    }

    /**
     * ✅ Validate schedules generated from timetable
     */
    public List<ScheduleConflict> validateDailySchedules(List<DailySchedule> schedules) {
        List<ScheduleConflict> conflicts = new ArrayList<>();
        
        if (schedules == null || schedules.isEmpty()) {
            return conflicts;
        }

        // Group by student and date
        Map<String, List<DailySchedule>> schedulesByStudentAndDate = schedules.stream()
            .collect(Collectors.groupingBy(s -> 
                s.getStudentProfile().getId() + "_" + s.getScheduledDate().toString()
            ));

        for (Map.Entry<String, List<DailySchedule>> entry : schedulesByStudentAndDate.entrySet()) {
            List<DailySchedule> daySchedules = entry.getValue();
            
            // Sort by start time
            daySchedules.sort(Comparator.comparing(DailySchedule::getStartTime));
            
            // Check for overlaps
            for (int i = 0; i < daySchedules.size() - 1; i++) {
                DailySchedule schedule1 = daySchedules.get(i);
                
                for (int j = i + 1; j < daySchedules.size(); j++) {
                    DailySchedule schedule2 = daySchedules.get(j);
                    
                    if (hasScheduleOverlap(schedule1, schedule2)) {
                        ScheduleConflict conflict = createScheduleConflict(schedule1, schedule2);
                        conflicts.add(conflict);
                    }
                }
            }
        }

        return conflicts;
    }

    /**
     * ✅ Check if two DailySchedule objects overlap
     */
    private boolean hasScheduleOverlap(DailySchedule s1, DailySchedule s2) {
        return s1.getStartTime().isBefore(s2.getEndTime()) && 
               s2.getStartTime().isBefore(s1.getEndTime());
    }

    /**
     * ✅ Create conflict from DailySchedule objects
     */
    private ScheduleConflict createScheduleConflict(DailySchedule s1, DailySchedule s2) {
        ScheduleConflict conflict = new ScheduleConflict();
        conflict.setConflictType("SCHEDULE_OVERLAP");
        conflict.setSeverity("HIGH");
        conflict.setDayOfWeek(s1.getScheduledDate().getDayOfWeek());
        conflict.setStudentId(s1.getStudentProfile().getId());
        conflict.setStudentName(s1.getStudentProfile().getUser().getFullName());
        
        conflict.setEntry1SubjectName(s1.getSubject().getName());
        conflict.setEntry1StartTime(s1.getStartTime().toString());
        conflict.setEntry1EndTime(s1.getEndTime().toString());
        conflict.setScheduleId1(s1.getId());
        
        conflict.setEntry2SubjectName(s2.getSubject().getName());
        conflict.setEntry2StartTime(s2.getStartTime().toString());
        conflict.setEntry2EndTime(s2.getEndTime().toString());
        conflict.setScheduleId2(s2.getId());
        
        conflict.setConflictDescription(String.format(
            "Schedule conflict on %s: %s (%s-%s) overlaps with %s (%s-%s)",
            s1.getScheduledDate(),
            s1.getSubject().getName(), s1.getStartTime(), s1.getEndTime(),
            s2.getSubject().getName(), s2.getStartTime(), s2.getEndTime()
        ));
        
        return conflict;
    }

    // ============================================================
    // DTO CLASSES
    // ============================================================

    /**
     * ✅ Enhanced ScheduleConflict with more fields
     */
    public static class ScheduleConflict {
        private Long timetableId;
        private Long studentId;
        private String studentName;
        private DayOfWeek dayOfWeek;
        private String entry1SubjectName;
        private String entry1StartTime;
        private String entry1EndTime;
        private String entry2SubjectName;
        private String entry2StartTime;
        private String entry2EndTime;
        private String conflictType;
        private String conflictDescription;
        private String severity; // HIGH, MEDIUM, LOW
        private Integer entryIndex;
        private Long scheduleId1;
        private Long scheduleId2;

        // Getters and setters
        public Long getTimetableId() { return timetableId; }
        public void setTimetableId(Long timetableId) { this.timetableId = timetableId; }

        public Long getStudentId() { return studentId; }
        public void setStudentId(Long studentId) { this.studentId = studentId; }

        public String getStudentName() { return studentName; }
        public void setStudentName(String studentName) { this.studentName = studentName; }

        public DayOfWeek getDayOfWeek() { return dayOfWeek; }
        public void setDayOfWeek(DayOfWeek dayOfWeek) { this.dayOfWeek = dayOfWeek; }

        public String getEntry1SubjectName() { return entry1SubjectName; }
        public void setEntry1SubjectName(String entry1SubjectName) { 
            this.entry1SubjectName = entry1SubjectName; 
        }

        public String getEntry1StartTime() { return entry1StartTime; }
        public void setEntry1StartTime(String entry1StartTime) { 
            this.entry1StartTime = entry1StartTime; 
        }

        public String getEntry1EndTime() { return entry1EndTime; }
        public void setEntry1EndTime(String entry1EndTime) { 
            this.entry1EndTime = entry1EndTime; 
        }

        public String getEntry2SubjectName() { return entry2SubjectName; }
        public void setEntry2SubjectName(String entry2SubjectName) { 
            this.entry2SubjectName = entry2SubjectName; 
        }

        public String getEntry2StartTime() { return entry2StartTime; }
        public void setEntry2StartTime(String entry2StartTime) { 
            this.entry2StartTime = entry2StartTime; 
        }

        public String getEntry2EndTime() { return entry2EndTime; }
        public void setEntry2EndTime(String entry2EndTime) { 
            this.entry2EndTime = entry2EndTime; 
        }

        public String getConflictType() { return conflictType; }
        public void setConflictType(String conflictType) { 
            this.conflictType = conflictType; 
        }

        public String getConflictDescription() { return conflictDescription; }
        public void setConflictDescription(String conflictDescription) { 
            this.conflictDescription = conflictDescription; 
        }

        public String getSeverity() { return severity; }
        public void setSeverity(String severity) { this.severity = severity; }

        public Integer getEntryIndex() { return entryIndex; }
        public void setEntryIndex(Integer entryIndex) { this.entryIndex = entryIndex; }

        public Long getScheduleId1() { return scheduleId1; }
        public void setScheduleId1(Long scheduleId1) { this.scheduleId1 = scheduleId1; }

        public Long getScheduleId2() { return scheduleId2; }
        public void setScheduleId2(Long scheduleId2) { this.scheduleId2 = scheduleId2; }
    }

    /**
     * ✅ Enhanced ConflictSummary with more analytics
     */
    public static class ConflictSummary {
        private Long timetableId;
        private Long studentId;
        private String studentName;
        private boolean hasConflicts;
        private int totalConflicts;
        private List<ScheduleConflict> conflicts;
        private Map<DayOfWeek, Long> conflictsByDay;
        private Map<String, Long> conflictsByType;
        private Map<String, Long> conflictsBySeverity;

        // Getters and setters
        public Long getTimetableId() { return timetableId; }
        public void setTimetableId(Long timetableId) { this.timetableId = timetableId; }

        public Long getStudentId() { return studentId; }
        public void setStudentId(Long studentId) { this.studentId = studentId; }

        public String getStudentName() { return studentName; }
        public void setStudentName(String studentName) { this.studentName = studentName; }

        public boolean isHasConflicts() { return hasConflicts; }
        public void setHasConflicts(boolean hasConflicts) { this.hasConflicts = hasConflicts; }

        public int getTotalConflicts() { return totalConflicts; }
        public void setTotalConflicts(int totalConflicts) { this.totalConflicts = totalConflicts; }

        public List<ScheduleConflict> getConflicts() { return conflicts; }
        public void setConflicts(List<ScheduleConflict> conflicts) { this.conflicts = conflicts; }

        public Map<DayOfWeek, Long> getConflictsByDay() { return conflictsByDay; }
        public void setConflictsByDay(Map<DayOfWeek, Long> conflictsByDay) { 
            this.conflictsByDay = conflictsByDay; 
        }

        public Map<String, Long> getConflictsByType() { return conflictsByType; }
        public void setConflictsByType(Map<String, Long> conflictsByType) { 
            this.conflictsByType = conflictsByType; 
        }

        public Map<String, Long> getConflictsBySeverity() { return conflictsBySeverity; }
        public void setConflictsBySeverity(Map<String, Long> conflictsBySeverity) { 
            this.conflictsBySeverity = conflictsBySeverity; 
        }
    }
}