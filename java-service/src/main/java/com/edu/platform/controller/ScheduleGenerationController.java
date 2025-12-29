package com.edu.platform.controller;

import com.edu.platform.service.DailyScheduleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/admin/schedule-generation")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Schedule Generation", description = "Admin endpoints for generating daily schedules")
public class ScheduleGenerationController {

    private final DailyScheduleService dailyScheduleService;

    @PostMapping("/generate")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Generate daily schedules", 
               description = "Generate daily schedules for all students on a specific date")
    public ResponseEntity<Map<String, Object>> generateSchedules(
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        if (date == null) {
            date = LocalDate.now();
        }

        log.info("🔨 Admin triggering schedule generation for {}", date);
        
        try {
            dailyScheduleService.generateDailySchedulesForAllStudents(date);
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Daily schedules generated successfully",
                "date", date.toString()
            ));
        } catch (Exception e) {
            log.error("❌ Failed to generate schedules: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "status", "error",
                "message", "Failed to generate schedules: " + e.getMessage()
            ));
        }
    }

    @PostMapping("/generate/class/{classId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Generate schedules for a class", 
               description = "Generate daily schedules for all students in a specific class")
    public ResponseEntity<Map<String, Object>> generateSchedulesForClass(
            @PathVariable Long classId,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        if (date == null) {
            date = LocalDate.now();
        }

        log.info("🔨 Admin triggering schedule generation for class {} on {}", classId, date);
        
        try {
            dailyScheduleService.generateDailySchedulesForClass(classId, date);
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Schedules generated for class " + classId,
                "classId", classId,
                "date", date.toString()
            ));
        } catch (Exception e) {
            log.error("❌ Failed to generate schedules: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "status", "error",
                "message", "Failed to generate schedules: " + e.getMessage()
            ));
        }
    }

    @PostMapping("/generate/week")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Generate schedules for a week", 
               description = "Generate daily schedules for the next 7 days")
    public ResponseEntity<Map<String, Object>> generateSchedulesForWeek(
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate) {
        
        if (startDate == null) {
            startDate = LocalDate.now();
        }

        log.info("🔨 Admin triggering schedule generation for week starting {}", startDate);
        
        try {
            for (int i = 0; i < 7; i++) {
                LocalDate date = startDate.plusDays(i);
                dailyScheduleService.generateDailySchedulesForAllStudents(date);
            }
            
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Weekly schedules generated successfully",
                "startDate", startDate.toString(),
                "endDate", startDate.plusDays(6).toString()
            ));
        } catch (Exception e) {
            log.error("❌ Failed to generate weekly schedules: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "status", "error",
                "message", "Failed to generate schedules: " + e.getMessage()
            ));
        }
    }

    @DeleteMapping("/cleanup")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Cleanup old schedules", 
               description = "Delete schedules older than specified date")
    public ResponseEntity<Map<String, Object>> cleanupOldSchedules(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate beforeDate) {
        
        log.info("🧹 Admin triggering cleanup of schedules before {}", beforeDate);
        
        try {
            dailyScheduleService.deleteOldSchedules(beforeDate);
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Old schedules cleaned up successfully",
                "beforeDate", beforeDate.toString()
            ));
        } catch (Exception e) {
            log.error("❌ Failed to cleanup schedules: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "status", "error",
                "message", "Failed to cleanup schedules: " + e.getMessage()
            ));
        }
    }
}