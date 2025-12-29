package com.edu.platform.controller.individual;

import com.edu.platform.dto.individual.*;
import com.edu.platform.service.individual.IndividualSchemeService;
import com.edu.platform.service.individual.IndividualTimetableService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Overview and dashboard for INDIVIDUAL students
 */
@RestController
@RequestMapping("/individual/student")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Individual Student", description = "Overview and dashboard for INDIVIDUAL students")
public class IndividualStudentController {

    private final IndividualTimetableService timetableService;
    private final IndividualSchemeService schemeService;

    /**
     * Get overview of all uploads for a student
     */
    @GetMapping("/{studentProfileId}/overview")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Get student upload overview", 
               description = "Get all timetables and schemes uploaded by an INDIVIDUAL student")
    public ResponseEntity<IndividualStudentOverviewDto> getStudentOverview(
            @PathVariable Long studentProfileId) {

        log.info("📊 Fetching overview for student profile: {}", studentProfileId);

        List<IndividualTimetableDto> timetables =
            timetableService.getTimetablesForStudent(studentProfileId);
        List<IndividualSchemeDto> schemes =
            schemeService.getSchemesForStudent(studentProfileId);

        IndividualStudentOverviewDto overview = IndividualStudentOverviewDto.builder()
            .studentProfileId(studentProfileId)
            .totalTimetables(timetables.size())
            .totalSchemes(schemes.size())
            .timetables(timetables)
            .schemes(schemes)
            .build();

        log.info("✅ Retrieved {} timetables and {} schemes", 
                 timetables.size(), schemes.size());

        return ResponseEntity.ok(overview);
    }

    /**
     * Get all timetables for a student
     */
    @GetMapping("/{studentProfileId}/timetables")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Get all timetables for a student")
    public ResponseEntity<List<IndividualTimetableDto>> getStudentTimetables(
            @PathVariable Long studentProfileId) {
        
        List<IndividualTimetableDto> timetables = 
            timetableService.getTimetablesForStudent(studentProfileId);
        return ResponseEntity.ok(timetables);
    }

    /**
     * Get all schemes for a student
     */
    @GetMapping("/{studentProfileId}/schemes")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Get all schemes for a student")
    public ResponseEntity<List<IndividualSchemeDto>> getStudentSchemes(
            @PathVariable Long studentProfileId) {
        
        List<IndividualSchemeDto> schemes = 
            schemeService.getSchemesForStudent(studentProfileId);
        return ResponseEntity.ok(schemes);
    }

    /**
     * Get processing statistics for a student
     */
    @GetMapping("/{studentProfileId}/stats")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Get processing statistics")
    public ResponseEntity<ProcessingStatsDto> getProcessingStats(
            @PathVariable Long studentProfileId) {
        
        List<IndividualTimetableDto> timetables = 
            timetableService.getTimetablesForStudent(studentProfileId);
        List<IndividualSchemeDto> schemes = 
            schemeService.getSchemesForStudent(studentProfileId);

        // Calculate stats
        long completedTimetables = timetables.stream()
            .filter(t -> "COMPLETED".equals(t.getProcessingStatus()))
            .count();
        long completedSchemes = schemes.stream()
            .filter(s -> "COMPLETED".equals(s.getProcessingStatus()))
            .count();
        long failedTimetables = timetables.stream()
            .filter(t -> "FAILED".equals(t.getProcessingStatus()))
            .count();
        long failedSchemes = schemes.stream()
            .filter(s -> "FAILED".equals(s.getProcessingStatus()))
            .count();

        ProcessingStatsDto stats = ProcessingStatsDto.builder()
            .totalTimetables(timetables.size())
            .totalSchemes(schemes.size())
            .completedTimetables((int) completedTimetables)
            .completedSchemes((int) completedSchemes)
            .failedTimetables((int) failedTimetables)
            .failedSchemes((int) failedSchemes)
            .processingTimetables((int) (timetables.size() - completedTimetables - failedTimetables))
            .processingSchemes((int) (schemes.size() - completedSchemes - failedSchemes))
            .build();

        return ResponseEntity.ok(stats);
    }
}