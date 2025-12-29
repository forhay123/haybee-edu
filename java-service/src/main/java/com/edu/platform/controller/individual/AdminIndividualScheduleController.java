package com.edu.platform.controller.individual;

import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.repository.DailyScheduleRepository;
import com.edu.platform.repository.StudentProfileRepository;
import com.edu.platform.repository.individual.IndividualTimetableRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository; // ✅ ADD THIS
import com.edu.platform.service.individual.IndividualScheduleGenerator;
import com.edu.platform.service.individual.TermWeekCalculator;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/individual/schedules")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin: Individual Schedule Management", description = "Admin endpoints for managing INDIVIDUAL student schedules")
public class AdminIndividualScheduleController {
    
    private final IndividualScheduleGenerator scheduleGenerator;
    private final DailyScheduleRepository scheduleRepository;
    private final StudentLessonProgressRepository progressRepository; // ✅ ADD THIS
    private final TermWeekCalculator termWeekCalculator;
    private final StudentProfileRepository studentProfileRepository;
    private final IndividualTimetableRepository timetableRepository;
    
    /**
     * ✅ FIXED: Delete progress records FIRST, then schedules
     */
    @PostMapping("/regenerate/week/{weekNumber}")
    @Transactional
    public ResponseEntity<Map<String, Object>> regenerateWeek(@PathVariable Integer weekNumber) {
        log.info("🔄 Admin: Regenerating schedules for Week {}", weekNumber);
        
        try {
            // ✅ SIMPLIFIED: Let the service handle everything
            IndividualScheduleGenerator.WeeklyGenerationResult result = 
                scheduleGenerator.generateWeeklySchedules(weekNumber);
            
            if (result.isSuccess()) {
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Successfully regenerated Week " + weekNumber,
                    "weekNumber", result.getWeekNumber(),
                    "schedulesCreated", result.getSchedulesCreated(),
                    "studentsProcessed", result.getStudentsProcessed()
                ));
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                        "success", false,
                        "message", "Regeneration failed: " + result.getErrorMessage()
                    ));
            }
            
        } catch (Exception e) {
            log.error("❌ Failed to regenerate week {}: {}", weekNumber, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(
                    "success", false,
                    "message", "Regeneration failed: " + e.getMessage()
                ));
        }
    }
    
    /**
     * ✅ FIXED: Delete progress records FIRST, then schedules
     */
    @DeleteMapping("/week/{weekNumber}")
    @Operation(summary = "Delete schedules for a week", 
               description = "Delete all INDIVIDUAL schedules for a specific week")
    @Transactional
    public ResponseEntity<Map<String, Object>> deleteWeekSchedules(
            @PathVariable Integer weekNumber) {
        
        log.info("🗑️ Admin: Deleting schedules for Week {}", weekNumber);
        
        try {
            LocalDate[] weekRange = termWeekCalculator.getWeekDateRange(weekNumber);
            if (weekRange == null) {
                return ResponseEntity.badRequest()
                    .body(Map.of(
                        "success", false,
                        "message", "Invalid week number: " + weekNumber
                    ));
            }
            
            LocalDate weekStart = weekRange[0];
            LocalDate weekEnd = weekRange[1];
            
            // ✅ STEP 1: Find schedules
            List<com.edu.platform.model.DailySchedule> schedulesToDelete = 
                scheduleRepository.findByScheduledDateBetweenAndScheduleSource(
                    weekStart, weekEnd, "INDIVIDUAL"
                );
            
            long scheduleCount = schedulesToDelete.size();
            log.info("📊 Found {} schedules to delete", scheduleCount);
            
            if (!schedulesToDelete.isEmpty()) {
                // ✅ STEP 2: DELETE PROGRESS RECORDS FIRST
                log.info("🗑️ Deleting progress records...");
                long progressDeleted = progressRepository.deleteByScheduledDateBetween(weekStart, weekEnd);
                log.info("✅ Deleted {} progress records", progressDeleted);
                
                progressRepository.flush();
                
                // ✅ STEP 3: DELETE SCHEDULES
                scheduleRepository.deleteAll(schedulesToDelete);
                scheduleRepository.flush();
            }
            
            log.info("✅ Deleted {} schedules for Week {}", scheduleCount, weekNumber);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Deleted " + scheduleCount + " schedules",
                "weekNumber", weekNumber,
                "weekStart", weekStart.toString(),
                "weekEnd", weekEnd.toString(),
                "schedulesDeleted", scheduleCount
            ));
            
        } catch (Exception e) {
            log.error("❌ Failed to delete week {}: {}", weekNumber, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(
                    "success", false,
                    "message", "Deletion failed: " + e.getMessage()
                ));
        }
    }
    
    /**
     * Preview what would be generated for a week (without saving)
     */
    @GetMapping("/preview/week/{weekNumber}")
    @Operation(summary = "Preview week generation", 
               description = "See which students would be processed without actually generating")
    public ResponseEntity<Map<String, Object>> previewWeekGeneration(
            @PathVariable Integer weekNumber) {
        
        log.info("👁️ Admin: Previewing generation for Week {}", weekNumber);
        
        try {
            LocalDate[] weekRange = termWeekCalculator.getWeekDateRange(weekNumber);
            if (weekRange == null) {
                return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Invalid week number"));
            }
            
            // Get students that would be processed
            List<StudentProfile> students = studentProfileRepository.findAll().stream()
                .filter(s -> s.getStudentType() == StudentType.INDIVIDUAL)
                .filter(s -> s.getUser() != null && s.getUser().isEnabled())
                .filter(s -> timetableRepository
                    .findFirstByStudentProfileAndProcessingStatusOrderByUploadedAtDesc(s, "COMPLETED")
                    .isPresent())
                .collect(Collectors.toList());
            
            // Count existing schedules
            long existingSchedules = scheduleRepository
                .countByScheduledDateBetweenAndScheduleSource(
                    weekRange[0], weekRange[1], "INDIVIDUAL"
                );
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "weekNumber", weekNumber,
                "weekStart", weekRange[0].toString(),
                "weekEnd", weekRange[1].toString(),
                "studentsToProcess", students.size(),
                "studentIds", students.stream().map(StudentProfile::getId).collect(Collectors.toList()),
                "existingSchedules", existingSchedules,
                "willRegenerate", existingSchedules > 0
            ));
            
        } catch (Exception e) {
            log.error("❌ Preview failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", e.getMessage()));
        }
    }
    
    /**
     * Get statistics for INDIVIDUAL schedules
     */
    @GetMapping("/stats")
    @Operation(summary = "Get schedule statistics", 
               description = "Get overall statistics for INDIVIDUAL schedules")
    public ResponseEntity<Map<String, Object>> getScheduleStats() {
        log.info("📊 Admin: Fetching INDIVIDUAL schedule statistics");
        
        try {
            long totalSchedules = scheduleRepository.countByScheduleSource("INDIVIDUAL");
            
            long studentsWithSchedules = scheduleRepository
                .findByScheduleSourceOrderByScheduledDateAscPeriodNumberAsc("INDIVIDUAL")
                .stream()
                .map(schedule -> schedule.getStudentProfile().getId())
                .distinct()
                .count();
            
            long missingTopics = scheduleRepository
                .countByMissingLessonTopicTrueAndScheduleSource("INDIVIDUAL");
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "totalSchedules", totalSchedules,
                "studentsWithSchedules", studentsWithSchedules,
                "missingTopics", missingTopics,
                "scheduleSource", "INDIVIDUAL"
            ));
            
        } catch (Exception e) {
            log.error("❌ Stats fetch failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", e.getMessage()));
        }
    }
    
    /**
     * Get current week number
     */
    @GetMapping("/current-week")
    @Operation(summary = "Get current week", 
               description = "Get the current week number of the active term")
    public ResponseEntity<Map<String, Object>> getCurrentWeek() {
        log.info("📅 Admin: Fetching current week number");
        
        try {
            Integer currentWeek = termWeekCalculator.getCurrentTermWeek();
            
            if (currentWeek == null) {
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "No active term or not within term dates"
                ));
            }
            
            LocalDate[] weekRange = termWeekCalculator.getWeekDateRange(currentWeek);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "currentWeek", currentWeek,
                "weekStart", weekRange[0].toString(),
                "weekEnd", weekRange[1].toString()
            ));
            
        } catch (Exception e) {
            log.error("❌ Current week fetch failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}