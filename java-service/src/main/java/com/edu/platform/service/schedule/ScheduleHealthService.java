package com.edu.platform.service.schedule;

import com.edu.platform.dto.schedule.ScheduleHealthDto;
import com.edu.platform.dto.schedule.ScheduleHealthDto.HealthStatus;
import com.edu.platform.model.*;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.repository.*;
import com.edu.platform.service.TermService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduleHealthService {

    private final StudentProfileRepository studentProfileRepository;
    private final WeeklyScheduleRepository weeklyScheduleRepository;
    private final DailyScheduleRepository dailyScheduleRepository;
    private final TermService termService;

    @Transactional(readOnly = true)
    public List<ScheduleHealthDto> getAllStudentsHealthStatus() {
        log.info("📊 Calculating schedule health for all CLASS students");
        
        List<StudentProfile> classStudents = studentProfileRepository.findAll().stream()
                .filter(s -> s.getStudentType() != StudentType.INDIVIDUAL)
                .collect(Collectors.toList());
        
        log.info("Found {} CLASS students to analyze", classStudents.size());
        
        List<ScheduleHealthDto> healthStatuses = new ArrayList<>();
        
        for (StudentProfile student : classStudents) {
            try {
                ScheduleHealthDto health = getStudentHealthStatus(student.getId());
                healthStatuses.add(health);
            } catch (Exception e) {
                log.error("Failed to calculate health for student {}: {}", 
                         student.getId(), e.getMessage());
            }
        }
        
        long healthy = healthStatuses.stream()
                .filter(h -> h.getHealthStatus() == HealthStatus.HEALTHY)
                .count();
        
        log.info("✅ Health Summary: {} healthy, {} need attention", 
                healthy, healthStatuses.size() - healthy);
        
        return healthStatuses;
    }

    @Transactional(readOnly = true)
    public ScheduleHealthDto getStudentHealthStatus(Long studentId) {
        StudentProfile student = studentProfileRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found: " + studentId));
        
        if (student.getStudentType() == StudentType.INDIVIDUAL) {
            return buildIndividualStudentHealth(student);
        }
        
        ClassEntity studentClass = student.getClassLevel();
        if (studentClass == null) {
            return buildNoClassHealth(student);
        }
        
        Term activeTerm = termService.getActiveTerm().orElse(null);
        if (activeTerm == null) {
            return buildNoTermHealth(student);
        }
        
        Integer currentWeek = activeTerm.getWeekNumberForDate(LocalDate.now());
        int weeklySchedulesCount = getWeeklyScheduleCount(studentClass.getId());
        
        LocalDate weekStart = activeTerm.getWeekStartDate(currentWeek);
        LocalDate weekEnd = weekStart.plusDays(6);
        
        List<DailySchedule> dailySchedules = dailyScheduleRepository
                .findByStudentProfileAndScheduledDateBetweenOrderByScheduledDateAscPeriodNumberAsc(
                        student, weekStart, weekEnd);
        
        int dailySchedulesCount = dailySchedules.size();
        int expectedDaily = calculateExpectedDailySchedules(studentClass.getId(), currentWeek);
        
        // ✅ NEW: Check if schedules need assessment sync
        int schedulesWithoutAssessment = (int) dailySchedules.stream()
                .filter(ds -> ds.getAssessment() == null)
                .count();
        
        int schedulesWithoutTimeWindow = (int) dailySchedules.stream()
                .filter(ds -> ds.getAssessmentWindowStart() == null || ds.getAssessmentWindowEnd() == null)
                .count();
        
        boolean needsAssessmentSync = schedulesWithoutAssessment > 0 || schedulesWithoutTimeWindow > 0;
        
        HealthStatus status;
        String statusMessage;
        boolean canGenerate;
        boolean canRegenerate;
        String actionRequired;
        
        if (weeklySchedulesCount == 0) {
            status = HealthStatus.NO_SCHEDULES;
            statusMessage = "No weekly schedules for class " + studentClass.getName();
            canGenerate = false;
            canRegenerate = false;
            actionRequired = "Configure weekly schedules first";
        } else if (dailySchedulesCount == 0) {
            status = HealthStatus.MISSING_DAILY;
            statusMessage = "Daily schedules not generated yet";
            canGenerate = true;
            canRegenerate = false;
            actionRequired = "Click 'Generate Schedules'";
        } else if (dailySchedulesCount < expectedDaily) {
            status = HealthStatus.PARTIAL;
            statusMessage = String.format("%d of %d schedules", dailySchedulesCount, expectedDaily);
            canGenerate = false;
            canRegenerate = true;
            actionRequired = "Click 'Regenerate' to add missing schedules";
        } else if (needsAssessmentSync) {
            // ✅ NEW: Status for schedules needing assessment sync
            status = HealthStatus.NEEDS_SYNC;
            statusMessage = String.format("Schedules need assessment sync (%d missing assessments, %d missing time windows)", 
                                         schedulesWithoutAssessment, schedulesWithoutTimeWindow);
            canGenerate = false;
            canRegenerate = true;
            actionRequired = "Click '🔄 Sync Assessments' to update";
        } else {
            status = HealthStatus.HEALTHY;
            statusMessage = "All schedules generated with assessments";
            canGenerate = false;
            canRegenerate = false; // ✅ Changed: Only allow regenerate if truly needed
            actionRequired = null;
        }
        
        List<DayOfWeek> missingDays = findMissingDays(studentId, weekStart, weekEnd, studentClass.getId());
        
        String lastGenerated = dailyScheduleRepository
                .findTopByStudentProfileOrderByCreatedAtDesc(student)
                .map(ds -> ds.getCreatedAt().toLocalDate().toString())
                .orElse(null);
        
        return ScheduleHealthDto.builder()
                .studentId(student.getId())
                .studentName(student.getUser() != null ? student.getUser().getFullName() : "Unknown")
                .email(student.getUser() != null ? student.getUser().getEmail() : "No email")
                .classId(studentClass.getId())
                .className(studentClass.getName())
                .studentType(student.getStudentType())
                .studentTypeDisplay(ScheduleHealthDto.formatStudentType(student.getStudentType()))
                .weeklySchedulesCount(weeklySchedulesCount)
                .dailySchedulesCount(dailySchedulesCount)
                .expectedDailySchedules(expectedDaily)
                .schedulesWithoutAssessment(schedulesWithoutAssessment)
                .schedulesWithoutTimeWindow(schedulesWithoutTimeWindow)
                .healthStatus(status)
                .statusMessage(statusMessage)
                .missingDays(missingDays)
                .canGenerate(canGenerate)
                .canRegenerate(canRegenerate)
                .actionRequired(actionRequired)
                .lastGeneratedDate(lastGenerated)
                .currentWeekNumber(currentWeek)
                .build();
    }

    private int getWeeklyScheduleCount(Long classId) {
        return weeklyScheduleRepository.findByClassEntityId(classId).size();
    }

    private int calculateExpectedDailySchedules(Long classId, Integer weekNumber) {
        List<WeeklySchedule> weeklySchedules = weeklyScheduleRepository
                .findByClassEntityIdAndWeekNumber(classId, weekNumber);
        return weeklySchedules.size();
    }

    private List<DayOfWeek> findMissingDays(Long studentId, LocalDate weekStart, 
                                            LocalDate weekEnd, Long classId) {
        StudentProfile student = studentProfileRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));
        
        List<DailySchedule> dailySchedules = dailyScheduleRepository
                .findByStudentProfileAndScheduledDateBetweenOrderByScheduledDateAscPeriodNumberAsc(
                        student, weekStart, weekEnd);
        
        List<DayOfWeek> scheduledDays = dailySchedules.stream()
                .map(ds -> ds.getScheduledDate().getDayOfWeek())
                .distinct()
                .collect(Collectors.toList());
        
        List<WeeklySchedule> expectedWeekly = weeklyScheduleRepository
                .findByClassEntityId(classId);
        
        List<DayOfWeek> expectedDays = expectedWeekly.stream()
                .map(WeeklySchedule::getDayOfWeek)
                .distinct()
                .collect(Collectors.toList());
        
        return expectedDays.stream()
                .filter(day -> !scheduledDays.contains(day))
                .collect(Collectors.toList());
    }

    private ScheduleHealthDto buildIndividualStudentHealth(StudentProfile student) {
        return ScheduleHealthDto.builder()
                .studentId(student.getId())
                .studentName(student.getUser() != null ? student.getUser().getFullName() : "Unknown")
                .email(student.getUser() != null ? student.getUser().getEmail() : "No email")
                .studentType(StudentType.INDIVIDUAL)
                .studentTypeDisplay("Individual")
                .healthStatus(HealthStatus.INDIVIDUAL_STUDENT)
                .statusMessage("Uses individual schedule system")
                .canGenerate(false)
                .canRegenerate(false)
                .actionRequired("Managed via individual timetable")
                .build();
    }

    private ScheduleHealthDto buildNoClassHealth(StudentProfile student) {
        return ScheduleHealthDto.builder()
                .studentId(student.getId())
                .studentName(student.getUser() != null ? student.getUser().getFullName() : "Unknown")
                .email(student.getUser() != null ? student.getUser().getEmail() : "No email")
                .studentType(student.getStudentType())
                .studentTypeDisplay(ScheduleHealthDto.formatStudentType(student.getStudentType()))
                .healthStatus(HealthStatus.NO_SCHEDULES)
                .statusMessage("No class assigned")
                .canGenerate(false)
                .canRegenerate(false)
                .actionRequired("Assign student to a class")
                .build();
    }

    private ScheduleHealthDto buildNoTermHealth(StudentProfile student) {
        ClassEntity studentClass = student.getClassLevel();
        return ScheduleHealthDto.builder()
                .studentId(student.getId())
                .studentName(student.getUser() != null ? student.getUser().getFullName() : "Unknown")
                .email(student.getUser() != null ? student.getUser().getEmail() : "No email")
                .classId(studentClass != null ? studentClass.getId() : null)
                .className(studentClass != null ? studentClass.getName() : null)
                .studentType(student.getStudentType())
                .studentTypeDisplay(ScheduleHealthDto.formatStudentType(student.getStudentType()))
                .healthStatus(HealthStatus.NO_SCHEDULES)
                .statusMessage("No active term configured")
                .canGenerate(false)
                .canRegenerate(false)
                .actionRequired("Configure active term first")
                .build();
    }
}