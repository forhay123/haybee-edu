package com.edu.platform.controller.individual;

import com.edu.platform.service.individual.IndividualTimetableService;
import com.edu.platform.service.individual.IndividualSchemeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Callback endpoints for Python AI service to update processing status
 */
@RestController
@RequestMapping("/individual/callback")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Individual Processing Callbacks", description = "Internal callbacks from Python AI service")
public class IndividualProcessingCallbackController {
    
    private final IndividualTimetableService timetableService;
    private final IndividualSchemeService schemeService;
    
    /**
     * Python calls this when timetable processing status changes
     */
    @PostMapping("/timetable/{timetableId}/status")
    @Operation(summary = "Update timetable processing status", 
               description = "Called by Python AI service to update processing status")
    public ResponseEntity<Map<String, String>> updateTimetableStatus(
            @PathVariable Long timetableId,
            @RequestBody Map<String, Object> statusUpdate) {
        
        log.info("📥 Received timetable status update for ID {}: {}", timetableId, statusUpdate);
        
        try {
            String status = (String) statusUpdate.get("status");
            String error = (String) statusUpdate.getOrDefault("error", null);
            
            // Update status
            timetableService.updateProcessingStatus(timetableId, status, error);
            
            // Update extraction results if completed
            if ("COMPLETED".equals(status) && statusUpdate.containsKey("total_periods")) {
                Integer totalPeriods = (Integer) statusUpdate.get("total_periods");
                Integer subjectsCount = (Integer) statusUpdate.get("subjects_count");
                Double confidence = (Double) statusUpdate.getOrDefault("confidence", 0.0);
                
                // Extract entries if present
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> entries = (List<Map<String, Object>>) 
                    statusUpdate.get("entries");
                
                if (entries != null && !entries.isEmpty()) {
                    log.info("📋 Received {} extracted entries", entries.size());
                    timetableService.updateExtractionResultsWithEntries(
                        timetableId, totalPeriods, subjectsCount, confidence, entries);
                } else {
                    log.warn("⚠️ No entries received in status update");
                    timetableService.updateExtractionResults(
                        timetableId, totalPeriods, subjectsCount, confidence);
                }
            }
            
            log.info("✅ Timetable status updated successfully");
            return ResponseEntity.ok(Map.of("status", "success", "message", "Status updated"));
            
        } catch (Exception e) {
            log.error("❌ Failed to update timetable status", e);
            return ResponseEntity.internalServerError()
                .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }
    
    /**
     * Python calls this when scheme processing status changes
     */
    @PostMapping("/scheme/{schemeId}/status")
    @Operation(summary = "Update scheme processing status",
               description = "Called by Python AI service to update processing status")
    public ResponseEntity<Map<String, String>> updateSchemeStatus(
            @PathVariable Long schemeId,
            @RequestBody Map<String, Object> statusUpdate) {
        
        log.info("📥 Received scheme status update for ID {}: {}", schemeId, statusUpdate);
        
        try {
            String status = (String) statusUpdate.get("status");
            String error = (String) statusUpdate.getOrDefault("error", null);
            
            // Update status
            schemeService.updateProcessingStatus(schemeId, status, error);
            
            // Update extraction results if completed
            if ("COMPLETED".equals(status) && statusUpdate.containsKey("total_topics")) {
                Integer totalTopics = (Integer) statusUpdate.get("total_topics");
                Integer weeksCount = (Integer) statusUpdate.get("weeks_count");
                Double confidence = (Double) statusUpdate.getOrDefault("confidence", 0.0);
                
                schemeService.updateExtractionResults(schemeId, totalTopics, 
                                                     weeksCount, confidence);
            }
            
            log.info("✅ Scheme status updated successfully");
            return ResponseEntity.ok(Map.of("status", "success", "message", "Status updated"));
            
        } catch (Exception e) {
            log.error("❌ Failed to update scheme status", e);
            return ResponseEntity.internalServerError()
                .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }
    
    /**
     * Health check for Python service
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of(
            "status", "healthy",
            "service", "individual_processing_callbacks"
        ));
    }
}