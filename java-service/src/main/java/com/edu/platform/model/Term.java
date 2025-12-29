package com.edu.platform.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Entity
@Table(name = "terms", schema = "academic")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Term {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    private SchoolSession session;
    
    @Column(nullable = false)
    private LocalDate startDate;
    
    @Column(nullable = false)
    private LocalDate endDate;
    
    /**
     * ✅ NEW: Whether this term is currently active
     * Only one term should be active at a time
     * Used for schedule calculations and week reference
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = false;
    
    /**
     * ✅ NEW: Number of weeks in this term
     * Auto-calculated from startDate and endDate
     * Teachers will see week options 1 to weekCount
     */
    @Column(nullable = false)
    @Builder.Default
    private Integer weekCount = 16;
    
    /**
     * Calculate weeks between start and end date
     */
    public void calculateWeekCount() {
        if (this.startDate != null && this.endDate != null) {
            long daysBetween = ChronoUnit.DAYS.between(this.startDate, this.endDate);
            this.weekCount = (int) Math.ceil((double) daysBetween / 7);
        }
    }
    
    /**
     * Get the start date of a specific week
     * Week 1 = startDate, Week 2 = startDate + 7 days, etc.
     */
    public LocalDate getWeekStartDate(int weekNumber) {
        if (weekNumber < 1) {
            throw new IllegalArgumentException("Week number must be >= 1");
        }
        return this.startDate.plusWeeks(weekNumber - 1);
    }
    
    /**
     * Get the end date of a specific week (7 days after start)
     */
    public LocalDate getWeekEndDate(int weekNumber) {
        LocalDate weekStart = getWeekStartDate(weekNumber);
        return weekStart.plusDays(6);
    }
    
    /**
     * Check if a given date falls within this term
     */
    public boolean containsDate(LocalDate date) {
        return !date.isBefore(this.startDate) && !date.isAfter(this.endDate);
    }
    
    /**
     * Get the week number for a given date
     * Returns -1 if date is outside term
     */
    public int getWeekNumberForDate(LocalDate date) {
        if (!containsDate(date)) {
            return -1;
        }
        long daysDiff = ChronoUnit.DAYS.between(this.startDate, date);
        return (int) (daysDiff / 7) + 1;
    }
    
    @PrePersist
    protected void onCreate() {
        if (this.isActive == null) {
            this.isActive = false;
        }
        if (this.weekCount == null) {
            calculateWeekCount();
        }
    }
}