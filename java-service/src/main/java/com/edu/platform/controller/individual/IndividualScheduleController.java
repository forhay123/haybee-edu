package com.edu.platform.controller.individual;

import com.edu.platform.dto.individual.IndividualDailyScheduleDto;
import com.edu.platform.service.individual.IndividualScheduleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

import com.edu.platform.service.individual.ProgressRecordCreationService;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/daily-schedules/individual")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Individual Schedule", description = "Daily schedule management for INDIVIDUAL students")
public class IndividualScheduleController {
    
    private final IndividualScheduleService scheduleService;
    private final ProgressRecordCreationService progressCreationService;
    
    /**
     * Get daily schedule for a specific date
     */
    @GetMapping("/student/{studentProfileId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Get daily schedule", description = "Get schedule for a specific date")
    public ResponseEntity<List<IndividualDailyScheduleDto>> getScheduleByDate(
            @PathVariable Long studentProfileId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        log.info("📅 Fetching schedule for student {} on {}", studentProfileId, date);
        List<IndividualDailyScheduleDto> schedules = 
            scheduleService.getScheduleByDate(studentProfileId, date);
        return ResponseEntity.ok(schedules);
    }
    
    /**
     * Get schedules for a date range
     */
    @GetMapping("/student/{studentProfileId}/range")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Get schedule range", description = "Get schedules for a date range")
    public ResponseEntity<List<IndividualDailyScheduleDto>> getScheduleByDateRange(
            @PathVariable Long studentProfileId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        log.info("📅 Fetching schedules for student {} from {} to {}", 
                 studentProfileId, startDate, endDate);
        
        List<IndividualDailyScheduleDto> schedules = 
            scheduleService.getScheduleByDateRange(studentProfileId, startDate, endDate);
        
        return ResponseEntity.ok(schedules);
    }
    
    /**
     * Mark a schedule as completed
     */
    @PutMapping("/{scheduleId}/complete")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Mark schedule complete", description = "Mark a schedule entry as completed")
    public ResponseEntity<Void> markScheduleComplete(@PathVariable Long scheduleId) {
        log.info("✅ Marking schedule {} as complete", scheduleId);
        scheduleService.markComplete(scheduleId);
        return ResponseEntity.ok().build();
    }
    
    /**
     * Mark a schedule as incomplete
     */
    @PutMapping("/{scheduleId}/incomplete")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Mark schedule incomplete", description = "Mark a schedule entry as incomplete")
    public ResponseEntity<Void> markScheduleIncomplete(@PathVariable Long scheduleId) {
        log.info("❌ Marking schedule {} as incomplete", scheduleId);
        scheduleService.markIncomplete(scheduleId);
        return ResponseEntity.ok().build();
    }
    
    /**
     * Fix missing progress records for a student
     * POST /api/v1/daily-schedules/individual/student/{studentProfileId}/fix-progress
     */
    @PostMapping("/student/{studentProfileId}/fix-progress")
    public ResponseEntity<Map<String, Object>> fixProgressRecords(
            @PathVariable Long studentProfileId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        log.info("🔧 Fixing progress records for student {} from {} to {}", 
                 studentProfileId, startDate, endDate);
        
        int created = progressCreationService.createMissingProgressRecords(
            studentProfileId, startDate, endDate);
        
        Map<String, Object> response = new HashMap<>();
        response.put("studentProfileId", studentProfileId);
        response.put("startDate", startDate);
        response.put("endDate", endDate);
        response.put("progressRecordsCreated", created);
        response.put("success", true);
        response.put("message", String.format("Created %d progress records", created));
        
        return ResponseEntity.ok(response);
    }
}