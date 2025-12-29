package com.edu.platform.service.individual;

import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service to track and manage pending custom assessment creation.
 * Identifies periods where:
 * - Student completed previous period
 * - Custom assessment needs to be created by teacher
 * - Assessment creation is not blocked by dependencies
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class PendingAssessmentTracker {

    private final StudentLessonProgressRepository progressRepository;
    private final PeriodDependencyService dependencyService;

    /**
     * DTO for pending assessment information
     */
    public static class PendingAssessmentInfo {
        private final Long progressId;
        private final Long studentId;
        private final String studentName;
        private final Long subjectId;
        private final String subjectName;
        private final Long topicId;
        private final String topicName;
        private final Integer periodNumber;
        private final LocalDate scheduledDate;
        private final Long previousPeriodProgressId;
        private final Long previousSubmissionId;
        private final Double previousScore;
        private final LocalDateTime previousCompletedAt;
        private final boolean canCreateNow;
        private final String blockingReason;

        public PendingAssessmentInfo(StudentLessonProgress progress, 
                                    StudentLessonProgress previousPeriod,
                                    boolean canCreateNow,
                                    String blockingReason) {
            this.progressId = progress.getId();
            this.studentId = progress.getStudentProfile().getId();
            this.studentName = progress.getStudentProfile().getUser().getFullName();
            this.subjectId = progress.getSubjectId();
            this.subjectName = progress.getSubject() != null ? progress.getSubject().getName() : null;
            this.topicId = progress.getTopicId();
            this.topicName = progress.getTopic() != null ? progress.getTopic().getTitle() : null;
            this.periodNumber = progress.getPeriodSequence();
            this.scheduledDate = progress.getScheduledDate();
            this.previousPeriodProgressId = previousPeriod != null ? previousPeriod.getId() : null;
            this.previousSubmissionId = previousPeriod != null ? previousPeriod.getAssessmentSubmissionId() : null;
            this.previousScore = previousPeriod != null ? previousPeriod.getAssessmentScoreAsDouble() : null;
            this.previousCompletedAt = previousPeriod != null ? previousPeriod.getCompletedAt() : null;
            this.canCreateNow = canCreateNow;
            this.blockingReason = blockingReason;
        }

        // Getters
        public Long getProgressId() { return progressId; }
        public Long getStudentId() { return studentId; }
        public String getStudentName() { return studentName; }
        public Long getSubjectId() { return subjectId; }
        public String getSubjectName() { return subjectName; }
        public Long getTopicId() { return topicId; }
        public String getTopicName() { return topicName; }
        public Integer getPeriodNumber() { return periodNumber; }
        public LocalDate getScheduledDate() { return scheduledDate; }
        public Long getPreviousPeriodProgressId() { return previousPeriodProgressId; }
        public Long getPreviousSubmissionId() { return previousSubmissionId; }
        public Double getPreviousScore() { return previousScore; }
        public LocalDateTime getPreviousCompletedAt() { return previousCompletedAt; }
        public boolean canCreateNow() { return canCreateNow; }
        public String getBlockingReason() { return blockingReason; }
    }

    /**
     * Get all pending custom assessments across the system
     * @return List of pending assessments ready for creation
     */
    public List<PendingAssessmentInfo> getAllPendingAssessments() {
        log.debug("Finding all pending custom assessments");
        
        // Find all progress records needing custom assessment
        List<StudentLessonProgress> needingAssessment = progressRepository.findAll().stream()
                .filter(p -> Boolean.TRUE.equals(p.getRequiresCustomAssessment()))
                .filter(p -> p.getAssessment() == null)
                .filter(p -> p.getPreviousPeriodProgress() == null || p.getPreviousPeriodProgress().isCompleted())
                .toList();

        return buildPendingAssessmentList(needingAssessment);
    }

    /**
     * Get pending custom assessments for specific teacher's subjects
     * @param subjectIds List of subject IDs taught by the teacher
     * @return List of pending assessments for those subjects
     */
    public List<PendingAssessmentInfo> getPendingAssessmentsBySubjects(List<Long> subjectIds) {
        log.debug("Finding pending assessments for {} subjects", subjectIds.size());
        
        if (subjectIds == null || subjectIds.isEmpty()) {
            return new ArrayList<>();
        }

        List<StudentLessonProgress> needingAssessment = progressRepository.findAll().stream()
                .filter(p -> Boolean.TRUE.equals(p.getRequiresCustomAssessment()))
                .filter(p -> p.getAssessment() == null)
                .filter(p -> p.getSubjectId() != null && subjectIds.contains(p.getSubjectId()))
                .filter(p -> p.getPreviousPeriodProgress() == null || p.getPreviousPeriodProgress().isCompleted())
                .toList();

        return buildPendingAssessmentList(needingAssessment);
    }

    /**
     * Get pending custom assessments for a specific student
     * @param studentId Student profile ID
     * @return List of pending assessments for this student
     */
    public List<PendingAssessmentInfo> getPendingAssessmentsForStudent(Long studentId) {
        log.debug("Finding pending assessments for student {}", studentId);
        
        List<StudentLessonProgress> needingAssessment = progressRepository.findByStudentProfileId(studentId).stream()
                .filter(p -> Boolean.TRUE.equals(p.getRequiresCustomAssessment()))
                .filter(p -> p.getAssessment() == null)
                .filter(p -> p.getPreviousPeriodProgress() == null || p.getPreviousPeriodProgress().isCompleted())
                .toList();

        return buildPendingAssessmentList(needingAssessment);
    }

    /**
     * Count pending custom assessments for a teacher
     * @param subjectIds List of subject IDs taught by the teacher
     * @return Count of pending assessments
     */
    public long countPendingAssessments(List<Long> subjectIds) {
        if (subjectIds == null || subjectIds.isEmpty()) {
            return 0;
        }

        return progressRepository.findAll().stream()
                .filter(p -> Boolean.TRUE.equals(p.getRequiresCustomAssessment()))
                .filter(p -> p.getAssessment() == null)
                .filter(p -> p.getSubjectId() != null && subjectIds.contains(p.getSubjectId()))
                .filter(p -> p.getPreviousPeriodProgress() == null || p.getPreviousPeriodProgress().isCompleted())
                .count();
    }

    /**
     * Count pending custom assessments for a student
     * @param studentId Student profile ID
     * @return Count of pending assessments
     */
    public long countPendingAssessmentsForStudent(Long studentId) {
        return progressRepository.findByStudentProfileId(studentId).stream()
                .filter(p -> Boolean.TRUE.equals(p.getRequiresCustomAssessment()))
                .filter(p -> p.getAssessment() == null)
                .filter(p -> p.getPreviousPeriodProgress() == null || p.getPreviousPeriodProgress().isCompleted())
                .count();
    }

    /**
     * Get recently completed Period 1 records that need Period 2 assessment
     * @param since Only include Period 1 completions since this time
     * @return List of Period 1 completions needing Period 2 assessment
     */
    public List<PendingAssessmentInfo> getRecentlyCompletedPeriod1(LocalDateTime since) {
        log.debug("Finding Period 1 completions since {}", since);
        
        List<StudentLessonProgress> completedPeriod1 = progressRepository.findAll().stream()
                .filter(StudentLessonProgress::isCompleted)
                .filter(StudentLessonProgress::isFirstPeriod)
                .filter(p -> p.getCompletedAt() != null && p.getCompletedAt().isAfter(since))
                .filter(p -> p.getTotalPeriodsInSequence() != null && p.getTotalPeriodsInSequence() > 1)
                .toList();

        // Find their corresponding Period 2 records
        List<PendingAssessmentInfo> result = new ArrayList<>();
        for (StudentLessonProgress period1 : completedPeriod1) {
            // Find Period 2 progress with same student, subject, topic
            progressRepository.findAll().stream()
                    .filter(p -> p.getStudentProfile().getId().equals(period1.getStudentProfile().getId()))
                    .filter(p -> p.getSubjectId() != null && p.getSubjectId().equals(period1.getSubjectId()))
                    .filter(p -> p.getTopicId() != null && p.getTopicId().equals(period1.getTopicId()))
                    .filter(p -> p.getPeriodSequence() != null && p.getPeriodSequence() == 2)
                    .filter(p -> p.needsTeacherAssessment())
                    .findFirst()
                    .ifPresent(period2 -> result.add(createPendingInfo(period2, period1)));
        }

        return result;
    }

    /**
     * Get pending assessments organized by student
     * @param subjectIds Teacher's subject IDs
     * @return Map of student ID to list of pending assessments
     */
    public java.util.Map<Long, List<PendingAssessmentInfo>> getPendingAssessmentsByStudent(
            List<Long> subjectIds) {
        
        List<PendingAssessmentInfo> allPending = getPendingAssessmentsBySubjects(subjectIds);
        
        return allPending.stream()
                .collect(Collectors.groupingBy(PendingAssessmentInfo::getStudentId));
    }

    /**
     * Get pending assessments organized by subject
     * @param subjectIds Teacher's subject IDs
     * @return Map of subject ID to list of pending assessments
     */
    public java.util.Map<Long, List<PendingAssessmentInfo>> getPendingAssessmentsBySubject(
            List<Long> subjectIds) {
        
        List<PendingAssessmentInfo> allPending = getPendingAssessmentsBySubjects(subjectIds);
        
        return allPending.stream()
                .collect(Collectors.groupingBy(PendingAssessmentInfo::getSubjectId));
    }

    /**
     * Get pending assessments due soon (scheduled within next N days)
     * @param subjectIds Teacher's subject IDs
     * @param daysAhead Number of days to look ahead
     * @return List of urgent pending assessments
     */
    public List<PendingAssessmentInfo> getUrgentPendingAssessments(List<Long> subjectIds, int daysAhead) {
        LocalDate cutoffDate = LocalDate.now().plusDays(daysAhead);
        
        List<PendingAssessmentInfo> allPending = getPendingAssessmentsBySubjects(subjectIds);
        
        return allPending.stream()
                .filter(info -> info.getScheduledDate() != null 
                        && !info.getScheduledDate().isAfter(cutoffDate))
                .sorted((a, b) -> a.getScheduledDate().compareTo(b.getScheduledDate()))
                .collect(Collectors.toList());
    }

    /**
     * Check if a specific progress record needs custom assessment creation
     * @param progressId Progress record ID
     * @return Pending assessment info or null if doesn't need assessment
     */
    public PendingAssessmentInfo checkIfNeedsCustomAssessment(Long progressId) {
        StudentLessonProgress progress = progressRepository.findById(progressId)
                .orElse(null);

        if (progress == null || !progress.needsTeacherAssessment()) {
            return null;
        }

        StudentLessonProgress previousPeriod = progress.getPreviousPeriodProgress();
        
        // Check if previous period is completed
        if (previousPeriod != null && !previousPeriod.isCompleted()) {
            return createPendingInfo(progress, previousPeriod, false, 
                    "Previous period not completed");
        }

        return createPendingInfo(progress, previousPeriod, true, null);
    }

    // ============================================================
    // PRIVATE HELPER METHODS
    // ============================================================

    /**
     * Build list of pending assessment info from progress records
     */
    private List<PendingAssessmentInfo> buildPendingAssessmentList(
            List<StudentLessonProgress> progressRecords) {
        
        List<PendingAssessmentInfo> result = new ArrayList<>();

        for (StudentLessonProgress progress : progressRecords) {
            StudentLessonProgress previousPeriod = progress.getPreviousPeriodProgress();
            
            // Determine if can create now
            boolean canCreate = true;
            String blockingReason = null;

            if (previousPeriod != null && !previousPeriod.isCompleted()) {
                canCreate = false;
                blockingReason = "Previous period not completed";
            }

            PendingAssessmentInfo info = createPendingInfo(
                    progress, previousPeriod, canCreate, blockingReason);
            
            result.add(info);
        }

        // Sort by scheduled date (most urgent first)
        result.sort((a, b) -> {
            if (a.getScheduledDate() == null) return 1;
            if (b.getScheduledDate() == null) return -1;
            return a.getScheduledDate().compareTo(b.getScheduledDate());
        });

        return result;
    }

    /**
     * Create PendingAssessmentInfo from progress records
     */
    private PendingAssessmentInfo createPendingInfo(StudentLessonProgress progress,
                                                   StudentLessonProgress previousPeriod) {
        return createPendingInfo(progress, previousPeriod, true, null);
    }

    /**
     * Create PendingAssessmentInfo with custom canCreate flag
     */
    private PendingAssessmentInfo createPendingInfo(StudentLessonProgress progress,
                                                   StudentLessonProgress previousPeriod,
                                                   boolean canCreate,
                                                   String blockingReason) {
        return new PendingAssessmentInfo(progress, previousPeriod, canCreate, blockingReason);
    }
}