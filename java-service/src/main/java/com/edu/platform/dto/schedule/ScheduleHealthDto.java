package com.edu.platform.dto.schedule;

import com.edu.platform.model.enums.StudentType;
import lombok.Builder;
import lombok.Data;

import java.time.DayOfWeek;
import java.util.List;

/**
 * DTO for Schedule Health Dashboard
 * Shows health status of CLASS students' schedules
 */
@Data
@Builder
public class ScheduleHealthDto {
    
    // Student info
    private Long studentId;
    private String studentName;
    private String email;
    private Long classId;
    private String className;
    private StudentType studentType;
    private String studentTypeDisplay;
    
    // Schedule counts
    private Integer weeklySchedulesCount;
    private Integer dailySchedulesCount;
    private Integer expectedDailySchedules;
    
    // Health status
    private HealthStatus healthStatus;
    private String statusMessage;
    private List<DayOfWeek> missingDays;
    private List<Integer> missingPeriods;
    
    // Actions
    private Boolean canGenerate;
    private Boolean canRegenerate;
    private String actionRequired;
    
    // Metadata
    private String lastGeneratedDate;
    private Integer currentWeekNumber;
    
    /**
     * Health status enum
     */
    public enum HealthStatus {
        HEALTHY("✅ Healthy", "All schedules generated correctly"),
        MISSING_DAILY("⚠️ Missing Daily", "Weekly schedules exist but daily schedules not generated"),
        NO_SCHEDULES("❌ No Schedules", "No weekly schedules configured for this class"),
        PARTIAL("⚠️ Partial", "Some daily schedules missing"),
        INDIVIDUAL_STUDENT("ℹ️ Individual Student", "Uses individual schedule system");
        
        private final String displayName;
        private final String description;
        
        HealthStatus(String displayName, String description) {
            this.displayName = displayName;
            this.description = description;
        }
        
        public String getDisplayName() {
            return displayName;
        }
        
        public String getDescription() {
            return description;
        }
    }
    
    /**
     * Helper method to format student type for display
     */
    public static String formatStudentType(StudentType type) {
        if (type == null) return "Unknown";
        String name = type.name();
        return name.charAt(0) + name.substring(1).toLowerCase();
    }
}