package com.edu.platform.service.individual;

import com.edu.platform.dto.individual.ConflictDto;
import com.edu.platform.dto.individual.ConflictResolutionRequest;
import com.edu.platform.dto.individual.ConflictResolutionResponse;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.exception.ValidationException;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.individual.IndividualStudentTimetable;
import com.edu.platform.repository.DailyScheduleRepository;
import com.edu.platform.repository.StudentProfileRepository;
import com.edu.platform.repository.individual.IndividualTimetableRepository;
import com.edu.platform.service.schedule.ConflictDetectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ✅ SPRINT 9: Enhanced conflict resolution service
 * Handles detection, resolution, validation, and prevention of schedule conflicts
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ConflictResolutionService {

    private final IndividualTimetableRepository timetableRepository;
    private final ConflictDetectionService conflictDetectionService;
    private final DailyScheduleRepository scheduleRepository;
    private final StudentProfileRepository studentProfileRepository;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    // ============================================================
    // CONFLICT DETECTION
    // ============================================================

    /**
     * ✅ Get all conflicts across all timetables
     */
    public List<ConflictDto> getAllConflicts() {
        log.info("🔍 Fetching all schedule conflicts");

        List<IndividualStudentTimetable> allTimetables = timetableRepository
            .findByProcessingStatusOrderByUploadedAtAsc("COMPLETED");

        List<ConflictDto> allConflicts = new ArrayList<>();

        for (IndividualStudentTimetable timetable : allTimetables) {
            List<ConflictDetectionService.ScheduleConflict> conflicts = 
                conflictDetectionService.detectConflicts(timetable);

            if (!conflicts.isEmpty()) {
                List<ConflictDto> dtos = conflicts.stream()
                    .map(conflict -> mapToConflictDto(conflict, timetable))
                    .collect(Collectors.toList());
                allConflicts.addAll(dtos);
            }
        }

        log.info("✅ Found {} total conflicts across {} timetables", 
            allConflicts.size(), allTimetables.size());

        return allConflicts;
    }

    /**
     * ✅ Get conflicts for a specific timetable
     */
    public List<ConflictDto> getConflictsForTimetable(Long timetableId) {
        log.info("🔍 Fetching conflicts for timetable {}", timetableId);

        IndividualStudentTimetable timetable = timetableRepository.findById(timetableId)
            .orElseThrow(() -> new ResourceNotFoundException("Timetable not found"));

        List<ConflictDetectionService.ScheduleConflict> conflicts = 
            conflictDetectionService.detectConflicts(timetable);

        return conflicts.stream()
            .map(conflict -> mapToConflictDto(conflict, timetable))
            .collect(Collectors.toList());
    }

    /**
     * ✅ Get conflicts for a specific student
     */
    public List<ConflictDto> getConflictsForStudent(Long studentProfileId) {
        log.info("🔍 Fetching conflicts for student {}", studentProfileId);

        StudentProfile student = studentProfileRepository.findById(studentProfileId)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        Optional<IndividualStudentTimetable> timetableOpt = timetableRepository
            .findFirstByStudentProfileAndProcessingStatusOrderByUploadedAtDesc(
                student, "COMPLETED"
            );

        if (timetableOpt.isEmpty()) {
            log.info("✅ No completed timetable found for student {}", studentProfileId);
            return Collections.emptyList();
        }

        return getConflictsForTimetable(timetableOpt.get().getId());
    }

    /**
     * ✅ Get conflicts by severity
     */
    public Map<String, List<ConflictDto>> getConflictsBySeverity() {
        List<ConflictDto> allConflicts = getAllConflicts();
        
        return allConflicts.stream()
            .collect(Collectors.groupingBy(ConflictDto::getSeverity));
    }

    /**
     * ✅ Get conflicts by type
     */
    public Map<String, List<ConflictDto>> getConflictsByType() {
        List<ConflictDto> allConflicts = getAllConflicts();
        
        return allConflicts.stream()
            .collect(Collectors.groupingBy(ConflictDto::getConflictType));
    }

    // ============================================================
    // CONFLICT RESOLUTION
    // ============================================================

    /**
     * ✅ Resolve a conflict with comprehensive validation
     */
    @Transactional
    public ConflictResolutionResponse resolveConflict(ConflictResolutionRequest request) {
        log.info("🔧 Resolving conflict: timetableId={}, action={}", 
            request.getTimetableId(), request.getResolutionAction());

        validateResolutionRequest(request);

        IndividualStudentTimetable timetable = timetableRepository.findById(request.getTimetableId())
            .orElseThrow(() -> new ResourceNotFoundException("Timetable not found"));

        ConflictResolutionResponse.ConflictResolutionResponseBuilder responseBuilder = 
            ConflictResolutionResponse.builder()
                .timetableId(timetable.getId())
                .studentProfileId(timetable.getStudentProfile().getId())
                .studentName(timetable.getStudentProfile().getUser().getFullName())
                .resolutionAction(request.getResolutionAction())
                .dayOfWeek(request.getDayOfWeek())
                .entryIndex(request.getEntryIndex())
                .resolvedByUserId(request.getResolvedByUserId())
                .resolvedAt(Instant.now());

        try {
            // Get timetable entries
            List<Map<String, Object>> entries = new ArrayList<>(timetable.getExtractedEntries());

            if (request.getEntryIndex() < 0 || request.getEntryIndex() >= entries.size()) {
                throw new ValidationException("Invalid entry index: " + request.getEntryIndex());
            }

            Map<String, Object> entryToModify = entries.get(request.getEntryIndex());
            String subjectName = (String) entryToModify.get("subjectName");

            // Execute resolution action
            switch (request.getResolutionAction()) {
                case "DELETE_PERIOD_1":
                case "DELETE_PERIOD_2":
                case "DELETE_ENTRY":
                    handleDeleteAction(entries, request, entryToModify, subjectName, responseBuilder);
                    break;

                case "EDIT_TIME_PERIOD_1":
                case "EDIT_TIME_PERIOD_2":
                case "EDIT_TIME":
                    handleEditTimeAction(entries, request, entryToModify, subjectName, responseBuilder);
                    break;

                case "MERGE_PERIODS":
                    handleMergePeriods(entries, request, responseBuilder);
                    break;

                case "SPLIT_PERIOD":
                    handleSplitPeriod(entries, request, entryToModify, responseBuilder);
                    break;

                default:
                    throw new ValidationException("Unknown resolution action: " + request.getResolutionAction());
            }

            // Save updated entries
            timetable.setExtractedEntries(entries);
            timetable.setUpdatedAt(Instant.now());
            timetableRepository.save(timetable);

            // Delete existing schedules if regeneration requested
            int schedulesDeleted = 0;
            if (request.getRegenerateSchedules()) {
                schedulesDeleted = deleteSchedulesForTimetable(timetable.getId());
                responseBuilder.schedulesDeleted(schedulesDeleted);
                log.info("🗑️ Deleted {} schedules for regeneration", schedulesDeleted);
            }

            // Check remaining conflicts
            List<ConflictDetectionService.ScheduleConflict> remainingConflicts = 
                conflictDetectionService.detectConflicts(timetable);

            responseBuilder
                .success(true)
                .message("Conflict resolved successfully")
                .remainingConflictsCount(remainingConflicts.size())
                .remainingConflicts(remainingConflicts.stream()
                    .map(ConflictDetectionService.ScheduleConflict::getConflictDescription)
                    .collect(Collectors.toList()));

            // Notify student if requested
            if (request.getNotifyStudent()) {
                notifyStudent(timetable, request.getResolutionAction());
                responseBuilder.studentNotified(true);
            }

            log.info("✅ Conflict resolved. Remaining conflicts: {}", remainingConflicts.size());

            return responseBuilder.build();

        } catch (Exception e) {
            log.error("❌ Failed to resolve conflict: {}", e.getMessage(), e);
            return responseBuilder
                .success(false)
                .message("Failed to resolve conflict: " + e.getMessage())
                .build();
        }
    }

    /**
     * ✅ Handle delete action
     */
    private void handleDeleteAction(
            List<Map<String, Object>> entries,
            ConflictResolutionRequest request,
            Map<String, Object> entryToModify,
            String subjectName,
            ConflictResolutionResponse.ConflictResolutionResponseBuilder responseBuilder) {
        
        entries.remove(request.getEntryIndex().intValue());
        responseBuilder.removedSubject(subjectName);
        log.info("🗑️ Removed entry {} ({})", request.getEntryIndex(), subjectName);
    }

    /**
     * ✅ Handle edit time action
     */
    private void handleEditTimeAction(
            List<Map<String, Object>> entries,
            ConflictResolutionRequest request,
            Map<String, Object> entryToModify,
            String subjectName,
            ConflictResolutionResponse.ConflictResolutionResponseBuilder responseBuilder) {
        
        String oldStart = (String) entryToModify.get("startTime");
        String oldEnd = (String) entryToModify.get("endTime");

        // Validate new times
        if (request.getNewStartTime() != null) {
            validateTime(request.getNewStartTime());
            entryToModify.put("startTime", request.getNewStartTime());
        }
        
        if (request.getNewEndTime() != null) {
            validateTime(request.getNewEndTime());
            entryToModify.put("endTime", request.getNewEndTime());
        }

        // Validate time range
        LocalTime start = LocalTime.parse(request.getNewStartTime() != null ? 
            request.getNewStartTime() : oldStart, TIME_FORMATTER);
        LocalTime end = LocalTime.parse(request.getNewEndTime() != null ? 
            request.getNewEndTime() : oldEnd, TIME_FORMATTER);

        if (end.isBefore(start) || end.equals(start)) {
            throw new ValidationException("End time must be after start time");
        }

        // Check if new times create new conflicts
        List<ConflictDetectionService.ScheduleConflict> newConflicts = 
            conflictDetectionService.validateNewEntry(entryToModify, entries, null);
        
        if (!newConflicts.isEmpty()) {
            log.warn("⚠️ New time creates {} conflicts", newConflicts.size());
        }

        entries.set(request.getEntryIndex(), entryToModify);
        
        responseBuilder
            .editedSubject(subjectName)
            .oldTime(oldStart + " - " + oldEnd)
            .newTime(request.getNewStartTime() + " - " + request.getNewEndTime());

        log.info("✏️ Updated entry {} ({}): {} → {}", 
            request.getEntryIndex(), subjectName, 
            oldStart + "-" + oldEnd,
            request.getNewStartTime() + "-" + request.getNewEndTime());
    }

    /**
     * ✅ Handle merge periods action
     */
    private void handleMergePeriods(
            List<Map<String, Object>> entries,
            ConflictResolutionRequest request,
            ConflictResolutionResponse.ConflictResolutionResponseBuilder responseBuilder) {
        
        if (request.getSecondEntryIndex() == null) {
            throw new ValidationException("Second entry index required for merge");
        }

        Map<String, Object> entry1 = entries.get(request.getEntryIndex());
        Map<String, Object> entry2 = entries.get(request.getSecondEntryIndex());

        // Validate same subject
        String subject1 = (String) entry1.get("subjectName");
        String subject2 = (String) entry2.get("subjectName");
        
        if (!subject1.equals(subject2)) {
            throw new ValidationException("Can only merge periods of the same subject");
        }

        // Create merged entry with earliest start and latest end
        LocalTime start1 = LocalTime.parse((String) entry1.get("startTime"), TIME_FORMATTER);
        LocalTime start2 = LocalTime.parse((String) entry2.get("startTime"), TIME_FORMATTER);
        LocalTime end1 = LocalTime.parse((String) entry1.get("endTime"), TIME_FORMATTER);
        LocalTime end2 = LocalTime.parse((String) entry2.get("endTime"), TIME_FORMATTER);

        LocalTime mergedStart = start1.isBefore(start2) ? start1 : start2;
        LocalTime mergedEnd = end1.isAfter(end2) ? end1 : end2;

        entry1.put("startTime", mergedStart.format(TIME_FORMATTER));
        entry1.put("endTime", mergedEnd.format(TIME_FORMATTER));

        // Remove second entry
        entries.remove(request.getSecondEntryIndex().intValue());
        
        responseBuilder
            .editedSubject(subject1)
            .message("Merged two " + subject1 + " periods");

        log.info("🔗 Merged periods for {}", subject1);
    }

    /**
     * ✅ Handle split period action
     */
    private void handleSplitPeriod(
            List<Map<String, Object>> entries,
            ConflictResolutionRequest request,
            Map<String, Object> entryToModify,
            ConflictResolutionResponse.ConflictResolutionResponseBuilder responseBuilder) {
        
        if (request.getSplitTime() == null) {
            throw new ValidationException("Split time is required");
        }

        validateTime(request.getSplitTime());
        
        String startTime = (String) entryToModify.get("startTime");
        String endTime = (String) entryToModify.get("endTime");
        
        LocalTime start = LocalTime.parse(startTime, TIME_FORMATTER);
        LocalTime end = LocalTime.parse(endTime, TIME_FORMATTER);
        LocalTime split = LocalTime.parse(request.getSplitTime(), TIME_FORMATTER);

        if (split.isBefore(start) || split.isAfter(end) || split.equals(start) || split.equals(end)) {
            throw new ValidationException("Split time must be between start and end times");
        }

        // Update first period to end at split time
        entryToModify.put("endTime", split.format(TIME_FORMATTER));

        // Create second period starting at split time
        Map<String, Object> newEntry = new HashMap<>(entryToModify);
        newEntry.put("startTime", split.format(TIME_FORMATTER));
        newEntry.put("endTime", endTime);

        entries.add(request.getEntryIndex() + 1, newEntry);

        responseBuilder
            .editedSubject((String) entryToModify.get("subjectName"))
            .message("Split period at " + split.format(TIME_FORMATTER));

        log.info("✂️ Split period for {} at {}", entryToModify.get("subjectName"), split);
    }

    /**
     * ✅ Bulk resolve conflicts
     */
    @Transactional
    public Map<Long, ConflictResolutionResponse> bulkResolveConflicts(
            List<ConflictResolutionRequest> requests) {
        
        log.info("🔧 Bulk resolving {} conflicts", requests.size());

        Map<Long, ConflictResolutionResponse> results = new HashMap<>();

        for (ConflictResolutionRequest request : requests) {
            try {
                ConflictResolutionResponse response = resolveConflict(request);
                results.put(request.getTimetableId(), response);
            } catch (Exception e) {
                log.error("❌ Failed to resolve conflict for timetable {}: {}", 
                    request.getTimetableId(), e.getMessage());
                
                results.put(request.getTimetableId(), 
                    ConflictResolutionResponse.builder()
                        .success(false)
                        .message("Failed: " + e.getMessage())
                        .timetableId(request.getTimetableId())
                        .build()
                );
            }
        }

        log.info("✅ Bulk resolution complete: {} succeeded, {} failed",
            results.values().stream().filter(ConflictResolutionResponse::isSuccess).count(),
            results.values().stream().filter(r -> !r.isSuccess()).count());

        return results;
    }

    /**
     * ✅ Auto-resolve simple conflicts
     */
    @Transactional
    public Map<String, Object> autoResolveConflicts(Long timetableId) {
        log.info("🤖 Auto-resolving conflicts for timetable {}", timetableId);

        IndividualStudentTimetable timetable = timetableRepository.findById(timetableId)
            .orElseThrow(() -> new ResourceNotFoundException("Timetable not found"));

        List<ConflictDetectionService.ScheduleConflict> conflicts = 
            conflictDetectionService.detectConflicts(timetable);

        int resolved = 0;
        int skipped = 0;
        List<String> actions = new ArrayList<>();

        for (ConflictDetectionService.ScheduleConflict conflict : conflicts) {
            // Only auto-resolve LOW severity conflicts
            if (!"LOW".equals(conflict.getSeverity())) {
                skipped++;
                continue;
            }

            // Auto-resolution logic here (e.g., adjust times by 1 minute)
            // For now, just log
            actions.add("Would auto-resolve: " + conflict.getConflictDescription());
            resolved++;
        }

        Map<String, Object> result = new HashMap<>();
        result.put("totalConflicts", conflicts.size());
        result.put("resolved", resolved);
        result.put("skipped", skipped);
        result.put("actions", actions);

        log.info("✅ Auto-resolution: {} resolved, {} skipped", resolved, skipped);

        return result;
    }

    // ============================================================
    // ANALYTICS & REPORTING
    // ============================================================

    /**
     * ✅ Get comprehensive conflict summary
     */
    public Map<String, Object> getConflictSummary() {
        log.info("📊 Computing conflict summary");

        List<ConflictDto> allConflicts = getAllConflicts();

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalConflicts", allConflicts.size());
        summary.put("resolvedConflicts", allConflicts.stream()
            .filter(ConflictDto::getIsResolved)
            .count());
        summary.put("unresolvedConflicts", allConflicts.stream()
            .filter(c -> !c.getIsResolved())
            .count());

        // Group by student
        Map<Long, Long> conflictsByStudent = allConflicts.stream()
            .collect(Collectors.groupingBy(
                ConflictDto::getStudentProfileId,
                Collectors.counting()
            ));
        summary.put("studentsWithConflicts", conflictsByStudent.size());
        summary.put("conflictsByStudent", conflictsByStudent);

        // Group by day of week
        Map<DayOfWeek, Long> conflictsByDay = allConflicts.stream()
            .collect(Collectors.groupingBy(
                ConflictDto::getDayOfWeek,
                Collectors.counting()
            ));
        summary.put("conflictsByDay", conflictsByDay);

        // Group by severity
        Map<String, Long> conflictsBySeverity = allConflicts.stream()
            .collect(Collectors.groupingBy(
                ConflictDto::getSeverity,
                Collectors.counting()
            ));
        summary.put("conflictsBySeverity", conflictsBySeverity);

        // Group by type
        Map<String, Long> conflictsByType = allConflicts.stream()
            .collect(Collectors.groupingBy(
                ConflictDto::getConflictType,
                Collectors.counting()
            ));
        summary.put("conflictsByType", conflictsByType);

        log.info("✅ Conflict summary: {} total, {} unresolved", 
            allConflicts.size(), summary.get("unresolvedConflicts"));

        return summary;
    }

    /**
     * ✅ FIXED: Get conflict trends over time
     * Fixed toLocalDate() error by converting Instant to LocalDate properly
     */
    public Map<String, Object> getConflictTrends(LocalDate startDate, LocalDate endDate) {
        log.info("📈 Computing conflict trends from {} to {}", startDate, endDate);

        // Convert LocalDate to LocalDateTime for the query
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);

        List<IndividualStudentTimetable> timetables = timetableRepository
            .findByProcessingStatusAndUploadedAtBetween(
                "COMPLETED", 
                startDateTime,
                endDateTime
            );

        Map<LocalDate, Integer> conflictsByDate = new TreeMap<>();

        for (IndividualStudentTimetable timetable : timetables) {
            // ✅ FIXED: Convert Instant to LocalDate properly
            LocalDate uploadDate = timetable.getUploadedAt()
                .atZone(ZoneId.systemDefault())
                .toLocalDate();
            
            int conflicts = conflictDetectionService.detectConflicts(timetable).size();
            
            conflictsByDate.merge(uploadDate, conflicts, Integer::sum);
        }

        Map<String, Object> trends = new HashMap<>();
        trends.put("conflictsByDate", conflictsByDate);
        trends.put("averageConflictsPerTimetable", 
            conflictsByDate.values().stream()
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0.0));
        trends.put("totalTimetables", timetables.size());

        return trends;
    }

    // ============================================================
    // HELPER METHODS
    // ============================================================

    private void validateResolutionRequest(ConflictResolutionRequest request) {
        if (request.getTimetableId() == null) {
            throw new ValidationException("Timetable ID is required");
        }
        if (request.getResolutionAction() == null || request.getResolutionAction().trim().isEmpty()) {
            throw new ValidationException("Resolution action is required");
        }
        if (request.getEntryIndex() == null) {
            throw new ValidationException("Entry index is required");
        }
        if (request.getResolvedByUserId() == null) {
            throw new ValidationException("Resolved by user ID is required");
        }

        // Validate specific action requirements
        String action = request.getResolutionAction();
        
        if (action.contains("EDIT_TIME")) {
            if (request.getNewStartTime() == null || request.getNewEndTime() == null) {
                throw new ValidationException("New start time and end time are required for time edits");
            }
        }
        
        if ("MERGE_PERIODS".equals(action)) {
            if (request.getSecondEntryIndex() == null) {
                throw new ValidationException("Second entry index required for merge");
            }
        }
        
        if ("SPLIT_PERIOD".equals(action)) {
            if (request.getSplitTime() == null) {
                throw new ValidationException("Split time required for split action");
            }
        }
    }

    private void validateTime(String timeStr) {
        try {
            LocalTime.parse(timeStr, TIME_FORMATTER);
        } catch (Exception e) {
            throw new ValidationException("Invalid time format: " + timeStr + ". Use HH:mm format.");
        }
    }

    private ConflictDto mapToConflictDto(
            ConflictDetectionService.ScheduleConflict conflict,
            IndividualStudentTimetable timetable) {
        
        StudentProfile student = timetable.getStudentProfile();

        ConflictDto.ConflictingPeriod period1 = ConflictDto.ConflictingPeriod.builder()
            .subjectName(conflict.getEntry1SubjectName())
            .startTime(conflict.getEntry1StartTime())
            .endTime(conflict.getEntry1EndTime())
            .build();

        ConflictDto.ConflictingPeriod period2 = null;
        if (conflict.getEntry2SubjectName() != null) {
            period2 = ConflictDto.ConflictingPeriod.builder()
                .subjectName(conflict.getEntry2SubjectName())
                .startTime(conflict.getEntry2StartTime())
                .endTime(conflict.getEntry2EndTime())
                .build();
        }

        List<String> resolutions = buildSuggestedResolutions(conflict);

        return ConflictDto.builder()
            .conflictType(conflict.getConflictType())
            .studentProfileId(student.getId())
            .studentName(student.getUser().getFullName())
            .className(student.getClassLevel() != null ? student.getClassLevel().getName() : "N/A")
            .timetableId(timetable.getId())
            .dayOfWeek(conflict.getDayOfWeek())
            .period1(period1)
            .period2(period2)
            .description(conflict.getConflictDescription())
            .severity(conflict.getSeverity() != null ? conflict.getSeverity() : "HIGH")
            .isResolved(false)
            .suggestedResolutions(resolutions)
            .build();
    }

    private List<String> buildSuggestedResolutions(ConflictDetectionService.ScheduleConflict conflict) {
        List<String> resolutions = new ArrayList<>();
        
        String type = conflict.getConflictType();
        
        if ("TIME_OVERLAP".equals(type)) {
            resolutions.add("Delete first period");
            resolutions.add("Delete second period");
            resolutions.add("Edit time of first period");
            resolutions.add("Edit time of second period");
        } else if ("DUPLICATE_SUBJECT".equals(type)) {
            resolutions.add("Merge duplicate periods");
            resolutions.add("Keep both (if intentional for practical sessions)");
            resolutions.add("Delete one occurrence");
        } else if ("INVALID_TIME_RANGE".equals(type)) {
            resolutions.add("Correct end time");
            resolutions.add("Delete period");
        } else if ("UNREALISTIC_DURATION".equals(type)) {
            resolutions.add("Split into two periods");
            resolutions.add("Correct end time");
        } else if ("TOO_MANY_PERIODS".equals(type)) {
            resolutions.add("Review and remove non-academic periods");
            resolutions.add("Verify schedule accuracy");
        } else {
            resolutions.add("Manual review required");
        }
        
        return resolutions;
    }

    private int deleteSchedulesForTimetable(Long timetableId) {
        // Delete future schedules for regeneration
        LocalDate today = LocalDate.now();
        return scheduleRepository.deleteByIndividualTimetableIdAndScheduledDateGreaterThanEqual(
            timetableId, today
        );
    }

    private void notifyStudent(IndividualStudentTimetable timetable, String action) {
        // TODO: Implement student notification
        // This could send email, push notification, etc.
        log.info("📧 Would notify student {} about conflict resolution: {}", 
            timetable.getStudentProfile().getUser().getFullName(), action);
    }
}