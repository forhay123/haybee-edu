package com.edu.platform.controller;

import com.edu.platform.dto.classdata.WeeklyScheduleDto;
import com.edu.platform.dto.validation.ValidationResult;
import com.edu.platform.model.WeeklySchedule;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.service.WeeklyScheduleService;
import com.edu.platform.service.schedule.WeeklyScheduleValidationService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/weekly-schedules")
@RequiredArgsConstructor
@Slf4j
public class WeeklyScheduleController {

    private final WeeklyScheduleService weeklyScheduleService;
    private final WeeklyScheduleValidationService validationService;

    // ✅ NEW: Get available student types for schedule management
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping("/student-types")
    @Operation(summary = "Get student types for schedules", 
               description = "Returns SCHOOL, HOME, and ASPIRANT student types (excludes INDIVIDUAL)")
    public ResponseEntity<List<Map<String, Object>>> getStudentTypesForSchedules() {
        log.info("GET /weekly-schedules/student-types - Fetching student types for schedules");
        
        // Only SCHOOL, HOME, and ASPIRANT use weekly schedules
        // INDIVIDUAL students use a different approach
        List<Map<String, Object>> studentTypes = Arrays.stream(StudentType.values())
            .filter(type -> type != StudentType.INDIVIDUAL) // ✅ Exclude INDIVIDUAL
            .map(type -> {
                Map<String, Object> typeMap = new HashMap<>();
                typeMap.put("id", type.ordinal() + 1);
                typeMap.put("name", type.name());
                typeMap.put("displayName", formatDisplayName(type.name()));
                typeMap.put("code", type.name());
                return typeMap;
            })
            .collect(Collectors.toList());
        
        log.info("✅ Returned {} student types for schedule management", studentTypes.size());
        return ResponseEntity.ok(studentTypes);
    }

    private String formatDisplayName(String enumName) {
        // Convert SCHOOL -> School, HOME -> Home, ASPIRANT -> Aspirant
        return enumName.charAt(0) + enumName.substring(1).toLowerCase();
    }

    // ======================================================
    // EXISTING ENDPOINTS (PRESERVED)
    // ======================================================

    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PostMapping("/validate")
    @Operation(summary = "Validate schedule creation", 
               description = "Check if weekly schedule can be created based on available questions")
    public ResponseEntity<ValidationResult> validateScheduleCreation(
            @RequestBody WeeklyScheduleDto dto) {
        
        log.info("🔍 Validating schedule creation for class {}, subject {}, lesson {}", 
                dto.classId(), dto.subjectId(), dto.lessonTopicId());
        
        ValidationResult result = validationService.validateScheduleCanBeCreated(dto);
        
        if (!result.isCanCreate()) {
            log.warn("⚠️ Validation FAILED: {}", result.getReason());
            log.debug("Question breakdown - AI: {}, Teacher: {}, Total: {}", 
                    result.getAiQuestions(), result.getTeacherQuestions(), result.getQuestionCount());
        } else {
            log.info("✅ Validation PASSED: {} questions available (AI: {}, Teacher: {})", 
                    result.getQuestionCount(), result.getAiQuestions(), result.getTeacherQuestions());
        }
        
        return ResponseEntity.ok(result);
    }

    @PreAuthorize("isAuthenticated()")  // ✅ Allow students
    @GetMapping
    public ResponseEntity<List<WeeklyScheduleDto>> getAll(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        log.info("GET /weekly-schedules - from: {}, to: {}", from, to);
        
        // For now, just return all schedules (you can add filtering later)
        List<WeeklyScheduleDto> schedules = weeklyScheduleService.getAllSchedules().stream()
                .map(WeeklyScheduleDto::fromEntity)
                .toList();
        
        log.info("✅ Returned {} weekly schedules", schedules.size());
        return ResponseEntity.ok(schedules);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping("/class/{classId}")
    public ResponseEntity<List<WeeklyScheduleDto>> getByClass(@PathVariable Long classId) {
        log.info("GET /weekly-schedules/class/{} - Fetching schedules for class", classId);
        
        List<WeeklyScheduleDto> schedules = weeklyScheduleService.getSchedulesByClass(classId).stream()
                .map(WeeklyScheduleDto::fromEntity)
                .toList();
        
        log.info("✅ Found {} weekly schedules for class {}", schedules.size(), classId);
        return ResponseEntity.ok(schedules);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping("/class/{classId}/day/{dayOfWeek}")
    public ResponseEntity<List<WeeklyScheduleDto>> getByClassAndDay(
            @PathVariable Long classId,
            @PathVariable DayOfWeek dayOfWeek) {
        log.info("GET /weekly-schedules/class/{}/day/{}", classId, dayOfWeek);
        
        List<WeeklyScheduleDto> schedules = weeklyScheduleService
                .getSchedulesByClassAndDay(classId, dayOfWeek).stream()
                .map(WeeklyScheduleDto::fromEntity)
                .toList();
        
        log.info("✅ Found {} schedules for class {} on {}", schedules.size(), classId, dayOfWeek);
        return ResponseEntity.ok(schedules);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PostMapping
    public ResponseEntity<WeeklyScheduleDto> create(@RequestBody WeeklyScheduleDto dto) {
        log.info("POST /weekly-schedules - Creating weekly schedule for class {}", dto.classId());
        
        WeeklySchedule saved = weeklyScheduleService.createSchedule(dto);
        
        log.info("✅ Created weekly schedule ID {} and auto-generated daily schedules", saved.getId());
        return ResponseEntity.ok(WeeklyScheduleDto.fromEntity(saved));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PutMapping("/{id}")
    public ResponseEntity<WeeklyScheduleDto> update(
            @PathVariable Long id, 
            @RequestBody WeeklyScheduleDto dto) {
        log.info("PUT /weekly-schedules/{} - Updating weekly schedule", id);
        
        WeeklySchedule updated = weeklyScheduleService.updateSchedule(id, dto);
        
        log.info("✅ Updated weekly schedule {}", id);
        return ResponseEntity.ok(WeeklyScheduleDto.fromEntity(updated));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        log.info("DELETE /weekly-schedules/{} - Deleting weekly schedule", id);
        
        weeklyScheduleService.deleteSchedule(id);
        
        log.info("✅ Deleted weekly schedule {}", id);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{id}/regenerate")
    public ResponseEntity<String> regenerateDailySchedules(@PathVariable Long id) {
        log.info("POST /weekly-schedules/{}/regenerate - Regenerating daily schedules", id);
        
        WeeklySchedule weeklySchedule = weeklyScheduleService.getScheduleById(id);
        weeklyScheduleService.generateDailySchedulesForWeeklyTemplate(weeklySchedule);
        
        log.info("✅ Regenerated daily schedules from weekly template {}", id);
        return ResponseEntity.ok("Daily schedules regenerated successfully");
    }

    @PostMapping("/generate-all-weeks")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Generate daily schedules for all weeks", 
               description = "Creates daily schedules for all existing weekly schedules in the active term")
    public ResponseEntity<Map<String, Object>> generateAllWeeks() {
        log.info("🔨 Admin triggering generation for all weeks");
        
        try {
            int count = weeklyScheduleService.generateDailySchedulesForAllWeeks();
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Daily schedules generated for all weeks",
                "schedulesCreated", count
            ));
        } catch (Exception e) {
            log.error("❌ Failed to generate schedules: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "status", "error",
                "message", e.getMessage()
            ));
        }
    }

    @PostMapping("/generate-for-student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Generate schedules for specific student", 
               description = "Creates daily schedules for a student from all weekly schedules")
    public ResponseEntity<Map<String, Object>> generateForStudent(@PathVariable Long studentId) {
        log.info("🔨 Generating schedules for student {}", studentId);
        
        try {
            int count = weeklyScheduleService.generateDailySchedulesForStudent(studentId);
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Daily schedules generated for student",
                "studentId", studentId,
                "schedulesCreated", count
            ));
        } catch (Exception e) {
            log.error("❌ Failed: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "status", "error",
                "message", e.getMessage()
            ));
        }
    }

    @PostMapping("/generate-for-class/{classId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Generate schedules for class", 
               description = "Regenerates daily schedules for all students in a class from weekly templates")
    public ResponseEntity<Map<String, Object>> generateForClass(@PathVariable Long classId) {
        log.info("🔨 Generating schedules for class {}", classId);
        
        try {
            int count = weeklyScheduleService.regenerateDailySchedulesForClass(classId);
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Daily schedules generated for class",
                "classId", classId,
                "schedulesCreated", count
            ));
        } catch (Exception e) {
            log.error("❌ Failed: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "status", "error",
                "message", e.getMessage()
            ));
        }
    }
}