package com.edu.platform.controller.individual;

import com.edu.platform.dto.individual.*;
import com.edu.platform.model.PublicHoliday;
import com.edu.platform.service.individual.PublicHolidayService;
import com.edu.platform.service.individual.TermWeekCalculator;
import com.edu.platform.service.UserService;
import org.springframework.security.core.Authentication;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * SPRINT 10: Public Holiday Management Controller
 * Admin CRUD for public holidays and rescheduling management
 */
@RestController
@RequestMapping("/individual/public-holidays")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Public Holidays", description = "Public holiday management and rescheduling")
public class PublicHolidayController {

    private final PublicHolidayService publicHolidayService;
    private final TermWeekCalculator termWeekCalculator;
    private final UserService userService;

    // ============================================================
    // HOLIDAY CRUD OPERATIONS (ADMIN ONLY)
    // ============================================================

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get all public holidays")
    public ResponseEntity<List<PublicHolidayDto>> getAllHolidays() {
        log.info("📅 Fetching all public holidays");
        
        List<PublicHoliday> holidays = publicHolidayService.getAllHolidays();
        List<PublicHolidayDto> dtos = holidays.stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{holidayId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get holiday by ID")
    public ResponseEntity<PublicHolidayDto> getHolidayById(@PathVariable Long holidayId) {
        log.info("📅 Fetching holiday {}", holidayId);
        
        PublicHoliday holiday = publicHolidayService.getHolidayById(holidayId);
        return ResponseEntity.ok(convertToDto(holiday));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a new public holiday")
    public ResponseEntity<PublicHolidayDto> createHoliday(
            @Valid @RequestBody PublicHolidayDto dto,
            Authentication authentication) {
        
        log.info("📅 Creating new holiday: {} on {}", dto.getHolidayName(), dto.getHolidayDate());
        
        // Get user ID from authenticated user
        String email = authentication.getName();
        Long userId = userService.findByEmail(email)
                .map(com.edu.platform.model.User::getId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        PublicHoliday holiday = publicHolidayService.createHoliday(
            dto.getHolidayDate(),
            dto.getHolidayName(),
            dto.getIsSchoolClosed() != null ? dto.getIsSchoolClosed() : true,
            userId
        );
        
        return ResponseEntity.status(HttpStatus.CREATED).body(convertToDto(holiday));
    }

    @PutMapping("/{holidayId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update an existing holiday")
    public ResponseEntity<PublicHolidayDto> updateHoliday(
            @PathVariable Long holidayId,
            @Valid @RequestBody PublicHolidayDto dto) {
        
        log.info("📅 Updating holiday {}", holidayId);
        
        PublicHoliday holiday = publicHolidayService.updateHoliday(
            holidayId,
            dto.getHolidayName(),
            dto.getIsSchoolClosed() != null ? dto.getIsSchoolClosed() : true
        );
        
        return ResponseEntity.ok(convertToDto(holiday));
    }

    @DeleteMapping("/{holidayId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete a holiday")
    public ResponseEntity<Void> deleteHoliday(@PathVariable Long holidayId) {
        log.info("📅 Deleting holiday {}", holidayId);
        
        publicHolidayService.deleteHoliday(holidayId);
        return ResponseEntity.noContent().build();
    }

    // ============================================================
    // HOLIDAY QUERIES
    // ============================================================

    @GetMapping("/upcoming")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get upcoming holidays")
    public ResponseEntity<List<PublicHolidayDto>> getUpcomingHolidays() {
        log.info("📅 Fetching upcoming holidays");
        
        List<PublicHoliday> holidays = publicHolidayService.findUpcomingHolidays();
        List<PublicHolidayDto> dtos = holidays.stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/year/{year}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get holidays for a specific year")
    public ResponseEntity<List<PublicHolidayDto>> getHolidaysForYear(@PathVariable int year) {
        log.info("📅 Fetching holidays for year {}", year);
        
        List<PublicHoliday> holidays = publicHolidayService.getHolidaysForYear(year);
        List<PublicHolidayDto> dtos = holidays.stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/range")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get holidays in a date range")
    public ResponseEntity<List<PublicHolidayDto>> getHolidaysInRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        log.info("📅 Fetching holidays from {} to {}", startDate, endDate);
        
        List<PublicHoliday> holidays = publicHolidayService.findHolidaysInRange(startDate, endDate);
        List<PublicHolidayDto> dtos = holidays.stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/check-date")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Check if a specific date is a holiday")
    public ResponseEntity<Map<String, Object>> checkDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        log.info("📅 Checking if {} is a holiday", date);
        
        boolean isHoliday = publicHolidayService.isPublicHolidayWithClosure(date);
        Optional<PublicHoliday> holidayOpt = publicHolidayService.getHolidayForDate(date);
        
        Map<String, Object> response = Map.of(
            "date", date,
            "isHoliday", isHoliday,
            "holiday", holidayOpt.map(this::convertToDto).orElse(null)
        );
        
        return ResponseEntity.ok(response);
    }

    // ============================================================
    // RESCHEDULING OPERATIONS
    // ============================================================

    @GetMapping("/rescheduling/check-week/{weekNumber}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Check if rescheduling is needed for a specific week")
    public ResponseEntity<ReschedulingInfoDto> checkReschedulingForWeek(
            @PathVariable Integer weekNumber) {
        
        log.info("🔄 Checking rescheduling for week {}", weekNumber);
        
        LocalDate[] weekRange = termWeekCalculator.getWeekDateRange(weekNumber);
        if (weekRange == null) {
            return ResponseEntity.badRequest().build();
        }
        
        LocalDate weekStart = weekRange[0];
        PublicHolidayService.ReschedulingInfo info = 
            publicHolidayService.checkReschedulingNeeded(weekStart);
        
        if (info == null) {
            // No rescheduling needed
            return ResponseEntity.ok(ReschedulingInfoDto.builder()
                .reschedulingRequired(false)
                .weekNumber(weekNumber)
                .build());
        }
        
        // Convert to DTO
        ReschedulingInfoDto dto = ReschedulingInfoDto.builder()
            .saturdayDate(info.getSaturday())
            .holiday(convertToDto(info.getHoliday()))
            .reschedulingRequired(info.isReschedulingRequired())
            .suggestedAlternateDay(info.getSuggestedAlternateDay())
            .reschedulingStrategy(info.getReschedulingStrategy())
            .weekNumber(weekNumber)
            .build();
        
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/rescheduling/statistics")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get rescheduling statistics for a date range")
    public ResponseEntity<HolidayStatisticsDto> getReschedulingStatistics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        log.info("📊 Getting rescheduling statistics from {} to {}", startDate, endDate);
        
        Map<String, Object> stats = publicHolidayService.getReschedulingStats(startDate, endDate);
        
        // Convert to DTO
        HolidayStatisticsDto dto = HolidayStatisticsDto.builder()
            .startDate(startDate)
            .endDate(endDate)
            .totalHolidays((Integer) stats.get("totalHolidays"))
            .saturdayHolidays((Long) stats.get("saturdayHolidays"))
            .weekdayHolidays((Long) stats.get("weekdayHolidays"))
            .reschedulingRequired((Boolean) stats.get("reschedulingRequired"))
            .affectedWeeks((Long) stats.get("affectedWeeks"))
            .build();
        
        // Convert Saturday holidays list
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> saturdayList = 
            (List<Map<String, Object>>) stats.get("saturdayHolidaysList");
        
        if (saturdayList != null) {
            List<HolidayStatisticsDto.SaturdayHolidayInfo> infoList = saturdayList.stream()
                .map(h -> HolidayStatisticsDto.SaturdayHolidayInfo.builder()
                    .holidayId((Long) h.get("id"))
                    .date((LocalDate) h.get("date"))
                    .name((String) h.get("name"))
                    .build())
                .collect(Collectors.toList());
            dto.setSaturdayHolidaysList(infoList);
        }
        
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/rescheduling/term-overview")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get overview of all Saturday holidays in current term")
    public ResponseEntity<HolidayStatisticsDto> getTermReschedulingOverview() {
        log.info("📊 Getting term rescheduling overview");
        
        Optional<com.edu.platform.model.Term> termOpt = termWeekCalculator.getActiveTerm();
        if (termOpt.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        com.edu.platform.model.Term term = termOpt.get();
        Map<String, Object> stats = publicHolidayService.getReschedulingStats(
            term.getStartDate(), term.getEndDate()
        );
        
        // Convert to DTO (similar to above)
        HolidayStatisticsDto dto = HolidayStatisticsDto.builder()
            .startDate(term.getStartDate())
            .endDate(term.getEndDate())
            .totalHolidays((Integer) stats.get("totalHolidays"))
            .saturdayHolidays((Long) stats.get("saturdayHolidays"))
            .weekdayHolidays((Long) stats.get("weekdayHolidays"))
            .reschedulingRequired((Boolean) stats.get("reschedulingRequired"))
            .affectedWeeks((Long) stats.get("affectedWeeks"))
            .build();
        
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> saturdayList = 
            (List<Map<String, Object>>) stats.get("saturdayHolidaysList");
        
        if (saturdayList != null) {
            List<HolidayStatisticsDto.SaturdayHolidayInfo> infoList = saturdayList.stream()
                .map(h -> HolidayStatisticsDto.SaturdayHolidayInfo.builder()
                    .holidayId((Long) h.get("id"))
                    .date((LocalDate) h.get("date"))
                    .name((String) h.get("name"))
                    .build())
                .collect(Collectors.toList());
            dto.setSaturdayHolidaysList(infoList);
        }
        
        return ResponseEntity.ok(dto);
    }

    // ============================================================
    // BULK OPERATIONS
    // ============================================================

    @PostMapping("/bulk-create")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create multiple holidays at once")
    public ResponseEntity<BulkOperationResultDto> bulkCreateHolidays(
            @Valid @RequestBody List<PublicHolidayDto> holidays,
            Authentication authentication) {
        
        log.info("📅 Bulk creating {} holidays", holidays.size());
        
        // Get user ID from authenticated user
        String email = authentication.getName();
        Long userId = userService.findByEmail(email)
                .map(com.edu.platform.model.User::getId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        int successCount = 0;
        int failedCount = 0;
        List<Long> failedIds = new ArrayList<>();
        List<String> errorMessages = new ArrayList<>();
        
        for (PublicHolidayDto dto : holidays) {
            try {
                publicHolidayService.createHoliday(
                    dto.getHolidayDate(),
                    dto.getHolidayName(),
                    dto.getIsSchoolClosed() != null ? dto.getIsSchoolClosed() : true,
                    userId
                );
                successCount++;
            } catch (Exception e) {
                log.error("Failed to create holiday: {}", dto.getHolidayName(), e);
                failedCount++;
                if (dto.getId() != null) {
                    failedIds.add(dto.getId());
                }
                errorMessages.add(String.format("Failed to create %s: %s", 
                    dto.getHolidayName(), e.getMessage()));
            }
        }
        
        String message = String.format("Bulk create completed: %d succeeded, %d failed", 
            successCount, failedCount);
        
        if (!errorMessages.isEmpty()) {
            message += ". Errors: " + String.join("; ", errorMessages);
        }
        
        BulkOperationResultDto result = BulkOperationResultDto.builder()
            .successCount(successCount)
            .failedCount(failedCount)
            .failedIds(failedIds)
            .message(message)
            .build();
        
        return ResponseEntity.ok(result);
    }

    // ============================================================
    // HELPER METHODS
    // ============================================================

    private PublicHolidayDto convertToDto(PublicHoliday holiday) {
        return PublicHolidayDto.builder()
            .id(holiday.getId())
            .holidayDate(holiday.getHolidayDate())
            .holidayName(holiday.getHolidayName())
            .isSchoolClosed(holiday.getIsSchoolClosed())
            .createdByUserId(holiday.getCreatedByUserId())
            .createdAt(holiday.getCreatedAt() != null ? 
                holiday.getCreatedAt().toInstant(java.time.ZoneOffset.UTC) : null)
            .updatedAt(holiday.getUpdatedAt() != null ? 
                holiday.getUpdatedAt().toInstant(java.time.ZoneOffset.UTC) : null)
            .build();
    }
}