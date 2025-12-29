package com.edu.platform.service.individual;

import com.edu.platform.model.ArchivedDailySchedule;
import com.edu.platform.model.ArchivedStudentLessonProgress;
import com.edu.platform.model.DailySchedule;
import com.edu.platform.model.Term;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.ArchivedDailyScheduleRepository;
import com.edu.platform.repository.ArchivedStudentLessonProgressRepository;
import com.edu.platform.repository.DailyScheduleRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Service for archiving old schedules and progress records
 * Preserves historical data before deletion during weekly regeneration
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ArchivalService {

    private final DailyScheduleRepository dailyScheduleRepository;
    private final StudentLessonProgressRepository progressRepository;
    private final ArchivedDailyScheduleRepository archivedScheduleRepository;
    private final ArchivedStudentLessonProgressRepository archivedProgressRepository;
    private final TermWeekCalculator termWeekCalculator;

    /**
     * Archive schedules and progress for a specific week before deletion
     * This is the main archival workflow called before weekly regeneration
     * 
     * @param weekStartDate Monday of the week to archive
     * @param weekEndDate Sunday of the week to archive
     * @param term The term these schedules belong to
     * @param weekNumber The week number within the term
     * @return Number of records archived
     */
    @Transactional
    public ArchivalResult archiveWeekData(LocalDate weekStartDate, LocalDate weekEndDate, 
                                          Term term, Integer weekNumber) {
        log.info("Starting archival process for week {} ({} to {})", 
            weekNumber, weekStartDate, weekEndDate);

        ArchivalResult result = new ArchivalResult();
        result.setWeekNumber(weekNumber);
        result.setWeekStartDate(weekStartDate);
        result.setWeekEndDate(weekEndDate);
        result.setArchivalStartTime(LocalDateTime.now());

        try {
            // Step 1: Archive schedules for INDIVIDUAL students only
            int schedulesArchived = archiveSchedules(weekStartDate, weekEndDate, term, weekNumber);
            result.setSchedulesArchived(schedulesArchived);
            log.info("Archived {} schedules for week {}", schedulesArchived, weekNumber);

            // Step 2: Archive progress records for INDIVIDUAL students
            int progressArchived = archiveProgress(weekStartDate, weekEndDate, term, weekNumber);
            result.setProgressRecordsArchived(progressArchived);
            log.info("Archived {} progress records for week {}", progressArchived, weekNumber);

            result.setSuccess(true);
            result.setArchivalEndTime(LocalDateTime.now());
            
            log.info("Archival complete for week {}: {} schedules, {} progress records", 
                weekNumber, schedulesArchived, progressArchived);

        } catch (Exception e) {
            log.error("Error during archival process for week {}: {}", weekNumber, e.getMessage(), e);
            result.setSuccess(false);
            result.setErrorMessage(e.getMessage());
            throw e; // Re-throw to trigger transaction rollback
        }

        return result;
    }

    /**
     * Archive daily schedules for a given week
     */
    private int archiveSchedules(LocalDate weekStart, LocalDate weekEnd, Term term, Integer weekNumber) {
        // Fetch all INDIVIDUAL schedules for this week
        List<DailySchedule> schedules = dailyScheduleRepository
            .findByScheduledDateBetweenAndScheduleSource(weekStart, weekEnd, "INDIVIDUAL");

        if (schedules.isEmpty()) {
            log.info("No INDIVIDUAL schedules found for week {} ({} to {})", 
                weekNumber, weekStart, weekEnd);
            return 0;
        }

        String academicYear = generateAcademicYear(term);
        int count = 0;

        for (DailySchedule schedule : schedules) {
            ArchivedDailySchedule archived = convertToArchivedSchedule(schedule, term, weekNumber, academicYear);
            archivedScheduleRepository.save(archived);
            count++;
        }

        return count;
    }

	
	/**
	 * ✅ FIXED: Archive progress records but SKIP ones with submissions
	 */
	private int archiveProgress(LocalDate weekStart, LocalDate weekEnd, Term term, Integer weekNumber) {
	    // Fetch all progress records for INDIVIDUAL students in this week
	    List<StudentLessonProgress> progressList = progressRepository
	        .findByScheduledDateBetween(weekStart, weekEnd);
	
	    if (progressList.isEmpty()) {
	        log.info("No progress records found for week {} ({} to {})", 
	            weekNumber, weekStart, weekEnd);
	        return 0;
	    }
	
	    String academicYear = generateAcademicYear(term);
	    int archivedCount = 0;
	    int preservedCount = 0;
	
	    for (StudentLessonProgress progress : progressList) {
	        // ✅ CRITICAL: Skip progress records that have submissions
	        if (progress.getAssessmentSubmission() != null) {
	            log.info("🔒 PRESERVING progress {} - has submission ID {} for topic '{}'", 
	                    progress.getId(), 
	                    progress.getAssessmentSubmission().getId(),
	                    progress.getLessonTopic() != null ? progress.getLessonTopic().getTitle() : "N/A");
	            preservedCount++;
	            continue; // DON'T ARCHIVE THIS ONE
	        }
	        
	        // Archive progress without submissions
	        ArchivedStudentLessonProgress archived = convertToArchivedProgress(
	            progress, term, weekNumber, academicYear);
	        archivedProgressRepository.save(archived);
	        archivedCount++;
	    }
	
	    log.info("✅ Archived {} progress records, 🔒 preserved {} with submissions for week {}", 
	            archivedCount, preservedCount, weekNumber);
	
	    return archivedCount;
	}

    /**
     * Convert DailySchedule to ArchivedDailySchedule
     */
    private ArchivedDailySchedule convertToArchivedSchedule(DailySchedule schedule, 
                                                            Term term, 
                                                            Integer weekNumber, 
                                                            String academicYear) {
        return ArchivedDailySchedule.builder()
            // Archive metadata
            .originalScheduleId(schedule.getId())
            .archivedAt(LocalDateTime.now())
            .term(term)
            .termWeekNumber(weekNumber)
            .academicYear(academicYear)
            
            // Original schedule data
            .studentId(schedule.getStudentProfile() != null ? schedule.getStudentProfile().getId() : null)
            .subjectId(schedule.getSubject() != null ? schedule.getSubject().getId() : null)
            .subjectName(schedule.getSubject() != null ? schedule.getSubject().getName() : null)
            .lessonTopicId(schedule.getLessonTopic() != null ? schedule.getLessonTopic().getId() : null)
            .lessonTopicTitle(schedule.getLessonTopic() != null ? schedule.getLessonTopic().getTitle() : null)
            .assessmentId(schedule.getAssessment() != null ? schedule.getAssessment().getId() : null)
            .scheduledDate(schedule.getScheduledDate())
            .periodNumber(schedule.getPeriodNumber())
            .priority(schedule.getPriority())
            .weight(schedule.getWeight())
            .lessonStartDatetime(schedule.getLessonStartDatetime())
            .lessonEndDatetime(schedule.getLessonEndDatetime())
            .graceEndDatetime(schedule.getGraceEndDatetime())
            .assessmentWindowStart(schedule.getAssessmentWindowStart())
            .assessmentWindowEnd(schedule.getAssessmentWindowEnd())
            .completed(schedule.isCompleted())
            .completedAt(schedule.getCompletedAt())
            .markedIncompleteReason(schedule.getMarkedIncompleteReason())
            .scheduleSource(schedule.getScheduleSource())
            .individualTimetableId(schedule.getIndividualStudentTimetable() != null ? 
                schedule.getIndividualStudentTimetable().getId() : null)
            .dayOfWeek(schedule.getDayOfWeek())
            .startTime(schedule.getStartTime())
            .endTime(schedule.getEndTime())
            
            // ✅ FIXED: New multi-assessment fields - convert String to List<Long>
            .periodSequence(schedule.getPeriodSequence())
            .totalPeriodsForTopic(schedule.getTotalPeriodsForTopic())
            .linkedScheduleIds(schedule.getLinkedScheduleIdsList()) // ✅ Uses method that returns List<Long>
            .assessmentInstanceId(schedule.getAssessmentInstanceId())
            .allAssessmentsCompleted(schedule.getAllAssessmentsCompleted())
            .topicCompletionPercentage(schedule.getTopicCompletionPercentage())
            .scheduleStatus(schedule.getScheduleStatus() != null ? schedule.getScheduleStatus().name() : null)
            
            // Compute statistics
            .assessmentScore(computeAssessmentScore(schedule))
            .completionStatus(computeCompletionStatus(schedule))
            
            // Timestamps
            .originalCreatedAt(schedule.getCreatedAt())
            .originalUpdatedAt(schedule.getUpdatedAt())
            
            .build();
    }

    /**
     * Convert StudentLessonProgress to ArchivedStudentLessonProgress
     */
    private ArchivedStudentLessonProgress convertToArchivedProgress(StudentLessonProgress progress,
                                                                    Term term,
                                                                    Integer weekNumber,
                                                                    String academicYear) {
        return ArchivedStudentLessonProgress.builder()
            // Archive metadata
            .originalProgressId(progress.getId())
            .archivedAt(LocalDateTime.now())
            .term(term)
            .termWeekNumber(weekNumber)
            .academicYear(academicYear)
            
            // Original progress data
            .studentId(progress.getStudentProfile() != null ? progress.getStudentProfile().getId() : null)
            .subjectId(progress.getSubject() != null ? progress.getSubject().getId() : null)
            .subjectName(progress.getSubject() != null ? progress.getSubject().getName() : null)
            .lessonTopicId(progress.getLessonTopic() != null ? progress.getLessonTopic().getId() : null)
            .lessonTopicTitle(progress.getLessonTopic() != null ? progress.getLessonTopic().getTitle() : null)
            .scheduledDate(progress.getScheduledDate())
            .periodNumber(progress.getPeriodNumber())
            .priority(progress.getPriority())
            .weight(progress.getWeight())
            .completed(progress.isCompleted())
            .completedAt(progress.getCompletedAt())
            .completionTime(progress.getCompletionTime())
            .assessmentId(progress.getAssessment() != null ? progress.getAssessment().getId() : null)
            .assessmentSubmissionId(progress.getAssessmentSubmission() != null ? 
                progress.getAssessmentSubmission().getId() : null)
            .assessmentAccessible(progress.getAssessmentAccessible())
            .assessmentWindowStart(progress.getAssessmentWindowStart())
            .assessmentWindowEnd(progress.getAssessmentWindowEnd())
            .incompleteReason(progress.getIncompleteReason())
            .autoMarkedIncompleteAt(progress.getAutoMarkedIncompleteAt())
            
            // ✅ FIXED: New multi-assessment fields - pass List<Long> directly
            .periodSequence(progress.getPeriodSequence())
            .totalPeriodsInSequence(progress.getTotalPeriodsInSequence())
            .linkedProgressIds(progress.getLinkedProgressIds()) // ✅ Now passes List<Long> directly
            .allPeriodsCompleted(progress.getAllPeriodsCompleted())
            .topicAverageScore(progress.getTopicAverageScore())
            
            // Compute statistics
            .assessmentScore(computeProgressAssessmentScore(progress))
            .completionStatus(computeProgressCompletionStatus(progress))
            
            // Timestamps
            .originalCreatedAt(progress.getCreatedAt())
            
            .build();
    }

    /**
     * Compute assessment score from schedule (if available)
     */
    private BigDecimal computeAssessmentScore(DailySchedule schedule) {
        // This would need to fetch the actual submission score
        // For now, return null - will be enhanced in Sprint 5
        return null;
    }

    /**
     * Compute completion status for schedule
     */
    private String computeCompletionStatus(DailySchedule schedule) {
        if (schedule.isCompleted()) {
            return "COMPLETED";
        } else if (schedule.getMarkedIncompleteReason() != null) {
            return "INCOMPLETE";
        } else if (schedule.getAssessmentWindowEnd() != null 
                   && LocalDateTime.now().isAfter(schedule.getAssessmentWindowEnd())) {
            return "MISSED";
        }
        return "PENDING";
    }

    /**
     * Compute assessment score from progress record
     */
    private BigDecimal computeProgressAssessmentScore(StudentLessonProgress progress) {
        // This would need to fetch the actual submission score
        // For now, return topic average if available
        return progress.getTopicAverageScore();
    }

    /**
     * Compute completion status for progress
     */
    private String computeProgressCompletionStatus(StudentLessonProgress progress) {
        if (progress.isCompleted()) {
            return "COMPLETED";
        } else if (progress.getIncompleteReason() != null) {
            return "INCOMPLETE";
        } else if (progress.getAssessmentWindowEnd() != null 
                   && LocalDateTime.now().isAfter(progress.getAssessmentWindowEnd())) {
            return "MISSED";
        }
        return "PENDING";
    }

    /**
     * Generate academic year string from term
     */
    private String generateAcademicYear(Term term) {
        if (term.getStartDate() == null) {
            return "UNKNOWN";
        }
        int startYear = term.getStartDate().getYear();
        int endYear = term.getEndDate() != null ? term.getEndDate().getYear() : startYear + 1;
        return String.format("%d/%d", startYear, endYear);
    }

    /**
     * Delete archived records older than retention period
     * Should be called periodically (e.g., monthly)
     * 
     * @param retentionWeeks Number of weeks to retain (default: 52)
     * @return Number of records deleted
     */
    @Transactional
    public int cleanupOldArchives(int retentionWeeks) {
        LocalDateTime cutoffDate = LocalDateTime.now().minusWeeks(retentionWeeks);
        
        log.info("Cleaning up archives older than {} ({} weeks)", cutoffDate, retentionWeeks);
        
        int schedulesDeleted = archivedScheduleRepository.deleteByArchivedAtBefore(cutoffDate);
        int progressDeleted = archivedProgressRepository.deleteByArchivedAtBefore(cutoffDate);
        
        log.info("Cleanup complete: {} archived schedules, {} archived progress records deleted", 
            schedulesDeleted, progressDeleted);
        
        return schedulesDeleted + progressDeleted;
    }

    /**
     * Result object for archival operations
     */
    public static class ArchivalResult {
        private boolean success;
        private Integer weekNumber;
        private LocalDate weekStartDate;
        private LocalDate weekEndDate;
        private int schedulesArchived;
        private int progressRecordsArchived;
        private LocalDateTime archivalStartTime;
        private LocalDateTime archivalEndTime;
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
        
        public int getSchedulesArchived() { return schedulesArchived; }
        public void setSchedulesArchived(int schedulesArchived) { this.schedulesArchived = schedulesArchived; }
        
        public int getProgressRecordsArchived() { return progressRecordsArchived; }
        public void setProgressRecordsArchived(int progressRecordsArchived) { 
            this.progressRecordsArchived = progressRecordsArchived; 
        }
        
        public LocalDateTime getArchivalStartTime() { return archivalStartTime; }
        public void setArchivalStartTime(LocalDateTime archivalStartTime) { 
            this.archivalStartTime = archivalStartTime; 
        }
        
        public LocalDateTime getArchivalEndTime() { return archivalEndTime; }
        public void setArchivalEndTime(LocalDateTime archivalEndTime) { 
            this.archivalEndTime = archivalEndTime; 
        }
        
        public String getErrorMessage() { return errorMessage; }
        public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

        public long getDurationSeconds() {
            if (archivalStartTime != null && archivalEndTime != null) {
                return java.time.Duration.between(archivalStartTime, archivalEndTime).getSeconds();
            }
            return 0;
        }

        @Override
        public String toString() {
            return String.format("ArchivalResult{success=%s, week=%d, schedules=%d, progress=%d, duration=%ds}",
                success, weekNumber, schedulesArchived, progressRecordsArchived, getDurationSeconds());
        }
    }
}