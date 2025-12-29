package com.edu.platform.controller;

import com.edu.platform.dto.classdata.DailyScheduleDto;
import com.edu.platform.service.DailyScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/schedules")
@RequiredArgsConstructor
public class DailyScheduleController {

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
}
