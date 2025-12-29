
// ============================================================================
// FILE 1: ProgressRecordCreationService.java
// Location: src/main/java/com/edu/platform/service/individual/ProgressRecordCreationService.java
// ============================================================================

package com.edu.platform.service.individual;

import com.edu.platform.model.DailySchedule;
import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.DailyScheduleRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class ProgressRecordCreationService {

    private final DailyScheduleRepository scheduleRepository;
    private final StudentLessonProgressRepository progressRepository;
    private final IndividualProgressInitializer progressInitializer;

    @Transactional
    public int createMissingProgressRecords(Long studentProfileId, 
                                           LocalDate startDate, 
                                           LocalDate endDate) {
        
        log.info("🔧 Creating missing progress records for student {} from {} to {}", 
                 studentProfileId, startDate, endDate);
        
        // Get all INDIVIDUAL schedules for this student in the date range
        List<DailySchedule> schedules = scheduleRepository
            .findByStudentProfileIdAndScheduledDateBetweenAndScheduleSourceOrderByScheduledDateAscPeriodNumberAsc(
                studentProfileId, startDate, endDate, "INDIVIDUAL");
        
        if (schedules.isEmpty()) {
            log.info("✅ No schedules found for student {}", studentProfileId);
            return 0;
        }
        
        log.info("📋 Found {} schedules for student {}", schedules.size(), studentProfileId);
        
        int createdCount = 0;
        
        for (DailySchedule schedule : schedules) {
            // Check if progress already exists
            boolean progressExists = progressRepository
                .existsByStudentProfileIdAndScheduledDateAndPeriodNumber(
                    studentProfileId, 
                    schedule.getScheduledDate(), 
                    schedule.getPeriodNumber()
                );
            
            if (progressExists) {
                log.debug("⏭️ Progress already exists for schedule {} ({} period {})", 
                    schedule.getId(), schedule.getScheduledDate(), schedule.getPeriodNumber());
                continue;
            }
            
            // Create progress record if lesson topic is assigned
            if (schedule.getLessonTopic() == null) {
                log.debug("⚠️ Schedule {} has no topic assigned, skipping progress creation", 
                    schedule.getId());
                continue;
            }
            
            try {
                // Calculate assessment windows
                LocalDateTime windowStart = calculateWindowStart(schedule);
                LocalDateTime windowEnd = calculateWindowEnd(schedule);
                
                // Get assessment (may be null)
                Assessment assessment = schedule.getAssessment();
                
                // Create progress record
                StudentLessonProgress progress = progressInitializer.createProgressRecord(
                    schedule, 
                    assessment, 
                    windowStart, 
                    windowEnd
                );
                
                if (progress != null) {
                    createdCount++;
                    log.info("✅ Created progress {} for schedule {} ({} period {})", 
                        progress.getId(), 
                        schedule.getId(), 
                        schedule.getScheduledDate(), 
                        schedule.getPeriodNumber()
                    );
                }
            } catch (Exception e) {
                log.error("❌ Failed to create progress for schedule {}: {}", 
                    schedule.getId(), e.getMessage(), e);
            }
        }
        
        log.info("✅ Created {} progress records for student {}", createdCount, studentProfileId);
        return createdCount;
    }
    
    private LocalDateTime calculateWindowStart(DailySchedule schedule) {
        if (schedule.getLessonStartDatetime() != null) {
            return schedule.getLessonStartDatetime();
        }
        
        if (schedule.getScheduledDate() != null && schedule.getStartTime() != null) {
            return LocalDateTime.of(
                schedule.getScheduledDate(), 
                schedule.getStartTime()
            );
        }
        
        return schedule.getScheduledDate().atStartOfDay();
    }
    
    private LocalDateTime calculateWindowEnd(DailySchedule schedule) {
        if (schedule.getLessonEndDatetime() != null) {
            return schedule.getLessonEndDatetime().plusMinutes(30);
        }
        
        if (schedule.getScheduledDate() != null && schedule.getEndTime() != null) {
            return LocalDateTime.of(
                schedule.getScheduledDate(), 
                schedule.getEndTime()
            ).plusMinutes(30);
        }
        
        return schedule.getScheduledDate().atTime(23, 59, 59);
    }
}