/**
 * ============================================================
 * UTILITY: Fix existing progress records with assessmentAccessible = false
 * ============================================================
 * 
 * Add this method to your AssessmentAccessService or create a maintenance service
 */

package com.edu.platform.service.assessment;

import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProgressMaintenanceService {
    
    private final StudentLessonProgressRepository progressRepository;
    
    /**
     * ✅ Fix all progress records where assessmentAccessible = false
     * This should be run once to fix existing data
     */
    @Transactional
    public void enableAssessmentAccessForAll() {
        log.info("🔧 Starting assessment access fix for all progress records...");
        
        List<StudentLessonProgress> allProgress = progressRepository.findAll();
        int fixedCount = 0;
        
        for (StudentLessonProgress progress : allProgress) {
            boolean needsFix = false;
            
            // Fix assessmentAccessible flag
            if (progress.getAssessment() != null && 
                (progress.getAssessmentAccessible() == null || !progress.getAssessmentAccessible())) {
                
                log.debug("Enabling access for progress {} (assessment: {})", 
                         progress.getId(), progress.getAssessment().getId());
                progress.setAssessmentAccessible(true);
                needsFix = true;
            }
            
            // Fix missing assessment window
            if (progress.getAssessment() != null && 
                (progress.getAssessmentWindowStart() == null || progress.getAssessmentWindowEnd() == null)) {
                
                LocalDate date = progress.getScheduledDate() != null ? 
                    progress.getScheduledDate() : LocalDate.now();
                
                progress.setAssessmentWindowStart(date.atStartOfDay());
                progress.setAssessmentWindowEnd(date.atTime(23, 59, 59));
                
                log.debug("Configured assessment window for progress {}: {} to {}", 
                         progress.getId(), 
                         progress.getAssessmentWindowStart(), 
                         progress.getAssessmentWindowEnd());
                needsFix = true;
            }
            
            if (needsFix) {
                progressRepository.save(progress);
                fixedCount++;
            }
        }
        
        log.info("✅ Assessment access fix completed: {} progress records updated", fixedCount);
    }
    
    /**
     * ✅ Fix assessment access for a specific student
     */
    @Transactional
    public int enableAssessmentAccessForStudent(Long studentId) {
        log.info("🔧 Fixing assessment access for student {}", studentId);
        
        List<StudentLessonProgress> studentProgress = progressRepository
            .findByStudentProfileId(studentId);
        
        int fixedCount = 0;
        
        for (StudentLessonProgress progress : studentProgress) {
            if (progress.getAssessment() != null && 
                (progress.getAssessmentAccessible() == null || !progress.getAssessmentAccessible())) {
                
                progress.setAssessmentAccessible(true);
                
                // Also fix window if missing
                if (progress.getAssessmentWindowStart() == null || 
                    progress.getAssessmentWindowEnd() == null) {
                    
                    LocalDate date = progress.getScheduledDate() != null ? 
                        progress.getScheduledDate() : LocalDate.now();
                    
                    progress.setAssessmentWindowStart(date.atStartOfDay());
                    progress.setAssessmentWindowEnd(date.atTime(23, 59, 59));
                }
                
                progressRepository.save(progress);
                fixedCount++;
            }
        }
        
        log.info("✅ Fixed {} progress records for student {}", fixedCount, studentId);
        return fixedCount;
    }
}