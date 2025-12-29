package com.edu.platform.service.assessment;

import com.edu.platform.dto.assessment.*;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.model.assessment.*;
import com.edu.platform.repository.StudentProfileRepository;
import com.edu.platform.repository.SubjectRepository;
import com.edu.platform.repository.assessment.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminAssessmentService {

    private final AssessmentRepository assessmentRepository;
    private final AssessmentSubmissionRepository submissionRepository;
    private final AssessmentAnswerRepository answerRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final SubjectRepository subjectRepository;
    private final AssessmentService assessmentService;

    /**
     * Get system-wide assessment statistics overview
     * ✅ UPDATED: Includes subjectBreakdown and recentActivity
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getAssessmentStatsOverview() {
        long totalAssessments = assessmentRepository.count();
        long publishedAssessments = assessmentRepository.countByPublishedTrue();
        long totalSubmissions = submissionRepository.count();
        long gradedSubmissions = submissionRepository.countByGradedTrue();
        long pendingGrading = submissionRepository.countByGradedFalse();
        
        List<AssessmentSubmission> allSubmissions = submissionRepository.findAll();
        double avgScore = allSubmissions.stream()
                .filter(s -> s.getPercentage() != null)
                .mapToDouble(AssessmentSubmission::getPercentage)
                .average()
                .orElse(0.0);
        
        long passedSubmissions = allSubmissions.stream()
                .filter(s -> Boolean.TRUE.equals(s.getPassed()))
                .count();
        
        double passRate = totalSubmissions > 0 
                ? (passedSubmissions * 100.0 / totalSubmissions) 
                : 0.0;

        List<Map<String, Object>> subjectBreakdown = getStatsBySubject();
        
        List<Map<String, Object>> recentActivity = allSubmissions.stream()
                .sorted((s1, s2) -> s2.getSubmittedAt().compareTo(s1.getSubmittedAt()))
                .limit(10)
                .map(submission -> {
                    Map<String, Object> activity = new HashMap<>();
                    activity.put("type", submission.getGraded() ? "graded" : "submission");
                    activity.put("studentName", submission.getStudent().getUser().getFullName());
                    activity.put("assessmentTitle", submission.getAssessment().getTitle());
                    activity.put("timestamp", submission.getSubmittedAt().toString());
                    if (submission.getPercentage() != null) {
                        activity.put("score", submission.getPercentage());
                    }
                    if (submission.getGraded() && submission.getAssessment().getCreatedBy() != null) {
                        activity.put("teacherName", submission.getAssessment().getCreatedBy().getFullName());
                    }
                    return activity;
                })
                .collect(Collectors.toList());

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalAssessments", totalAssessments);
        stats.put("publishedAssessments", publishedAssessments);
        stats.put("draftAssessments", totalAssessments - publishedAssessments);
        stats.put("totalSubmissions", totalSubmissions);
        stats.put("gradedSubmissions", gradedSubmissions);
        stats.put("pendingGrading", pendingGrading);
        stats.put("averageScore", Math.round(avgScore * 100.0) / 100.0);
        stats.put("passRate", Math.round(passRate * 100.0) / 100.0);
        stats.put("passedSubmissions", passedSubmissions);
        stats.put("failedSubmissions", totalSubmissions - passedSubmissions);
        stats.put("subjectBreakdown", subjectBreakdown);
        stats.put("recentActivity", recentActivity);
        
        return stats;
    }

    /**
     * Get all submissions with filters
     */
    @Transactional(readOnly = true)
    public List<AssessmentSubmissionDto> getAllSubmissions(
            Long assessmentId, Long studentId, Long subjectId, Boolean graded) {
        
        List<AssessmentSubmission> submissions;
        
        if (assessmentId != null) {
            submissions = submissionRepository.findByAssessmentId(assessmentId);
        } else if (studentId != null) {
            submissions = submissionRepository.findByStudentId(studentId);
        } else if (subjectId != null) {
            submissions = submissionRepository.findByAssessmentSubjectId(subjectId);
        } else {
            submissions = submissionRepository.findAll();
        }
        
        if (graded != null) {
            submissions = submissions.stream()
                    .filter(s -> graded.equals(s.getGraded()))
                    .collect(Collectors.toList());
        }
        
        return submissions.stream()
                .map(this::convertSubmissionToDto)
                .collect(Collectors.toList());
    }

    /**
     * Get all pending grading submissions
     * ✅ UPDATED: Now checks for actual pending answers (essay/short answer questions)
     */
    @Transactional(readOnly = true)
    public List<PendingSubmissionDto> getAllPendingGrading(Long subjectId, Long teacherId) {
        List<AssessmentSubmission> submissions;
        
        if (subjectId != null) {
            submissions = submissionRepository.findByAssessmentSubjectId(subjectId);
        } else if (teacherId != null) {
            submissions = submissionRepository.findByAssessment_CreatedBy_Id(teacherId);
        } else {
            submissions = submissionRepository.findAll();
        }
        
        return submissions.stream()
                .map(this::toPendingSubmissionDto)
                .filter(dto -> dto.getPendingAnswersCount() > 0)
                .collect(Collectors.toList());
    }

    /**
     * Get all assessments with filters
     */
    @Transactional(readOnly = true)
    public List<AssessmentDto> getAllAssessments(Long subjectId, Long teacherId, Boolean published) {
        List<Assessment> assessments;
        
        if (subjectId != null && published != null) {
            if (published) {
                assessments = assessmentRepository.findBySubjectIdAndPublishedTrue(subjectId);
            } else {
                assessments = assessmentRepository.findBySubjectId(subjectId);
            }
        } else if (subjectId != null) {
            assessments = assessmentRepository.findBySubjectId(subjectId);
        } else if (teacherId != null) {
            assessments = assessmentRepository.findByCreatedBy_Id(teacherId);
        } else if (published != null) {
            if (published) {
                assessments = assessmentRepository.findByPublishedTrue();
            } else {
                assessments = assessmentRepository.findAll();
            }
        } else {
            assessments = assessmentRepository.findAll();
        }
        
        return assessments.stream()
                .map(a -> assessmentService.convertToDto(a, null))
                .collect(Collectors.toList());
    }

    /**
     * Get assessment statistics by subject
     * ✅ UPDATED: Includes passRate
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getStatsBySubject() {
        List<Assessment> assessments = assessmentRepository.findAll();
        
        Map<Long, Map<String, Object>> subjectStats = new HashMap<>();
        
        for (Assessment assessment : assessments) {
            if (assessment.getSubject() == null) continue;
            
            Long subjectId = assessment.getSubject().getId();
            subjectStats.putIfAbsent(subjectId, new HashMap<>(Map.of(
                "subjectId", subjectId,
                "subjectName", assessment.getSubject().getName(),
                "assessmentCount", 0L,
                "submissionCount", 0L,
                "averageScore", 0.0,
                "passRate", 0.0,
                "scores", new ArrayList<Double>(),
                "passed", new ArrayList<Boolean>()
            )));
            
            Map<String, Object> stats = subjectStats.get(subjectId);
            stats.put("assessmentCount", (Long) stats.get("assessmentCount") + 1);
            
            List<AssessmentSubmission> submissions = submissionRepository.findByAssessmentId(assessment.getId());
            stats.put("submissionCount", (Long) stats.get("submissionCount") + submissions.size());
            
            @SuppressWarnings("unchecked")
            List<Double> scores = (List<Double>) stats.get("scores");
            @SuppressWarnings("unchecked")
            List<Boolean> passed = (List<Boolean>) stats.get("passed");
            
            submissions.stream()
                    .filter(s -> s.getPercentage() != null)
                    .forEach(s -> {
                        scores.add(s.getPercentage());
                        passed.add(Boolean.TRUE.equals(s.getPassed()));
                    });
        }
        
        for (Map<String, Object> stats : subjectStats.values()) {
            @SuppressWarnings("unchecked")
            List<Double> scores = (List<Double>) stats.get("scores");
            @SuppressWarnings("unchecked")
            List<Boolean> passed = (List<Boolean>) stats.get("passed");
            
            double avg = scores.isEmpty() ? 0.0 : scores.stream()
                    .mapToDouble(Double::doubleValue)
                    .average()
                    .orElse(0.0);
            stats.put("averageScore", Math.round(avg * 100.0) / 100.0);
            
            long passedCount = passed.stream().filter(p -> p).count();
            double passRate = passed.isEmpty() ? 0.0 : (passedCount * 100.0 / passed.size());
            stats.put("passRate", Math.round(passRate * 100.0) / 100.0);
            
            stats.remove("scores");
            stats.remove("passed");
        }
        
        return new ArrayList<>(subjectStats.values());
    }

    /**
     * Get assessment statistics by teacher
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getStatsByTeacher() {
        List<Assessment> assessments = assessmentRepository.findAll();
        
        Map<Long, Map<String, Object>> teacherStats = new HashMap<>();
        
        for (Assessment assessment : assessments) {
            if (assessment.getCreatedBy() == null) continue;
            
            Long teacherId = assessment.getCreatedBy().getId();
            teacherStats.putIfAbsent(teacherId, new HashMap<>(Map.of(
                "teacherId", teacherId,
                "teacherName", assessment.getCreatedBy().getFullName(),
                "assessmentCount", 0L,
                "submissionCount", 0L,
                "avgScore", 0.0,
                "scores", new ArrayList<Double>()
            )));
            
            Map<String, Object> stats = teacherStats.get(teacherId);
            stats.put("assessmentCount", (Long) stats.get("assessmentCount") + 1);
            
            List<AssessmentSubmission> submissions = submissionRepository.findByAssessmentId(assessment.getId());
            stats.put("submissionCount", (Long) stats.get("submissionCount") + submissions.size());
            
            @SuppressWarnings("unchecked")
            List<Double> scores = (List<Double>) stats.get("scores");
            submissions.stream()
                    .filter(s -> s.getPercentage() != null)
                    .forEach(s -> scores.add(s.getPercentage()));
        }
        
        for (Map<String, Object> stats : teacherStats.values()) {
            @SuppressWarnings("unchecked")
            List<Double> scores = (List<Double>) stats.get("scores");
            double avg = scores.isEmpty() ? 0.0 : scores.stream()
                    .mapToDouble(Double::doubleValue)
                    .average()
                    .orElse(0.0);
            stats.put("avgScore", Math.round(avg * 100.0) / 100.0);
            stats.remove("scores");
        }
        
        return new ArrayList<>(teacherStats.values());
    }

    /**
     * Get submission trends over time
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getSubmissionTrends(int days) {
        LocalDateTime startDate = LocalDateTime.now().minusDays(days);
        List<AssessmentSubmission> recentSubmissions = submissionRepository.findAll().stream()
                .filter(s -> s.getSubmittedAt().isAfter(startDate))
                .collect(Collectors.toList());
        
        Map<String, Long> dailyCounts = recentSubmissions.stream()
                .collect(Collectors.groupingBy(
                    s -> s.getSubmittedAt().toLocalDate().toString(),
                    Collectors.counting()
                ));
        
        long totalInPeriod = recentSubmissions.size();
        long gradedInPeriod = recentSubmissions.stream()
                .filter(s -> Boolean.TRUE.equals(s.getGraded()))
                .count();
        
        return Map.of(
            "period", days + " days",
            "totalSubmissions", totalInPeriod,
            "gradedSubmissions", gradedInPeriod,
            "pendingGrading", totalInPeriod - gradedInPeriod,
            "dailyCounts", dailyCounts
        );
    }

    /**
     * Get detailed statistics for a specific assessment
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getDetailedAssessmentStats(Long assessmentId) {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment not found"));
        
        List<AssessmentSubmission> submissions = submissionRepository.findByAssessmentId(assessmentId);
        
        long totalSubmissions = submissions.size();
        long gradedSubmissions = submissions.stream()
                .filter(s -> Boolean.TRUE.equals(s.getGraded()))
                .count();
        long passedSubmissions = submissions.stream()
                .filter(s -> Boolean.TRUE.equals(s.getPassed()))
                .count();
        
        double avgScore = submissions.stream()
                .filter(s -> s.getPercentage() != null)
                .mapToDouble(AssessmentSubmission::getPercentage)
                .average()
                .orElse(0.0);
        
        double highestScore = submissions.stream()
                .filter(s -> s.getPercentage() != null)
                .mapToDouble(AssessmentSubmission::getPercentage)
                .max()
                .orElse(0.0);
        
        double lowestScore = submissions.stream()
                .filter(s -> s.getPercentage() != null)
                .mapToDouble(AssessmentSubmission::getPercentage)
                .min()
                .orElse(0.0);
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("assessmentId", assessmentId);
        stats.put("assessmentTitle", assessment.getTitle());
        stats.put("totalSubmissions", totalSubmissions);
        stats.put("gradedSubmissions", gradedSubmissions);
        stats.put("pendingGrading", totalSubmissions - gradedSubmissions);
        stats.put("passedSubmissions", passedSubmissions);
        stats.put("failedSubmissions", totalSubmissions - passedSubmissions);
        stats.put("passRate", totalSubmissions > 0 ? (passedSubmissions * 100.0 / totalSubmissions) : 0.0);
        stats.put("averageScore", Math.round(avgScore * 100.0) / 100.0);
        stats.put("highestScore", highestScore);
        stats.put("lowestScore", lowestScore);
        
        return stats;
    }

    /**
     * ✅ NEW: Get detailed student performance
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getStudentPerformance(Long studentId) {
        StudentProfile student = studentProfileRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        
        List<AssessmentSubmission> submissions = submissionRepository.findByStudentId(studentId);
        
        // Calculate overall stats
        long totalAssessments = submissions.size();
        long passed = submissions.stream()
                .filter(s -> Boolean.TRUE.equals(s.getPassed()))
                .count();
        long failed = totalAssessments - passed;
        
        double averageScore = submissions.stream()
                .filter(s -> s.getPercentage() != null)
                .mapToDouble(AssessmentSubmission::getPercentage)
                .average()
                .orElse(0.0);
        
        // Calculate subject-wise performance
        Map<Long, List<AssessmentSubmission>> bySubject = submissions.stream()
                .filter(s -> s.getAssessment().getSubject() != null)
                .collect(Collectors.groupingBy(s -> s.getAssessment().getSubject().getId()));
        
        List<Map<String, Object>> subjectPerformance = bySubject.entrySet().stream()
                .map(entry -> {
                    Long subjectId = entry.getKey();
                    List<AssessmentSubmission> subjectSubmissions = entry.getValue();
                    
                    String subjectName = subjectSubmissions.get(0).getAssessment().getSubject().getName();
                    
                    double subjectAvg = subjectSubmissions.stream()
                            .filter(s -> s.getPercentage() != null)
                            .mapToDouble(AssessmentSubmission::getPercentage)
                            .average()
                            .orElse(0.0);
                    
                    long subjectPassed = subjectSubmissions.stream()
                            .filter(s -> Boolean.TRUE.equals(s.getPassed()))
                            .count();
                    
                    double subjectPassRate = subjectSubmissions.size() > 0
                            ? (subjectPassed * 100.0 / subjectSubmissions.size())
                            : 0.0;
                    
                    Map<String, Object> subjectStats = new HashMap<>();
                    subjectStats.put("subjectId", subjectId);
                    subjectStats.put("subjectName", subjectName);
                    subjectStats.put("averageScore", Math.round(subjectAvg * 100.0) / 100.0);
                    subjectStats.put("passRate", Math.round(subjectPassRate * 100.0) / 100.0);
                    subjectStats.put("totalAssessments", subjectSubmissions.size());
                    subjectStats.put("passed", subjectPassed);
                    
                    return subjectStats;
                })
                .collect(Collectors.toList());
        
        // Build response
        Map<String, Object> response = new HashMap<>();
        
        Map<String, Object> studentInfo = new HashMap<>();
        studentInfo.put("id", student.getId());
        studentInfo.put("name", student.getUser().getFullName());
        studentInfo.put("email", student.getUser().getEmail());
        studentInfo.put("className", student.getClassLevel() != null ? student.getClassLevel().getName() : null);
        response.put("student", studentInfo);
        
        response.put("submissions", submissions.stream()
                .map(this::convertSubmissionToDto)
                .collect(Collectors.toList()));
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalAssessments", totalAssessments);
        stats.put("passed", passed);
        stats.put("failed", failed);
        stats.put("averageScore", Math.round(averageScore * 100.0) / 100.0);
        stats.put("subjectPerformance", subjectPerformance);
        response.put("stats", stats);
        
        return response;
    }

    /**
     * ✅ NEW: Get detailed subject breakdown
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getSubjectBreakdown(Long subjectId) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
        
        List<Assessment> assessments = assessmentRepository.findBySubjectId(subjectId);
        List<AssessmentSubmission> submissions = submissionRepository.findByAssessmentSubjectId(subjectId);
        
        // Calculate stats
        long totalAssessments = assessments.size();
        long totalSubmissions = submissions.size();
        
        double averageScore = submissions.stream()
                .filter(s -> s.getPercentage() != null)
                .mapToDouble(AssessmentSubmission::getPercentage)
                .average()
                .orElse(0.0);
        
        long passedCount = submissions.stream()
                .filter(s -> Boolean.TRUE.equals(s.getPassed()))
                .count();
        
        double passRate = totalSubmissions > 0 
                ? (passedCount * 100.0 / totalSubmissions)
                : 0.0;
        
        // Get top performers
        Map<Long, List<AssessmentSubmission>> byStudent = submissions.stream()
                .collect(Collectors.groupingBy(s -> s.getStudent().getId()));
        
        List<Map<String, Object>> topPerformers = byStudent.entrySet().stream()
                .map(entry -> {
                    Long studentId = entry.getKey();
                    List<AssessmentSubmission> studentSubs = entry.getValue();
                    
                    double studentAvg = studentSubs.stream()
                            .filter(s -> s.getPercentage() != null)
                            .mapToDouble(AssessmentSubmission::getPercentage)
                            .average()
                            .orElse(0.0);
                    
                    Map<String, Object> performer = new HashMap<>();
                    performer.put("studentId", studentId);
                    performer.put("studentName", studentSubs.get(0).getStudent().getUser().getFullName());
                    performer.put("averageScore", Math.round(studentAvg * 100.0) / 100.0);
                    performer.put("totalAssessments", studentSubs.size());
                    
                    return performer;
                })
                .sorted((a, b) -> Double.compare(
                        (Double) b.get("averageScore"), 
                        (Double) a.get("averageScore")))
                .limit(10)
                .collect(Collectors.toList());
        
        // Get struggling students (bottom performers)
        List<Map<String, Object>> strugglingStudents = byStudent.entrySet().stream()
                .map(entry -> {
                    Long studentId = entry.getKey();
                    List<AssessmentSubmission> studentSubs = entry.getValue();
                    
                    double studentAvg = studentSubs.stream()
                            .filter(s -> s.getPercentage() != null)
                            .mapToDouble(AssessmentSubmission::getPercentage)
                            .average()
                            .orElse(0.0);
                    
                    Map<String, Object> performer = new HashMap<>();
                    performer.put("studentId", studentId);
                    performer.put("studentName", studentSubs.get(0).getStudent().getUser().getFullName());
                    performer.put("averageScore", Math.round(studentAvg * 100.0) / 100.0);
                    performer.put("totalAssessments", studentSubs.size());
                    
                    return performer;
                })
                .sorted((a, b) -> Double.compare(
                        (Double) a.get("averageScore"), 
                        (Double) b.get("averageScore")))
                .limit(10)
                .collect(Collectors.toList());
        
        // Build response
        Map<String, Object> response = new HashMap<>();
        
        Map<String, Object> subjectInfo = new HashMap<>();
        subjectInfo.put("id", subject.getId());
        subjectInfo.put("name", subject.getName());
        response.put("subject", subjectInfo);
        
        response.put("assessments", assessments.stream()
                .map(a -> assessmentService.convertToDto(a, null))
                .collect(Collectors.toList()));
        
        response.put("submissions", submissions.stream()
                .map(this::convertSubmissionToDto)
                .collect(Collectors.toList()));
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalAssessments", totalAssessments);
        stats.put("totalSubmissions", totalSubmissions);
        stats.put("averageScore", Math.round(averageScore * 100.0) / 100.0);
        stats.put("passRate", Math.round(passRate * 100.0) / 100.0);
        stats.put("topPerformers", topPerformers);
        stats.put("strugglingStudents", strugglingStudents);
        response.put("stats", stats);
        
        return response;
    }

    // Helper methods
    
    private PendingSubmissionDto toPendingSubmissionDto(AssessmentSubmission submission) {
        List<AssessmentAnswer> answers = answerRepository.findBySubmissionId(submission.getId());
        
        long pendingCount = answers.stream()
                .filter(a -> (a.getQuestion().getQuestionType() == AssessmentQuestion.QuestionType.ESSAY ||
                             a.getQuestion().getQuestionType() == AssessmentQuestion.QuestionType.SHORT_ANSWER) &&
                            a.getMarksObtained() == null)
                .count();
        
        return PendingSubmissionDto.builder()
                .id(submission.getId())
                .assessmentId(submission.getAssessment().getId())
                .assessmentTitle(submission.getAssessment().getTitle())
                .studentId(submission.getStudent().getId())
                .studentName(submission.getStudent().getUser().getFullName())
                .subjectId(submission.getAssessment().getSubject() != null 
                        ? submission.getAssessment().getSubject().getId() 
                        : null)
                .subjectName(submission.getAssessment().getSubject() != null 
                        ? submission.getAssessment().getSubject().getName() 
                        : null)
                .teacherName(submission.getAssessment().getCreatedBy() != null 
                        ? submission.getAssessment().getCreatedBy().getFullName() 
                        : null)
                .submittedAt(submission.getSubmittedAt())
                .score(submission.getScore())
                .totalMarks(submission.getTotalMarks() != null ? submission.getTotalMarks().doubleValue() : null)
                .percentage(submission.getPercentage())
                .passed(submission.getPassed())
                .graded(submission.getGraded())
                .pendingAnswersCount((int) pendingCount)
                .build();
    }

    private AssessmentSubmissionDto convertSubmissionToDto(AssessmentSubmission submission) {
        List<AssessmentAnswerDto> answerDtos = answerRepository.findBySubmissionId(submission.getId())
                .stream()
                .map(this::convertAnswerToDto)
                .collect(Collectors.toList());
        
        return AssessmentSubmissionDto.builder()
                .id(submission.getId())
                .assessmentId(submission.getAssessment().getId())
                .assessmentTitle(submission.getAssessment().getTitle())
                .studentId(submission.getStudent().getId())
                .studentName(submission.getStudent().getUser().getFullName())
                .lessonTopicId(submission.getAssessment().getLessonTopic() != null 
                        ? submission.getAssessment().getLessonTopic().getId() 
                        : null)
                .submittedAt(submission.getSubmittedAt())
                .score(submission.getScore())
                .totalMarks(submission.getTotalMarks())
                .percentage(submission.getPercentage())
                .passed(submission.getPassed())
                .graded(submission.getGraded())
                .gradedAt(submission.getGradedAt())
                .answers(answerDtos)
                .build();
    }

    private AssessmentAnswerDto convertAnswerToDto(AssessmentAnswer answer) {
        return AssessmentAnswerDto.builder()
                .id(answer.getId())
                .questionId(answer.getQuestion().getId())
                .questionText(answer.getQuestion().getQuestionText())
                .questionType(answer.getQuestion().getQuestionType())
                .studentAnswer(answer.getStudentAnswer())
                .correctAnswer(answer.getQuestion().getCorrectAnswer())
                .isCorrect(answer.getIsCorrect())
                .marksObtained(answer.getMarksObtained())
                .maxMarks(answer.getQuestion().getMarks())
                .teacherFeedback(answer.getTeacherFeedback())
                .build();
    }
}