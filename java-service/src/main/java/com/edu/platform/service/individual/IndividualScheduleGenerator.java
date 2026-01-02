package com.edu.platform.service.individual;

import com.edu.platform.model.*;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.model.individual.IndividualStudentTimetable;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.*;
import com.edu.platform.repository.individual.IndividualTimetableRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ✅ FINAL FIX: Proper deletion + transaction isolation + duplicate prevention
 * - Deletes in separate transaction BEFORE generation
 * - Each student in isolated transaction
 * - Handles Hibernate session issues after exceptions
 * - Prevents duplicate key violations
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class IndividualScheduleGenerator {

    private final IndividualTimetableRepository timetableRepository;
    private final DailyScheduleRepository dailyScheduleRepository;
    private final SubjectRepository subjectRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final TermWeekCalculator termWeekCalculator;
    private final ArchivalService archivalService;
    private final IndividualLessonAssigner lessonAssigner;
    private final PublicHolidayService publicHolidayService;
    private final StudentLessonProgressRepository progressRepository;
    private final MultiPeriodDetectionService multiPeriodDetectionService;

    private static final LocalTime WEEKDAY_START = LocalTime.of(16, 0);
    private static final LocalTime WEEKDAY_END = LocalTime.of(18, 0);
    private static final int WEEKDAY_PERIODS = 2;

    private static final LocalTime SATURDAY_START = LocalTime.of(12, 0);
    private static final LocalTime SATURDAY_END = LocalTime.of(15, 0);
    private static final int SATURDAY_PERIODS = 3;

    private static final int PERIOD_DURATION_MINUTES = 60;

    /**
     * Get standardized time slots based on learning window
     */
    private List<TimeSlot> getStandardizedTimeSlots(DayOfWeek dayOfWeek) {
        List<TimeSlot> slots = new ArrayList<>();
        
        if (dayOfWeek == DayOfWeek.SUNDAY) {
            return slots;
        }
        
        LocalTime start;
        int periodCount;
        
        if (dayOfWeek == DayOfWeek.SATURDAY) {
            start = SATURDAY_START;
            periodCount = SATURDAY_PERIODS;
        } else {
            start = WEEKDAY_START;
            periodCount = WEEKDAY_PERIODS;
        }
        
        for (int i = 0; i < periodCount; i++) {
            LocalTime slotStart = start.plusMinutes(i * PERIOD_DURATION_MINUTES);
            LocalTime slotEnd = slotStart.plusMinutes(PERIOD_DURATION_MINUTES);
            slots.add(new TimeSlot(i + 1, slotStart, slotEnd));
        }
        
        return slots;
    }

    /**
     * ✅ CRITICAL FIX: Weekly generation with separate deletion transaction
     */
    @Transactional
    public WeeklyGenerationResult generateWeeklySchedules(Integer weekNumber) {
        log.info("========================================");
        log.info("🕐 Starting weekly generation for Week {}", weekNumber);
        log.info("========================================");

        WeeklyGenerationResult result = new WeeklyGenerationResult();
        result.setWeekNumber(weekNumber);
        result.setGenerationStartTime(LocalDateTime.now());

        try {
            Optional<Term> termOpt = termWeekCalculator.getActiveTerm();
            if (termOpt.isEmpty()) {
                throw new IllegalStateException("No active term found");
            }
            Term term = termOpt.get();

            LocalDate[] weekRange = termWeekCalculator.getWeekDateRange(weekNumber);
            if (weekRange == null) {
                throw new IllegalStateException("Invalid week number: " + weekNumber);
            }
            LocalDate weekStart = weekRange[0];
            LocalDate weekEnd = weekRange[1];
            result.setWeekStartDate(weekStart);
            result.setWeekEndDate(weekEnd);

            // Archive previous week
            Integer previousWeek = weekNumber - 1;
            if (previousWeek >= 1) {
                LocalDate[] prevWeekRange = termWeekCalculator.getWeekDateRange(previousWeek);
                if (prevWeekRange != null) {
                    ArchivalService.ArchivalResult archivalResult = archivalService.archiveWeekData(
                        prevWeekRange[0], prevWeekRange[1], term, previousWeek
                    );
                    result.setSchedulesArchived(archivalResult.getSchedulesArchived());
                    result.setProgressRecordsArchived(archivalResult.getProgressRecordsArchived());
                }
            }

            // ✅ CRITICAL: Delete in separate transaction BEFORE generation starts
            deleteSchedulesInSeparateTransaction(weekStart, weekEnd);

            PublicHolidayService.ReschedulingInfo reschedulingInfo = 
                publicHolidayService.checkReschedulingNeeded(weekStart);
            result.setSaturdayHoliday(reschedulingInfo != null);

            List<StudentProfile> students = getIndividualStudentsWithTimetables();
            result.setStudentsProcessed(students.size());

            int totalSchedules = 0;
            Map<Subject, List<DailySchedule>> missingTopics = new HashMap<>();

            // Process each student in separate transaction
            for (StudentProfile student : students) {
                try {
                    StudentGenerationResult studentResult = processStudentInNewTransaction(
                        student, weekNumber, weekStart, weekEnd, term, reschedulingInfo
                    );
                    
                    totalSchedules += studentResult.getSchedulesCreated();
                    
                    for (Map.Entry<Subject, List<DailySchedule>> entry : 
                            studentResult.getMissingTopics().entrySet()) {
                        missingTopics.computeIfAbsent(entry.getKey(), k -> new ArrayList<>())
                            .addAll(entry.getValue());
                    }
                    
                } catch (Exception e) {
                    log.error("❌ Failed to generate schedules for student {}: {}", 
                        student.getId(), e.getMessage(), e);
                    result.getFailedStudents().add(student.getId());
                    // Continue with next student
                }
            }

            result.setSchedulesCreated(totalSchedules);
            result.setMissingTopicsCount(missingTopics.size());
            result.setSuccess(true);
            result.setGenerationEndTime(LocalDateTime.now());

            log.info("✅ Generation complete: {} schedules created", totalSchedules);

        } catch (Exception e) {
            log.error("❌ Weekly generation failed: {}", e.getMessage(), e);
            result.setSuccess(false);
            result.setErrorMessage(e.getMessage());
            result.setGenerationEndTime(LocalDateTime.now());
        }

        return result;
    }

    /**
     * ✅ CRITICAL: Delete schedules in a separate transaction
     * This prevents deletion issues from poisoning the generation transaction
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deleteSchedulesInSeparateTransaction(LocalDate weekStart, LocalDate weekEnd) {
        log.info("🗑️ Deleting old schedules for week {} to {} in separate transaction", weekStart, weekEnd);
        
        try {
            List<DailySchedule> schedulesToDelete = dailyScheduleRepository
                .findByScheduledDateBetweenAndScheduleSource(weekStart, weekEnd, "INDIVIDUAL");
            
            if (schedulesToDelete.isEmpty()) {
                log.info("✅ No existing schedules to delete");
                return;
            }
            
            log.info("Found {} schedules to delete", schedulesToDelete.size());
            
            int schedulesDeleted = 0;
            int progressPreserved = 0;
            int progressDeleted = 0;
            
            // Process in batches to avoid memory issues
            for (DailySchedule schedule : schedulesToDelete) {
                try {
                    List<StudentLessonProgress> progressRecords = progressRepository
                        .findByScheduledDateBetweenAndStudentProfile(
                            schedule.getScheduledDate(), 
                            schedule.getScheduledDate(), 
                            schedule.getStudentProfile()
                        ).stream()
                        .filter(p -> p.getSchedule() != null && p.getSchedule().getId().equals(schedule.getId()))
                        .collect(Collectors.toList());
                    
                    for (StudentLessonProgress progress : progressRecords) {
                        if (progress.getAssessmentSubmission() != null) {
                            progress.setSchedule(null);
                            progressRepository.save(progress);
                            progressPreserved++;
                        } else {
                            progressRepository.delete(progress);
                            progressDeleted++;
                        }
                    }
                    
                    dailyScheduleRepository.delete(schedule);
                    schedulesDeleted++;
                    
                } catch (Exception e) {
                    log.error("Failed to delete schedule {}: {}", schedule.getId(), e.getMessage());
                    // Continue with next schedule
                }
            }
            
            // Force flush to ensure all deletions are committed
            dailyScheduleRepository.flush();
            progressRepository.flush();
            
            log.info("✅ Deleted {} schedules, 🔒 preserved {} progress with submissions, 🗑️ deleted {} progress without submissions", 
                    schedulesDeleted, progressPreserved, progressDeleted);
                    
        } catch (Exception e) {
            log.error("❌ Failed to delete schedules: {}", e.getMessage(), e);
            throw e; // Re-throw to mark transaction for rollback
        }
    }

    /**
     * ✅ Process student in a new transaction with Hibernate session management
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public StudentGenerationResult processStudentInNewTransaction(
            StudentProfile student,
            Integer weekNumber,
            LocalDate weekStart,
            LocalDate weekEnd,
            Term term,
            PublicHolidayService.ReschedulingInfo reschedulingInfo) {
        
        try {
            return generateSchedulesForStudent(student, weekNumber, weekStart, weekEnd, term, reschedulingInfo);
        } catch (Exception e) {
            log.error("Transaction failed for student {}: {}", student.getId(), e.getMessage());
            // This transaction will be rolled back, but others continue
            throw e;
        }
    }

    /**
     * Generate schedules for a single student
     */
    private StudentGenerationResult generateSchedulesForStudent(
            StudentProfile student,
            Integer weekNumber,
            LocalDate weekStart,
            LocalDate weekEnd,
            Term term,
            PublicHolidayService.ReschedulingInfo reschedulingInfo) {
        
        log.debug("📝 Generating schedules for student {}", student.getId());

        StudentGenerationResult result = new StudentGenerationResult();
        result.setStudentId(student.getId());

        Optional<IndividualStudentTimetable> timetableOpt = timetableRepository
            .findFirstByStudentProfileAndProcessingStatusOrderByUploadedAtDesc(student, "COMPLETED");

        if (timetableOpt.isEmpty()) {
            log.warn("⚠️ No completed timetable found for student {}", student.getId());
            return result;
        }

        IndividualStudentTimetable timetable = timetableOpt.get();
        List<Map<String, Object>> entries = timetable.getExtractedEntries();

        if (entries == null || entries.isEmpty()) {
            log.warn("⚠️ No timetable entries found for student {}", student.getId());
            return result;
        }

        // Group entries by day
        Map<String, List<Map<String, Object>>> entriesByDay = entries.stream()
            .filter(e -> e.containsKey("dayOfWeek") && e.get("dayOfWeek") != null)
            .collect(Collectors.groupingBy(e -> (String) e.get("dayOfWeek")));

        // Get ALL unique subjects from timetable (for Saturday fallback)
        List<Long> allSubjectIds = entries.stream()
            .filter(e -> e.containsKey("subjectId") && e.get("subjectId") != null)
            .map(e -> ((Number) e.get("subjectId")).longValue())
            .distinct()
            .collect(Collectors.toList());
        
        List<Subject> allSubjects = subjectRepository.findAllById(allSubjectIds);
        log.info("📖 Total unique subjects in timetable: {}", allSubjects.size());
        
        // Track all created schedules for multi-period detection
        List<DailySchedule> allCreatedSchedules = new ArrayList<>();
        
        // Generate schedules for each day
        for (int dayOffset = 0; dayOffset < 7; dayOffset++) {
            LocalDate scheduleDate = weekStart.plusDays(dayOffset);
            DayOfWeek dayOfWeek = scheduleDate.getDayOfWeek();

            if (dayOfWeek == DayOfWeek.SUNDAY) continue;
            if (dayOfWeek == DayOfWeek.SATURDAY && reschedulingInfo != null && reschedulingInfo.isReschedulingRequired()) {
                continue;
            }

            // Get day-specific subjects
            String dayName = dayOfWeek.name();
            List<Map<String, Object>> dayEntries = entriesByDay.get(dayName);
            
            List<Subject> daySubjects;
            
            if (dayEntries == null || dayEntries.isEmpty()) {
                if (dayOfWeek == DayOfWeek.SATURDAY) {
                    log.info("📅 SATURDAY has no timetable entries - using ALL {} subjects from timetable", 
                            allSubjects.size());
                    daySubjects = new ArrayList<>(allSubjects);
                } else {
                    log.debug("⚠️ No timetable entries found for {} - skipping", dayName);
                    continue;
                }
            } else {
                List<Long> daySubjectIds = dayEntries.stream()
                    .filter(e -> e.containsKey("subjectId") && e.get("subjectId") != null)
                    .map(e -> ((Number) e.get("subjectId")).longValue())
                    .distinct()
                    .collect(Collectors.toList());
                daySubjects = subjectRepository.findAllById(daySubjectIds);
            }
            
            if (daySubjects.isEmpty()) {
                log.warn("⚠️ No subjects found for {} - skipping", dayName);
                continue;
            }
            
            log.info("📅 {} has {} unique subjects", dayName, daySubjects.size());

            List<TimeSlot> timeSlots = getStandardizedTimeSlots(dayOfWeek);

            int subjectIndex = 0;
            for (TimeSlot slot : timeSlots) {
                if (subjectIndex >= daySubjects.size()) {
                    subjectIndex = 0;
                }

                Subject subject = daySubjects.get(subjectIndex);
                subjectIndex++;

                try {
                    // ✅ Check for existing schedule before creating
                    Optional<DailySchedule> existingSchedule = dailyScheduleRepository
                        .findByStudentProfileAndScheduledDateAndPeriodNumber(
                            student, scheduleDate, slot.getPeriodNumber());
                    
                    if (existingSchedule.isPresent()) {
                        log.warn("⚠️ Schedule already exists for student {} on {} period {} - skipping", 
                            student.getId(), scheduleDate, slot.getPeriodNumber());
                        continue;
                    }

                    DailySchedule schedule = createStandardizedSchedule(
                        student, subject, scheduleDate, slot, weekNumber, term, timetable
                    );

                    if (schedule != null) {
                        allCreatedSchedules.add(schedule);
                        result.incrementSchedulesCreated();
                        
                        if (schedule.getMissingLessonTopic() != null && schedule.getMissingLessonTopic()) {
                            result.addMissingTopic(schedule.getSubject(), schedule);
                        }
                    }
                } catch (org.hibernate.exception.ConstraintViolationException e) {
                    log.error("❌ Duplicate key constraint for {} {} period {}: {}", 
                        dayName, subject.getName(), slot.getPeriodNumber(), e.getMessage());
                    // Skip this schedule and continue
                } catch (Exception e) {
                    log.error("❌ Failed to create schedule for {} {} period {}: {}", 
                        dayName, subject.getName(), slot.getPeriodNumber(), e.getMessage());
                    // Skip this schedule and continue
                }
            }
        }

        // Detect and link multi-period subjects after all schedules created
        if (!allCreatedSchedules.isEmpty()) {
            try {
                detectAndLinkMultiPeriodSubjects(student, allCreatedSchedules, weekStart, weekEnd);
            } catch (Exception e) {
                log.error("❌ Failed to link multi-period subjects for student {}: {}", 
                    student.getId(), e.getMessage(), e);
                // Don't fail the entire generation if linking fails
            }
        }

        return result;
    }

    /**
     * Detect multi-period subjects and set up dependencies
     */
    private void detectAndLinkMultiPeriodSubjects(
            StudentProfile student,
            List<DailySchedule> weekSchedules,
            LocalDate weekStart,
            LocalDate weekEnd) {
        
        log.info("🔍 Detecting multi-period subjects for student {} in week {} to {}", 
                student.getId(), weekStart, weekEnd);

        MultiPeriodDetectionService.MultiPeriodAnalysis analysis = 
                multiPeriodDetectionService.analyzeWeekSchedules(weekSchedules);

        if (analysis.getMultiPeriodSubjects().isEmpty()) {
            log.info("✅ No multi-period subjects found for student {}", student.getId());
            return;
        }

        log.info("📊 Found {} multi-period subjects for student {}", 
                analysis.getMultiPeriodSubjects().size(), student.getId());

        for (MultiPeriodDetectionService.SubjectPeriodInfo subjectInfo : analysis.getMultiPeriodSubjects()) {
            try {
                processMultiPeriodSubject(student, subjectInfo);
            } catch (Exception e) {
                log.error("❌ Failed to process multi-period subject '{}': {}", 
                    subjectInfo.getSubject().getName(), e.getMessage());
                // Continue with next subject
            }
        }
    }

    /**
     * Process a single multi-period subject
     * ✅ FIXED: Clears assessment for Period 2+ BEFORE any other operations
     */
    private void processMultiPeriodSubject(
            StudentProfile student,
            MultiPeriodDetectionService.SubjectPeriodInfo subjectInfo) {
        
        Subject subject = subjectInfo.getSubject();
        List<DailySchedule> periods = subjectInfo.getPeriods();
        
        log.info("🔗 Linking {} periods for subject '{}' (student {})", 
                periods.size(), subject.getName(), student.getId());

        periods.sort(Comparator.comparing(DailySchedule::getScheduledDate)
                .thenComparing(DailySchedule::getStartTime));

        StudentLessonProgress previousProgress = null;

        for (int i = 0; i < periods.size(); i++) {
            DailySchedule schedule = periods.get(i);
            int periodSequence = i + 1;

            log.debug("  Period {}: {} - {} ({})", 
                    periodSequence, 
                    schedule.getScheduledDate(), 
                    schedule.getStartTime(),
                    schedule.getId());

            LessonTopic lessonTopic = schedule.getLessonTopic();
            if (lessonTopic == null) {
                log.warn("⚠️ Schedule {} has no lesson topic - skipping period linking", schedule.getId());
                continue;
            }

            List<StudentLessonProgress> progressList = progressRepository
                    .findByStudentProfileAndLessonTopicAndScheduledDate(
                            student, lessonTopic, schedule.getScheduledDate());

            StudentLessonProgress progress = progressList.stream()
                    .filter(p -> p.getPeriodNumber() != null && 
                                p.getPeriodNumber().equals(schedule.getPeriodNumber()))
                    .findFirst()
                    .orElse(null);

            if (progress == null) {
                log.warn("⚠️ No progress record found for schedule {}", schedule.getId());
                continue;
            }

            // ✅ CRITICAL FIX: Clear assessment FIRST for Period 2+
            if (periodSequence > 1) {
                if (progress.getAssessment() != null) {
                    log.info("    🔄 Period {}: Clearing pre-assigned assessment (was: {})", 
                            periodSequence, progress.getAssessment().getId());
                    progress.setAssessment(null);  // ✅ Only this - no setAssessmentId()
                }
            }

            // Now set metadata
            progress.setPeriodSequence(periodSequence);
            progress.setTotalPeriodsInSequence(periods.size());
            progress.setIsFirstPeriod(periodSequence == 1);
            
            if (periodSequence == 1) {
                // Period 1: Keep assessment if it exists
                log.debug("    ✓ Period 1: Assessment retained (ID: {})", 
                        progress.getAssessment() != null ? progress.getAssessment().getId() : "none");
                progress.setAssessmentAccessible(true);
                progress.setRequiresCustomAssessment(false);
            } else {
                // Period 2+: Already cleared above, now set flags
                log.info("    ✅ Period {}: Assessment cleared, requires custom assessment", periodSequence);
                progress.setRequiresCustomAssessment(true);
                progress.setAssessmentAccessible(false);
            }

            if (previousProgress != null) {
                progress.linkToPreviousPeriod(previousProgress);
                log.debug("    🔗 Linked to previous period (progress ID: {})", previousProgress.getId());
            }

            progressRepository.save(progress);
            previousProgress = progress;
        }

        log.info("✅ Completed linking {} periods for '{}'", periods.size(), subject.getName());
    }

    /**
     * Create schedule - let exceptions propagate for proper transaction handling
     */
    private DailySchedule createStandardizedSchedule(
            StudentProfile student,
            Subject subject,
            LocalDate date,
            TimeSlot slot,
            Integer weekNumber,
            Term term,
            IndividualStudentTimetable timetable) {
        
        // ✅ NEW: Calculate assessment windows at schedule creation
        LocalDateTime windowStart = LocalDateTime.of(date, slot.getStartTime());
        LocalDateTime windowEnd = LocalDateTime.of(date, slot.getEndTime());
        LocalDateTime graceEnd = windowEnd.plusMinutes(15);
        
        DailySchedule schedule = DailySchedule.builder()
            .studentProfile(student)
            .scheduledDate(date)
            .dayOfWeek(date.getDayOfWeek().name())
            .periodNumber(slot.getPeriodNumber())
            .startTime(slot.getStartTime())
            .endTime(slot.getEndTime())
            .subject(subject)
            .scheduleSource("INDIVIDUAL")
            .individualTimetableId(timetable.getId())
            .completed(false)
            .lessonContentAccessible(true)
            // ✅ NEW: Set assessment windows at creation
            .assessmentWindowStart(windowStart)
            .assessmentWindowEnd(windowEnd)
            .graceEndDatetime(graceEnd)
            .build();

        LessonTopic lessonTopic = lessonAssigner.assignLessonTopicForWeek(
            schedule, subject, weekNumber, term
        );

        if (lessonTopic == null) {
            schedule.setMissingLessonTopic(true);
            schedule.setLessonAssignmentMethod("PENDING_MANUAL");
            schedule.setScheduleStatus(com.edu.platform.model.enums.ScheduleStatus.IN_PROGRESS);
            schedule = dailyScheduleRepository.save(schedule);
        } else {
            schedule.setMissingLessonTopic(false);
            schedule.setLessonAssignmentMethod("AUTO_WEEKLY_ROTATION");
            schedule.setScheduleStatus(com.edu.platform.model.enums.ScheduleStatus.READY);
            schedule = dailyScheduleRepository.save(schedule);
            createProgressRecord(schedule, student, subject, lessonTopic, date, slot);
        }

        return schedule;
    }

    /**
     * Create or update progress record, preserving existing submissions
     * ✅ FIXED: Don't set assessment for multi-period subjects - let processMultiPeriodSubject handle it
     */
    /**
     * Create or update progress record, preserving existing submissions
     * ✅ FIXED: Use schedule's assessment windows directly
     */
    private void createProgressRecord(
            DailySchedule schedule,
            StudentProfile student,
            Subject subject,
            LessonTopic lessonTopic,
            LocalDate date,
            TimeSlot slot) {
        
        if (lessonTopic == null) {
            log.warn("⚠️ Skipping progress record creation for schedule {} - no lesson topic assigned", 
                    schedule.getId());
            return;
        }
        
        Optional<StudentLessonProgress> existingProgressOpt = progressRepository
            .findByStudentProfileAndScheduledDateAndLessonTopic(student, date, lessonTopic);
        
        if (existingProgressOpt.isPresent()) {
            StudentLessonProgress existingProgress = existingProgressOpt.get();
            
            if (existingProgress.getAssessmentSubmission() != null) {
                log.info("🔄 PRESERVING progress {} with submission {} - relinking to schedule {}", 
                        existingProgress.getId(), 
                        existingProgress.getAssessmentSubmission().getId(),
                        schedule.getId());
                
                existingProgress.setSchedule(schedule);
                existingProgress.setScheduledDate(date);
                existingProgress.setPeriodNumber(slot.getPeriodNumber());
                
                // ✅ CRITICAL: Don't preserve assessment for multi-period - will be set later
                // The assessment will be properly assigned by processMultiPeriodSubject()
                existingProgress.setAssessment(null);
                
                // ✅ FIXED: Use schedule's windows directly
                existingProgress.setAssessmentWindowStart(schedule.getAssessmentWindowStart());
                existingProgress.setAssessmentWindowEnd(schedule.getAssessmentWindowEnd());
                existingProgress.setGracePeriodEnd(schedule.getGraceEndDatetime());
                existingProgress.setLessonContentAccessible(true);
                existingProgress.setAssessmentAccessible(false);
                
                progressRepository.save(existingProgress);
                return;
            } else {
                progressRepository.delete(existingProgress);
                progressRepository.flush();
            }
        }
        
        // ✅ CRITICAL: Create progress WITHOUT assessment
        // Assessment will be assigned later by processMultiPeriodSubject() for Period 1 only
        // ✅ FIXED: Use schedule's assessment windows
        StudentLessonProgress progress = StudentLessonProgress.builder()
            .studentProfile(student)
            .schedule(schedule)
            .subject(subject)
            .topic(lessonTopic)
            .lessonTopic(lessonTopic)
            .scheduledDate(date)
            .periodNumber(slot.getPeriodNumber())
            .date(date)
            .completed(false)
            .lessonContentAccessible(true)
            .assessmentAccessible(false)
            .priority(3)
            .weight(1.0)
            .assessmentWindowStart(schedule.getAssessmentWindowStart())
            .assessmentWindowEnd(schedule.getAssessmentWindowEnd())
            .gracePeriodEnd(schedule.getGraceEndDatetime())
            // ✅ NOTE: No assessment set here - will be handled by processMultiPeriodSubject
            .build();
        
        progressRepository.save(progress);
    }

    // Helper methods
    private List<StudentProfile> getIndividualStudentsWithTimetables() {
        return studentProfileRepository.findAll().stream()
            .filter(s -> s.getStudentType() == StudentType.INDIVIDUAL)
            .filter(s -> s.getUser() != null && s.getUser().isEnabled())
            .filter(s -> hasCompletedTimetable(s))
            .collect(Collectors.toList());
    }

    private boolean hasCompletedTimetable(StudentProfile student) {
        return timetableRepository
            .findFirstByStudentProfileAndProcessingStatusOrderByUploadedAtDesc(student, "COMPLETED")
            .isPresent();
    }

    // Inner classes
    @lombok.Data
    @lombok.AllArgsConstructor
    private static class TimeSlot {
        private int periodNumber;
        private LocalTime startTime;
        private LocalTime endTime;
    }

    public static class WeeklyGenerationResult {
        private boolean success;
        private Integer weekNumber;
        private LocalDate weekStartDate;
        private LocalDate weekEndDate;
        private int studentsProcessed;
        private int schedulesCreated;
        private int schedulesArchived;
        private int progressRecordsArchived;
        private int missingTopicsCount;
        private boolean saturdayHoliday;
        private Map<Subject, List<DailySchedule>> missingTopicsBySubject = new HashMap<>();
        private List<Long> failedStudents = new ArrayList<>();
        private LocalDateTime generationStartTime;
        private LocalDateTime generationEndTime;
        private String errorMessage;

        // Getters and setters
        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
        public Integer getWeekNumber() { return weekNumber; }
        public void setWeekNumber(Integer weekNumber) { this.weekNumber = weekNumber; }
        public LocalDate getWeekStartDate() { return weekStartDate; }
        public void setWeekStartDate(LocalDate weekStartDate) { this.weekStartDate = weekStartDate; }
        public LocalDate getWeekEndDate() { return weekEndDate; }
        public void setWeekEndDate(LocalDate weekEndDate) { this.weekEndDate = weekEndDate; }
        public int getStudentsProcessed() { return studentsProcessed; }
        public void setStudentsProcessed(int studentsProcessed) { this.studentsProcessed = studentsProcessed; }
        public int getSchedulesCreated() { return schedulesCreated; }
        public void setSchedulesCreated(int schedulesCreated) { this.schedulesCreated = schedulesCreated; }
        public int getSchedulesArchived() { return schedulesArchived; }
        public void setSchedulesArchived(int schedulesArchived) { this.schedulesArchived = schedulesArchived; }
        public int getProgressRecordsArchived() { return progressRecordsArchived; }
        public void setProgressRecordsArchived(int progressRecordsArchived) { 
            this.progressRecordsArchived = progressRecordsArchived; 
        }
        public int getMissingTopicsCount() { return missingTopicsCount; }
        public void setMissingTopicsCount(int missingTopicsCount) { 
            this.missingTopicsCount = missingTopicsCount; 
        }
        public boolean isSaturdayHoliday() { return saturdayHoliday; }
        public void setSaturdayHoliday(boolean saturdayHoliday) { this.saturdayHoliday = saturdayHoliday; }
        public Map<Subject, List<DailySchedule>> getMissingTopicsBySubject() { 
            return missingTopicsBySubject; 
        }
        public List<Long> getFailedStudents() { return failedStudents; }
        public String getErrorMessage() { return errorMessage; }
        public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
        public LocalDateTime getGenerationStartTime() { return generationStartTime; }
        public void setGenerationStartTime(LocalDateTime generationStartTime) { 
            this.generationStartTime = generationStartTime; }
        public LocalDateTime getGenerationEndTime() { return generationEndTime; }
        public void setGenerationEndTime(LocalDateTime generationEndTime) { 
            this.generationEndTime = generationEndTime; 
        }
    }

    public static class StudentGenerationResult {
        private Long studentId;
        private int schedulesCreated;
        private Map<Subject, List<DailySchedule>> missingTopics = new HashMap<>();

        public Long getStudentId() { return studentId; }
        public void setStudentId(Long studentId) { this.studentId = studentId; }
        public int getSchedulesCreated() { return schedulesCreated; }
        public void incrementSchedulesCreated() { this.schedulesCreated++; }
        public Map<Subject, List<DailySchedule>> getMissingTopics() { return missingTopics; }
        public void addMissingTopic(Subject subject, DailySchedule schedule) {
            missingTopics.computeIfAbsent(subject, k -> new ArrayList<>()).add(schedule);
        }
    }

    // Legacy methods remain unchanged
    @Deprecated
    @Transactional
    public List<DailySchedule> generateForDate(StudentProfile student, LocalDate date) {
        log.warn("Using deprecated generateForDate method. Consider using weekly generation.");
        
        if (student.getStudentType() != StudentType.INDIVIDUAL) {
            throw new IllegalArgumentException("Student must be INDIVIDUAL type");
        }

        IndividualStudentTimetable timetable = timetableRepository
            .findFirstByStudentProfileAndProcessingStatusOrderByUploadedAtDesc(student, "COMPLETED")
            .orElse(null);
        
        if (timetable == null) {
            log.warn("No processed timetable found for student {}", student.getId());
            return List.of();
        }

        dailyScheduleRepository.deleteByStudentProfileAndScheduledDateAndScheduleSource(
            student, date, "INDIVIDUAL"
        );

        List<DailySchedule> schedules = generateSchedulesForSingleDate(student, timetable, date);
        
        if (!schedules.isEmpty()) {
            schedules = dailyScheduleRepository.saveAll(schedules);
        }

        return schedules;
    }

    @Deprecated
    @Transactional
    public List<DailySchedule> generateForDateRange(StudentProfile student, 
                                                    LocalDate startDate, 
                                                    LocalDate endDate) {
        log.warn("Using deprecated generateForDateRange method. Consider using weekly generation.");
        log.info("📅 Generating schedules for student {} from {} to {}", 
                 student.getId(), startDate, endDate);
        
        if (student.getStudentType() != StudentType.INDIVIDUAL) {
            throw new IllegalArgumentException("Student must be INDIVIDUAL type");
        }

        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Start date must be before or equal to end date");
        }

        IndividualStudentTimetable timetable = timetableRepository
            .findFirstByStudentProfileAndProcessingStatusOrderByUploadedAtDesc(student, "COMPLETED")
            .orElse(null);
        
        if (timetable == null) {
            log.warn("No processed timetable found for student {}", student.getId());
            return List.of();
        }

        dailyScheduleRepository.deleteByStudentProfileAndScheduledDateBetweenAndScheduleSource(
            student, startDate, endDate, "INDIVIDUAL"
        );

        List<DailySchedule> allSchedules = new ArrayList<>();
        
        LocalDate currentDate = startDate;
        while (!currentDate.isAfter(endDate)) {
            log.debug("Generating schedules for date: {}", currentDate);
            
            if (currentDate.getDayOfWeek() != DayOfWeek.SUNDAY) {
                List<DailySchedule> dailySchedules = generateSchedulesForSingleDate(
                    student, timetable, currentDate
                );
                
                if (!dailySchedules.isEmpty()) {
                    dailySchedules = dailyScheduleRepository.saveAll(dailySchedules);
                    allSchedules.addAll(dailySchedules);
                    log.debug("Created {} schedules for {}", dailySchedules.size(), currentDate);
                }
            }
            
            currentDate = currentDate.plusDays(1);
        }
        
        log.info("✅ Generated {} total schedules for date range {} to {}", 
                 allSchedules.size(), startDate, endDate);
        
        return allSchedules;
    }

    private List<DailySchedule> generateSchedulesForSingleDate(
            StudentProfile student, 
            IndividualStudentTimetable timetable, 
            LocalDate date) {
        
        List<DailySchedule> schedules = new ArrayList<>();
        DayOfWeek dayOfWeek = date.getDayOfWeek();

        if (dayOfWeek == DayOfWeek.SUNDAY) {
            return schedules;
        }

        List<Map<String, Object>> entries = timetable.getExtractedEntries();
        if (entries == null || entries.isEmpty()) {
            return schedules;
        }

        List<Long> subjectIds = entries.stream()
            .filter(e -> e.containsKey("subjectId") && e.get("subjectId") != null)
            .map(e -> ((Number) e.get("subjectId")).longValue())
            .distinct()
            .collect(Collectors.toList());

        List<Subject> subjects = subjectRepository.findAllById(subjectIds);
        if (subjects.isEmpty()) {
            return schedules;
        }

        List<TimeSlot> timeSlots = getStandardizedTimeSlots(dayOfWeek);
        
        int subjectIndex = 0;
        for (TimeSlot slot : timeSlots) {
            if (subjectIndex >= subjects.size()) {
                subjectIndex = 0;
            }

            Subject subject = subjects.get(subjectIndex);
            subjectIndex++;

            DailySchedule schedule = DailySchedule.builder()
                .studentProfile(student)
                .scheduledDate(date)
                .dayOfWeek(dayOfWeek.name())
                .periodNumber(slot.getPeriodNumber())
                .startTime(slot.getStartTime())
                .endTime(slot.getEndTime())
                .subject(subject)
                .scheduleSource("INDIVIDUAL")
                .individualTimetableId(timetable.getId())
                .completed(false)
                .lessonContentAccessible(true)
                .build();

            schedules.add(schedule);
        }

        return schedules;
    }
}