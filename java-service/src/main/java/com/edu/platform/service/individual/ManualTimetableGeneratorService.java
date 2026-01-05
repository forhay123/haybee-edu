package com.edu.platform.service.individual;

import com.edu.platform.dto.individual.ManualTimetableCreationRequest;
import com.edu.platform.dto.individual.ManualTimetableCreationResponse;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.exception.ValidationException;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.model.Term;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.model.individual.IndividualStudentTimetable;
import com.edu.platform.repository.StudentProfileRepository;
import com.edu.platform.repository.SubjectRepository;
import com.edu.platform.repository.individual.IndividualTimetableRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

/**
 * Service for generating virtual timetables from manually selected subjects
 * 
 * Key Features:
 * - Accepts 4-10 subjects
 * - Distributes subjects evenly across Mon-Fri (2 periods/day)
 * - Generates Week 1-12 schedules immediately
 * - No file upload or AI processing needed
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ManualTimetableGeneratorService {
    
    private final StudentProfileRepository studentProfileRepository;
    private final SubjectRepository subjectRepository;
    private final IndividualTimetableRepository timetableRepository;
    private final IndividualScheduleGenerator scheduleGenerator;
    private final TermWeekCalculator termWeekCalculator;
    private final PublicHolidayService publicHolidayService;
    
    // Configuration constants
    private static final int MIN_SUBJECTS = 4;
    private static final int MAX_SUBJECTS = 10;
    private static final int PERIODS_PER_DAY = 2;
    private static final String[] WEEKDAYS = {"MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"};
    
    // Default time slots (Mon-Fri: 4pm-6pm, Sat: 12pm-3pm)
    private static final String WEEKDAY_START_TIME = "16:00";
    private static final String WEEKDAY_SLOT1_END = "17:00";
    private static final String WEEKDAY_SLOT2_START = "17:00";
    private static final String WEEKDAY_SLOT2_END = "18:00";
    
    /**
     * Main entry point: Create virtual timetable from selected subjects
     */
    @Transactional
    public ManualTimetableCreationResponse generateVirtualTimetable(
            ManualTimetableCreationRequest request) {
        
        log.info("========================================");
        log.info("🎯 MANUAL TIMETABLE GENERATION STARTED");
        log.info("========================================");
        log.info("Student: {}", request.getStudentProfileId());
        log.info("Subjects: {} selected", request.getSubjectIds().size());
        
        // Step 1: Validate request
        validateRequest(request);
        
        // Step 2: Get student profile
        StudentProfile student = studentProfileRepository.findById(request.getStudentProfileId())
            .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + request.getStudentProfileId()));
        
        // Step 3: Validate student is INDIVIDUAL type
        if (student.getStudentType() != StudentType.INDIVIDUAL) {
            throw new ValidationException("Only INDIVIDUAL students can use manual subject selection");
        }
        
        // Step 4: Check one-timetable rule
        validateNoExistingTimetable(student);
        
        // Step 5: Fetch and validate subjects
        List<Subject> subjects = fetchAndValidateSubjects(request.getSubjectIds());
        
        // Step 6: Build timetable entries with balanced distribution
        List<Map<String, Object>> entries = buildTimetableEntries(subjects);
        
        // Step 7: Create virtual timetable record
        IndividualStudentTimetable timetable = createVirtualTimetable(student, request, subjects, entries);
        
        // Step 8: Generate Week 1-12 schedules
        int schedulesCreated = generateSchedulesForAllWeeks(student, timetable);
        
        log.info("========================================");
        log.info("✅ MANUAL TIMETABLE GENERATION COMPLETE");
        log.info("========================================");
        log.info("Timetable ID: {}", timetable.getId());
        log.info("Schedules Created: {}", schedulesCreated);
        
        // Step 9: Build response
        LocalDate[] weekRange = termWeekCalculator.getWeekDateRange(1);
        
        return ManualTimetableCreationResponse.builder()
            .success(true)
            .timetableId(timetable.getId())
            .schedulesCreated(schedulesCreated)
            .message("Schedule created successfully from selected subjects")
            .weekStart(weekRange != null ? weekRange[0] : null)
            .weekEnd(weekRange != null ? weekRange[1] : null)
            .subjectsSelected(subjects.size())
            .academicYear(request.getAcademicYear())
            .build();
    }
    
    /**
     * Validate request constraints
     */
    private void validateRequest(ManualTimetableCreationRequest request) {
        if (request.getSubjectIds() == null || request.getSubjectIds().isEmpty()) {
            throw new ValidationException("Subject IDs are required");
        }
        
        if (request.getSubjectIds().size() < MIN_SUBJECTS) {
            throw new ValidationException(
                String.format("Must select at least %d subjects. Selected: %d", 
                    MIN_SUBJECTS, request.getSubjectIds().size())
            );
        }
        
        if (request.getSubjectIds().size() > MAX_SUBJECTS) {
            throw new ValidationException(
                String.format("Cannot select more than %d subjects. Selected: %d", 
                    MAX_SUBJECTS, request.getSubjectIds().size())
            );
        }
        
        // Check for duplicates
        Set<Long> uniqueIds = new HashSet<>(request.getSubjectIds());
        if (uniqueIds.size() != request.getSubjectIds().size()) {
            throw new ValidationException("Duplicate subjects detected");
        }
        
        log.info("✅ Request validation passed");
    }
    
    /**
     * Validate student has no existing timetable (one-timetable rule)
     */
    private void validateNoExistingTimetable(StudentProfile student) {
        List<IndividualStudentTimetable> existing = timetableRepository
            .findByStudentProfileIdOrderByUploadedAtDesc(student.getId());
        
        long activeCount = existing.stream()
            .filter(t -> !"DELETED".equals(t.getProcessingStatus()))
            .count();
        
        if (activeCount > 0) {
            throw new ValidationException(
                "You already have a timetable. Please delete it before creating a new one."
            );
        }
        
        log.info("✅ No existing timetable found");
    }
    
    /**
     * Fetch subjects from database and validate they exist
     */
    private List<Subject> fetchAndValidateSubjects(List<Long> subjectIds) {
        List<Subject> subjects = subjectRepository.findAllById(subjectIds);
        
        if (subjects.size() != subjectIds.size()) {
            Set<Long> foundIds = subjects.stream()
                .map(Subject::getId)
                .collect(java.util.stream.Collectors.toSet());
            
            List<Long> missingIds = subjectIds.stream()
                .filter(id -> !foundIds.contains(id))
                .collect(java.util.stream.Collectors.toList());
            
            throw new ValidationException(
                "Some subjects not found: " + missingIds
            );
        }
        
        log.info("✅ All {} subjects validated", subjects.size());
        return subjects;
    }
    
    /**
     * Build timetable entries with balanced subject distribution
     * 
     * Strategy: Round-robin distribution across weekdays
     * - Each day gets 2 periods (4pm-5pm, 5pm-6pm)
     * - Subjects are cycled through days
     * - Each subject appears approximately equally
     */
    private List<Map<String, Object>> buildTimetableEntries(List<Subject> subjects) {
        log.info("📋 Building timetable entries for {} subjects", subjects.size());
        
        List<Map<String, Object>> entries = new ArrayList<>();
        int subjectIndex = 0;
        int totalSubjects = subjects.size();
        int entryCounter = 0;
        
        // Distribute across weekdays (Mon-Fri)
        for (String day : WEEKDAYS) {
            // Period 1: 4pm-5pm
            Subject subject1 = subjects.get(subjectIndex % totalSubjects);
            entries.add(createEntry(
                day, 
                1, 
                WEEKDAY_START_TIME, 
                WEEKDAY_SLOT1_END, 
                subject1,
                ++entryCounter
            ));
            subjectIndex++;
            
            // Period 2: 5pm-6pm
            Subject subject2 = subjects.get(subjectIndex % totalSubjects);
            entries.add(createEntry(
                day, 
                2, 
                WEEKDAY_SLOT2_START, 
                WEEKDAY_SLOT2_END, 
                subject2,
                ++entryCounter
            ));
            subjectIndex++;
        }
        
        log.info("✅ Created {} timetable entries (10 periods across 5 days)", entries.size());
        logSubjectDistribution(entries, subjects);
        
        return entries;
    }
    
    /**
     * Create a single timetable entry
     */
    private Map<String, Object> createEntry(
            String dayOfWeek,
            int periodNumber,
            String startTime,
            String endTime,
            Subject subject,
            int entryId) {
        
        Map<String, Object> entry = new HashMap<>();
        entry.put("id", entryId);
        entry.put("dayOfWeek", dayOfWeek);
        entry.put("periodNumber", periodNumber);
        entry.put("startTime", startTime);
        entry.put("endTime", endTime);
        entry.put("subjectId", subject.getId());
        entry.put("subjectName", subject.getName());
        entry.put("subjectCode", subject.getCode());
        entry.put("mappingConfidence", 1.0); // Manual selection = 100% confidence
        entry.put("source", "MANUAL_SELECTION");
        
        return entry;
    }
    
    /**
     * Log subject distribution for verification
     */
    private void logSubjectDistribution(List<Map<String, Object>> entries, List<Subject> subjects) {
        Map<String, Long> distribution = new HashMap<>();
        
        for (Map<String, Object> entry : entries) {
            String subjectName = (String) entry.get("subjectName");
            distribution.put(subjectName, distribution.getOrDefault(subjectName, 0L) + 1);
        }
        
        log.info("📊 Subject Distribution:");
        distribution.forEach((name, count) -> 
            log.info("   {} → {} periods", name, count)
        );
    }
    
    /**
     * Create virtual timetable record
     */
    private IndividualStudentTimetable createVirtualTimetable(
            StudentProfile student,
            ManualTimetableCreationRequest request,
            List<Subject> subjects,
            List<Map<String, Object>> entries) {
        
        log.info("💾 Creating virtual timetable record...");
        
        // Get term if specified
        Term term = null;
        if (request.getTermId() != null) {
            term = termWeekCalculator.getActiveTerm()
                .orElse(null);
        }
        
        String academicYear = request.getAcademicYear() != null 
            ? request.getAcademicYear() 
            : "2024/2025";
        
        IndividualStudentTimetable timetable = IndividualStudentTimetable.builder()
            .studentProfile(student)
            .classEntity(student.getClassLevel()) // ✅ StudentProfile has classLevel field
            .term(term)
            .academicYear(academicYear)
            .originalFilename("Manual Selection - " + subjects.size() + " subjects")
            .fileUrl(null) // No file for manual selection
            .fileType("MANUAL")
            .fileSizeBytes(0L)
            .uploadType("MANUAL") // ✅ Mark as manual
            .processingStatus("COMPLETED") // Instant completion
            .uploadedAt(Instant.now())
            .processedAt(Instant.now()) // Processed immediately
            .totalPeriodsExtracted(entries.size())
            .subjectsIdentified(subjects.size())
            .confidenceScore(BigDecimal.ONE) // 100% confidence
            .extractedEntries(entries)
            .build();
        
        timetable = timetableRepository.save(timetable);
        
        log.info("✅ Virtual timetable created: ID {}", timetable.getId());
        
        return timetable;
    }
    
    /**
     * Generate schedules for Week 1-12
     */
    private int generateSchedulesForAllWeeks(
            StudentProfile student,
            IndividualStudentTimetable timetable) {
        
        log.info("🔄 Generating schedules for Week 1-12...");
        
        Optional<Term> termOpt = termWeekCalculator.getActiveTerm();
        if (termOpt.isEmpty()) {
            throw new ValidationException("No active term found. Cannot generate schedules.");
        }
        
        Term term = termOpt.get();
        int totalSchedulesCreated = 0;
        
        for (int week = 1; week <= 12; week++) {
            try {
                LocalDate[] weekRange = termWeekCalculator.getWeekDateRange(week);
                if (weekRange == null) {
                    log.warn("⚠️ Could not get date range for week {}", week);
                    continue;
                }
                
                LocalDate weekStart = weekRange[0];
                LocalDate weekEnd = weekRange[1];
                
                // Check for Saturday holidays/rescheduling
                PublicHolidayService.ReschedulingInfo reschedulingInfo = 
                    publicHolidayService.checkReschedulingNeeded(weekStart);
                
                // Generate schedules for this week
                IndividualScheduleGenerator.StudentGenerationResult result = 
                    scheduleGenerator.processStudentInNewTransaction(
                        student, week, weekStart, weekEnd, term, reschedulingInfo
                    );
                
                totalSchedulesCreated += result.getSchedulesCreated();
                
                log.info("✅ Week {} complete: {} schedules created", week, result.getSchedulesCreated());
                
            } catch (Exception e) {
                log.error("❌ Failed to generate schedules for week {}: {}", week, e.getMessage(), e);
                // Continue with next week
            }
        }
        
        log.info("✅ Total schedules created: {}", totalSchedulesCreated);
        
        return totalSchedulesCreated;
    }
}