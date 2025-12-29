package com.edu.platform.service.individual;

import com.edu.platform.model.DailySchedule;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Service for initializing student lesson progress records
 * Creates progress records for each schedule with assessment windows
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class IndividualProgressInitializer {

    private final StudentLessonProgressRepository progressRepository;

    /**
     * Create a progress record for a daily schedule
     * Sets up assessment windows and accessibility
     * 
     * @param schedule The daily schedule
     * @param assessment The assessment for this lesson (can be null if not assigned yet)
     * @param assessmentWindowStart When assessment becomes accessible
     * @param assessmentWindowEnd When assessment expires (with grace period)
     * @return Created progress record
     */
    @Transactional
    public StudentLessonProgress createProgressRecord(DailySchedule schedule,
                                                      Assessment assessment,
                                                      LocalDateTime assessmentWindowStart,
                                                      LocalDateTime assessmentWindowEnd) {
        log.debug("Creating progress record for schedule {} on {}", 
            schedule.getId(), schedule.getScheduledDate());

        // Check if progress record already exists
        if (schedule.getStudentProfile() != null && 
            schedule.getLessonTopic() != null &&
            schedule.getScheduledDate() != null &&
            schedule.getPeriodNumber() != null) {
            
            boolean exists = progressRepository.existsByStudentProfileAndLessonTopicAndScheduledDateAndPeriodNumber(
                schedule.getStudentProfile(),
                schedule.getLessonTopic(),
                schedule.getScheduledDate(),
                schedule.getPeriodNumber()
            );

            if (exists) {
                log.warn("Progress record already exists for schedule {}, skipping creation", schedule.getId());
                return progressRepository.findByStudentProfileAndLessonTopicAndScheduledDateAndPeriodNumber(
                    schedule.getStudentProfile(),
                    schedule.getLessonTopic(),
                    schedule.getScheduledDate(),
                    schedule.getPeriodNumber()
                ).orElse(null);
            }
        }

        // Build progress record
        StudentLessonProgress progress = new StudentLessonProgress();
        progress.setStudentProfile(schedule.getStudentProfile());
        progress.setLessonTopic(schedule.getLessonTopic());
        progress.setSubject(schedule.getSubject());
        progress.setScheduledDate(schedule.getScheduledDate());
        progress.setPeriodNumber(schedule.getPeriodNumber());
        progress.setPriority(schedule.getPriority());
        progress.setWeight(schedule.getWeight());
        progress.setDate(schedule.getScheduledDate());
        
        // ✅ LINK SCHEDULE TO PROGRESS
        progress.setSchedule(schedule);
        
        // Assessment details
        progress.setAssessment(assessment);
        progress.setAssessmentAccessible(false); // Will be opened by background task
        progress.setAssessmentWindowStart(assessmentWindowStart);
        progress.setAssessmentWindowEnd(assessmentWindowEnd);
        
        // Initialize as not completed
        progress.setCompleted(false);
        progress.setIncompleteReason(null);
        
        // Multi-period fields (will be set later by linking service)
        progress.setPeriodSequence(schedule.getPeriodSequence());
        progress.setTotalPeriodsInSequence(schedule.getTotalPeriodsForTopic());
        progress.setAllPeriodsCompleted(false);

        StudentLessonProgress saved = progressRepository.save(progress);
        
        log.info("Created progress record {} for student {} - topic: {}", 
            saved.getId(), 
            schedule.getStudentProfile().getId(),
            schedule.getLessonTopic() != null ? schedule.getLessonTopic().getTitle() : "N/A");

        return saved;
    }

    /**
     * Create multiple progress records for a list of schedules
     * Batch operation for efficiency
     * 
     * @param schedules List of schedules
     * @param assessmentWindowCalculator Function to calculate windows
     * @return List of created progress records
     */
    @Transactional
    public List<StudentLessonProgress> createBatchProgressRecords(
            List<DailySchedule> schedules,
            AssessmentWindowCalculator assessmentWindowCalculator) {
        
        log.info("Creating batch progress records for {} schedules", schedules.size());
        
        List<StudentLessonProgress> progressRecords = new ArrayList<>();
        
        for (DailySchedule schedule : schedules) {
            if (schedule.getLessonTopic() == null) {
                log.warn("Schedule {} has no lesson topic, skipping progress creation", schedule.getId());
                continue;
            }

            // Calculate assessment window
            LocalDateTime windowStart = assessmentWindowCalculator.calculateWindowStart(schedule);
            LocalDateTime windowEnd = assessmentWindowCalculator.calculateWindowEnd(schedule);
            
            // Get assessment (may be null if not assigned yet)
            Assessment assessment = schedule.getAssessment();
            
            StudentLessonProgress progress = createProgressRecord(
                schedule, assessment, windowStart, windowEnd
            );
            
            if (progress != null) {
                progressRecords.add(progress);
            }
        }
        
        log.info("Successfully created {} progress records", progressRecords.size());
        return progressRecords;
    }

    /**
     * ✅ FIXED: Update progress record with linked progress IDs (for multi-period topics)
     * Now accepts List<Long> instead of String
     * 
     * @param progressId Progress record to update
     * @param linkedProgressIds List of linked progress IDs
     */
    @Transactional
    public void linkProgressRecords(Long progressId, List<Long> linkedProgressIds) {
        StudentLessonProgress progress = progressRepository.findById(progressId)
            .orElseThrow(() -> new IllegalArgumentException("Progress not found: " + progressId));

        progress.setLinkedProgressIds(linkedProgressIds); // ✅ Now accepts List<Long>
        progressRepository.save(progress);

        log.debug("Linked progress {} with {} IDs", progressId, linkedProgressIds.size());
    }

    /**
     * ✅ FIXED: Update multiple progress records with their linked IDs
     * Now uses Map<Long, List<Long>> instead of Map<Long, String>
     * 
     * @param progressLinks Map of progress ID -> linked progress IDs
     */
    @Transactional
    public void bulkLinkProgressRecords(Map<Long, List<Long>> progressLinks) {
        log.info("Bulk linking {} progress records", progressLinks.size());

        // ✅ FIXED: Changed from Map.Entry<Long, String> to Map.Entry<Long, List<Long>>
        for (Map.Entry<Long, List<Long>> entry : progressLinks.entrySet()) {
            try {
                linkProgressRecords(entry.getKey(), entry.getValue());
            } catch (Exception e) {
                log.error("Failed to link progress {}: {}", entry.getKey(), e.getMessage());
            }
        }
    }

    /**
     * Mark progress as incomplete with reason
     * 
     * @param progressId Progress record ID
     * @param reason Incomplete reason
     */
    @Transactional
    public void markIncomplete(Long progressId, String reason) {
        StudentLessonProgress progress = progressRepository.findById(progressId)
            .orElseThrow(() -> new IllegalArgumentException("Progress not found: " + progressId));

        progress.markIncomplete(reason);
        progressRepository.save(progress);

        log.info("Marked progress {} as incomplete: {}", progressId, reason);
    }

    /**
     * Mark progress as completed
     * 
     * @param progressId Progress record ID
     */
    @Transactional
    public void markCompleted(Long progressId) {
        StudentLessonProgress progress = progressRepository.findById(progressId)
            .orElseThrow(() -> new IllegalArgumentException("Progress not found: " + progressId));

        progress.markCompleted();
        progressRepository.save(progress);

        log.info("Marked progress {} as completed", progressId);
    }

    /**
     * Delete progress records for a student in a date range
     * Used during schedule regeneration
     * 
     * @param student Student profile
     * @param startDate Start date
     * @param endDate End date
     */
    @Transactional
    public void deleteProgressForStudentInRange(StudentProfile student, 
                                                java.time.LocalDate startDate, 
                                                java.time.LocalDate endDate) {
        log.info("Deleting progress for student {} from {} to {}", 
            student.getId(), startDate, endDate);

        progressRepository.deleteProgressForStudentInWeek(student, startDate, endDate);
    }

    // ============================================================
    // FUNCTIONAL INTERFACE
    // ============================================================

    /**
     * Functional interface for calculating assessment windows
     */
    @FunctionalInterface
    public interface AssessmentWindowCalculator {
        LocalDateTime calculateWindowStart(DailySchedule schedule);
        
        default LocalDateTime calculateWindowEnd(DailySchedule schedule) {
            // Default: 2 hours after lesson end + grace period
            if (schedule.getLessonEndDatetime() != null) {
                return schedule.getLessonEndDatetime().plusHours(2);
            }
            return null;
        }
    }
}