package com.edu.platform.dto.assessment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Result of assessment access control check
 * Determines if a student can access an assessment at a given time
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccessCheckResult {
    
    /**
     * Whether student can access the assessment
     */
    private boolean canAccess;
    
    /**
     * Reason for blocking (if canAccess is false)
     * Examples:
     * - "Assessment not yet available. Opens at 09:00 AM"
     * - "Assessment window closed. Deadline was 10:30 AM"
     * - "Assessment already submitted"
     */
    private String reason;
    
    /**
     * When assessment window starts
     */
    private LocalDateTime windowStart;
    
    /**
     * When assessment window ends
     */
    private LocalDateTime windowEnd;
    
    /**
     * Current time when check was performed
     */
    private LocalDateTime currentTime;
    
    /**
     * Minutes until assessment opens (if not yet open)
     */
    private Long minutesUntilOpen;
    
    /**
     * Minutes remaining before assessment closes (if currently open)
     */
    private Long minutesRemaining;
    
    /**
     * Whether grace period is currently active
     */
    private Boolean gracePeriodActive;
    
    /**
     * Status code for frontend handling
     * - "ALLOWED": Can access
     * - "NOT_YET_OPEN": Assessment not yet available
     * - "EXPIRED": Assessment window closed
     * - "ALREADY_SUBMITTED": Already completed
     */
    private String statusCode;
    
    // ============================================================
    // FACTORY METHODS
    // ============================================================
    
    /**
     * Create allowed access result
     */
    public static AccessCheckResult allowed(
        LocalDateTime windowEnd,
        long minutesRemaining,
        boolean gracePeriodActive
    ) {
        return AccessCheckResult.builder()
            .canAccess(true)
            .windowEnd(windowEnd)
            .minutesRemaining(minutesRemaining)
            .gracePeriodActive(gracePeriodActive)
            .currentTime(LocalDateTime.now())
            .statusCode("ALLOWED")
            .build();
    }
    
    /**
     * Create blocked access result (assessment not yet open)
     */
    public static AccessCheckResult notYetOpen(
        String reason,
        LocalDateTime windowStart,
        LocalDateTime windowEnd,
        long minutesUntilOpen
    ) {
        return AccessCheckResult.builder()
            .canAccess(false)
            .reason(reason)
            .windowStart(windowStart)
            .windowEnd(windowEnd)
            .currentTime(LocalDateTime.now())
            .minutesUntilOpen(minutesUntilOpen)
            .statusCode("NOT_YET_OPEN")
            .build();
    }
    
    /**
     * Create blocked access result (assessment expired)
     */
    public static AccessCheckResult expired(
        String reason,
        LocalDateTime windowEnd
    ) {
        return AccessCheckResult.builder()
            .canAccess(false)
            .reason(reason)
            .windowEnd(windowEnd)
            .currentTime(LocalDateTime.now())
            .statusCode("EXPIRED")
            .build();
    }
    
    /**
     * Create blocked access result (already submitted)
     */
    public static AccessCheckResult alreadySubmitted() {
        return AccessCheckResult.builder()
            .canAccess(false)
            .reason("Assessment already submitted")
            .currentTime(LocalDateTime.now())
            .statusCode("ALREADY_SUBMITTED")
            .build();
    }
    
    /**
     * Create generic blocked result
     */
    public static AccessCheckResult blocked(String reason) {
        return AccessCheckResult.builder()
            .canAccess(false)
            .reason(reason)
            .currentTime(LocalDateTime.now())
            .statusCode("BLOCKED")
            .build();
    }
}