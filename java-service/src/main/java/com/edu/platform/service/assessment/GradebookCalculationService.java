package com.edu.platform.service.assessment;

import com.edu.platform.dto.assessment.GradebookReportDto;
import com.edu.platform.dto.assessment.SubjectGradebookDto;
import com.edu.platform.dto.assessment.ComponentScoreDto;
import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.model.assessment.AssessmentSubmission;
import com.edu.platform.model.assessment.AssessmentType;
import com.edu.platform.repository.assessment.AssessmentRepository;
import com.edu.platform.repository.assessment.AssessmentSubmissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 📊 Gradebook Calculation Service
 * Handles weighted grade calculations for gradebook assessments
 * 
 * Weight Distribution:
 * - QUIZ:       20%
 * - CLASSWORK:  10%
 * - TEST1:      10%
 * - TEST2:      10%
 * - ASSIGNMENT: 10%
 * - EXAM:       40%
 * TOTAL:       100%
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GradebookCalculationService {
    
    private final AssessmentRepository assessmentRepository;
    private final AssessmentSubmissionRepository submissionRepository;
    
    // ✅ Weight definitions (as percentages)
    private static final Map<AssessmentType, Integer> ASSESSMENT_WEIGHTS = Map.of(
        AssessmentType.QUIZ,       20,
        AssessmentType.CLASSWORK,  10,
        AssessmentType.TEST1,      10,
        AssessmentType.TEST2,      10,
        AssessmentType.ASSIGNMENT, 10,
        AssessmentType.EXAM,       40
    );
    
    /**
     * ✅ Calculate full gradebook report for a student
     * Returns weighted grades for all subjects
     */
    @Transactional(readOnly = true)
    public GradebookReportDto calculateStudentReport(Long studentId) {
        log.info("📊 Calculating gradebook report for student {}", studentId);
        
        // Get all gradebook assessments for student
        List<Assessment> gradebookAssessments = assessmentRepository
            .findGradebookAssessmentsByStudentId(studentId);
        
        if (gradebookAssessments.isEmpty()) {
            log.warn("⚠️ No gradebook assessments found for student {}", studentId);
            return GradebookReportDto.empty(studentId);
        }
        
        // Get all submissions for these assessments
        List<Long> assessmentIds = gradebookAssessments.stream()
            .map(Assessment::getId)
            .collect(Collectors.toList());
        
        List<AssessmentSubmission> submissions = submissionRepository
            .findByStudentIdAndAssessmentIdIn(studentId, assessmentIds);
        
        // Create submission lookup map
        Map<Long, AssessmentSubmission> submissionMap = submissions.stream()
            .collect(Collectors.toMap(
                s -> s.getAssessment().getId(),
                s -> s
            ));
        
        // Group assessments by subject
        Map<Long, List<Assessment>> assessmentsBySubject = gradebookAssessments.stream()
            .collect(Collectors.groupingBy(a -> a.getSubject().getId()));
        
        // Calculate grade for each subject
        List<SubjectGradebookDto> subjectReports = new ArrayList<>();
        
        for (Map.Entry<Long, List<Assessment>> entry : assessmentsBySubject.entrySet()) {
            Long subjectId = entry.getKey();
            List<Assessment> subjectAssessments = entry.getValue();
            
            SubjectGradebookDto subjectReport = calculateSubjectGrade(
                studentId,
                subjectId,
                subjectAssessments,
                submissionMap
            );
            
            subjectReports.add(subjectReport);
        }
        
        // Sort by subject name
        subjectReports.sort(Comparator.comparing(SubjectGradebookDto::getSubjectName));
        
        // Calculate overall statistics
        return calculateOverallReport(studentId, subjectReports);
    }
    
    /**
     * ✅ Calculate weighted grade for ONE subject
     */
    @Transactional(readOnly = true)
    public SubjectGradebookDto calculateSubjectGrade(
            Long studentId,
            Long subjectId) {
        
        log.info("📊 Calculating subject grade: student={}, subject={}", studentId, subjectId);
        
        // Get all gradebook assessments for this subject
        List<Assessment> assessments = assessmentRepository
            .findGradebookAssessmentsByStudentIdAndSubjectId(studentId, subjectId);
        
        if (assessments.isEmpty()) {
            log.warn("⚠️ No assessments found for subject {}", subjectId);
            return SubjectGradebookDto.empty(subjectId);
        }
        
        // Get submissions
        List<Long> assessmentIds = assessments.stream()
            .map(Assessment::getId)
            .collect(Collectors.toList());
        
        List<AssessmentSubmission> submissions = submissionRepository
            .findByStudentIdAndAssessmentIdIn(studentId, assessmentIds);
        
        Map<Long, AssessmentSubmission> submissionMap = submissions.stream()
            .collect(Collectors.toMap(
                s -> s.getAssessment().getId(),
                s -> s
            ));
        
        return calculateSubjectGrade(studentId, subjectId, assessments, submissionMap);
    }
    
    /**
     * ✅ CORE CALCULATION: Calculate weighted grade for a subject
     */
    private SubjectGradebookDto calculateSubjectGrade(
            Long studentId,
            Long subjectId,
            List<Assessment> assessments,
            Map<Long, AssessmentSubmission> submissionMap) {
        
        String subjectName = assessments.get(0).getSubject().getName();
        String subjectCode = assessments.get(0).getSubject().getCode();
        
        log.debug("📊 Calculating grade for subject: {}", subjectName);
        
        // Group assessments by type
        Map<AssessmentType, List<Assessment>> assessmentsByType = assessments.stream()
            .collect(Collectors.groupingBy(Assessment::getType));
        
        // Calculate score for each component
        Map<AssessmentType, ComponentScoreDto> componentScores = new HashMap<>();
        double totalWeightedScore = 0.0;
        int totalWeightCovered = 0;
        int componentsSubmitted = 0;
        int totalComponents = ASSESSMENT_WEIGHTS.size();
        
        for (Map.Entry<AssessmentType, Integer> weightEntry : ASSESSMENT_WEIGHTS.entrySet()) {
            AssessmentType type = weightEntry.getKey();
            int weight = weightEntry.getValue();
            
            List<Assessment> typeAssessments = assessmentsByType.getOrDefault(type, new ArrayList<>());
            
            ComponentScoreDto componentScore = calculateComponentScore(
                type,
                weight,
                typeAssessments,
                submissionMap
            );
            
            componentScores.put(type, componentScore);
            
            if (Boolean.TRUE.equals(componentScore.getSubmitted())) {
                totalWeightedScore += componentScore.getWeightedScore();
                totalWeightCovered += weight;
                componentsSubmitted++;
            }
        }
        
        // Calculate final percentage
        double finalPercentage = totalWeightCovered > 0 
            ? (totalWeightedScore / totalWeightCovered) * 100 
            : 0.0;
        
        // Determine grade letter and status
        String gradeLetter = calculateGradeLetter(finalPercentage);
        String status = determineStatus(finalPercentage, componentsSubmitted, totalComponents);
        
        // Check if complete
        boolean isComplete = componentsSubmitted == totalComponents;
        
        log.info("✅ Subject {}: {}/{} components, {}%, Grade: {}, Status: {}", 
                 subjectName, componentsSubmitted, totalComponents, 
                 String.format("%.2f", finalPercentage), gradeLetter, status);
        
        return SubjectGradebookDto.builder()
            .subjectId(subjectId)
            .subjectName(subjectName)
            .subjectCode(subjectCode)
            .components(componentScores)
            .totalWeightedScore(round(totalWeightedScore, 2))
            .totalWeightCovered(totalWeightCovered)
            .finalPercentage(round(finalPercentage, 2))
            .gradeLetter(gradeLetter)
            .status(status)
            .isComplete(isComplete)
            .componentsSubmitted(componentsSubmitted)
            .totalComponents(totalComponents)
            .build();
    }
    
    /**
     * ✅ Calculate score for one component (e.g., all QUIZes)
     */
    private ComponentScoreDto calculateComponentScore(
            AssessmentType type,
            int weight,
            List<Assessment> assessments,
            Map<Long, AssessmentSubmission> submissionMap) {
        
        if (assessments.isEmpty()) {
            // No assessment of this type exists
            return ComponentScoreDto.notAvailable(type, weight);
        }
        
        // Get submissions for these assessments
        List<AssessmentSubmission> submissions = assessments.stream()
            .map(a -> submissionMap.get(a.getId()))
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
        
        if (submissions.isEmpty()) {
            // Assessment exists but not submitted
            return ComponentScoreDto.pending(type, weight, assessments.size());
        }
        
        // Calculate average if multiple assessments of same type
        double totalScore = 0.0;
        double totalPossible = 0.0;
        
        for (AssessmentSubmission submission : submissions) {
            totalScore += submission.getScore().doubleValue();
            totalPossible += submission.getTotalMarks().doubleValue();
        }
        
        // Calculate percentage for this component
        double percentage = (totalScore / totalPossible) * 100;
        
        // Calculate weighted contribution
        double weightedScore = (percentage / 100) * weight;
        
        log.debug("Component {}: {}/{} = {}%, weighted = {}", 
                 type, totalScore, totalPossible, 
                 String.format("%.2f", percentage), 
                 String.format("%.2f", weightedScore));
        
        return ComponentScoreDto.builder()
            .type(type)
            .weight(weight)
            .score(round(totalScore, 2))
            .totalPossible(round(totalPossible, 2))
            .percentage(round(percentage, 2))
            .weightedScore(round(weightedScore, 2))
            .submitted(true)
            .count(submissions.size())
            .assessmentIds(submissions.stream()
                .map(s -> s.getAssessment().getId())
                .collect(Collectors.toList()))
            .build();
    }
    
    /**
     * ✅ Calculate overall report statistics
     */
    private GradebookReportDto calculateOverallReport(
            Long studentId,
            List<SubjectGradebookDto> subjectReports) {
        
        if (subjectReports.isEmpty()) {
            return GradebookReportDto.empty(studentId);
        }
        
        // Calculate overall average (only complete subjects)
        double totalPercentage = 0.0;
        int completeSubjects = 0;
        int passedSubjects = 0;
        
        for (SubjectGradebookDto subject : subjectReports) {
            if (Boolean.TRUE.equals(subject.getIsComplete())) {
                totalPercentage += subject.getFinalPercentage();
                completeSubjects++;
                
                if ("PASS".equals(subject.getStatus())) {
                    passedSubjects++;
                }
            }
        }
        
        double overallAverage = completeSubjects > 0 
            ? totalPercentage / completeSubjects 
            : 0.0;
        
        String overallGrade = calculateGradeLetter(overallAverage);
        
        return GradebookReportDto.builder()
            .studentId(studentId)
            .subjects(subjectReports)
            .totalSubjects(subjectReports.size())
            .completeSubjects(completeSubjects)
            .incompleteSubjects(subjectReports.size() - completeSubjects)
            .passedSubjects(passedSubjects)
            .failedSubjects(completeSubjects - passedSubjects)
            .overallAverage(round(overallAverage, 2))
            .overallGrade(overallGrade)
            .build();
    }
    
    /**
     * ✅ Calculate grade letter from percentage
     */
    private String calculateGradeLetter(double percentage) {
        if (percentage >= 90) return "A+";
        if (percentage >= 85) return "A";
        if (percentage >= 80) return "A-";
        if (percentage >= 75) return "B+";
        if (percentage >= 70) return "B";
        if (percentage >= 65) return "B-";
        if (percentage >= 60) return "C+";
        if (percentage >= 55) return "C";
        if (percentage >= 50) return "C-";
        if (percentage >= 45) return "D";
        return "F";
    }
    
    /**
     * ✅ Determine pass/fail status
     */
    private String determineStatus(double percentage, int submitted, int total) {
        if (submitted < total) {
            return "INCOMPLETE";
        }
        return percentage >= 50 ? "PASS" : "FAIL";
    }
    
    /**
     * ✅ Round to specified decimal places
     */
    private double round(double value, int places) {
        if (Double.isNaN(value) || Double.isInfinite(value)) {
            return 0.0;
        }
        return BigDecimal.valueOf(value)
            .setScale(places, RoundingMode.HALF_UP)
            .doubleValue();
    }
    
    /**
     * ✅ Get assessment weight
     */
    public int getAssessmentWeight(AssessmentType type) {
        return ASSESSMENT_WEIGHTS.getOrDefault(type, 0);
    }
    
    /**
     * ✅ Get all weights
     */
    public Map<AssessmentType, Integer> getAllWeights() {
        return new HashMap<>(ASSESSMENT_WEIGHTS);
    }
}