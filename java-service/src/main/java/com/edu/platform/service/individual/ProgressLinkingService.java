package com.edu.platform.service.individual;

import com.edu.platform.model.DailySchedule;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.DailyScheduleRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for linking progress records and schedules across multi-period lessons
 * Handles the relationship between multiple assessment instances for the same lesson topic
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ProgressLinkingService {

    private final StudentLessonProgressRepository progressRepository;
    private final DailyScheduleRepository scheduleRepository;
    private final ObjectMapper objectMapper;

    /**
     * Link all progress records for a lesson topic that appears multiple times
     * 
     * @param progressRecords List of progress records to link
     * @return Number of records linked
     */
    @Transactional
    public int linkProgressRecords(List<StudentLessonProgress> progressRecords) {
        if (progressRecords == null || progressRecords.size() <= 1) {
            log.debug("No linking needed for {} progress records", 
                progressRecords != null ? progressRecords.size() : 0);
            return 0;
        }

        log.info("Linking {} progress records for multi-period lesson", progressRecords.size());

        // Collect all progress IDs
        List<Long> progressIds = progressRecords.stream()
            .map(StudentLessonProgress::getId)
            .collect(Collectors.toList());

        int totalPeriods = progressRecords.size();

        // Update each progress record with linked IDs and sequence info
        int linkedCount = 0;
        for (int i = 0; i < progressRecords.size(); i++) {
            StudentLessonProgress progress = progressRecords.get(i);
            
            // Set linking information
            progress.setPeriodSequence(i + 1);
            progress.setTotalPeriodsInSequence(totalPeriods);
            
            // Set linked IDs (excluding self)
            List<Long> linkedIds = new ArrayList<>(progressIds);
            linkedIds.remove(progress.getId());
            progress.setLinkedProgressIds(linkedIds); // ✅ FIXED: Use setLinkedProgressIdsList
            
            // Initialize completion status
            progress.setAllPeriodsCompleted(false);
            progress.setTopicAverageScore((BigDecimal) null); // ✅ FIXED: Cast to BigDecimal
            
            progressRepository.save(progress);
            linkedCount++;
            
            log.debug("Linked progress {} - sequence {} of {}", 
                progress.getId(), i + 1, totalPeriods);
        }

        log.info("Successfully linked {} progress records", linkedCount);
        return linkedCount;
    }

    /**
     * Link all schedules for a lesson topic that appears multiple times
     * 
     * @param schedules List of schedules to link
     * @return Number of schedules linked
     */
    @Transactional
    public int linkSchedules(List<DailySchedule> schedules) {
        if (schedules == null || schedules.size() <= 1) {
            log.debug("No linking needed for {} schedules", 
                schedules != null ? schedules.size() : 0);
            return 0;
        }

        log.info("Linking {} schedules for multi-period lesson", schedules.size());

        // Collect all schedule IDs
        List<Long> scheduleIds = schedules.stream()
            .map(DailySchedule::getId)
            .collect(Collectors.toList());

        int totalPeriods = schedules.size();

        // Update each schedule with linked IDs and sequence info
        int linkedCount = 0;
        for (int i = 0; i < schedules.size(); i++) {
            DailySchedule schedule = schedules.get(i);
            
            // Set sequence information
            schedule.setPeriodSequence(i + 1);
            schedule.setTotalPeriodsForTopic(totalPeriods);
            
            // Set linked IDs (excluding self)
            List<Long> linkedIds = new ArrayList<>(scheduleIds);
            linkedIds.remove(schedule.getId());
            schedule.setLinkedScheduleIdsList(linkedIds); // ✅ FIXED: Use setLinkedScheduleIdsList
            
            // Initialize completion tracking
            schedule.setAllAssessmentsCompleted(false);
            schedule.setTopicCompletionPercentage(BigDecimal.ZERO);
            
            scheduleRepository.save(schedule);
            linkedCount++;
            
            log.debug("Linked schedule {} - period {} of {}", 
                schedule.getId(), i + 1, totalPeriods);
        }

        log.info("Successfully linked {} schedules", linkedCount);
        return linkedCount;
    }

    /**
     * Update completion status across all linked progress records
     * Called when a student completes one assessment
     * 
     * @param completedProgressId ID of the progress record that was just completed
     */
    @Transactional
    public void updateCompletionStatus(Long completedProgressId) {
        log.info("Updating completion status for progress chain starting from {}", completedProgressId);

        // Get the completed progress
        StudentLessonProgress completedProgress = progressRepository.findById(completedProgressId)
            .orElseThrow(() -> new IllegalArgumentException("Progress not found: " + completedProgressId));

        // Get all linked progress IDs
        List<Long> linkedIds = completedProgress.getLinkedProgressIds(); // ✅ FIXED: Use getLinkedProgressIdsList
        if (linkedIds.isEmpty()) {
            log.debug("No linked progress records for {}", completedProgressId);
            return;
        }

        // Include self in the list
        List<Long> allIds = new ArrayList<>(linkedIds);
        allIds.add(completedProgressId);

        // Fetch all linked progress records
        List<StudentLessonProgress> allProgress = progressRepository.findAllById(allIds);

        // Calculate completion statistics
        long completedCount = allProgress.stream()
            .filter(StudentLessonProgress::isCompleted)
            .count();
        
        int totalCount = allProgress.size();
        BigDecimal completionPercentage = BigDecimal.valueOf(completedCount)
            .divide(BigDecimal.valueOf(totalCount), 2, RoundingMode.HALF_UP)
            .multiply(BigDecimal.valueOf(100));

        boolean allCompleted = completedCount == totalCount;

        log.info("Completion status: {} of {} completed ({}%)", 
            completedCount, totalCount, completionPercentage);

        // Calculate average score if all completed
        BigDecimal averageScore = null;
        if (allCompleted) {
            averageScore = calculateAverageScore(allProgress);
            log.info("All assessments completed. Average score: {}", averageScore);
        }

        // Update all progress records
        for (StudentLessonProgress progress : allProgress) {
            progress.setAllPeriodsCompleted(allCompleted);
            progress.setTopicAverageScore(averageScore); // ✅ FIXED: Now accepts BigDecimal
            progressRepository.save(progress);
        }

        // Update linked schedules
        updateLinkedSchedules(completedProgress, completionPercentage, allCompleted);
    }

    /**
     * Update all linked schedules with completion status
     */
    private void updateLinkedSchedules(StudentLessonProgress progress, 
                                      BigDecimal completionPercentage,
                                      boolean allCompleted) {
        // Get linked schedule IDs
        List<Long> linkedScheduleIds = new ArrayList<>();
        
        // Get schedule from progress record
        if (progress.getSchedule() != null) {
            DailySchedule progressSchedule = progress.getSchedule();
            
            // Add current schedule ID
            linkedScheduleIds.add(progressSchedule.getId());
            
            // Get linked schedule IDs if available
            List<Long> additionalIds = progressSchedule.getLinkedScheduleIdsList(); // ✅ FIXED
            linkedScheduleIds.addAll(additionalIds);
        }

        if (linkedScheduleIds.isEmpty()) {
            log.warn("No linked schedules found for progress {}", progress.getId());
            return;
        }

        // Update all linked schedules
        List<DailySchedule> schedules = scheduleRepository.findAllById(linkedScheduleIds);
        for (DailySchedule schedule : schedules) {
            schedule.setTopicCompletionPercentage(completionPercentage);
            schedule.setAllAssessmentsCompleted(allCompleted);
            scheduleRepository.save(schedule);
        }

        log.debug("Updated {} linked schedules with completion status", schedules.size());
    }

    /**
     * Get all linked progress records for a given progress ID
     */
    public List<StudentLessonProgress> getLinkedProgress(Long progressId) {
        StudentLessonProgress progress = progressRepository.findById(progressId)
            .orElseThrow(() -> new IllegalArgumentException("Progress not found: " + progressId));

        List<Long> linkedIds = progress.getLinkedProgressIds(); // ✅ FIXED
        if (linkedIds.isEmpty()) {
            return List.of(progress);
        }

        List<Long> allIds = new ArrayList<>(linkedIds);
        allIds.add(progressId);

        return progressRepository.findAllById(allIds);
    }

    /**
     * Check if all assessments in a multi-period lesson are completed
     */
    public boolean areAllPeriodsCompleted(Long progressId) {
        List<StudentLessonProgress> linked = getLinkedProgress(progressId);
        return linked.stream().allMatch(StudentLessonProgress::isCompleted);
    }

    /**
     * Get completion statistics for a multi-period lesson
     */
    public CompletionStats getCompletionStats(Long progressId) {
        List<StudentLessonProgress> linked = getLinkedProgress(progressId);
        
        long completedCount = linked.stream()
            .filter(StudentLessonProgress::isCompleted)
            .count();
        
        int totalCount = linked.size();
        
        BigDecimal percentage = BigDecimal.valueOf(completedCount)
            .divide(BigDecimal.valueOf(totalCount), 2, RoundingMode.HALF_UP)
            .multiply(BigDecimal.valueOf(100));

        BigDecimal averageScore = calculateAverageScore(linked);

        return new CompletionStats(
            completedCount,
            totalCount,
            percentage,
            averageScore,
            completedCount == totalCount
        );
    }
    
    
    /**
     * Calculate average score across multiple progress records
     * Only includes completed progress with scores
     */
    private BigDecimal calculateAverageScore(List<StudentLessonProgress> progressList) {
        List<BigDecimal> scores = progressList.stream()
            .filter(StudentLessonProgress::isCompleted)
            .map(StudentLessonProgress::getAssessmentScore)
            .filter(score -> score != null)
            .collect(Collectors.toList());
        
        if (scores.isEmpty()) {
            return null;
        }
        
        BigDecimal sum = scores.stream()
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal average = sum.divide(
            BigDecimal.valueOf(scores.size()), 
            2, 
            RoundingMode.HALF_UP
        );
        
        log.debug("Calculated average score: {} from {} scores", average, scores.size());
        return average;
    }

    // ============================================================
    // JSON UTILITIES
    // ============================================================

    private String toJson(List<Long> list) {
        try {
            return objectMapper.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize list to JSON: {}", e.getMessage());
            return "[]";
        }
    }

    private List<Long> fromJson(String json) {
        if (json == null || json.trim().isEmpty() || "[]".equals(json.trim())) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(
                json,
                objectMapper.getTypeFactory().constructCollectionType(List.class, Long.class)
            );
        } catch (JsonProcessingException e) {
            log.error("Failed to parse JSON: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    // ============================================================
    // DTO CLASSES
    // ============================================================

    public static class CompletionStats {
        private final long completedCount;
        private final int totalCount;
        private final BigDecimal completionPercentage;
        private final BigDecimal averageScore;
        private final boolean allCompleted;

        public CompletionStats(long completedCount, int totalCount, 
                             BigDecimal completionPercentage, BigDecimal averageScore,
                             boolean allCompleted) {
            this.completedCount = completedCount;
            this.totalCount = totalCount;
            this.completionPercentage = completionPercentage;
            this.averageScore = averageScore;
            this.allCompleted = allCompleted;
        }

        public long getCompletedCount() { return completedCount; }
        public int getTotalCount() { return totalCount; }
        public BigDecimal getCompletionPercentage() { return completionPercentage; }
        public BigDecimal getAverageScore() { return averageScore; }
        public boolean isAllCompleted() { return allCompleted; }
    }
}