package com.edu.platform.service.individual;

import com.edu.platform.dto.individual.*;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.StudentProfileRepository;
import com.edu.platform.repository.SubjectRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * SPRINT 11: Incomplete Tracking Service
 * Tracks and reports on incomplete lessons for INDIVIDUAL students
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class IncompleteTrackingService {

    private final StudentLessonProgressRepository progressRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final SubjectRepository subjectRepository;

    // ============================================================
    // INCOMPLETE QUERIES
    // ============================================================

    /**
     * Get all incomplete lessons for a student
     */
    @Transactional(readOnly = true)
    public List<IncompleteProgressDto> getIncompleteForStudent(Long studentId) {
        log.info("📊 Fetching incomplete lessons for student {}", studentId);
        
        StudentProfile student = studentProfileRepository.findById(studentId)
            .orElseThrow(() -> new RuntimeException("Student not found: " + studentId));
        
        List<StudentLessonProgress> incompleteProgress = progressRepository
            .findByStudentProfileIdAndCompletedFalseAndIncompleteReasonIsNotNull(studentId);
        
        return incompleteProgress.stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());
    }

    /**
     * Get incomplete lessons for a student by date range
     */
    @Transactional(readOnly = true)
    public List<IncompleteProgressDto> getIncompleteForStudentInRange(
            Long studentId, LocalDate startDate, LocalDate endDate) {
        
        log.info("📊 Fetching incomplete lessons for student {} from {} to {}", 
            studentId, startDate, endDate);
        
        StudentProfile student = studentProfileRepository.findById(studentId)
            .orElseThrow(() -> new RuntimeException("Student not found: " + studentId));
        
        List<StudentLessonProgress> allProgress = progressRepository
            .findByStudentProfileAndScheduledDateBetween(student, startDate, endDate);
        
        return allProgress.stream()
            .filter(p -> !p.isCompleted() && p.getIncompleteReason() != null)
            .map(this::convertToDto)
            .collect(Collectors.toList());
    }

    /**
     * Get incomplete lessons by subject
     */
    @Transactional(readOnly = true)
    public List<IncompleteProgressDto> getIncompleteBySubject(Long subjectId, LocalDate startDate, LocalDate endDate) {
        log.info("📊 Fetching incomplete lessons for subject {} from {} to {}", 
            subjectId, startDate, endDate);
        
        List<StudentLessonProgress> progress = progressRepository
            .findBySubjectIdAndScheduledDateBetween(subjectId, startDate, endDate);
        
        return progress.stream()
            .filter(p -> !p.isCompleted() && p.getIncompleteReason() != null)
            .map(this::convertToDto)
            .collect(Collectors.toList());
    }

    /**
     * Get incomplete lessons by reason
     */
    @Transactional(readOnly = true)
    public List<IncompleteProgressDto> getIncompleteByReason(
            Long studentId, String reason) {
        
        log.info("📊 Fetching incomplete lessons for student {} with reason {}", 
            studentId, reason);
        
        List<StudentLessonProgress> progress = progressRepository
            .findByStudentProfileIdAndIncompleteReason(studentId, reason);
        
        return progress.stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());
    }

    // ============================================================
    // STATISTICS
    // ============================================================

    /**
     * Get incomplete statistics for a student
     */
    @Transactional(readOnly = true)
    public IncompleteStatisticsDto getStatisticsForStudent(
            Long studentId, LocalDate startDate, LocalDate endDate) {
        
        log.info("📊 Calculating incomplete statistics for student {} from {} to {}", 
            studentId, startDate, endDate);
        
        StudentProfile student = studentProfileRepository.findById(studentId)
            .orElseThrow(() -> new RuntimeException("Student not found: " + studentId));
        
        List<StudentLessonProgress> allProgress = progressRepository
            .findByStudentProfileAndScheduledDateBetween(student, startDate, endDate);
        
        return calculateStatistics(allProgress, startDate, endDate);
    }

    /**
     * Get incomplete statistics for a subject
     */
    @Transactional(readOnly = true)
    public IncompleteStatisticsDto getStatisticsForSubject(
            Long subjectId, LocalDate startDate, LocalDate endDate) {
        
        log.info("📊 Calculating incomplete statistics for subject {} from {} to {}", 
            subjectId, startDate, endDate);
        
        List<StudentLessonProgress> allProgress = progressRepository
            .findBySubjectIdAndScheduledDateBetween(subjectId, startDate, endDate);
        
        return calculateStatistics(allProgress, startDate, endDate);
    }

    /**
     * Get system-wide incomplete statistics (Admin)
     */
    @Transactional(readOnly = true)
    public IncompleteStatisticsDto getSystemStatistics(LocalDate startDate, LocalDate endDate) {
        log.info("📊 Calculating system-wide incomplete statistics from {} to {}", 
            startDate, endDate);
        
        List<StudentLessonProgress> allProgress = progressRepository
            .findByScheduledDateBetween(startDate, endDate);
        
        return calculateStatistics(allProgress, startDate, endDate);
    }

    /**
     * Calculate statistics from progress list
     */
    private IncompleteStatisticsDto calculateStatistics(
            List<StudentLessonProgress> progressList, 
            LocalDate startDate, 
            LocalDate endDate) {
        
        long totalLessons = progressList.size();
        long totalCompleted = progressList.stream().filter(StudentLessonProgress::isCompleted).count();
        long totalIncomplete = progressList.stream()
            .filter(p -> !p.isCompleted() && p.getIncompleteReason() != null)
            .count();
        
        // Incomplete by reason
        Map<String, Long> incompleteByReason = progressList.stream()
            .filter(p -> !p.isCompleted() && p.getIncompleteReason() != null)
            .collect(Collectors.groupingBy(
                StudentLessonProgress::getIncompleteReason,
                Collectors.counting()
            ));
        
        // Calculate urgency levels
        long lowUrgency = 0, mediumUrgency = 0, highUrgency = 0, criticalUrgency = 0;
        
        for (StudentLessonProgress p : progressList) {
            if (!p.isCompleted() && p.getIncompleteReason() != null) {
                long daysOverdue = ChronoUnit.DAYS.between(p.getScheduledDate(), LocalDate.now());
                if (daysOverdue == 0) lowUrgency++;
                else if (daysOverdue <= 3) mediumUrgency++;
                else if (daysOverdue <= 7) highUrgency++;
                else criticalUrgency++;
            }
        }
        
        // Multi-period vs single-period
        long multiPeriodIncomplete = progressList.stream()
            .filter(p -> !p.isCompleted() && p.getIncompleteReason() != null)
            .filter(p -> p.getTotalPeriodsInSequence() != null && p.getTotalPeriodsInSequence() > 1)
            .count();
        
        long singlePeriodIncomplete = totalIncomplete - multiPeriodIncomplete;
        
        // Assessment-related
        long missedDeadlines = incompleteByReason.getOrDefault("MISSED_GRACE_PERIOD", 0L);
        long noSubmissions = incompleteByReason.getOrDefault("NO_SUBMISSION", 0L);
        long topicNotAssigned = incompleteByReason.getOrDefault("TOPIC_NOT_ASSIGNED", 0L);
        
        // Affected counts
        long affectedSubjects = progressList.stream()
            .filter(p -> !p.isCompleted() && p.getIncompleteReason() != null)
            .map(p -> p.getSubject().getId())
            .distinct()
            .count();
        
        long affectedStudents = progressList.stream()
            .filter(p -> !p.isCompleted() && p.getIncompleteReason() != null)
            .map(p -> p.getStudentProfile().getId())
            .distinct()
            .count();
        
        IncompleteStatisticsDto stats = IncompleteStatisticsDto.builder()
            .startDate(startDate)
            .endDate(endDate)
            .totalLessons(totalLessons)
            .totalCompleted(totalCompleted)
            .totalIncomplete(totalIncomplete)
            .incompleteByReason(incompleteByReason)
            .lowUrgency(lowUrgency)
            .mediumUrgency(mediumUrgency)
            .highUrgency(highUrgency)
            .criticalUrgency(criticalUrgency)
            .multiPeriodIncomplete(multiPeriodIncomplete)
            .singlePeriodIncomplete(singlePeriodIncomplete)
            .missedAssessmentDeadlines(missedDeadlines)
            .noSubmissions(noSubmissions)
            .topicNotAssigned(topicNotAssigned)
            .affectedSubjectsCount(affectedSubjects)
            .affectedStudentsCount(affectedStudents)
            .build();
        
        stats.calculatePercentages();
        
        return stats;
    }

    // ============================================================
    // REPORTS
    // ============================================================

    /**
     * Generate incomplete report for a student
     */
    @Transactional(readOnly = true)
    public IncompleteReportDto generateStudentReport(
            Long studentId, LocalDate startDate, LocalDate endDate) {
        
        log.info("📊 Generating incomplete report for student {} from {} to {}", 
            studentId, startDate, endDate);
        
        StudentProfile student = studentProfileRepository.findById(studentId)
            .orElseThrow(() -> new RuntimeException("Student not found: " + studentId));
        
        List<IncompleteProgressDto> incompleteRecords = getIncompleteForStudentInRange(
            studentId, startDate, endDate
        );
        
        IncompleteStatisticsDto statistics = getStatisticsForStudent(
            studentId, startDate, endDate
        );
        
        // Build breakdowns
        Map<String, Long> byReason = incompleteRecords.stream()
            .collect(Collectors.groupingBy(
                IncompleteProgressDto::getIncompleteReason,
                Collectors.counting()
            ));
        
        Map<String, IncompleteReportDto.SubjectIncompleteBreakdown> bySubject = 
            buildSubjectBreakdown(incompleteRecords);
        
        IncompleteReportDto report = IncompleteReportDto.builder()
            .generatedAt(java.time.LocalDateTime.now())
            .reportStartDate(startDate)
            .reportEndDate(endDate)
            .reportType("STUDENT")
            .statistics(statistics)
            .incompleteRecords(incompleteRecords)
            .incompleteByReason(byReason)
            .incompleteBySubject(bySubject)
            .build();
        
        return report;
    }

    /**
     * Generate incomplete report for a subject (Teacher view)
     */
    @Transactional(readOnly = true)
    public IncompleteReportDto generateSubjectReport(
            Long subjectId, LocalDate startDate, LocalDate endDate) {
        
        log.info("📊 Generating incomplete report for subject {} from {} to {}", 
            subjectId, startDate, endDate);
        
        Subject subject = subjectRepository.findById(subjectId)
            .orElseThrow(() -> new RuntimeException("Subject not found: " + subjectId));
        
        List<IncompleteProgressDto> incompleteRecords = getIncompleteBySubject(
            subjectId, startDate, endDate
        );
        
        IncompleteStatisticsDto statistics = getStatisticsForSubject(
            subjectId, startDate, endDate
        );
        
        // Build breakdowns
        Map<String, Long> byReason = incompleteRecords.stream()
            .collect(Collectors.groupingBy(
                IncompleteProgressDto::getIncompleteReason,
                Collectors.counting()
            ));
        
        Map<Long, IncompleteReportDto.StudentIncompleteBreakdown> byStudent = 
            buildStudentBreakdown(incompleteRecords);
        
        // Get top 10 most affected students
        List<IncompleteReportDto.StudentIncompleteBreakdown> topStudents = 
            byStudent.values().stream()
                .sorted((a, b) -> Long.compare(b.getIncompleteCount(), a.getIncompleteCount()))
                .limit(10)
                .collect(Collectors.toList());
        
        IncompleteReportDto report = IncompleteReportDto.builder()
            .generatedAt(java.time.LocalDateTime.now())
            .reportStartDate(startDate)
            .reportEndDate(endDate)
            .reportType("SUBJECT")
            .statistics(statistics)
            .incompleteRecords(incompleteRecords)
            .incompleteByReason(byReason)
            .incompleteByStudent(byStudent)
            .mostAffectedStudents(topStudents)
            .build();
        
        return report;
    }

    /**
     * Generate system-wide incomplete report (Admin)
     */
    @Transactional(readOnly = true)
    public IncompleteReportDto generateSystemReport(LocalDate startDate, LocalDate endDate) {
        log.info("📊 Generating system-wide incomplete report from {} to {}", 
            startDate, endDate);
        
        List<StudentLessonProgress> allProgress = progressRepository
            .findByScheduledDateBetween(startDate, endDate);
        
        List<IncompleteProgressDto> incompleteRecords = allProgress.stream()
            .filter(p -> !p.isCompleted() && p.getIncompleteReason() != null)
            .map(this::convertToDto)
            .collect(Collectors.toList());
        
        IncompleteStatisticsDto statistics = getSystemStatistics(startDate, endDate);
        
        // Build all breakdowns
        Map<String, Long> byReason = incompleteRecords.stream()
            .collect(Collectors.groupingBy(
                IncompleteProgressDto::getIncompleteReason,
                Collectors.counting()
            ));
        
        Map<String, IncompleteReportDto.SubjectIncompleteBreakdown> bySubject = 
            buildSubjectBreakdown(incompleteRecords);
        
        Map<Long, IncompleteReportDto.StudentIncompleteBreakdown> byStudent = 
            buildStudentBreakdown(incompleteRecords);
        
        // Get top 10 for each
        List<IncompleteReportDto.StudentIncompleteBreakdown> topStudents = 
            byStudent.values().stream()
                .sorted((a, b) -> Long.compare(b.getIncompleteCount(), a.getIncompleteCount()))
                .limit(10)
                .collect(Collectors.toList());
        
        List<IncompleteReportDto.SubjectIncompleteBreakdown> topSubjects = 
            bySubject.values().stream()
                .sorted((a, b) -> Long.compare(b.getIncompleteCount(), a.getIncompleteCount()))
                .limit(10)
                .collect(Collectors.toList());
        
        IncompleteReportDto report = IncompleteReportDto.builder()
            .generatedAt(java.time.LocalDateTime.now())
            .reportStartDate(startDate)
            .reportEndDate(endDate)
            .reportType("ADMIN")
            .statistics(statistics)
            .incompleteRecords(incompleteRecords)
            .incompleteByReason(byReason)
            .incompleteBySubject(bySubject)
            .incompleteByStudent(byStudent)
            .mostAffectedStudents(topStudents)
            .mostAffectedSubjects(topSubjects)
            .build();
        
        return report;
    }

    // ============================================================
    // HELPER METHODS
    // ============================================================

    /**
     * Convert progress to DTO
     */
    private IncompleteProgressDto convertToDto(StudentLessonProgress progress) {
        IncompleteProgressDto dto = IncompleteProgressDto.builder()
            .id(progress.getId())
            .studentId(progress.getStudentProfile().getId())
            .studentName(progress.getStudentProfile().getUser().getFullName())
            .studentEmail(progress.getStudentProfile().getUser().getEmail())
            .scheduledDate(progress.getScheduledDate())
            .periodNumber(progress.getPeriodNumber())
            .dayOfWeek(progress.getScheduledDate().getDayOfWeek().name())
            .incompleteReason(progress.getIncompleteReason())
            .autoMarkedIncompleteAt(progress.getAutoMarkedIncompleteAt())
            .assessmentWindowEnd(progress.getAssessmentWindowEnd())
            .completed(progress.isCompleted())
            .assessmentScore(progress.getAssessmentScore())
            .completedAt(progress.getCompletedAt())
            .periodSequence(progress.getPeriodSequence())
            .totalPeriodsInSequence(progress.getTotalPeriodsInSequence())
            .allPeriodsCompleted(progress.getAllPeriodsCompleted())
            .build();
        
        if (progress.getSubject() != null) {
            dto.setSubjectId(progress.getSubject().getId());
            dto.setSubjectName(progress.getSubject().getName());
        }
        
        if (progress.getLessonTopic() != null) {
            dto.setLessonTopicId(progress.getLessonTopic().getId());
            dto.setLessonTopicTitle(progress.getLessonTopic().getTopicTitle());
            dto.setWeekNumber(progress.getLessonTopic().getWeekNumber());
        }
        
        if (progress.getAssessment() != null) {
            dto.setAssessmentId(progress.getAssessment().getId());
            dto.setAssessmentTitle(progress.getAssessment().getTitle());
            dto.setAssessmentAccessible(progress.getAssessmentAccessible());
            dto.setAssessmentWindowStart(progress.getAssessmentWindowStart());
        }
        
        dto.setDaysOverdue(dto.calculateDaysOverdue());
        
        return dto;
    }

    /**
     * Build subject breakdown
     */
    private Map<String, IncompleteReportDto.SubjectIncompleteBreakdown> buildSubjectBreakdown(
            List<IncompleteProgressDto> records) {
        
        Map<String, List<IncompleteProgressDto>> grouped = records.stream()
            .collect(Collectors.groupingBy(IncompleteProgressDto::getSubjectName));
        
        Map<String, IncompleteReportDto.SubjectIncompleteBreakdown> breakdown = new HashMap<>();
        
        for (Map.Entry<String, List<IncompleteProgressDto>> entry : grouped.entrySet()) {
            String subjectName = entry.getKey();
            List<IncompleteProgressDto> subjectRecords = entry.getValue();
            
            Map<String, Long> reasonBreakdown = subjectRecords.stream()
                .collect(Collectors.groupingBy(
                    IncompleteProgressDto::getIncompleteReason,
                    Collectors.counting()
                ));
            
            IncompleteReportDto.SubjectIncompleteBreakdown subjectBreakdown = 
                IncompleteReportDto.SubjectIncompleteBreakdown.builder()
                    .subjectName(subjectName)
                    .incompleteCount(subjectRecords.size())
                    .reasonBreakdown(reasonBreakdown)
                    .build();
            
            breakdown.put(subjectName, subjectBreakdown);
        }
        
        return breakdown;
    }

    /**
     * Build student breakdown
     */
    private Map<Long, IncompleteReportDto.StudentIncompleteBreakdown> buildStudentBreakdown(
            List<IncompleteProgressDto> records) {
        
        Map<Long, List<IncompleteProgressDto>> grouped = records.stream()
            .collect(Collectors.groupingBy(IncompleteProgressDto::getStudentId));
        
        Map<Long, IncompleteReportDto.StudentIncompleteBreakdown> breakdown = new HashMap<>();
        
        for (Map.Entry<Long, List<IncompleteProgressDto>> entry : grouped.entrySet()) {
            Long studentId = entry.getKey();
            List<IncompleteProgressDto> studentRecords = entry.getValue();
            
            IncompleteProgressDto first = studentRecords.get(0);
            
            Map<String, Long> reasonBreakdown = studentRecords.stream()
                .collect(Collectors.groupingBy(
                    IncompleteProgressDto::getIncompleteReason,
                    Collectors.counting()
                ));
            
            List<String> affectedSubjects = studentRecords.stream()
                .map(IncompleteProgressDto::getSubjectName)
                .distinct()
                .collect(Collectors.toList());
            
            IncompleteReportDto.StudentIncompleteBreakdown studentBreakdown = 
                IncompleteReportDto.StudentIncompleteBreakdown.builder()
                    .studentId(studentId)
                    .studentName(first.getStudentName())
                    .studentEmail(first.getStudentEmail())
                    .incompleteCount(studentRecords.size())
                    .reasonBreakdown(reasonBreakdown)
                    .affectedSubjects(affectedSubjects)
                    .build();
            
            breakdown.put(studentId, studentBreakdown);
        }
        
        return breakdown;
    }

    /**
     * Get incomplete count for a student
     */
    public long getIncompleteCountForStudent(Long studentId) {
        return progressRepository.countByStudentProfileIdAndCompletedFalseAndIncompleteReasonIsNotNull(studentId);
    }
}