// ===================================================================
// TeacherSubjectReportService.java
// ===================================================================
package com.edu.platform.service.individual;

import com.edu.platform.dto.individual.TeacherSubjectPerformanceDto;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.StudentProfileRepository;
import com.edu.platform.repository.SubjectRepository;
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
 * SPRINT 12: Teacher Subject Performance Reporting Service
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TeacherSubjectReportService {

    private final StudentProfileRepository studentProfileRepository;
    private final SubjectRepository subjectRepository;
    private final StudentLessonProgressRepository progressRepository;

    @Transactional(readOnly = true)
    public TeacherSubjectPerformanceDto getTeacherSubjectReport(
            Long teacherId, Long subjectId, LocalDate startDate, LocalDate endDate) {
        
        log.info("📚 Generating teacher subject report - Teacher: {}, Subject: {}", teacherId, subjectId);

        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new EntityNotFoundException("Subject not found"));

        // Get all progress for subject in date range
        List<StudentLessonProgress> allProgress = progressRepository
                .findBySubjectIdAndScheduledDateBetween(subjectId, startDate, endDate);

        // Group by student
        Map<Long, List<StudentLessonProgress>> progressByStudent = allProgress.stream()
                .collect(Collectors.groupingBy(p -> p.getStudentProfile().getId()));

        TeacherSubjectPerformanceDto dto = TeacherSubjectPerformanceDto.builder()
                .teacherId(teacherId)
                .subjectId(subjectId)
                .subjectName(subject.getName())
                .subjectCode(subject.getCode()) // ✅ FIXED: Use getCode() instead of getSubjectCode()
                .startDate(startDate)
                .endDate(endDate)
                .totalStudents(progressByStudent.size())
                .build();

        // Calculate overall statistics
        int totalLessons = allProgress.size();
        long completedLessons = allProgress.stream().filter(StudentLessonProgress::isCompleted).count();
        long incompleteLessons = allProgress.stream().filter(p -> p.getIncompleteReason() != null).count();

        dto.setTotalLessonsScheduled(totalLessons);
        dto.setTotalLessonsCompleted((int) completedLessons);
        dto.setTotalLessonsIncomplete((int) incompleteLessons);
        dto.calculateOverallCompletionRate();

        // Assessment statistics
        dto.setTotalAssessmentsGiven(totalLessons);
        dto.setTotalAssessmentsCompleted((int) completedLessons);
        dto.setTotalAssessmentsMissed((int) incompleteLessons);
        dto.calculateAssessmentCompletionRate();

        // Calculate class average score
        OptionalDouble classAvg = allProgress.stream()
                .filter(StudentLessonProgress::isCompleted)
                .filter(p -> p.getAssessmentScore() != null)
                .mapToDouble(p -> p.getAssessmentScore().doubleValue())
                .average();
        
        if (classAvg.isPresent()) {
            dto.setClassAverageScore(BigDecimal.valueOf(classAvg.getAsDouble()).setScale(2, RoundingMode.HALF_UP));
        }

        // Student performance summaries
        List<TeacherSubjectPerformanceDto.StudentPerformanceSummary> studentPerformances = new ArrayList<>();
        
        for (Map.Entry<Long, List<StudentLessonProgress>> entry : progressByStudent.entrySet()) {
            StudentProfile student = entry.getValue().get(0).getStudentProfile();
            List<StudentLessonProgress> studentProgress = entry.getValue();

            int completed = (int) studentProgress.stream().filter(StudentLessonProgress::isCompleted).count();
            int incomplete = (int) studentProgress.stream().filter(p -> p.getIncompleteReason() != null).count();
            double completionRate = studentProgress.isEmpty() ? 0 : (completed * 100.0) / studentProgress.size();

            OptionalDouble avgScore = studentProgress.stream()
                    .filter(StudentLessonProgress::isCompleted)
                    .filter(p -> p.getAssessmentScore() != null)
                    .mapToDouble(p -> p.getAssessmentScore().doubleValue())
                    .average();

            String performanceLevel = determinePerformanceLevel(completionRate, avgScore.orElse(0));

            studentPerformances.add(TeacherSubjectPerformanceDto.StudentPerformanceSummary.builder()
                    .studentId(student.getId())
                    .studentName(student.getUser().getFullName())
                    .className(student.getClassLevel() != null ? student.getClassLevel().getName() : "N/A")
                    .lessonsCompleted(completed)
                    .lessonsIncomplete(incomplete)
                    .completionRate(completionRate)
                    .averageScore(avgScore.isPresent() ? BigDecimal.valueOf(avgScore.getAsDouble()).setScale(2, RoundingMode.HALF_UP) : null)
                    .performanceLevel(performanceLevel)
                    .needsAttention("AT_RISK".equals(performanceLevel))
                    .build());
        }

        dto.setStudentPerformances(studentPerformances);

        // Count at-risk students
        dto.setStudentsAtRisk((int) studentPerformances.stream().filter(s -> "AT_RISK".equals(s.getPerformanceLevel())).count());

        // Add insights
        if (dto.getOverallCompletionRate() < 70) {
            dto.addInsight("Overall completion rate is below 70% - consider reviewing assignment difficulty");
        }
        if (dto.getStudentsAtRisk() > dto.getTotalStudents() * 0.3) {
            dto.addAlert("More than 30% of students are at risk");
        }

        dto.calculateEffectivenessMetrics();

        log.info("✅ Teacher report generated: {} students, {:.1f}% completion", 
                dto.getTotalStudents(), dto.getOverallCompletionRate());

        return dto;
    }

    private String determinePerformanceLevel(double completionRate, double avgScore) {
        if (completionRate >= 90 && avgScore >= 85) return "EXCELLENT";
        if (completionRate >= 75 && avgScore >= 70) return "GOOD";
        if (completionRate >= 60) return "AVERAGE";
        return "AT_RISK";
    }
}