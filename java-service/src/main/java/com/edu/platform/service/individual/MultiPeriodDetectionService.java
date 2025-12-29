package com.edu.platform.service.individual;

import com.edu.platform.model.DailySchedule;
import com.edu.platform.model.Subject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service to detect and manage multi-period subjects in weekly schedules.
 * Identifies when a subject appears multiple times in a week and determines
 * the sequence order (1st, 2nd, 3rd period).
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MultiPeriodDetectionService {

    // ============================================================
    // NEW CLASSES FOR MULTI-PERIOD ANALYSIS
    // ============================================================

    /**
     * Result of analyzing a week's schedules for multi-period subjects
     */
    public static class MultiPeriodAnalysis {
        private final List<SubjectPeriodInfo> multiPeriodSubjects;
        private final List<Subject> singlePeriodSubjects;
        private final int totalSchedules;

        public MultiPeriodAnalysis(List<SubjectPeriodInfo> multiPeriodSubjects, 
                                  List<Subject> singlePeriodSubjects,
                                  int totalSchedules) {
            this.multiPeriodSubjects = multiPeriodSubjects;
            this.singlePeriodSubjects = singlePeriodSubjects;
            this.totalSchedules = totalSchedules;
        }

        public List<SubjectPeriodInfo> getMultiPeriodSubjects() { return multiPeriodSubjects; }
        public List<Subject> getSinglePeriodSubjects() { return singlePeriodSubjects; }
        public int getTotalSchedules() { return totalSchedules; }
    }

    /**
     * Information about a multi-period subject
     */
    public static class SubjectPeriodInfo {
        private final Subject subject;
        private final List<DailySchedule> periods;
        private final int periodCount;

        public SubjectPeriodInfo(Subject subject, List<DailySchedule> periods) {
            this.subject = subject;
            this.periods = periods;
            this.periodCount = periods.size();
        }

        public Subject getSubject() { return subject; }
        public List<DailySchedule> getPeriods() { return periods; }
        public int getPeriodCount() { return periodCount; }
    }

    /**
     * ✅ NEW: Main analysis method used by IndividualScheduleGenerator
     * Analyzes a week's schedules and identifies multi-period subjects
     */
    public MultiPeriodAnalysis analyzeWeekSchedules(List<DailySchedule> schedules) {
        log.debug("🔍 Analyzing {} schedules for multi-period subjects", schedules.size());

        // Group schedules by subject
        Map<Long, List<DailySchedule>> schedulesBySubject = schedules.stream()
                .filter(s -> s.getSubject() != null)
                .collect(Collectors.groupingBy(s -> s.getSubject().getId()));

        List<SubjectPeriodInfo> multiPeriodSubjects = new ArrayList<>();
        List<Subject> singlePeriodSubjects = new ArrayList<>();

        for (Map.Entry<Long, List<DailySchedule>> entry : schedulesBySubject.entrySet()) {
            List<DailySchedule> subjectSchedules = entry.getValue();
            Subject subject = subjectSchedules.get(0).getSubject();

            if (subjectSchedules.size() > 1) {
                // Multi-period subject - sort chronologically
                List<DailySchedule> sortedPeriods = subjectSchedules.stream()
                        .sorted(Comparator.comparing(DailySchedule::getScheduledDate)
                                .thenComparing(DailySchedule::getStartTime))
                        .collect(Collectors.toList());
                
                multiPeriodSubjects.add(new SubjectPeriodInfo(subject, sortedPeriods));
                
                log.debug("  📚 {} - {} periods", subject.getName(), sortedPeriods.size());
            } else {
                // Single period subject
                singlePeriodSubjects.add(subject);
            }
        }

        log.info("✅ Found {} multi-period subjects, {} single-period subjects", 
                multiPeriodSubjects.size(), singlePeriodSubjects.size());

        return new MultiPeriodAnalysis(multiPeriodSubjects, singlePeriodSubjects, schedules.size());
    }

    // ============================================================
    // EXISTING CLASSES (Keep for backward compatibility)
    // ============================================================

    /**
     * Result object containing period detection information
     */
    public static class PeriodSequenceInfo {
        private final Long subjectId;
        private final String subjectName;
        private final int totalPeriods;
        private final List<SchedulePeriodInfo> periods;

        public PeriodSequenceInfo(Long subjectId, String subjectName, int totalPeriods, List<SchedulePeriodInfo> periods) {
            this.subjectId = subjectId;
            this.subjectName = subjectName;
            this.totalPeriods = totalPeriods;
            this.periods = periods;
        }

        public Long getSubjectId() { return subjectId; }
        public String getSubjectName() { return subjectName; }
        public int getTotalPeriods() { return totalPeriods; }
        public List<SchedulePeriodInfo> getPeriods() { return periods; }
    }

    /**
     * Information about a specific period in a sequence
     */
    public static class SchedulePeriodInfo {
        private final Long scheduleId;
        private final LocalDate scheduledDate;
        private final int periodNumber;
        private final int sequenceNumber;
        private final boolean isFirst;
        private final boolean isLast;

        public SchedulePeriodInfo(Long scheduleId, LocalDate scheduledDate, int periodNumber, 
                                 int sequenceNumber, int totalInSequence) {
            this.scheduleId = scheduleId;
            this.scheduledDate = scheduledDate;
            this.periodNumber = periodNumber;
            this.sequenceNumber = sequenceNumber;
            this.isFirst = (sequenceNumber == 1);
            this.isLast = (sequenceNumber == totalInSequence);
        }

        public Long getScheduleId() { return scheduleId; }
        public LocalDate getScheduledDate() { return scheduledDate; }
        public int getPeriodNumber() { return periodNumber; }
        public int getSequenceNumber() { return sequenceNumber; }
        public boolean isFirst() { return isFirst; }
        public boolean isLast() { return isLast; }
    }

    /**
     * Detect all multi-period subjects in a list of schedules
     * @param schedules List of schedules for a week
     * @return Map of subject ID to period sequence information
     */
    public Map<Long, PeriodSequenceInfo> detectMultiPeriodSubjects(List<DailySchedule> schedules) {
        log.debug("Detecting multi-period subjects from {} schedules", schedules.size());

        // Group schedules by subject
        Map<Long, List<DailySchedule>> schedulesBySubject = schedules.stream()
                .filter(s -> s.getSubject() != null)
                .collect(Collectors.groupingBy(s -> s.getSubject().getId()));

        Map<Long, PeriodSequenceInfo> result = new HashMap<>();

        // Process each subject
        for (Map.Entry<Long, List<DailySchedule>> entry : schedulesBySubject.entrySet()) {
            Long subjectId = entry.getKey();
            List<DailySchedule> subjectSchedules = entry.getValue();

            // Only interested in subjects appearing 2+ times
            if (subjectSchedules.size() > 1) {
                PeriodSequenceInfo info = createPeriodSequenceInfo(subjectSchedules);
                result.put(subjectId, info);
                
                log.debug("Detected multi-period subject: {} with {} periods", 
                         info.getSubjectName(), info.getTotalPeriods());
            }
        }

        return result;
    }

    /**
     * Check if a subject appears multiple times in the schedules
     * @param schedules List of schedules
     * @param subjectId Subject to check
     * @return true if subject appears 2+ times
     */
    public boolean isMultiPeriodSubject(List<DailySchedule> schedules, Long subjectId) {
        long count = schedules.stream()
                .filter(s -> s.getSubject() != null)
                .filter(s -> s.getSubject().getId().equals(subjectId))
                .count();
        
        return count > 1;
    }

    /**
     * Get the sequence number for a specific schedule within its subject group
     * @param schedules All schedules for the week
     * @param targetScheduleId The schedule to find sequence for
     * @return Sequence number (1, 2, 3) or null if not found or single period
     */
    public Integer getSequenceNumber(List<DailySchedule> schedules, Long targetScheduleId) {
        DailySchedule targetSchedule = schedules.stream()
                .filter(s -> s.getId().equals(targetScheduleId))
                .findFirst()
                .orElse(null);

        if (targetSchedule == null || targetSchedule.getSubject() == null) {
            return null;
        }

        // Get all schedules for the same subject
        List<DailySchedule> sameSubjectSchedules = schedules.stream()
                .filter(s -> s.getSubject() != null)
                .filter(s -> s.getSubject().getId().equals(targetSchedule.getSubject().getId()))
                .sorted(Comparator.comparing(DailySchedule::getScheduledDate)
                        .thenComparing(DailySchedule::getPeriodNumber))
                .collect(Collectors.toList());

        // Single period - no sequence
        if (sameSubjectSchedules.size() <= 1) {
            return null;
        }

        // Find position in sequence
        for (int i = 0; i < sameSubjectSchedules.size(); i++) {
            if (sameSubjectSchedules.get(i).getId().equals(targetScheduleId)) {
                return i + 1; // 1-based indexing
            }
        }

        return null;
    }

    /**
     * Get period sequence information for a specific subject
     * @param schedules All schedules for the week
     * @param subjectId Subject to analyze
     * @return Period sequence info or null if not multi-period
     */
    public PeriodSequenceInfo getPeriodSequenceInfo(List<DailySchedule> schedules, Long subjectId) {
        List<DailySchedule> subjectSchedules = schedules.stream()
                .filter(s -> s.getSubject() != null)
                .filter(s -> s.getSubject().getId().equals(subjectId))
                .collect(Collectors.toList());

        if (subjectSchedules.size() <= 1) {
            return null;
        }

        return createPeriodSequenceInfo(subjectSchedules);
    }

    /**
     * Check if a schedule is the first period in its sequence
     * @param schedules All schedules for the week
     * @param scheduleId Schedule to check
     * @return true if this is the first period
     */
    public boolean isFirstPeriod(List<DailySchedule> schedules, Long scheduleId) {
        Integer sequence = getSequenceNumber(schedules, scheduleId);
        return sequence != null && sequence == 1;
    }

    /**
     * Check if a schedule is the last period in its sequence
     * @param schedules All schedules for the week
     * @param scheduleId Schedule to check
     * @return true if this is the last period
     */
    public boolean isLastPeriod(List<DailySchedule> schedules, Long scheduleId) {
        Integer sequence = getSequenceNumber(schedules, scheduleId);
        if (sequence == null) {
            return false;
        }

        DailySchedule targetSchedule = schedules.stream()
                .filter(s -> s.getId().equals(scheduleId))
                .findFirst()
                .orElse(null);

        if (targetSchedule == null || targetSchedule.getSubject() == null) {
            return false;
        }

        long totalPeriods = schedules.stream()
                .filter(s -> s.getSubject() != null)
                .filter(s -> s.getSubject().getId().equals(targetSchedule.getSubject().getId()))
                .count();

        return sequence == totalPeriods;
    }

    /**
     * Find the previous period schedule in a sequence
     * @param schedules All schedules for the week
     * @param currentScheduleId Current schedule
     * @return Previous schedule or null if this is the first period
     */
    public DailySchedule findPreviousPeriod(List<DailySchedule> schedules, Long currentScheduleId) {
        DailySchedule current = schedules.stream()
                .filter(s -> s.getId().equals(currentScheduleId))
                .findFirst()
                .orElse(null);

        if (current == null || current.getSubject() == null) {
            return null;
        }

        // Get all schedules for same subject, sorted by date
        List<DailySchedule> sameSubjectSchedules = schedules.stream()
                .filter(s -> s.getSubject() != null)
                .filter(s -> s.getSubject().getId().equals(current.getSubject().getId()))
                .sorted(Comparator.comparing(DailySchedule::getScheduledDate)
                        .thenComparing(DailySchedule::getPeriodNumber))
                .collect(Collectors.toList());

        // Find current position
        for (int i = 0; i < sameSubjectSchedules.size(); i++) {
            if (sameSubjectSchedules.get(i).getId().equals(currentScheduleId)) {
                // Return previous if exists
                if (i > 0) {
                    return sameSubjectSchedules.get(i - 1);
                }
                break;
            }
        }

        return null;
    }

    /**
     * Find the next period schedule in a sequence
     * @param schedules All schedules for the week
     * @param currentScheduleId Current schedule
     * @return Next schedule or null if this is the last period
     */
    public DailySchedule findNextPeriod(List<DailySchedule> schedules, Long currentScheduleId) {
        DailySchedule current = schedules.stream()
                .filter(s -> s.getId().equals(currentScheduleId))
                .findFirst()
                .orElse(null);

        if (current == null || current.getSubject() == null) {
            return null;
        }

        // Get all schedules for same subject, sorted by date
        List<DailySchedule> sameSubjectSchedules = schedules.stream()
                .filter(s -> s.getSubject() != null)
                .filter(s -> s.getSubject().getId().equals(current.getSubject().getId()))
                .sorted(Comparator.comparing(DailySchedule::getScheduledDate)
                        .thenComparing(DailySchedule::getPeriodNumber))
                .collect(Collectors.toList());

        // Find current position
        for (int i = 0; i < sameSubjectSchedules.size(); i++) {
            if (sameSubjectSchedules.get(i).getId().equals(currentScheduleId)) {
                // Return next if exists
                if (i < sameSubjectSchedules.size() - 1) {
                    return sameSubjectSchedules.get(i + 1);
                }
                break;
            }
        }

        return null;
    }

    // ============================================================
    // PRIVATE HELPER METHODS
    // ============================================================

    /**
     * Create period sequence info from a list of schedules for the same subject
     */
    private PeriodSequenceInfo createPeriodSequenceInfo(List<DailySchedule> subjectSchedules) {
        // Sort by date and period number
        List<DailySchedule> sorted = subjectSchedules.stream()
                .sorted(Comparator.comparing(DailySchedule::getScheduledDate)
                        .thenComparing(DailySchedule::getPeriodNumber))
                .collect(Collectors.toList());

        // Get subject info from first schedule
        DailySchedule first = sorted.get(0);
        Subject subject = first.getSubject();
        Long subjectId = subject.getId();
        String subjectName = subject.getName();
        int totalPeriods = sorted.size();

        // Build period info list
        List<SchedulePeriodInfo> periods = new ArrayList<>();
        for (int i = 0; i < sorted.size(); i++) {
            DailySchedule schedule = sorted.get(i);
            SchedulePeriodInfo periodInfo = new SchedulePeriodInfo(
                    schedule.getId(),
                    schedule.getScheduledDate(),
                    schedule.getPeriodNumber(),
                    i + 1, // Sequence number (1-based)
                    totalPeriods
            );
            periods.add(periodInfo);
        }

        return new PeriodSequenceInfo(subjectId, subjectName, totalPeriods, periods);
    }

    /**
     * Validate that multi-period detection is working correctly
     * @param schedules Schedules to validate
     * @return List of validation errors (empty if valid)
     */
    public List<String> validateMultiPeriodSetup(List<DailySchedule> schedules) {
        List<String> errors = new ArrayList<>();

        Map<Long, PeriodSequenceInfo> multiPeriodSubjects = detectMultiPeriodSubjects(schedules);

        for (PeriodSequenceInfo info : multiPeriodSubjects.values()) {
            // Check that each period has proper date progression
            List<SchedulePeriodInfo> periods = info.getPeriods();
            for (int i = 1; i < periods.size(); i++) {
                LocalDate prevDate = periods.get(i - 1).getScheduledDate();
                LocalDate currDate = periods.get(i).getScheduledDate();
                
                if (!currDate.isAfter(prevDate)) {
                    errors.add(String.format(
                            "Subject %s: Period %d date (%s) is not after Period %d date (%s)",
                            info.getSubjectName(), i + 1, currDate, i, prevDate));
                }
            }

            // Check sequence numbers are continuous
            for (int i = 0; i < periods.size(); i++) {
                int expectedSequence = i + 1;
                int actualSequence = periods.get(i).getSequenceNumber();
                if (expectedSequence != actualSequence) {
                    errors.add(String.format(
                            "Subject %s: Expected sequence %d but got %d",
                            info.getSubjectName(), expectedSequence, actualSequence));
                }
            }
        }

        return errors;
    }
}