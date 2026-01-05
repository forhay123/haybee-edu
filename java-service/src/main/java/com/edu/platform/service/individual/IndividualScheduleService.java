package com.edu.platform.service.individual;

import com.edu.platform.dto.individual.IndividualDailyScheduleDto;
import com.edu.platform.mapper.DailyScheduleMapper;
import com.edu.platform.model.DailySchedule;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Term;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.DailyScheduleRepository;
import com.edu.platform.repository.StudentProfileRepository;
import com.edu.platform.repository.SubjectRepository;
import com.edu.platform.repository.individual.IndividualTimetableRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Service for managing INDIVIDUAL student daily schedules
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class IndividualScheduleService {
    
    private final DailyScheduleRepository scheduleRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final DailyScheduleMapper scheduleMapper;
    private final IndividualScheduleGenerator scheduleGenerator;
    private final StudentLessonProgressRepository progressRepository;
    
    
    private final TermWeekCalculator termWeekCalculator;
    private final PublicHolidayService publicHolidayService;
    

    private final JdbcTemplate jdbcTemplate;
    
    
    /**
     * Get schedule for a specific date
     * Auto-generates if not found
     * ✅ FIXED: Now properly maps progressId and status using period+subject key
     */
    @Transactional
    public List<IndividualDailyScheduleDto> getScheduleByDate(
            Long studentProfileId, 
            LocalDate date) {
        
        log.info("📅 Fetching schedule for student {} on {}", studentProfileId, date);
        
        StudentProfile student = studentProfileRepository.findById(studentProfileId)
            .orElseThrow(() -> new RuntimeException("Student not found: " + studentProfileId));
        
        // Get schedules
        List<DailySchedule> schedules = scheduleRepository
            .findByStudentProfileAndScheduledDateAndScheduleSourceOrderByPeriodNumber(
                student, date, "INDIVIDUAL");
        
        if (schedules.isEmpty()) {
            log.info("⚙️ No schedules found for date {}, generating...", date);
            schedules = scheduleGenerator.generateForDate(student, date);
        }
        
        // ✅ FETCH ALL PROGRESS RECORDS FOR THIS DATE AT ONCE
        List<StudentLessonProgress> progressRecords = progressRepository
            .findByStudentProfileAndScheduledDate(student, date);
        
        // ✅ Map by date+period+subject to prevent mismatches
        Map<String, StudentLessonProgress> progressMap = progressRecords.stream()
            .collect(Collectors.toMap(
                progress -> progress.getScheduledDate() + "-" + 
                           progress.getPeriodNumber() + "-" + 
                           progress.getSubject().getId(),
                progress -> progress,
                (existing, replacement) -> existing
            ));
        
        log.info("✅ Found {} progress records for date {}", progressRecords.size(), date);
        log.info("✅ Returning {} schedule entries for {}", schedules.size(), date);
        
        return schedules.stream()
            .map(schedule -> {
                // ✅ GET PROGRESS USING DATE+PERIOD+SUBJECT KEY
                String progressKey = schedule.getScheduledDate() + "-" + 
                                   schedule.getPeriodNumber() + "-" + 
                                   schedule.getSubject().getId();
                StudentLessonProgress progress = progressMap.get(progressKey);
                
                // ✅ Build DTO with proper status calculation
                IndividualDailyScheduleDto dto = buildScheduleDto(schedule, progress);
                
                if (progress != null) {
                    log.debug("✅ Mapped schedule {} period {} subject {} to progress {}", 
                        schedule.getId(), 
                        schedule.getPeriodNumber(), 
                        schedule.getSubject().getId(),
                        progress.getId());
                } else {
                    log.warn("⚠️ No progress found for schedule {} period {} subject {}", 
                        schedule.getId(), 
                        schedule.getPeriodNumber(),
                        schedule.getSubject().getId());
                }
                
                return dto;
            })
            .collect(Collectors.toList());
    }
    
    /**
     * Get schedules for a date range
     * Auto-generates if not found
     * ✅ FIXED: Now properly passes progress data with status calculation
     */
    @Transactional
    public List<IndividualDailyScheduleDto> getScheduleByDateRange(
            Long studentProfileId,
            LocalDate startDate,
            LocalDate endDate) {
        
        log.info("📅 Fetching schedules for student {} from {} to {}", 
                 studentProfileId, startDate, endDate);
        
        StudentProfile student = studentProfileRepository.findById(studentProfileId)
            .orElseThrow(() -> new RuntimeException("Student not found: " + studentProfileId));
        
        // Try to get existing INDIVIDUAL schedules for this range
        List<DailySchedule> schedules = scheduleRepository
            .findByStudentProfileAndScheduledDateBetweenAndScheduleSourceOrderByScheduledDateAscPeriodNumberAsc(
                student, startDate, endDate, "INDIVIDUAL");
        
        // If no schedules exist, generate them
        if (schedules.isEmpty()) {
            log.info("⚙️ No schedules found for range {} to {}, generating...", 
                     startDate, endDate);
            scheduleGenerator.generateForDateRange(student, startDate, endDate);
            
            // Fetch the newly generated schedules
            schedules = scheduleRepository
                .findByStudentProfileAndScheduledDateBetweenAndScheduleSourceOrderByScheduledDateAscPeriodNumberAsc(
                    student, startDate, endDate, "INDIVIDUAL");
        }
        
        // ✅ FETCH ALL PROGRESS RECORDS FOR THIS DATE RANGE AT ONCE
        List<StudentLessonProgress> progressRecords = progressRepository
            .findByStudentProfileAndScheduledDateBetween(student, startDate, endDate);
        
        // ✅ Map by date+period+subject to prevent mismatches
        Map<String, StudentLessonProgress> progressMap = progressRecords.stream()
            .collect(Collectors.toMap(
                progress -> progress.getScheduledDate() + "-" + 
                           progress.getPeriodNumber() + "-" + 
                           progress.getSubject().getId(),
                progress -> progress,
                (existing, replacement) -> existing
            ));

        log.info("✅ Found {} progress records for date range {} to {}", 
                 progressRecords.size(), startDate, endDate);
        log.info("✅ Returning {} schedule entries for date range", schedules.size());

        return schedules.stream()
            .map(schedule -> {
                // ✅ GET PROGRESS USING DATE+PERIOD+SUBJECT KEY
                String progressKey = schedule.getScheduledDate() + "-" + 
                                   schedule.getPeriodNumber() + "-" + 
                                   schedule.getSubject().getId();
                StudentLessonProgress progress = progressMap.get(progressKey);
                
                // ✅ Build DTO with proper status calculation
                IndividualDailyScheduleDto dto = buildScheduleDto(schedule, progress);
                
                if (progress != null) {
                    log.debug("✅ Mapped schedule {} ({}) period {} subject {} to progress {}", 
                        schedule.getId(), 
                        schedule.getScheduledDate(), 
                        schedule.getPeriodNumber(),
                        schedule.getSubject().getId(),
                        progress.getId());
                } else {
                    log.warn("⚠️ No progress found for schedule {} ({}) period {} subject {}", 
                        schedule.getId(), 
                        schedule.getScheduledDate(), 
                        schedule.getPeriodNumber(),
                        schedule.getSubject().getId());
                }
                
                return dto;
            })
            .collect(Collectors.toList());
    }
    
    /**
     * ✅ NEW: Build DTO with proper status calculation
     * This is the SINGLE SOURCE OF TRUTH for status calculation
     */
    private IndividualDailyScheduleDto buildScheduleDto(
            DailySchedule schedule, 
            StudentLessonProgress progress) {
        
        // Start with basic schedule info from mapper
        IndividualDailyScheduleDto dto = scheduleMapper.toDto(schedule, progress);
        
        if (progress != null) {
            // ✅ Set progress-related fields
            dto.setProgressId(progress.getId());
            dto.setCompletedAt(progress.getCompletedAt());
            dto.setAssessmentSubmissionId(progress.getAssessmentSubmissionId());
            dto.setIncompleteReason(progress.getIncompleteReason());
            dto.setAssessmentScore(progress.getAssessmentScore());
            
            // ✅ CALCULATE CORRECT STATUS
            String status = calculateProgressStatus(progress);
            dto.setStatus(status);
            dto.setCompleted(progress.isCompleted());
            
            log.debug("📊 Progress {} status calculated: {} (submission: {}, reason: {})", 
                progress.getId(), 
                status, 
                progress.getAssessmentSubmissionId(),
                progress.getIncompleteReason());
        } else {
            // No progress record yet - calculate time-based status
            dto.setStatus(calculateScheduleStatus(schedule));
        }
        
        return dto;
    }
    
    /**
     * ✅ NEW: Calculate status for a progress record
     * Distinguishes between COMPLETED (has submission) and MISSED (no submission)
     */
    private String calculateProgressStatus(StudentLessonProgress progress) {
        // ✅ PRIORITY 1: If has incomplete_reason = MISSED
        if (progress.getIncompleteReason() != null && 
            !progress.getIncompleteReason().isEmpty()) {
            return "MISSED";
        }
        
        // ✅ PRIORITY 2: If completed with submission = COMPLETED
        if (progress.isCompleted() && progress.getAssessmentSubmissionId() != null) {
            return "COMPLETED";
        }
        
        // ✅ PRIORITY 3: If completed WITHOUT submission = MISSED
        if (progress.isCompleted() && progress.getAssessmentSubmissionId() == null) {
            return "MISSED";
        }
        
        // ✅ PRIORITY 4: Not completed - check time windows
        LocalDateTime now = LocalDateTime.now();
        
        if (progress.getAssessmentWindowEnd() != null) {
            LocalDateTime windowEnd = progress.getGracePeriodEnd() != null 
                ? progress.getGracePeriodEnd() 
                : progress.getAssessmentWindowEnd();
            
            // Grace period passed - MISSED
            if (now.isAfter(windowEnd)) {
                return "MISSED";
            }
            
            // Within assessment window - AVAILABLE
            if (progress.getAssessmentWindowStart() != null && 
                now.isAfter(progress.getAssessmentWindowStart()) && 
                now.isBefore(windowEnd)) {
                return "AVAILABLE";
            }
            
            // Before window - PENDING
            if (progress.getAssessmentWindowStart() != null && 
                now.isBefore(progress.getAssessmentWindowStart())) {
                return "PENDING";
            }
        }
        
        // Default
        return "SCHEDULED";
    }
    
    /**
     * ✅ NEW: Calculate status for a schedule without progress
     */
    private String calculateScheduleStatus(DailySchedule schedule) {
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = LocalDate.now();
        
        // Past date without progress = MISSED
        if (schedule.getScheduledDate().isBefore(today)) {
            return "MISSED";
        }
        
        // Future date = UPCOMING
        if (schedule.getScheduledDate().isAfter(today)) {
            return "UPCOMING";
        }
        
        // Today - check assessment windows if available
        if (schedule.getAssessmentWindowEnd() != null) {
            LocalDateTime windowEnd = schedule.getGraceEndDatetime() != null 
                ? schedule.getGraceEndDatetime() 
                : schedule.getAssessmentWindowEnd();
            
            if (now.isAfter(windowEnd)) {
                return "MISSED";
            }
            
            if (schedule.getAssessmentWindowStart() != null && 
                now.isAfter(schedule.getAssessmentWindowStart()) && 
                now.isBefore(windowEnd)) {
                return "AVAILABLE";
            }
            
            if (schedule.getAssessmentWindowStart() != null && 
                now.isBefore(schedule.getAssessmentWindowStart())) {
                return "PENDING";
            }
        }
        
        return "SCHEDULED";
    }
    
    /**
     * Mark schedule as completed
     */
    @Transactional
    public void markComplete(Long scheduleId) {
        log.info("✅ Marking schedule {} as complete", scheduleId);
        
        DailySchedule schedule = scheduleRepository.findById(scheduleId)
            .orElseThrow(() -> new RuntimeException("Schedule not found: " + scheduleId));
        
        schedule.markCompleted();
        scheduleRepository.save(schedule);
        
        log.info("✅ Schedule {} marked as complete", scheduleId);
    }
    
    /**
     * Mark schedule as incomplete
     */
    @Transactional
    public void markIncomplete(Long scheduleId) {
        log.info("❌ Marking schedule {} as incomplete", scheduleId);
        
        DailySchedule schedule = scheduleRepository.findById(scheduleId)
            .orElseThrow(() -> new RuntimeException("Schedule not found: " + scheduleId));
        
        schedule.markIncomplete();
        scheduleRepository.save(schedule);
        
        log.info("❌ Schedule {} marked as incomplete", scheduleId);
    }
    
    /**
     * Regenerate schedules for a date range
     * Deletes existing schedules and creates new ones
     */
    @Transactional
    public void regenerateSchedules(Long studentProfileId, 
                                   LocalDate startDate, 
                                   LocalDate endDate) {
        log.info("🔄 Regenerating schedules for student {} from {} to {}", 
                 studentProfileId, startDate, endDate);
        
        StudentProfile student = studentProfileRepository.findById(studentProfileId)
            .orElseThrow(() -> new RuntimeException("Student not found: " + studentProfileId));
        
        // Delete existing INDIVIDUAL schedules in the range
        scheduleRepository.deleteByStudentProfileAndScheduledDateBetweenAndScheduleSource(
            student, startDate, endDate, "INDIVIDUAL");
        
        // Generate new schedules
        scheduleGenerator.generateForDateRange(student, startDate, endDate);
        
        log.info("✅ Schedules regenerated successfully");
    }
    
    /**
     * Delete all schedules for a specific timetable
     */
    @Transactional
    public void deleteByTimetableId(Long timetableId) {
        log.info("🗑️ Deleting all schedules for timetable {}", timetableId);
        scheduleRepository.deleteByIndividualTimetableId(timetableId);
        log.info("✅ Schedules deleted for timetable {}", timetableId);
    }
    
    /**
     * Get schedule statistics for a student
     */
    @Transactional(readOnly = true)
    public ScheduleStatsDto getScheduleStats(Long studentProfileId, 
                                            LocalDate startDate, 
                                            LocalDate endDate) {
        StudentProfile student = studentProfileRepository.findById(studentProfileId)
            .orElseThrow(() -> new RuntimeException("Student not found: " + studentProfileId));
        
        List<DailySchedule> schedules = scheduleRepository
            .findByStudentProfileAndScheduledDateBetweenAndScheduleSourceOrderByScheduledDateAscPeriodNumberAsc(
                student, startDate, endDate, "INDIVIDUAL");
        
        long totalScheduled = schedules.size();
        long completed = schedules.stream().filter(DailySchedule::isCompleted).count();
        long pending = totalScheduled - completed;
        double completionRate = totalScheduled > 0 ? (completed * 100.0 / totalScheduled) : 0.0;
        
        return ScheduleStatsDto.builder()
            .totalScheduled(totalScheduled)
            .completed(completed)
            .pending(pending)
            .completionRate(completionRate)
            .build();
    }
    
    
    /**
     * ✅ NEW: Mark assessment as missed with zero-score submission
     * Called by AssessmentAutoMarkIncompleteTask
     */
    @Transactional
    public void markAssessmentMissedWithZeroScore(
            Long progressId, 
            Long submissionId, 
            String reason) {
        
        log.info("🔒 Marking progress {} as MISSED with submission {}", progressId, submissionId);
        
        StudentLessonProgress progress = progressRepository.findById(progressId)
            .orElseThrow(() -> new RuntimeException("Progress not found: " + progressId));
        
        // Mark as missed
        progress.setIncompleteReason(reason);
        progress.setAutoMarkedIncompleteAt(LocalDateTime.now());
        
        // Link zero-score submission
        progress.setAssessmentSubmissionId(submissionId);
        
        // Mark as completed (so teacher can create next period's assessment)
        progress.setCompleted(true);
        progress.setCompletedAt(LocalDateTime.now());
        
        progressRepository.save(progress);
        
        log.info("✅ Progress {} marked as MISSED with zero-score submission", progressId);
    }
    
    
    /**
     * ✅ Regenerate schedules for a single student for a specific week
     * Works exactly like weekly generation but for one student only
     */
    @Transactional
    public Map<String, Object> regenerateStudentWeek(Long studentProfileId, Integer weekNumber) {
        log.info("========================================");
        log.info("🔄 REGENERATING week {} for student {}", weekNumber, studentProfileId);
        log.info("========================================");
        
        Map<String, Object> result = new HashMap<>();
        result.put("studentId", studentProfileId);
        result.put("weekNumber", weekNumber);
        result.put("startTime", LocalDateTime.now().toString());
        
        try {
            StudentProfile student = studentProfileRepository.findById(studentProfileId)
                .orElseThrow(() -> new RuntimeException("Student not found: " + studentProfileId));
            
            // Get week date range
            LocalDate[] weekRange = termWeekCalculator.getWeekDateRange(weekNumber);
            if (weekRange == null) {
                throw new IllegalStateException("Invalid week number: " + weekNumber);
            }
            LocalDate weekStart = weekRange[0];
            LocalDate weekEnd = weekRange[1];
            
            result.put("weekStart", weekStart.toString());
            result.put("weekEnd", weekEnd.toString());
            
            // ✅ Use SQL-based deletion instead of JPA
            int schedulesDeleted = deleteStudentSchedulesForWeekSQL(studentProfileId, weekStart, weekEnd);
            result.put("schedulesDeleted", schedulesDeleted);
            
            // Get active term
            Optional<Term> termOpt = termWeekCalculator.getActiveTerm();
            if (termOpt.isEmpty()) {
                throw new IllegalStateException("No active term found");
            }
            Term term = termOpt.get();
            
            // Check for Saturday holidays
            PublicHolidayService.ReschedulingInfo reschedulingInfo = 
                publicHolidayService.checkReschedulingNeeded(weekStart);
            
            // Generate schedules using the weekly generator
            IndividualScheduleGenerator.StudentGenerationResult genResult = 
                scheduleGenerator.processStudentInNewTransaction(
                    student, weekNumber, weekStart, weekEnd, term, reschedulingInfo
                );
            
            result.put("schedulesCreated", genResult.getSchedulesCreated());
            result.put("missingTopics", genResult.getMissingTopics().size());
            result.put("success", true);
            result.put("endTime", LocalDateTime.now().toString());
            
            log.info("========================================");
            log.info("✅ REGENERATION COMPLETE for student {}", studentProfileId);
            log.info("========================================");
            
            return result;
            
        } catch (Exception e) {
            log.error("❌ Regeneration failed: {}", e.getMessage(), e);
            result.put("success", false);
            result.put("error", e.getMessage());
            result.put("endTime", LocalDateTime.now().toString());
            return result;
        }
    }
    
    
    /**
     * ✅ FIXED: Delete schedules using SQL to handle self-referencing FK properly
     * Handles previous_period_progress_id FK constraint
     */
    @Transactional
    private int deleteStudentSchedulesForWeekSQL(Long studentId, LocalDate weekStart, LocalDate weekEnd) {
        log.info("🗑️ Deleting schedules for student {} from {} to {}", studentId, weekStart, weekEnd);
        
        try {
            // Step 1: Unlink previous_period_progress_id references FIRST
            String unlinkSelfRefSql = """
                UPDATE academic.student_lesson_progress
                SET previous_period_progress_id = NULL
                WHERE student_profile_id = ?
                  AND scheduled_date BETWEEN ? AND ?
                  AND previous_period_progress_id IS NOT NULL
                """;
            
            int unlinked = jdbcTemplate.update(unlinkSelfRefSql, studentId, weekStart, weekEnd);
            if (unlinked > 0) {
                log.info("  ✅ Unlinked {} previous period progress references", unlinked);
            }
            
            // Step 2: Preserve progress with submissions by unlinking from schedule
            String preserveProgressSql = """
                UPDATE academic.student_lesson_progress p
                SET daily_schedule_id = NULL
                WHERE p.student_profile_id = ?
                  AND p.scheduled_date BETWEEN ? AND ?
                  AND p.assessment_submission_id IS NOT NULL
                """;
            int preserved = jdbcTemplate.update(preserveProgressSql, studentId, weekStart, weekEnd);
            log.info("  ✅ Preserved {} progress records with submissions", preserved);
            
            // Step 3: Delete progress without submissions
            String deleteProgressSql = """
                DELETE FROM academic.student_lesson_progress p
                WHERE p.student_profile_id = ?
                  AND p.scheduled_date BETWEEN ? AND ?
                  AND p.assessment_submission_id IS NULL
                """;
            int progressDeleted = jdbcTemplate.update(deleteProgressSql, studentId, weekStart, weekEnd);
            log.info("  ✅ Deleted {} progress records without submissions", progressDeleted);
            
            // Step 4: Delete schedules
            String deleteSchedulesSql = """
                DELETE FROM academic.daily_schedules
                WHERE student_id = ?
                  AND scheduled_date BETWEEN ? AND ?
                  AND schedule_source = 'INDIVIDUAL'
                """;
            int schedulesDeleted = jdbcTemplate.update(deleteSchedulesSql, studentId, weekStart, weekEnd);
            log.info("  ✅ Deleted {} schedules", schedulesDeleted);
            
            return schedulesDeleted;
            
        } catch (Exception e) {
            log.error("❌ Failed to delete schedules: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to delete schedules: " + e.getMessage(), e);
        }
    }
    

    /**
     * Delete schedules for a specific student and week
     * Preserves progress records with submissions
     */
    @Transactional
    private int deleteStudentSchedulesForWeek(StudentProfile student, LocalDate weekStart, LocalDate weekEnd) {
        log.info("🗑️ Deleting schedules for student {} from {} to {}", student.getId(), weekStart, weekEnd);
        
        List<DailySchedule> schedulesToDelete = scheduleRepository
            .findByStudentProfileAndScheduledDateBetweenAndScheduleSourceOrderByScheduledDateAscPeriodNumberAsc(
                student, weekStart, weekEnd, "INDIVIDUAL");
        
        if (schedulesToDelete.isEmpty()) {
            log.info("✅ No schedules to delete");
            return 0;
        }
        
        int schedulesDeleted = 0;
        int progressPreserved = 0;
        int progressDeleted = 0;
        
        for (DailySchedule schedule : schedulesToDelete) {
            // Find progress records linked to this schedule
            List<StudentLessonProgress> progressRecords = progressRepository
                .findByStudentProfileAndScheduledDate(student, schedule.getScheduledDate())
                .stream()
                .filter(p -> p.getSchedule() != null && p.getSchedule().getId().equals(schedule.getId()))
                .collect(Collectors.toList());
            
            for (StudentLessonProgress progress : progressRecords) {
                if (progress.getAssessmentSubmission() != null) {
                    // Preserve progress with submissions
                    progress.setSchedule(null);
                    progressRepository.save(progress);
                    progressPreserved++;
                } else {
                    // Delete progress without submissions
                    progressRepository.delete(progress);
                    progressDeleted++;
                }
            }
            
            scheduleRepository.delete(schedule);
            schedulesDeleted++;
        }
        
        log.info("✅ Deleted {} schedules, preserved {} progress with submissions, deleted {} progress without submissions",
                schedulesDeleted, progressPreserved, progressDeleted);
        
        return schedulesDeleted;
    }
    
    /**
     * DTO for schedule statistics
     */
    @lombok.Data
    @lombok.Builder
    public static class ScheduleStatsDto {
        private long totalScheduled;
        private long completed;
        private long pending;
        private double completionRate;
    }
}