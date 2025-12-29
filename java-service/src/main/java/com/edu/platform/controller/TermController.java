package com.edu.platform.controller;

import com.edu.platform.dto.classdata.TermDto;
import com.edu.platform.model.Term;
import com.edu.platform.service.TermService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/terms")
@RequiredArgsConstructor
@Slf4j
public class TermController {
    
    private final TermService termService;

    /**
     * Get all terms (for dropdowns, lists, etc.)
     */
    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public ResponseEntity<List<TermDto>> getAllTerms() {
        log.info("GET /terms - Fetching all terms");
        List<TermDto> terms = termService.getAllTermDtos();
        return ResponseEntity.ok(terms);
    }

    /**
     * ✅ Get the currently active term
     * Used by teachers for week calculations
     */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/active")
    public ResponseEntity<TermDto> getActiveTerm() {
        log.info("GET /terms/active - Fetching active term");
        return termService.getActiveTermDto()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * ✅ NEW: Get current active term WITH calculated current week
     * Used by students to determine which week they're in
     */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/current")
    public ResponseEntity<Map<String, Object>> getCurrentTermWithWeek() {
        log.info("GET /terms/current - Fetching current term with week calculation");
        
        return termService.getActiveTermDto()
            .map(termDto -> {
                // Calculate current week
                LocalDate termStart = termDto.startDate();
                LocalDate today = LocalDate.now();
                
                long daysBetween = ChronoUnit.DAYS.between(termStart, today);
                int currentWeek = (int) Math.floor(daysBetween / 7.0) + 1; // +1 because first week is Week 1
                
                // Clamp to valid range (1 to weekCount)
                int weekCount = termDto.weekCount() != null ? termDto.weekCount() : 20;
                currentWeek = Math.max(1, Math.min(weekCount, currentWeek));

                // Build response
                Map<String, Object> response = new HashMap<>();
                response.put("id", termDto.id());
                response.put("name", termDto.name());
                response.put("startDate", termDto.startDate());
                response.put("endDate", termDto.endDate());
                response.put("isActive", termDto.isActive());
                response.put("weekCount", weekCount);
                response.put("currentWeek", currentWeek);
                response.put("sessionId", termDto.sessionId());
                response.put("sessionName", termDto.sessionName());

                log.info("📅 Current term: {} | Week {}/{} (Start: {}, Today: {}, Days: {})", 
                         termDto.name(), currentWeek, weekCount, termStart, today, daysBetween);

                return ResponseEntity.ok(response);
            })
            .orElseGet(() -> {
                log.warn("⚠️ No active term found");
                return ResponseEntity.notFound().build();
            });
    }

    /**
     * Get term by ID
     */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}")
    public ResponseEntity<TermDto> getTermById(@PathVariable Long id) {
        log.info("GET /terms/{} - Fetching term by ID", id);
        return termService.getById(id)
                .map(term -> ResponseEntity.ok(toDto(term)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Create a new term (Admin only)
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<TermDto> createTerm(@RequestBody TermDto termDto) {
        log.info("POST /terms - Creating new term: {}", termDto.name());
        
        Term term = Term.builder()
                .name(termDto.name())
                .startDate(termDto.startDate())
                .endDate(termDto.endDate())
                .isActive(Boolean.TRUE.equals(termDto.isActive()))
                .build();
        
        Term saved = termService.save(term);
        log.info("✅ Created term ID: {}", saved.getId());
        return ResponseEntity.ok(toDto(saved));
    }

    /**
     * Update an existing term (Admin only)
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<TermDto> updateTerm(
            @PathVariable Long id,
            @RequestBody TermDto updatedTermDto) {
        log.info("PUT /terms/{} - Updating term", id);
        
        Term updatedTerm = Term.builder()
                .startDate(updatedTermDto.startDate())
                .endDate(updatedTermDto.endDate())
                .name(updatedTermDto.name())
                .isActive(Boolean.TRUE.equals(updatedTermDto.isActive()))
                .build();
        
        Term saved = termService.update(id, updatedTerm);
        log.info("✅ Updated term ID: {}", id);
        return ResponseEntity.ok(toDto(saved));
    }

    /**
     * ✅ Set a term as active (Admin only)
     * Automatically deactivates all other terms
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{id}/activate")
    public ResponseEntity<TermDto> setTermActive(@PathVariable Long id) {
        log.info("POST /terms/{}/activate - Setting term as active", id);
        
        Term activeTerm = termService.setActive(id);
        log.info("✅ Term {} is now active", id);
        return ResponseEntity.ok(toDto(activeTerm));
    }

    /**
     * Delete a term (Admin only)
     * Cannot delete the active term
     */
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTerm(@PathVariable Long id) {
        log.info("DELETE /terms/{} - Deleting term", id);
        
        if (termService.getById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        termService.delete(id);
        log.info("✅ Deleted term ID: {}", id);
        return ResponseEntity.noContent().build();
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================

    private TermDto toDto(Term term) {
        return TermDto.builder()
                .id(term.getId())
                .name(term.getName())
                .startDate(term.getStartDate())
                .endDate(term.getEndDate())
                .isActive(term.getIsActive())
                .weekCount(term.getWeekCount())
                .sessionId(term.getSession() != null ? term.getSession().getId() : null)
                .sessionName(term.getSession() != null ? term.getSession().getName() : null)
                .build();
    }
}