package com.edu.platform.controller;

import com.edu.platform.dto.schedule.ScheduleHealthDto;
import com.edu.platform.service.WeeklyScheduleService;
import com.edu.platform.service.schedule.ScheduleHealthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/schedule-health")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Schedule Health", description = "Monitor and fix schedule generation")
public class ScheduleHealthController {

    private final ScheduleHealthService scheduleHealthService;
    private final WeeklyScheduleService weeklyScheduleService;

    @GetMapping("/students")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get all students' schedule health")
    public ResponseEntity<List<ScheduleHealthDto>> getAllStudentsHealth() {
        log.info("GET /schedule-health/students");
        
        List<ScheduleHealthDto> healthStatuses = scheduleHealthService.getAllStudentsHealthStatus();
        
        log.info("✅ Returned health for {} students", healthStatuses.size());
        return ResponseEntity.ok(healthStatuses);
    }

    @GetMapping("/students/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get single student's schedule health")
    public ResponseEntity<ScheduleHealthDto> getStudentHealth(@PathVariable Long studentId) {
        log.info("GET /schedule-health/students/{}", studentId);
        
        ScheduleHealthDto health = scheduleHealthService.getStudentHealthStatus(studentId);
        
        log.info("✅ Returned health for student {}: {}", studentId, health.getHealthStatus());
        return ResponseEntity.ok(health);
    }

    @PostMapping("/students/{studentId}/fix")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Fix schedule issues for a student")
    public ResponseEntity<Map<String, Object>> fixStudentSchedules(
            @PathVariable Long studentId,
            @RequestParam(defaultValue = "false") boolean forceRegenerate) {
        log.info("POST /schedule-health/students/{}/fix (forceRegenerate={})", studentId, forceRegenerate);
        
        try {
            ScheduleHealthDto health = scheduleHealthService.getStudentHealthStatus(studentId);
            
            if (!health.getCanGenerate() && !health.getCanRegenerate()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", "Cannot fix: " + health.getActionRequired()
                ));
            }
            
            int count;
            
            // ✅ CRITICAL FIX: Use regeneration mode when schedules exist
            if (forceRegenerate || health.getCanRegenerate()) {
                log.info("🔄 Regenerating schedules (will update existing ones)");
                count = weeklyScheduleService.regenerateDailySchedulesForStudent(studentId);
            } else {
                log.info("➕ Generating new schedules");
                count = weeklyScheduleService.generateDailySchedulesForStudent(studentId);
            }
            
            ScheduleHealthDto updatedHealth = scheduleHealthService.getStudentHealthStatus(studentId);
            
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Schedules fixed successfully",
                "schedulesProcessed", count,
                "healthStatus", updatedHealth.getHealthStatus().name(),
                "studentId", studentId
            ));
            
        } catch (Exception e) {
            log.error("❌ Failed to fix schedules for student {}: {}", studentId, e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "status", "error",
                "message", e.getMessage()
            ));
        }
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get overall health summary")
    public ResponseEntity<Map<String, Object>> getHealthSummary() {
        log.info("GET /schedule-health/summary");
        
        List<ScheduleHealthDto> allHealth = scheduleHealthService.getAllStudentsHealthStatus();
        
        long healthy = allHealth.stream()
                .filter(h -> h.getHealthStatus() == ScheduleHealthDto.HealthStatus.HEALTHY)
                .count();
        
        long missingDaily = allHealth.stream()
                .filter(h -> h.getHealthStatus() == ScheduleHealthDto.HealthStatus.MISSING_DAILY)
                .count();
        
        long noSchedules = allHealth.stream()
                .filter(h -> h.getHealthStatus() == ScheduleHealthDto.HealthStatus.NO_SCHEDULES)
                .count();
        
        long partial = allHealth.stream()
                .filter(h -> h.getHealthStatus() == ScheduleHealthDto.HealthStatus.PARTIAL)
                .count();
        
        Map<String, Object> summary = new HashMap<>();
        summary.put("total", allHealth.size());
        summary.put("healthy", healthy);
        summary.put("missingDaily", missingDaily);
        summary.put("noSchedules", noSchedules);
        summary.put("partial", partial);
        summary.put("needsAttention", allHealth.size() - healthy);
        
        log.info("✅ Summary: {} total, {} healthy, {} need attention", 
                allHealth.size(), healthy, allHealth.size() - healthy);
        
        return ResponseEntity.ok(summary);
    }

    @PostMapping("/fix-all")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Fix schedules for all students with issues")
    public ResponseEntity<Map<String, Object>> fixAllStudents(
            @RequestParam(defaultValue = "false") boolean forceRegenerate) {
        log.info("POST /schedule-health/fix-all (forceRegenerate={})", forceRegenerate);
        
        List<ScheduleHealthDto> allHealth = scheduleHealthService.getAllStudentsHealthStatus();
        
        List<Long> fixableStudents = allHealth.stream()
                .filter(h -> h.getCanGenerate() || h.getCanRegenerate())
                .map(ScheduleHealthDto::getStudentId)
                .toList();
        
        int successCount = 0;
        int failCount = 0;
        List<String> errors = new ArrayList<>();
        
        for (Long studentId : fixableStudents) {
            try {
                ScheduleHealthDto health = allHealth.stream()
                    .filter(h -> h.getStudentId().equals(studentId))
                    .findFirst()
                    .orElseThrow();
                
                if (forceRegenerate || health.getCanRegenerate()) {
                    weeklyScheduleService.regenerateDailySchedulesForStudent(studentId);
                } else {
                    weeklyScheduleService.generateDailySchedulesForStudent(studentId);
                }
                
                successCount++;
            } catch (Exception e) {
                failCount++;
                errors.add("Student " + studentId + ": " + e.getMessage());
                log.error("Failed to fix student {}: {}", studentId, e.getMessage());
            }
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("status", "completed");
        result.put("totalProcessed", fixableStudents.size());
        result.put("successCount", successCount);
        result.put("failCount", failCount);
        result.put("errors", errors);
        
        log.info("✅ Fixed {} students, {} failed", successCount, failCount);
        
        return ResponseEntity.ok(result);
    }
}