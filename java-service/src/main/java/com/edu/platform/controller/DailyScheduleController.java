package com.edu.platform.controller;

import com.edu.platform.dto.classdata.DailyScheduleDto;
import com.edu.platform.model.DailySchedule;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.repository.DailyScheduleRepository;
import com.edu.platform.repository.StudentProfileRepository;
import com.edu.platform.service.DailyScheduleService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/schedules")
@RequiredArgsConstructor
public class DailyScheduleController {

	
	private final StudentProfileRepository studentProfileRepository;
	private final DailyScheduleRepository dailyScheduleRepository;
    private final DailyScheduleService dailyScheduleService;

    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PostMapping
    public ResponseEntity<DailyScheduleDto> create(@RequestBody DailyScheduleDto dto) {
        DailyScheduleDto created = dailyScheduleService.createSchedule(dto);
        return ResponseEntity.ok(created);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping
    public ResponseEntity<List<DailyScheduleDto>> getAllSchedules(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        List<DailyScheduleDto> schedules = dailyScheduleService.getAllSchedules(fromDate, toDate);
        return ResponseEntity.ok(schedules);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping("/date/{date}")
    public ResponseEntity<List<DailyScheduleDto>> getSchedulesByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        List<DailyScheduleDto> schedules = dailyScheduleService.getSchedulesByDate(date);
        return ResponseEntity.ok(schedules);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        dailyScheduleService.deleteSchedule(id);
        return ResponseEntity.noContent().build();
    }
    
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/student/{studentId}")
    public ResponseEntity<List<DailyScheduleDto>> getStudentSchedules(
            @PathVariable Long studentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        log.info("GET /schedules/student/{} - from: {}, to: {}", studentId, fromDate, toDate);
        
        StudentProfile student = studentProfileRepository.findById(studentId)
                .orElseThrow(() -> new EntityNotFoundException("Student not found: " + studentId));
        
        List<DailySchedule> schedules;
        
        if (fromDate != null && toDate != null) {
            schedules = dailyScheduleRepository
                    .findByStudentProfileAndScheduledDateBetweenOrderByScheduledDateAscPeriodNumberAsc(
                            student, fromDate, toDate);
        } else {
            schedules = dailyScheduleRepository
                    .findByStudentProfileOrderByScheduledDateAscPeriodNumberAsc(student);
        }
        
        List<DailyScheduleDto> dtos = schedules.stream()
                .map(DailyScheduleDto::fromEntity)
                .collect(Collectors.toList());
        
        log.info("✅ Returned {} daily schedules for student {}", dtos.size(), studentId);
        return ResponseEntity.ok(dtos);
    }
}
