package com.edu.platform.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Public holidays that affect Saturday schedule generation
 * Used for automatic rescheduling of Saturday lessons
 */
@Entity
@Table(name = "public_holidays", schema = "academic",
       indexes = {
           @Index(name = "idx_holiday_date", columnList = "holiday_date")
       })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicHoliday {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Date of the holiday
     */
    @Column(name = "holiday_date", nullable = false, unique = true)
    private LocalDate holidayDate;

    /**
     * Name of the holiday (e.g., "Republic Day", "Sports Day")
     */
    @Column(name = "holiday_name", nullable = false, length = 100)
    private String holidayName;

    /**
     * Is school closed on this day?
     * If true, schedules will be rescheduled
     */
    @Column(name = "is_school_closed", nullable = false)
    @Builder.Default
    private Boolean isSchoolClosed = true;

    /**
     * Optional description
     */
    @Column(name = "description", length = 500)
    private String description;

    /**
     * User who created this holiday entry (admin)
     */
    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.updatedAt == null) {
            this.updatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // ============================================================
    // EXPLICIT GETTERS AND SETTERS FOR BOOLEAN FIELD
    // ============================================================
    
    /**
     * Get school closed status
     * Using explicit getter to avoid Lombok confusion
     */
    public Boolean getIsSchoolClosed() {
        return isSchoolClosed;
    }

    /**
     * Set school closed status
     * Using explicit setter to avoid Lombok confusion
     */
    public void setIsSchoolClosed(Boolean isSchoolClosed) {
        this.isSchoolClosed = isSchoolClosed;
    }

    // ============================================================
    // HELPER METHODS
    // ============================================================

    /**
     * Check if this holiday falls on a Saturday
     */
    public boolean isSaturday() {
        return holidayDate.getDayOfWeek() == java.time.DayOfWeek.SATURDAY;
    }

    /**
     * Check if this holiday is in the future
     */
    public boolean isFuture() {
        return holidayDate.isAfter(LocalDate.now());
    }

    /**
     * Check if this holiday is today
     */
    public boolean isToday() {
        return holidayDate.isEqual(LocalDate.now());
    }
}