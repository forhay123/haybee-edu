package com.edu.platform.controller.individual;

import com.edu.platform.dto.individual.ConflictDto;
import com.edu.platform.dto.individual.ConflictResolutionRequest;
import com.edu.platform.dto.individual.ConflictResolutionResponse;
import com.edu.platform.service.individual.ConflictResolutionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * ✅ SPRINT 7: Controller for schedule conflict resolution
 * Accessible by ADMIN only
 */
@RestController
@RequestMapping("/individual/conflicts")
@RequiredArgsConstructor
@Slf4j
public class ConflictResolutionController {

    private final ConflictResolutionService conflictService;

    // ============================================================
    // ADMIN: Query Conflicts
    // ============================================================

    /**
     * ✅ Get all schedule conflicts across all timetables
     * GET /api/individual/conflicts
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ConflictDto>> getAllConflicts() {
        log.info("🔍 GET /conflicts - all");

        List<ConflictDto> conflicts = conflictService.getAllConflicts();
        return ResponseEntity.ok(conflicts);
    }

    /**
     * ✅ Get conflicts for a specific timetable
     * GET /api/individual/conflicts/timetable/{timetableId}
     */
    @GetMapping("/timetable/{timetableId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ConflictDto>> getConflictsForTimetable(
            @PathVariable Long timetableId) {
        
        log.info("🔍 GET /conflicts/timetable/{}", timetableId);

        List<ConflictDto> conflicts = conflictService.getConflictsForTimetable(timetableId);
        return ResponseEntity.ok(conflicts);
    }

    /**
     * ✅ Get conflicts for a specific student
     * GET /api/individual/conflicts/student/{studentProfileId}
     */
    @GetMapping("/student/{studentProfileId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ConflictDto>> getConflictsForStudent(
            @PathVariable Long studentProfileId) {
        
        log.info("🔍 GET /conflicts/student/{}", studentProfileId);

        List<ConflictDto> conflicts = conflictService.getConflictsForStudent(studentProfileId);
        return ResponseEntity.ok(conflicts);
    }

    /**
     * ✅ Get conflict summary for dashboard
     * GET /api/individual/conflicts/summary
     */
    @GetMapping("/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getConflictSummary() {
        log.info("📊 GET /conflicts/summary");

        Map<String, Object> summary = conflictService.getConflictSummary();
        return ResponseEntity.ok(summary);
    }

    // ============================================================
    // ADMIN: Resolve Conflicts
    // ============================================================

    /**
     * ✅ Resolve a single conflict
     * POST /api/individual/conflicts/resolve
     */
    @PostMapping("/resolve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ConflictResolutionResponse> resolveConflict(
            @RequestBody ConflictResolutionRequest request) {
        
        log.info("🔧 POST /conflicts/resolve - timetableId: {}, action: {}", 
            request.getTimetableId(), request.getResolutionAction());

        ConflictResolutionResponse response = conflictService.resolveConflict(request);
        return ResponseEntity.ok(response);
    }

    /**
     * ✅ Bulk resolve multiple conflicts
     * POST /api/individual/conflicts/bulk-resolve
     */
    @PostMapping("/bulk-resolve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<Long, ConflictResolutionResponse>> bulkResolveConflicts(
            @RequestBody List<ConflictResolutionRequest> requests) {
        
        log.info("🔧 POST /conflicts/bulk-resolve - {} conflicts", requests.size());

        Map<Long, ConflictResolutionResponse> results = 
            conflictService.bulkResolveConflicts(requests);
        return ResponseEntity.ok(results);
    }
}