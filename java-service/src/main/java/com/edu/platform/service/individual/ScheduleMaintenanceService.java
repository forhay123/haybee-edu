package com.edu.platform.service.individual;

import com.edu.platform.model.DailySchedule;
import com.edu.platform.model.enums.ScheduleStatus;
import com.edu.platform.repository.DailyScheduleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service for maintaining schedule data integrity
 * Fixes inconsistent missing_lesson_topic flags
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ScheduleMaintenanceService {

    private final DailyScheduleRepository dailyScheduleRepository;

    /**
     * Fix all schedules with inconsistent missing_lesson_topic flags
     * 
     * @return Number of schedules fixed
     */
    @Transactional
    public int fixInconsistentMissingTopicFlags() {
        log.info("🔧 Starting schedule maintenance: fixing inconsistent missing_lesson_topic flags");

        int fixedCount = 0;

        // Fix Case 1: Schedules with NULL topic but flag = FALSE
        fixedCount += fixNullTopicButFlagFalse();

        // Fix Case 2: Schedules WITH topic but flag = TRUE
        fixedCount += fixHasTopicButFlagTrue();

        log.info("✅ Schedule maintenance complete: {} schedules fixed", fixedCount);
        return fixedCount;
    }

    /**
     * Fix schedules that have NULL lesson_topic_id but missing_lesson_topic = FALSE
     * These should have flag = TRUE
     */
    @Transactional
    public int fixNullTopicButFlagFalse() {
        log.info("🔍 Finding schedules with NULL topic but flag=FALSE");

        // Find all INDIVIDUAL schedules
        List<DailySchedule> allSchedules = dailyScheduleRepository
            .findByScheduleStatusAndScheduleSource(ScheduleStatus.READY, "INDIVIDUAL");

        int fixedCount = 0;

        for (DailySchedule schedule : allSchedules) {
            // Check: no topic + flag is false = INCONSISTENT
            if (schedule.getLessonTopic() == null && !Boolean.TRUE.equals(schedule.getMissingLessonTopic())) {
                log.debug("⚠️  Fixing schedule {}: NULL topic but flag=FALSE", schedule.getId());
                
                schedule.setMissingLessonTopic(true);
                schedule.setScheduleStatus(ScheduleStatus.IN_PROGRESS);
                schedule.setLessonAssignmentMethod("PENDING_MANUAL");
                
                dailyScheduleRepository.save(schedule);
                fixedCount++;
            }
        }

        log.info("✅ Fixed {} schedules (NULL topic → flag=TRUE)", fixedCount);
        return fixedCount;
    }

    /**
     * Fix schedules that HAVE a lesson_topic but missing_lesson_topic = TRUE
     * These should have flag = FALSE
     */
    @Transactional
    public int fixHasTopicButFlagTrue() {
        log.info("🔍 Finding schedules with topic assigned but flag=TRUE");

        // Find all schedules with missing_lesson_topic = TRUE
        List<DailySchedule> missingSchedules = dailyScheduleRepository
            .findByMissingLessonTopicTrueAndScheduleSource("INDIVIDUAL");

        int fixedCount = 0;

        for (DailySchedule schedule : missingSchedules) {
            // Check: has topic + flag is true = INCONSISTENT
            if (schedule.getLessonTopic() != null) {
                log.debug("⚠️  Fixing schedule {}: HAS topic but flag=TRUE", schedule.getId());
                
                schedule.setMissingLessonTopic(false);
                schedule.setScheduleStatus(ScheduleStatus.READY);
                
                dailyScheduleRepository.save(schedule);
                fixedCount++;
            }
        }

        log.info("✅ Fixed {} schedules (HAS topic → flag=FALSE)", fixedCount);
        return fixedCount;
    }

    /**
     * Get statistics on schedule flag consistency
     */
    public MaintenanceStats getMaintenanceStats() {
        MaintenanceStats stats = new MaintenanceStats();

        // Total INDIVIDUAL schedules
        long totalSchedules = dailyScheduleRepository.countByScheduleSource("INDIVIDUAL");
        stats.setTotalSchedules(totalSchedules);

        // Schedules with missing topics (flag = TRUE)
        long missingTopics = dailyScheduleRepository
            .countByMissingLessonTopicTrueAndScheduleSource("INDIVIDUAL");
        stats.setSchedulesWithMissingTopics(missingTopics);

        // Schedules with assigned topics
        stats.setSchedulesWithAssignedTopics(totalSchedules - missingTopics);

        // Get all schedules for detailed check
        List<DailySchedule> allSchedules = dailyScheduleRepository
            .findByScheduleSourceOrderByScheduledDateAscPeriodNumberAsc("INDIVIDUAL");

        long inconsistentNullTopic = allSchedules.stream()
            .filter(s -> s.getLessonTopic() == null && !Boolean.TRUE.equals(s.getMissingLessonTopic()))
            .count();

        long inconsistentHasTopic = allSchedules.stream()
            .filter(s -> s.getLessonTopic() != null && Boolean.TRUE.equals(s.getMissingLessonTopic()))
            .count();

        stats.setInconsistentNullTopic(inconsistentNullTopic);
        stats.setInconsistentHasTopic(inconsistentHasTopic);
        stats.setTotalInconsistent(inconsistentNullTopic + inconsistentHasTopic);

        log.info("📊 Maintenance Stats: total={}, missing={}, inconsistent={}", 
            totalSchedules, missingTopics, stats.getTotalInconsistent());

        return stats;
    }

    /**
     * Stats DTO
     */
    public static class MaintenanceStats {
        private long totalSchedules;
        private long schedulesWithMissingTopics;
        private long schedulesWithAssignedTopics;
        private long inconsistentNullTopic;
        private long inconsistentHasTopic;
        private long totalInconsistent;

        // Getters and setters
        public long getTotalSchedules() { return totalSchedules; }
        public void setTotalSchedules(long totalSchedules) { this.totalSchedules = totalSchedules; }
        
        public long getSchedulesWithMissingTopics() { return schedulesWithMissingTopics; }
        public void setSchedulesWithMissingTopics(long schedulesWithMissingTopics) { 
            this.schedulesWithMissingTopics = schedulesWithMissingTopics; 
        }
        
        public long getSchedulesWithAssignedTopics() { return schedulesWithAssignedTopics; }
        public void setSchedulesWithAssignedTopics(long schedulesWithAssignedTopics) { 
            this.schedulesWithAssignedTopics = schedulesWithAssignedTopics; 
        }
        
        public long getInconsistentNullTopic() { return inconsistentNullTopic; }
        public void setInconsistentNullTopic(long inconsistentNullTopic) { 
            this.inconsistentNullTopic = inconsistentNullTopic; 
        }
        
        public long getInconsistentHasTopic() { return inconsistentHasTopic; }
        public void setInconsistentHasTopic(long inconsistentHasTopic) { 
            this.inconsistentHasTopic = inconsistentHasTopic; 
        }
        
        public long getTotalInconsistent() { return totalInconsistent; }
        public void setTotalInconsistent(long totalInconsistent) { 
            this.totalInconsistent = totalInconsistent; 
        }
    }
}