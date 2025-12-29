package com.edu.platform.service.individual;

import com.edu.platform.dto.individual.SubjectProgressDto;
import com.edu.platform.dto.individual.TermCompletionDto;
import com.edu.platform.dto.individual.WeeklyProgressDto;
import com.edu.platform.model.DailySchedule;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Term;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.DailyScheduleRepository;
import com.edu.platform.repository.StudentProfileRepository;
import com.edu.platform.repository.TermRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * SPRINT 12: Individual Student Progress Reporting Service
 * Generates comprehensive progress reports for INDIVIDUAL students
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class IndividualProgressReportService {

    private final StudentProfileRepository studentProfileRepository;
    private final DailyScheduleRepository dailyScheduleRepository;
    private final StudentLessonProgressRepository progressRepository;
    private final TermRepository termRepository;
    private final TermWeekCalculator termWeekCalculator;

    /**
     * Generate weekly progress report for a student
     */
    @Transactional(readOnly = true)
    public WeeklyProgressDto getWeeklyProgressReport(Long studentId, Integer weekNumber) {
        log.info("📊 Generating weekly progress report - Student: {}, Week: {}", studentId, weekNumber);

        StudentProfile student = getStudent(studentId);
        Term term = termWeekCalculator.getActiveTerm()
                .orElseThrow(() -> new IllegalStateException("No active term"));

        LocalDate weekStart = termWeekCalculator.getWeekStartDate(weekNumber);
        LocalDate weekEnd = termWeekCalculator.getWeekEndDate(weekNumber);

        // Get all schedules for the week
        List<DailySchedule> schedules = dailyScheduleRepository
                .findByStudentProfileAndScheduledDateBetweenAndScheduleSourceOrderByScheduledDateAscPeriodNumberAsc(
                        student, weekStart, weekEnd, "INDIVIDUAL");

        // Get all progress records
        List<StudentLessonProgress> progressList = progressRepository
                .findByStudentProfileAndScheduledDateBetween(student, weekStart, weekEnd);

        return buildWeeklyProgressDto(student, term, weekNumber, weekStart, weekEnd, schedules, progressList);
    }

    /**
     * Generate subject-specific progress report
     */
    @Transactional(readOnly = true)
    public SubjectProgressDto getSubjectProgressReport(Long studentId, Long subjectId, LocalDate startDate, LocalDate endDate) {
        log.info("📚 Generating subject progress report - Student: {}, Subject: {}", studentId, subjectId);

        StudentProfile student = getStudent(studentId);

        // Get schedules for subject
        List<DailySchedule> schedules = dailyScheduleRepository
                .findByStudentProfileAndScheduledDateBetweenAndScheduleSourceOrderByScheduledDateAscPeriodNumberAsc(
                        student, startDate, endDate, "INDIVIDUAL")
                .stream()
                .filter(s -> s.getSubject() != null && s.getSubject().getId().equals(subjectId))
                .toList();

        // Get progress for subject
        List<StudentLessonProgress> progressList = progressRepository
                .findByStudentProfileAndScheduledDateBetween(student, startDate, endDate)
                .stream()
                .filter(p -> p.getSubject() != null && p.getSubject().getId().equals(subjectId))
                .toList();

        return buildSubjectProgressDto(student, subjectId, startDate, endDate, schedules, progressList);
    }

    /**
     * Generate term completion report
     */
    @Transactional(readOnly = true)
    public TermCompletionDto getTermCompletionReport(Long studentId, Long termId) {
        log.info("📈 Generating term completion report - Student: {}, Term: {}", studentId, termId);

        StudentProfile student = getStudent(studentId);
        Term term = termRepository.findById(termId)
                .orElseThrow(() -> new EntityNotFoundException("Term not found"));

        LocalDate termStart = term.getStartDate();
        LocalDate termEnd = term.getEndDate();

        // Get all schedules for term
        List<DailySchedule> schedules = dailyScheduleRepository
                .findByStudentProfileAndScheduledDateBetweenAndScheduleSourceOrderByScheduledDateAscPeriodNumberAsc(
                        student, termStart, termEnd, "INDIVIDUAL");

        // Get all progress for term
        List<StudentLessonProgress> progressList = progressRepository
                .findByStudentProfileAndScheduledDateBetween(student, termStart, termEnd);

        return buildTermCompletionDto(student, term, schedules, progressList);
    }

    /**
     * Build WeeklyProgressDto from data
     */
    private WeeklyProgressDto buildWeeklyProgressDto(
            StudentProfile student, Term term, Integer weekNumber,
            LocalDate weekStart, LocalDate weekEnd,
            List<DailySchedule> schedules, List<StudentLessonProgress> progressList) {

        WeeklyProgressDto dto = WeeklyProgressDto.builder()
                .weekNumber(weekNumber)
                .weekStartDate(weekStart)
                .weekEndDate(weekEnd)
                .termName(term.getName())
                .studentId(student.getId())
                .studentName(student.getUser().getFullName())
                .studentEmail(student.getUser().getEmail())
                .totalScheduledLessons(schedules.size())
                .build();

        // Calculate completion statistics
        long completed = schedules.stream().filter(DailySchedule::isCompleted).count();
        long incomplete = progressList.stream()
                .filter(p -> !p.isCompleted() && p.getIncompleteReason() != null)
                .count();
        long pending = schedules.size() - completed - incomplete;

        dto.setCompletedLessons((int) completed);
        dto.setIncompleteLessons((int) incomplete);
        dto.setPendingLessons((int) pending);
        dto.calculateCompletionRate();

        // Assessment statistics
        dto.setTotalAssessments(progressList.size());
        dto.setCompletedAssessments((int) progressList.stream().filter(StudentLessonProgress::isCompleted).count());
        dto.setPendingAssessments((int) progressList.stream()
                .filter(p -> !p.isCompleted() && p.getIncompleteReason() == null).count());
        dto.setMissedAssessments((int) progressList.stream()
                .filter(p -> p.getIncompleteReason() != null).count());

        // Calculate average score
        OptionalDouble avgScore = progressList.stream()
                .filter(StudentLessonProgress::isCompleted)
                .filter(p -> p.getAssessmentScore() != null)
                .mapToDouble(p -> p.getAssessmentScore().doubleValue())
                .average();
        
        if (avgScore.isPresent()) {
            dto.setAverageScore(BigDecimal.valueOf(avgScore.getAsDouble()).setScale(2, RoundingMode.HALF_UP));
        }

        // Subject breakdown
        Map<String, WeeklyProgressDto.SubjectWeeklyProgress> subjectMap = new HashMap<>();
        for (DailySchedule schedule : schedules) {
            if (schedule.getSubject() == null) continue;
            
            String subjectName = schedule.getSubject().getName();
            subjectMap.putIfAbsent(subjectName, WeeklyProgressDto.SubjectWeeklyProgress.builder()
                    .subjectId(schedule.getSubject().getId())
                    .subjectName(subjectName)
                    .build());
            
            WeeklyProgressDto.SubjectWeeklyProgress subj = subjectMap.get(subjectName);
            subj.setTotalLessons(subj.getTotalLessons() + 1);
            if (schedule.isCompleted()) {
                subj.setCompletedLessons(subj.getCompletedLessons() + 1);
            } else {
                subj.setIncompleteLessons(subj.getIncompleteLessons() + 1);
            }
        }

        // Calculate subject completion rates
        subjectMap.values().forEach(subj -> {
            if (subj.getTotalLessons() > 0) {
                subj.setCompletionRate((subj.getCompletedLessons() * 100.0) / subj.getTotalLessons());
            }
        });
        
        dto.setSubjectProgress(subjectMap);

        // Daily breakdown
        Map<LocalDate, WeeklyProgressDto.DailyProgress> dailyMap = new HashMap<>();
        for (DailySchedule schedule : schedules) {
            LocalDate date = schedule.getScheduledDate();
            dailyMap.putIfAbsent(date, WeeklyProgressDto.DailyProgress.builder()
                    .date(date)
                    .dayOfWeek(date.getDayOfWeek().name())
                    .build());
            
            WeeklyProgressDto.DailyProgress daily = dailyMap.get(date);
            daily.setScheduledLessons(daily.getScheduledLessons() + 1);
            if (schedule.isCompleted()) {
                daily.setCompletedLessons(daily.getCompletedLessons() + 1);
            } else {
                daily.setIncompleteLessons(daily.getIncompleteLessons() + 1);
            }
        }

        // Calculate daily completion rates
        dailyMap.values().forEach(daily -> {
            if (daily.getScheduledLessons() > 0) {
                daily.setCompletionRate((daily.getCompletedLessons() * 100.0) / daily.getScheduledLessons());
            }
        });
        
        dto.setDailyProgress(new ArrayList<>(dailyMap.values()));

        // Multi-period topics
        long multiPeriodStarted = schedules.stream()
                .filter(DailySchedule::isMultiPeriodTopic)
                .map(DailySchedule::getLessonTopic)
                .filter(Objects::nonNull)
                .distinct()
                .count();
        
        long multiPeriodCompleted = schedules.stream()
                .filter(DailySchedule::isMultiPeriodTopic)
                .filter(s -> Boolean.TRUE.equals(s.getAllAssessmentsCompleted()))
                .map(DailySchedule::getLessonTopic)
                .filter(Objects::nonNull)
                .distinct()
                .count();

        dto.setMultiPeriodTopicsStarted((int) multiPeriodStarted);
        dto.setMultiPeriodTopicsCompleted((int) multiPeriodCompleted);
        dto.setMultiPeriodTopicsPending((int) (multiPeriodStarted - multiPeriodCompleted));

        // Incomplete breakdown
        Map<String, Integer> incompleteMap = progressList.stream()
                .filter(p -> p.getIncompleteReason() != null)
                .collect(Collectors.groupingBy(
                        StudentLessonProgress::getIncompleteReason,
                        Collectors.collectingAndThen(Collectors.counting(), Long::intValue)
                ));
        dto.setIncompleteByReason(incompleteMap);

        // Performance level
        dto.determinePerformanceLevel();
        dto.checkNeedsAttention();

        // Add alerts
        if (dto.getCompletionRate() < 70) {
            dto.addAlert("Low completion rate: " + String.format("%.1f%%", dto.getCompletionRate()));
        }
        if (dto.getMissedAssessments() > 2) {
            dto.addAlert("Multiple missed assessments: " + dto.getMissedAssessments());
        }

        log.info("✅ Weekly report generated: {} lessons, {:.1f}% completion", 
                dto.getTotalScheduledLessons(), dto.getCompletionRate());

        return dto;
    }

    /**
     * Build SubjectProgressDto from data
     */
    private SubjectProgressDto buildSubjectProgressDto(
            StudentProfile student, Long subjectId,
            LocalDate startDate, LocalDate endDate,
            List<DailySchedule> schedules, List<StudentLessonProgress> progressList) {

        if (schedules.isEmpty()) {
            throw new IllegalStateException("No schedules found for subject");
        }

        var subject = schedules.get(0).getSubject();

        SubjectProgressDto dto = SubjectProgressDto.builder()
                .subjectId(subject.getId())
                .subjectName(subject.getName())
                .subjectCode(subject.getCode()) // ✅ FIXED: Use getCode() instead of getSubjectCode()
                .studentId(student.getId())
                .studentName(student.getUser().getFullName())
                .studentEmail(student.getUser().getEmail())
                .startDate(startDate)
                .endDate(endDate)
                .totalLessonsScheduled(schedules.size())
                .build();

        // Calculate completion
        long completed = schedules.stream().filter(DailySchedule::isCompleted).count();
        dto.setCompletedLessons((int) completed);
        dto.setIncompleteLessons((int) progressList.stream().filter(p -> p.getIncompleteReason() != null).count());
        dto.setPendingLessons(schedules.size() - (int) completed - dto.getIncompleteLessons());
        dto.calculateCompletionRate();

        // Assessment stats
        dto.setTotalAssessments(progressList.size());
        dto.setCompletedAssessments((int) progressList.stream().filter(StudentLessonProgress::isCompleted).count());
        dto.setMissedAssessments((int) progressList.stream().filter(p -> p.getIncompleteReason() != null).count());

        // Average score
        OptionalDouble avgScore = progressList.stream()
                .filter(StudentLessonProgress::isCompleted)
                .filter(p -> p.getAssessmentScore() != null)
                .mapToDouble(p -> p.getAssessmentScore().doubleValue())
                .average();
        
        if (avgScore.isPresent()) {
            dto.setAverageScore(BigDecimal.valueOf(avgScore.getAsDouble()).setScale(2, RoundingMode.HALF_UP));
        }

        dto.determineGrade();
        dto.checkOnTrack();

        return dto;
    }

    /**
     * Build TermCompletionDto from data
     */
    private TermCompletionDto buildTermCompletionDto(
            StudentProfile student, Term term,
            List<DailySchedule> schedules, List<StudentLessonProgress> progressList) {

        TermCompletionDto dto = TermCompletionDto.builder()
                .termId(term.getId())
                .termName(term.getName())
                .termStartDate(term.getStartDate())
                .termEndDate(term.getEndDate())
                .totalWeeks(term.getWeekCount())
                .studentId(student.getId())
                .studentName(student.getUser().getFullName())
                .studentEmail(student.getUser().getEmail())
                .totalScheduledLessons(schedules.size())
                .build();

        // Completion stats
        long completed = schedules.stream().filter(DailySchedule::isCompleted).count();
        dto.setCompletedLessons((int) completed);
        dto.setIncompleteLessons((int) progressList.stream().filter(p -> p.getIncompleteReason() != null).count());
        dto.setPendingLessons(schedules.size() - (int) completed - dto.getIncompleteLessons());
        dto.calculateOverallCompletionRate();

        // Average score
        OptionalDouble avgScore = progressList.stream()
                .filter(StudentLessonProgress::isCompleted)
                .filter(p -> p.getAssessmentScore() != null)
                .mapToDouble(p -> p.getAssessmentScore().doubleValue())
                .average();
        
        if (avgScore.isPresent()) {
            dto.setTermAverageScore(BigDecimal.valueOf(avgScore.getAsDouble()).setScale(2, RoundingMode.HALF_UP));
        }

        dto.determineOverallGrade();
        dto.determinePerformanceLevel();

        return dto;
    }

    /**
     * Get student profile
     */
    private StudentProfile getStudent(Long studentId) {
        return studentProfileRepository.findById(studentId)
                .orElseThrow(() -> new EntityNotFoundException("Student not found: " + studentId));
    }
}