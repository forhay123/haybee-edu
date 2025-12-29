package com.edu.platform.service;

import com.edu.platform.dto.classdata.TermDto;
import com.edu.platform.dto.classdata.TermWeekDto;
import com.edu.platform.model.Term;
import com.edu.platform.repository.TermRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TermService {
    
    private final TermRepository termRepository;

    /**
     * Get all terms (as entities)
     */
    public List<Term> getAllTerms() {
        return termRepository.findAll();
    }

    /**
     * Get all terms (as DTOs)
     */
    @Cacheable(value = "allTerms", cacheManager = "cache1h")
    public List<TermDto> getAllTermDtos() {
        return termRepository.findAll()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Get term by ID
     */
    public Optional<Term> getById(Long id) {
        return termRepository.findById(id);
    }

    /**
     * ✅ NEW: Get active term for schedule calculations
     */
    @Cacheable(value = "activeTerm", cacheManager = "cache1h")
    public Optional<Term> getActiveTerm() {
        return termRepository.findByIsActiveTrue();
    }

    /**
     * ✅ NEW: Get active term as DTO
     */
    public Optional<TermDto> getActiveTermDto() {
        return getActiveTerm().map(this::toDto);
    }

    /**
     * Create a new term
     */
    @Transactional
    @CacheEvict(value = {"allTerms", "activeTerm"}, allEntries = true)
    public Term save(Term term) {
        if (term.getStartDate() != null && term.getEndDate() != null) {
            term.calculateWeekCount();
        }
        
        // If this term is being set as active, deactivate others
        if (Boolean.TRUE.equals(term.getIsActive())) {
            termRepository.findByIsActiveTrue().ifPresent(activeTerm -> {
                activeTerm.setIsActive(false);
                termRepository.save(activeTerm);
            });
        }
        
        return termRepository.save(term);
    }

    /**
     * Update an existing term
     */
    @Transactional
    @CacheEvict(value = {"allTerms", "activeTerm"}, allEntries = true)
    public Term update(Long id, Term updatedTerm) {
        Term existing = termRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Term not found: " + id));

        existing.setName(updatedTerm.getName());
        existing.setStartDate(updatedTerm.getStartDate());
        existing.setEndDate(updatedTerm.getEndDate());
        existing.setSession(updatedTerm.getSession());

        if (existing.getStartDate() != null && existing.getEndDate() != null) {
            existing.calculateWeekCount();
        }

        // Handle active term logic
        if (Boolean.TRUE.equals(updatedTerm.getIsActive()) && !Boolean.TRUE.equals(existing.getIsActive())) {
            termRepository.findByIsActiveTrue().ifPresent(activeTerm -> {
                activeTerm.setIsActive(false);
                termRepository.save(activeTerm);
            });
            existing.setIsActive(true);
        } else if (Boolean.FALSE.equals(updatedTerm.getIsActive())) {
            existing.setIsActive(false);
        }

        return termRepository.save(existing);
    }

    /**
     * ✅ NEW: Set a term as active (deactivate others)
     */
    @Transactional
    @CacheEvict(value = {"allTerms", "activeTerm"}, allEntries = true)
    public Term setActive(Long id) {
        Term term = termRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Term not found: " + id));

        // Deactivate all other terms
        termRepository.findByIsActiveTrue().ifPresent(activeTerm -> {
            activeTerm.setIsActive(false);
            termRepository.save(activeTerm);
            log.info("Deactivated term: {}", activeTerm.getId());
        });

        // Activate this term
        term.setIsActive(true);
        Term saved = termRepository.save(term);
        log.info("✅ Term {} set as active", id);
        return saved;
    }

    /**
     * Delete a term
     */
    @Transactional
    @CacheEvict(value = {"allTerms", "activeTerm"}, allEntries = true)
    public void delete(Long id) {
        Term term = termRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Term not found: " + id));

        if (Boolean.TRUE.equals(term.getIsActive())) {
            throw new IllegalStateException("Cannot delete the active term. Please set another term as active first.");
        }

        termRepository.deleteById(id);
        log.info("Deleted term: {}", id);
    }

    /**
     * ✅ NEW: Get week start date for a specific week in active term
     */
    public LocalDate getWeekStartDateForActiveTerm(int weekNumber) {
        Term activeTerm = getActiveTerm()
                .orElseThrow(() -> new EntityNotFoundException("No active term configured"));
        
        if (weekNumber < 1 || weekNumber > activeTerm.getWeekCount()) {
            throw new IllegalArgumentException(
                String.format("Week number must be between 1 and %d", activeTerm.getWeekCount())
            );
        }
        
        return activeTerm.getWeekStartDate(weekNumber);
    }

    /**
     * ✅ NEW: Get week date range for a specific week in active term
     */
    public TermWeekDto getWeekForActiveTerm(int weekNumber) {
        Term activeTerm = getActiveTerm()
                .orElseThrow(() -> new EntityNotFoundException("No active term configured"));
        
        if (weekNumber < 1 || weekNumber > activeTerm.getWeekCount()) {
            throw new IllegalArgumentException(
                String.format("Week number must be between 1 and %d", activeTerm.getWeekCount())
            );
        }
        
        LocalDate weekStart = activeTerm.getWeekStartDate(weekNumber);
        LocalDate weekEnd = activeTerm.getWeekEndDate(weekNumber);
        
        return TermWeekDto.builder()
                .weekNumber(weekNumber)
                .startDate(weekStart)
                .endDate(weekEnd)
                .build();
    }

    // ==========================================
    // DTO MAPPING
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