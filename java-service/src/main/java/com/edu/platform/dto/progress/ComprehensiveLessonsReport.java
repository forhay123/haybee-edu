package com.edu.platform.dto.progress;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * ✅ Comprehensive report aggregating all lesson statuses
 * Used for the dashboard and lesson tracking views
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComprehensiveLessonsReport {
    
    // ============================================================
    // METADATA
    // ============================================================
    private Long studentId;
    private String studentName;
    private LocalDate fromDate;
    private LocalDate toDate;
    private Integer dateRangeDays;  // How many days in the filter range
    
    // ============================================================
    // SUMMARY STATISTICS
    // ============================================================
    private Integer totalLessons;
    private Integer completedCount;
    private Integer missedCount;
    private Integer inProgressCount;
    private Integer scheduledCount;
    
    // ============================================================
    // COMPUTED METRICS
    // ============================================================
    private Double completionRate;      // (completed / total) * 100
    private Double missedRate;          // ✅ NEW: Added for frontend
    private Double onTrackRate;         // ✅ NEW: Added for frontend
    private Double onTimeCompletionRate; // Completed on or before due date
    private Integer averageDaysToComplete;
    private Integer totalMissedDays;    // Total days overdue
    private Boolean isOnTrack;          // ✅ NEW: Added for frontend
    private Boolean isAtRisk;           // ✅ NEW: Added for frontend
    
    // ============================================================
    // GROUPED LESSONS BY STATUS
    // ============================================================
    /**
     * All lessons grouped by their status
     * Each list is sorted by date (earliest first)
     */
    private Map<String, List<ComprehensiveLessonDto>> lessonsByStatus;
    
    // ============================================================
    // FLAT LIST (for alternative display)
    // ============================================================
    /**
     * All lessons in a flat list, useful for tables and exports
     * Can be sorted client-side by any field
     */
    private List<ComprehensiveLessonDto> allLessons;
    
    // ============================================================
    // HELPER METHODS
    // ============================================================
    
    /**
     * Get count for a specific status
     */
    public Integer getCountByStatus(String status) {
        if (lessonsByStatus == null || !lessonsByStatus.containsKey(status)) {
            return 0;
        }
        return lessonsByStatus.get(status).size();
    }
    
    /**
     * Check if student is on track (completion rate > 80%)
     */
    public Boolean isOnTrack() {
        if (isOnTrack != null) {
            return isOnTrack;
        }
        return completionRate != null && completionRate > 80.0;
    }
    
    /**
     * Check if student is at risk (too many missed lessons)
     */
    public Boolean isAtRisk() {
        if (isAtRisk != null) {
            return isAtRisk;
        }
        return missedCount != null && missedCount > (totalLessons != null ? totalLessons * 0.2 : 0);
    }
    
    /**
     * Get lessons that need immediate attention (missed or overdue)
     */
    public List<ComprehensiveLessonDto> getUrgentLessons() {
        List<ComprehensiveLessonDto> urgent = new java.util.ArrayList<>();
        
        // Add missed lessons
        if (lessonsByStatus != null && lessonsByStatus.containsKey("MISSED")) {
            urgent.addAll(lessonsByStatus.get("MISSED"));
        }
        
        // Add in-progress lessons that are past due
        if (lessonsByStatus != null && lessonsByStatus.containsKey("IN_PROGRESS")) {
            urgent.addAll(lessonsByStatus.get("IN_PROGRESS").stream()
                    .filter(lesson -> lesson.getDaysUntilDue() != null && 
                                     lesson.getDaysUntilDue().contains("ago"))
                    .toList());
        }
        
        return urgent;
    }
    
    /**
     * Calculate completion rate if not already set
     */
    public void calculateMetrics() {
        if (totalLessons == null || totalLessons == 0) {
            this.completionRate = 0.0;
            this.missedRate = 0.0;
            this.onTrackRate = 0.0;
            this.isOnTrack = true;
            this.isAtRisk = false;
            return;
        }
        
        // Completion rate
        this.completionRate = (completedCount.doubleValue() / totalLessons.doubleValue()) * 100.0;
        this.completionRate = Math.round(this.completionRate * 100.0) / 100.0;
        
        // Missed rate
        this.missedRate = (missedCount.doubleValue() / totalLessons.doubleValue()) * 100.0;
        this.missedRate = Math.round(this.missedRate * 100.0) / 100.0;
        
        // On track rate (completed + in progress)
        double onTrackCount = completedCount.doubleValue() + inProgressCount.doubleValue();
        this.onTrackRate = (onTrackCount / totalLessons.doubleValue()) * 100.0;
        this.onTrackRate = Math.round(this.onTrackRate * 100.0) / 100.0;
        
        // On track status
        this.isOnTrack = this.completionRate > 80.0;
        
        // At risk status (more than 20% missed)
        this.isAtRisk = this.missedRate > 20.0;
    }
    
    /**
     * Calculate date range days
     */
    public void calculateDateRangeDays() {
        if (fromDate != null && toDate != null) {
            this.dateRangeDays = (int) java.time.temporal.ChronoUnit.DAYS.between(fromDate, toDate) + 1;
        }
    }
}