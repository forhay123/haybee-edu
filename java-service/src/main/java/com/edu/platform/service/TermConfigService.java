/*package com.edu.platform.service;

import com.edu.platform.dto.classdata.WeeklyScheduleDto;
import com.edu.platform.model.*;
import com.edu.platform.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TermConfigService {
    
    private final TermConfigRepository termConfigRepository;
    
    public LocalDate getCurrentTermStartDate() {
        TermConfig config = termConfigRepository.findCurrentTerm()
                .orElseThrow(() -> new IllegalStateException("No active term configured"));
        return config.getStartDate();
    }
    
    public LocalDate getCurrentTermEndDate() {
        TermConfig config = termConfigRepository.findCurrentTerm()
                .orElseThrow(() -> new IllegalStateException("No active term configured"));
        return config.getEndDate();
    }
}
*/