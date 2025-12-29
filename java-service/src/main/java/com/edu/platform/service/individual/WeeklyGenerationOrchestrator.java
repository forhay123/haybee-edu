package com.edu.platform.service.individual;

import com.edu.platform.model.*;
import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.model.assessment.AssessmentInstance;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.model.individual.IndividualStudentTimetable;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.*;
import com.edu.platform.repository.assessment.AssessmentRepository;
import com.edu.platform.repository.individual.IndividualTimetableRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * SPRINT 3: Weekly Generation Orchestrator
 * 
 * High-level service that orchestrates the complete weekly schedule generation workflow:
 * 1. Archive previous week
 * 2. Delete old schedules
 * 3. Generate new schedules
 * 4. Create assessment instances (multi-period shuffling)
 * 5. Initialize progress records
 * 6. Link progress/schedules together
 * 7. Handle missing topics
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class WeeklyGenerationOrchestrator {

    // Repositories
    private final IndividualTimetableRepository timetableRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final DailyScheduleRepository scheduleRepository;
    private final SubjectRepository subjectRepository;
    private final LessonTopicRepository lessonTopicRepository;
    private final AssessmentRepository assessmentRepository;
    
    // Services
    private final TermWeekCalculator termWeekCalculator;
    private final ArchivalService archivalService;
    private final IndividualLessonAssigner lessonAssigner;
    private final AssessmentShufflingService assessmentShufflingService;
    private final IndividualProgressInitializer progressInitializer;
    private final ProgressLinkingService progressLinkingService;
    private final PublicHolidayService publicHolidayService;

    /**
     * Main orchestration method - generates schedules for a given week
     */
    @Transactional
    public WeeklyGenerationResult generateWeeklySchedules(Integer weekNumber) {
        log.info("========================================");
        log.info("WEEKLY GENERATION ORCHESTRATOR: Week {}", weekNumber);
        log.info("========================================");

        WeeklyGenerationResult result = new WeeklyGenerationResult();
        result.setWeekNumber(weekNumber);
        result.setGenerationStartTime(LocalDateTime.now());

        try {
            // Step 1: Validate term and week
            Term term = validateTermAndWeek(weekNumber);
            result.setTermId(term.getId());
            result.setTermName(term.getName());

            // Step 2: Get week date range
            LocalDate[] weekRange = termWeekCalculator.getWeekDateRange(weekNumber);
            LocalDate weekStart = weekRange[0];
            LocalDate weekEnd = weekRange[1];
            result.setWeekStartDate(weekStart);
            result.setWeekEndDate(weekEnd);

            log.info("Week {} range: {} to {}", weekNumber, weekStart, weekEnd);

            // Step 3: Archive previous week (if not first week)
            if (weekNumber > 1) {
                archivePreviousWeek(weekNumber - 1, term, result);
            }

            // Step 4: Check for Saturday holiday
            checkSaturdayHoliday(weekStart, result);

            // Step 5: Get all INDIVIDUAL students with timetables
            List<StudentProfile> students = getEligibleStudents();
            result.setStudentsProcessed(students.size());
            log.info("Found {} eligible INDIVIDUAL students", students.size());

            // Step 6: Generate schedules for each student
            for (StudentProfile student : students) {
                try {
                    StudentGenerationResult studentResult = generateForStudent(
                        student, weekNumber, weekStart, weekEnd, term
                    );
                    aggregateStudentResult(result, studentResult);
                } catch (Exception e) {
                    log.error("Failed to generate for student {}: {}", student.getId(), e.getMessage(), e);
                    result.addFailedStudent(student.getId(), e.getMessage());
                }
            }

            result.setSuccess(true);
            log.info("✅ Weekly generation COMPLETE: {} schedules, {} progress records",
                result.getSchedulesCreated(), result.getProgressRecordsCreated());

        } catch (Exception e) {
            log.error("❌ Weekly generation FAILED: {}", e.getMessage(), e);
            result.setSuccess(false);
            result.setErrorMessage(e.getMessage());
        }

        result.setGenerationEndTime(LocalDateTime.now());
        return result;
    }

    /**
     * Validate term and week number
     */
    private Term validateTermAndWeek(Integer weekNumber) {
        Optional<Term> termOpt = termWeekCalculator.getActiveTerm();
        if (termOpt.isEmpty()) {
            throw new IllegalStateException("No active term found");
        }

        Term term = termOpt.get();
        if (weekNumber < 1 || weekNumber > term.getWeekCount()) {
            throw new IllegalArgumentException(
                String.format("Invalid week %d (term has %d weeks)", weekNumber, term.getWeekCount())
            );
        }

        return term;
    }

    /**
     * Archive previous week's data
     */
    private void archivePreviousWeek(Integer previousWeek, Term term, WeeklyGenerationResult result) {
        log.info("Archiving previous week {}", previousWeek);
        LocalDate[] prevRange = termWeekCalculator.getWeekDateRange(previousWeek);
        
        ArchivalService.ArchivalResult archivalResult = archivalService.archiveWeekData(
            prevRange[0], prevRange[1], term, previousWeek
        );
        
        result.setSchedulesArchived(archivalResult.getSchedulesArchived());
        result.setProgressRecordsArchived(archivalResult.getProgressRecordsArchived());
        
        log.info("Archived {} schedules, {} progress records", 
            archivalResult.getSchedulesArchived(), archivalResult.getProgressRecordsArchived());
    }

    /**
     * Check if Saturday is a public holiday
     */
    private void checkSaturdayHoliday(LocalDate weekStart, WeeklyGenerationResult result) {
        PublicHolidayService.ReschedulingInfo reschedulingInfo = 
            publicHolidayService.checkReschedulingNeeded(weekStart);
        
        if (reschedulingInfo != null) {
            result.setSaturdayHoliday(true);
            result.setHolidayName(reschedulingInfo.getHoliday().getHolidayName());
            log.info("Saturday holiday detected: {}", reschedulingInfo.getHoliday().getHolidayName());
        }
    }

    /**
     * Get eligible INDIVIDUAL students with completed timetables
     */
    private List<StudentProfile> getEligibleStudents() {
        return studentProfileRepository.findAll().stream()
            .filter(s -> s.getStudentType() == StudentType.INDIVIDUAL)
            .filter(s -> s.getUser() != null && s.getUser().isEnabled())
            .filter(this::hasCompletedTimetable)
            .collect(Collectors.toList());
    }

    /**
     * Check if student has a completed timetable
     */
    private boolean hasCompletedTimetable(StudentProfile student) {
        return timetableRepository
            .findFirstByStudentProfileAndProcessingStatusOrderByUploadedAtDesc(student, "COMPLETED")
            .isPresent();
    }

    /**
     * Generate schedules for a single student
     */
    private StudentGenerationResult generateForStudent(StudentProfile student, 
                                                       Integer weekNumber,
                                                       LocalDate weekStart, 
                                                       LocalDate weekEnd,
                                                       Term term) {
        log.debug("Generating for student {} (ID: {})", 
            student.getUser().getFullName(), student.getId());

        StudentGenerationResult result = new StudentGenerationResult();
        result.setStudentId(student.getId());

        // Get timetable
        IndividualStudentTimetable timetable = timetableRepository
            .findFirstByStudentProfileAndProcessingStatusOrderByUploadedAtDesc(student, "COMPLETED")
            .orElseThrow(() -> new IllegalStateException("No timetable found for student " + student.getId()));

        List<Map<String, Object>> entries = timetable.getExtractedEntries();
        if (entries == null || entries.isEmpty()) {
            log.warn("No timetable entries for student {}", student.getId());
            return result;
        }

        // Group entries by subject to detect multi-period subjects
        Map<Long, List<Map<String, Object>>> entriesBySubject = groupEntriesBySubject(entries);

        // Process each day of the week
        for (int dayOffset = 0; dayOffset < 7; dayOffset++) {
            LocalDate date = weekStart.plusDays(dayOffset);
            DayOfWeek dayOfWeek = date.getDayOfWeek();

            // Skip Sunday
            if (dayOfWeek == DayOfWeek.SUNDAY) {
                continue;
            }

            // Get entries for this day
            List<Map<String, Object>> dayEntries = getEntriesForDay(entries, dayOfWeek);

            for (Map<String, Object> entry : dayEntries) {
                DailySchedule schedule = createScheduleFromEntry(
                    student, entry, date, weekNumber, term, timetable
                );

                if (schedule != null) {
                    result.addSchedule(schedule);

                    if (schedule.getMissingLessonTopic() != null && schedule.getMissingLessonTopic()) {
                        result.addMissingTopic(schedule.getSubject(), schedule);
                    }
                }
            }
        }

        // After creating all schedules, process multi-period subjects
        processMultiPeriodSubjects(result.getSchedules(), weekNumber, result);

        return result;
    }

    /**
     * Group timetable entries by subject ID
     */
    private Map<Long, List<Map<String, Object>>> groupEntriesBySubject(List<Map<String, Object>> entries) {
        return entries.stream()
            .filter(e -> e.containsKey("subjectId") && e.get("subjectId") != null)
            .collect(Collectors.groupingBy(e -> ((Number) e.get("subjectId")).longValue()));
    }

    /**
     * Get entries for a specific day
     */
    private List<Map<String, Object>> getEntriesForDay(List<Map<String, Object>> entries, DayOfWeek dayOfWeek) {
        String dayName = dayOfWeek.name();
        return entries.stream()
            .filter(e -> dayName.equals(e.get("dayOfWeek")))
            .collect(Collectors.toList());
    }

    /**
     * Create a schedule from a timetable entry
     */
    private DailySchedule createScheduleFromEntry(StudentProfile student,
                                                  Map<String, Object> entry,
                                                  LocalDate date,
                                                  Integer weekNumber,
                                                  Term term,
                                                  IndividualStudentTimetable timetable) {
        try {
            // Parse entry data
            Integer periodNumber = ((Number) entry.get("periodNumber")).intValue();
            LocalTime startTime = LocalTime.parse((String) entry.get("startTime"));
            LocalTime endTime = LocalTime.parse((String) entry.get("endTime"));

            // Validate time window
            if (!termWeekCalculator.isDateInAllowedTimeWindow(date, startTime)) {
                log.debug("Skipping entry outside time window: {} at {}", entry.get("subjectName"), startTime);
                return null;
            }

            // Get subject
            Long subjectId = ((Number) entry.get("subjectId")).longValue();
            Subject subject = subjectRepository.findById(subjectId).orElse(null);
            if (subject == null) {
                log.warn("Subject {} not found", subjectId);
                return null;
            }

            // Create schedule
            DailySchedule schedule = DailySchedule.builder()
                .studentProfile(student)
                .scheduledDate(date)
                .dayOfWeek(date.getDayOfWeek().name())
                .periodNumber(periodNumber)
                .startTime(startTime)
                .endTime(endTime)
                .subject(subject)
                .scheduleSource("INDIVIDUAL")
                .individualTimetableId(timetable.getId())
                .completed(false)
                .build();

            // Try to assign lesson topic
            LessonTopic lessonTopic = lessonAssigner.assignLessonTopicForWeek(
                schedule, subject, weekNumber, term
            );

            schedule = scheduleRepository.save(schedule);
            log.debug("Created schedule {} for {} on {}", schedule.getId(), subject.getName(), date);

            return schedule;

        } catch (Exception e) {
            log.error("Failed to create schedule from entry: {}", entry, e);
            return null;
        }
    }

    /**
     * Process multi-period subjects:
     * - Group schedules by lesson topic
     * - Create shuffled assessment instances
     * - Initialize progress records
     * - Link everything together
     */
    private void processMultiPeriodSubjects(List<DailySchedule> schedules, 
                                           Integer weekNumber,
                                           StudentGenerationResult result) {
        // Group schedules by lesson topic (only those with topics assigned)
        Map<Long, List<DailySchedule>> schedulesByTopic = schedules.stream()
            .filter(s -> s.getLessonTopic() != null)
            .collect(Collectors.groupingBy(s -> s.getLessonTopic().getId()));

        for (Map.Entry<Long, List<DailySchedule>> entry : schedulesByTopic.entrySet()) {
            List<DailySchedule> topicSchedules = entry.getValue();
            
            if (topicSchedules.size() == 1) {
                // Single period - simpler processing
                processSinglePeriodLesson(topicSchedules.get(0), result);
            } else {
                // Multi-period - full shuffle logic
                processMultiPeriodLesson(topicSchedules, weekNumber, result);
            }
        }
    }

    /**
     * Process a single-period lesson
     */
    private void processSinglePeriodLesson(DailySchedule schedule, StudentGenerationResult result) {
        try {
            // Set single period info
            schedule.setPeriodSequence(1);
            schedule.setTotalPeriodsForTopic(1);
            schedule.setAllAssessmentsCompleted(false);
            scheduleRepository.save(schedule);

            // Create progress record
            LocalDateTime windowStart = termWeekCalculator.calculateAssessmentWindowStart(
                schedule.getScheduledDate(), schedule.getStartTime()
            );
            LocalDateTime windowEnd = termWeekCalculator.calculateAssessmentWindowEnd(
                schedule.getScheduledDate(), schedule.getEndTime()
            );

            StudentLessonProgress progress = progressInitializer.createProgressRecord(
                schedule, schedule.getAssessment(), windowStart, windowEnd
            );

            result.incrementProgressRecordsCreated();
            log.debug("Created single-period progress for schedule {}", schedule.getId());

        } catch (Exception e) {
            log.error("Failed to process single-period lesson: {}", e.getMessage(), e);
        }
    }

    /**
     * Process a multi-period lesson with shuffled assessments
     */
    private void processMultiPeriodLesson(List<DailySchedule> schedules, 
                                         Integer weekNumber,
                                         StudentGenerationResult result) {
        try {
            // Sort by date/time to ensure correct sequence
            schedules.sort(Comparator.comparing(DailySchedule::getScheduledDate)
                .thenComparing(DailySchedule::getStartTime));

            LessonTopic topic = schedules.get(0).getLessonTopic();
            int periodCount = schedules.size();

            log.info("Processing multi-period lesson: {} ({} periods)", topic.getTitle(), periodCount);

            // Get base assessment
            List<Assessment> assessments = assessmentRepository.findByLessonTopicId(topic.getId());
            Assessment baseAssessment = assessments.isEmpty() ? null : assessments.get(0);

            List<AssessmentInstance> instances = null;
            if (baseAssessment != null) {
                // Create shuffled assessment instances
                instances = assessmentShufflingService.createShuffledInstances(
                    baseAssessment, topic, periodCount, weekNumber
                );
                result.incrementAssessmentInstancesCreated(instances.size());
            } else {
                log.warn("No assessment found for topic: {}", topic.getTitle());
            }

            // Create progress records for each period
            List<StudentLessonProgress> progressRecords = new ArrayList<>();
            for (int i = 0; i < schedules.size(); i++) {
                DailySchedule schedule = schedules.get(i);
                AssessmentInstance instance = instances != null && i < instances.size() ? instances.get(i) : null;

                // Update schedule with instance
                if (instance != null) {
                    schedule.setAssessmentInstanceId(instance.getId());
                }

                // Calculate assessment window
                LocalDateTime windowStart = termWeekCalculator.calculateAssessmentWindowStart(
                    schedule.getScheduledDate(), schedule.getStartTime()
                );
                LocalDateTime windowEnd = termWeekCalculator.calculateAssessmentWindowEnd(
                    schedule.getScheduledDate(), schedule.getEndTime()
                );

                // Create progress
                StudentLessonProgress progress = progressInitializer.createProgressRecord(
                    schedule, 
                    instance != null ? instance.getBaseAssessment() : null,
                    windowStart, 
                    windowEnd
                );

                progressRecords.add(progress);
                result.incrementProgressRecordsCreated();
            }

            // Link schedules together
            progressLinkingService.linkSchedules(schedules);

            // Link progress records together
            progressLinkingService.linkProgressRecords(progressRecords);

            log.info("✅ Multi-period lesson processed: {} schedules, {} progress, {} instances",
                schedules.size(), progressRecords.size(), instances != null ? instances.size() : 0);

        } catch (Exception e) {
            log.error("Failed to process multi-period lesson: {}", e.getMessage(), e);
        }
    }

    /**
     * Aggregate student result into overall result
     */
    private void aggregateStudentResult(WeeklyGenerationResult result, StudentGenerationResult studentResult) {
        result.incrementSchedulesCreated(studentResult.getSchedules().size());
        result.incrementProgressRecordsCreated(studentResult.getProgressRecordsCreated());
        result.incrementAssessmentInstancesCreated(studentResult.getAssessmentInstancesCreated());

        // Add missing topics
        for (Map.Entry<Subject, List<DailySchedule>> entry : studentResult.getMissingTopics().entrySet()) {
            result.addMissingTopics(entry.getKey(), entry.getValue());
        }
    }

    // ============================================================
    // RESULT DTOs
    // ============================================================

    public static class WeeklyGenerationResult {
        private boolean success;
        private Integer weekNumber;
        private Long termId;
        private String termName;
        private LocalDate weekStartDate;
        private LocalDate weekEndDate;
        private int studentsProcessed;
        private int schedulesCreated;
        private int progressRecordsCreated;
        private int assessmentInstancesCreated;
        private int schedulesArchived;
        private int progressRecordsArchived;
        private boolean saturdayHoliday;
        private String holidayName;
        private Map<Subject, List<DailySchedule>> missingTopicsBySubject = new HashMap<>();
        private Map<Long, String> failedStudents = new HashMap<>();
        private LocalDateTime generationStartTime;
        private LocalDateTime generationEndTime;
        private String errorMessage;

        // Getters and setters
        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }

        public Integer getWeekNumber() { return weekNumber; }
        public void setWeekNumber(Integer weekNumber) { this.weekNumber = weekNumber; }

        public Long getTermId() { return termId; }
        public void setTermId(Long termId) { this.termId = termId; }

        public String getTermName() { return termName; }
        public void setTermName(String termName) { this.termName = termName; }

        public LocalDate getWeekStartDate() { return weekStartDate; }
        public void setWeekStartDate(LocalDate weekStartDate) { this.weekStartDate = weekStartDate; }

        public LocalDate getWeekEndDate() { return weekEndDate; }
        public void setWeekEndDate(LocalDate weekEndDate) { this.weekEndDate = weekEndDate; }

        public int getStudentsProcessed() { return studentsProcessed; }
        public void setStudentsProcessed(int studentsProcessed) { this.studentsProcessed = studentsProcessed; }

        public int getSchedulesCreated() { return schedulesCreated; }
        public void incrementSchedulesCreated(int count) { this.schedulesCreated += count; }

        public int getProgressRecordsCreated() { return progressRecordsCreated; }
        public void incrementProgressRecordsCreated(int count) { this.progressRecordsCreated += count; }

        public int getAssessmentInstancesCreated() { return assessmentInstancesCreated; }
        public void incrementAssessmentInstancesCreated(int count) { this.assessmentInstancesCreated += count; }

        public int getSchedulesArchived() { return schedulesArchived; }
        public void setSchedulesArchived(int schedulesArchived) { this.schedulesArchived = schedulesArchived; }

        public int getProgressRecordsArchived() { return progressRecordsArchived; }
        public void setProgressRecordsArchived(int progressRecordsArchived) { 
            this.progressRecordsArchived = progressRecordsArchived; 
        }

        public boolean isSaturdayHoliday() { return saturdayHoliday; }
        public void setSaturdayHoliday(boolean saturdayHoliday) { this.saturdayHoliday = saturdayHoliday; }

        public String getHolidayName() { return holidayName; }
        public void setHolidayName(String holidayName) { this.holidayName = holidayName; }

        public Map<Subject, List<DailySchedule>> getMissingTopicsBySubject() { 
            return missingTopicsBySubject; 
        }

        public void addMissingTopics(Subject subject, List<DailySchedule> schedules) {
            missingTopicsBySubject.computeIfAbsent(subject, k -> new ArrayList<>()).addAll(schedules);
        }

        public int getMissingTopicsCount() { return missingTopicsBySubject.size(); }

        public Map<Long, String> getFailedStudents() { return failedStudents; }
        public void addFailedStudent(Long studentId, String error) { 
            failedStudents.put(studentId, error); 
        }

        public LocalDateTime getGenerationStartTime() { return generationStartTime; }
        public void setGenerationStartTime(LocalDateTime generationStartTime) { 
            this.generationStartTime = generationStartTime; 
        }

        public LocalDateTime getGenerationEndTime() { return generationEndTime; }
        public void setGenerationEndTime(LocalDateTime generationEndTime) { 
            this.generationEndTime = generationEndTime; 
        }

        public String getErrorMessage() { return errorMessage; }
        public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

        public long getDurationSeconds() {
            if (generationStartTime != null && generationEndTime != null) {
                return java.time.Duration.between(generationStartTime, generationEndTime).getSeconds();
            }
            return 0;
        }
    }

    public static class StudentGenerationResult {
        private Long studentId;
        private List<DailySchedule> schedules = new ArrayList<>();
        private int progressRecordsCreated;
        private int assessmentInstancesCreated;
        private Map<Subject, List<DailySchedule>> missingTopics = new HashMap<>();

        public Long getStudentId() { return studentId; }
        public void setStudentId(Long studentId) { this.studentId = studentId; }

        public List<DailySchedule> getSchedules() { return schedules; }
        public void addSchedule(DailySchedule schedule) { schedules.add(schedule); }

        public int getProgressRecordsCreated() { return progressRecordsCreated; }
        public void incrementProgressRecordsCreated() { this.progressRecordsCreated++; }

        public int getAssessmentInstancesCreated() { return assessmentInstancesCreated; }
        public void incrementAssessmentInstancesCreated(int count) { 
            this.assessmentInstancesCreated += count; 
        }

        public Map<Subject, List<DailySchedule>> getMissingTopics() { return missingTopics; }
        public void addMissingTopic(Subject subject, DailySchedule schedule) {
            missingTopics.computeIfAbsent(subject, k -> new ArrayList<>()).add(schedule);
        }
    }
}