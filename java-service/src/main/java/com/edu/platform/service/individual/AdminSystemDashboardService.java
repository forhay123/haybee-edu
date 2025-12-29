// ===================================================================
// AdminSystemDashboardService.java
// ===================================================================
package com.edu.platform.service.individual;

import com.edu.platform.dto.individual.SystemDashboardDto;
import com.edu.platform.model.Term;
import com.edu.platform.repository.DailyScheduleRepository;
import com.edu.platform.repository.StudentProfileRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.OptionalDouble;

/**
 * SPRINT 12: Admin System Dashboard Service
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminSystemDashboardService {

    private final StudentProfileRepository studentProfileRepository;
    private final DailyScheduleRepository dailyScheduleRepository;
    private final StudentLessonProgressRepository progressRepository;
    private final TermWeekCalculator termWeekCalculator;

    @Transactional(readOnly = true)
    public SystemDashboardDto getSystemDashboard() {
        log.info("📊 Generating system dashboard");

        Term term = termWeekCalculator.getActiveTerm()
                .orElseThrow(() -> new IllegalStateException("No active term"));

        Integer currentWeek = termWeekCalculator.getCurrentTermWeek();
        LocalDate weekStart = termWeekCalculator.getWeekStartDate(currentWeek);
        LocalDate weekEnd = termWeekCalculator.getWeekEndDate(currentWeek);

        SystemDashboardDto dto = SystemDashboardDto.builder()
                .generatedAt(LocalDateTime.now())
                .reportDate(LocalDate.now())
                .termId(term.getId())
                .termName(term.getName())
                .currentWeekNumber(currentWeek)
                .totalWeeks(term.getWeekCount())
                .build();

        dto.calculateTermProgress();

        // Student statistics
        long totalIndividual = studentProfileRepository.countByStudentTypeAndUser_EnabledTrue(
                com.edu.platform.model.enums.StudentType.INDIVIDUAL);
        dto.setTotalIndividualStudents((int) totalIndividual);

        // Schedule statistics for current week
        List<com.edu.platform.model.DailySchedule> weekSchedules = dailyScheduleRepository
                .findByScheduledDateBetweenAndScheduleSource(weekStart, weekEnd, "INDIVIDUAL");

        dto.setSchedulesThisWeek(weekSchedules.size());
        dto.setSchedulesCompleted((int) weekSchedules.stream().filter(com.edu.platform.model.DailySchedule::isCompleted).count());
        dto.setSchedulesIncomplete((int) weekSchedules.stream().filter(s -> s.getMarkedIncompleteReason() != null).count());
        dto.setSchedulesPending(weekSchedules.size() - dto.getSchedulesCompleted() - dto.getSchedulesIncomplete());
        dto.calculateOverallCompletionRate();

        // Progress statistics
        List<com.edu.platform.model.progress.StudentLessonProgress> weekProgress = progressRepository
                .findByScheduledDateBetween(weekStart, weekEnd);

        dto.setTotalAssessments(weekProgress.size());
        dto.setAssessmentsCompleted((int) weekProgress.stream().filter(com.edu.platform.model.progress.StudentLessonProgress::isCompleted).count());
        dto.setAssessmentsMissed((int) weekProgress.stream().filter(p -> p.getIncompleteReason() != null).count());
        dto.calculateAssessmentCompletionRate();

        // System average score
        OptionalDouble sysAvg = weekProgress.stream()
                .filter(com.edu.platform.model.progress.StudentLessonProgress::isCompleted)
                .filter(p -> p.getAssessmentScore() != null)
                .mapToDouble(p -> p.getAssessmentScore().doubleValue())
                .average();
        
        if (sysAvg.isPresent()) {
            dto.setSystemAverageScore(BigDecimal.valueOf(sysAvg.getAsDouble()).setScale(2, RoundingMode.HALF_UP));
        }

        // Missing topics
        long missingTopics = weekSchedules.stream()
                .filter(s -> Boolean.TRUE.equals(s.getMissingLessonTopic()))
                .count();
        dto.setTotalMissingTopics((int) missingTopics);

        // Conflicts
        long conflicts = weekSchedules.stream()
                .filter(s -> Boolean.TRUE.equals(s.getHasScheduleConflict()))
                .count();
        dto.setUnresolvedConflicts((int) conflicts);

        // Determine system health
        dto.determineSystemHealth();

        // Add recent activities
        dto.addActivity("GENERATION", "Weekly schedules generated for Week " + currentWeek, "System", "🔄");
        dto.addActivity("ARCHIVE", weekSchedules.size() + " schedules archived", "System", "📦");

        log.info("✅ System dashboard generated: {} students, {} schedules, {:.1f}% completion",
                dto.getTotalIndividualStudents(), dto.getSchedulesThisWeek(), dto.getOverallCompletionRate());

        return dto;
    }
}