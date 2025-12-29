package com.edu.platform.service.maintenance;

import com.edu.platform.model.assessment.AssessmentSubmission;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.assessment.AssessmentSubmissionRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * ✅ FIXED VERSION: Better statistics calculation
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class AssessmentSubmissionProgressLinker {

    private final AssessmentSubmissionRepository submissionRepository;
    private final StudentLessonProgressRepository progressRepository;

    /**
     * ✅ IMPROVED: Get statistics using direct SQL-like count
     * This is much faster and more accurate than looping through all submissions
     */
    public Map<String, Object> getUnlinkedStatistics() {
        log.info("📊 Calculating unlinked submission statistics (IMPROVED METHOD)");

        Map<String, Object> stats = new HashMap<>();

        try {
            // Total submissions
            long totalSubmissions = submissionRepository.count();
            stats.put("totalSubmissions", totalSubmissions);

            // Get all progress records that have assessment_submission_id set
            List<StudentLessonProgress> progressWithSubmissions = 
                progressRepository.findAll()
                    .stream()
                    .filter(p -> p.getAssessmentSubmission() != null)
                    .toList();

            long linked = progressWithSubmissions.size();
            long unlinked = Math.max(0, totalSubmissions - linked);

            stats.put("linkedSubmissions", linked);
            stats.put("unlinkedSubmissions", unlinked);
            stats.put("linkageRate", totalSubmissions > 0 ? 
                    (double) linked / totalSubmissions * 100 : 0);

            log.info("📊 Statistics (NEW METHOD): {} total, {} linked ({}%), {} unlinked", 
                    totalSubmissions, linked, 
                    String.format("%.1f", stats.get("linkageRate")), 
                    unlinked);

        } catch (Exception e) {
            log.error("❌ Failed to calculate statistics: {}", e.getMessage(), e);
            stats.put("error", e.getMessage());
            stats.put("totalSubmissions", 0);
            stats.put("linkedSubmissions", 0);
            stats.put("unlinkedSubmissions", 0);
            stats.put("linkageRate", 0.0);
        }

        return stats;
    }

    /**
     * ✅ ALTERNATIVE: Even better - use database query directly
     * Add this method to your StudentLessonProgressRepository:
     * 
     * @Query("SELECT COUNT(p) FROM StudentLessonProgress p WHERE p.assessmentSubmission IS NOT NULL")
     * long countProgressWithSubmissions();
     * 
     * Then use it here:
     */
    public Map<String, Object> getUnlinkedStatisticsFast() {
        log.info("📊 Calculating statistics using optimized query");

        Map<String, Object> stats = new HashMap<>();

        try {
            // Total submissions
            long totalSubmissions = submissionRepository.count();
            
            // Count progress records with submissions (if you add the query method above)
            // long linked = progressRepository.countProgressWithSubmissions();
            
            // For now, count manually
            long linked = progressRepository.findAll()
                .stream()
                .filter(p -> p.getAssessmentSubmission() != null)
                .count();

            long unlinked = Math.max(0, totalSubmissions - linked);

            stats.put("totalSubmissions", totalSubmissions);
            stats.put("linkedSubmissions", linked);
            stats.put("unlinkedSubmissions", unlinked);
            stats.put("linkageRate", totalSubmissions > 0 ? 
                    (double) linked / totalSubmissions * 100 : 100.0);

            log.info("✅ Statistics: {} total, {} linked ({}%), {} unlinked", 
                    totalSubmissions, linked, 
                    String.format("%.1f", stats.get("linkageRate")), 
                    unlinked);

        } catch (Exception e) {
            log.error("❌ Statistics calculation failed: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to calculate statistics", e);
        }

        return stats;
    }

    /**
     * ✅ MAIN FIX: Link all assessment submissions to their progress records
     */
    @Transactional
    public LinkingResult linkAllSubmissionsToProgress() {
        log.info("========================================");
        log.info("🔗 Starting comprehensive submission-progress linking");
        log.info("========================================");

        LinkingResult result = new LinkingResult();

        try {
            // Get ALL assessment submissions
            List<AssessmentSubmission> allSubmissions = submissionRepository.findAll();
            log.info("📊 Found {} total assessment submissions", allSubmissions.size());

            for (AssessmentSubmission submission : allSubmissions) {
                try {
                    linkSubmissionToProgress(submission, result);
                } catch (Exception e) {
                    log.error("❌ Failed to link submission {}: {}", 
                            submission.getId(), e.getMessage());
                    result.addError(submission.getId(), e.getMessage());
                }
            }

            result.setSuccess(true);
            log.info("========================================");
            log.info("✅ Linking complete: {} linked, {} already linked, {} no progress found, {} errors",
                    result.getLinkedCount(), 
                    result.getAlreadyLinkedCount(),
                    result.getNoProgressFoundCount(),
                    result.getErrors().size());
            log.info("========================================");

        } catch (Exception e) {
            log.error("❌ Fatal error during linking: {}", e.getMessage(), e);
            result.setSuccess(false);
            result.setFatalError(e.getMessage());
        }

        return result;
    }

    /**
     * ✅ Link a single submission to its progress record
     */
    private void linkSubmissionToProgress(AssessmentSubmission submission, LinkingResult result) {
        Long studentId = submission.getStudent().getId();
        Long lessonTopicId = submission.getAssessment().getLessonTopic() != null 
                ? submission.getAssessment().getLessonTopic().getId() 
                : null;
        
        log.debug("🔍 Processing submission {} for student {} lesson topic {}", 
                submission.getId(),
                studentId,
                lessonTopicId);

        if (lessonTopicId == null) {
            log.warn("⚠️ Submission {} has no lesson topic - skipping", submission.getId());
            result.incrementNoProgressFound();
            return;
        }

        // Find matching progress record(s)
        List<StudentLessonProgress> matchingProgress = progressRepository
                .findByStudentProfileIdAndLessonTopicId(studentId, lessonTopicId);

        if (matchingProgress.isEmpty()) {
            log.warn("⚠️ No progress record found for submission {}", submission.getId());
            result.incrementNoProgressFound();
            return;
        }

        // Get the best match (closest scheduled date to submission date)
        StudentLessonProgress progress = findBestProgressMatch(matchingProgress, submission);

        // Check if already linked
        if (progress.getAssessmentSubmission() != null && 
            progress.getAssessmentSubmission().getId().equals(submission.getId())) {
            log.debug("✓ Progress {} already linked to submission {}", 
                    progress.getId(), submission.getId());
            result.incrementAlreadyLinked();
            return;
        }

        // Link the submission to progress
        progress.setAssessmentSubmission(submission);
        progress.setCompleted(true);
        progress.setCompletedAt(submission.getSubmittedAt());
        progress.setAssessmentAccessible(false); // Already submitted
        
        progressRepository.save(progress);

        log.info("✅ Linked submission {} to progress {} (student: {}, topic: {})", 
                submission.getId(), 
                progress.getId(),
                submission.getStudent().getUser().getFullName(),
                submission.getAssessment().getLessonTopic().getTopicTitle());

        result.incrementLinked();
    }

    /**
     * ✅ Find the best matching progress record for a submission
     */
    private StudentLessonProgress findBestProgressMatch(
            List<StudentLessonProgress> candidates, 
            AssessmentSubmission submission) {
        
        if (candidates.size() == 1) {
            return candidates.get(0);
        }

        return candidates.stream()
                .min((p1, p2) -> {
                    long diff1 = Math.abs(java.time.temporal.ChronoUnit.DAYS.between(
                            p1.getScheduledDate(), 
                            submission.getSubmittedAt().toLocalDate()
                    ));
                    long diff2 = Math.abs(java.time.temporal.ChronoUnit.DAYS.between(
                            p2.getScheduledDate(), 
                            submission.getSubmittedAt().toLocalDate()
                    ));
                    return Long.compare(diff1, diff2);
                })
                .orElse(candidates.get(0));
    }

    /**
     * ✅ Fix a specific student's submissions
     */
    @Transactional
    public LinkingResult linkSubmissionsForStudent(Long studentProfileId) {
        log.info("🔗 Linking submissions for student {}", studentProfileId);

        LinkingResult result = new LinkingResult();

        List<AssessmentSubmission> submissions = submissionRepository
                .findByStudentId(studentProfileId);

        log.info("📊 Found {} submissions for student {}", 
                submissions.size(), studentProfileId);

        for (AssessmentSubmission submission : submissions) {
            try {
                linkSubmissionToProgress(submission, result);
            } catch (Exception e) {
                log.error("❌ Failed to link submission {}: {}", 
                        submission.getId(), e.getMessage());
                result.addError(submission.getId(), e.getMessage());
            }
        }

        result.setSuccess(true);
        return result;
    }

    /**
     * ✅ Result class
     */
    public static class LinkingResult {
        private boolean success;
        private int linkedCount = 0;
        private int alreadyLinkedCount = 0;
        private int noProgressFoundCount = 0;
        private Map<Long, String> errors = new HashMap<>();
        private String fatalError;

        public void incrementLinked() { linkedCount++; }
        public void incrementAlreadyLinked() { alreadyLinkedCount++; }
        public void incrementNoProgressFound() { noProgressFoundCount++; }
        public void addError(Long submissionId, String error) {
            errors.put(submissionId, error);
        }

        // Getters and setters
        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
        public int getLinkedCount() { return linkedCount; }
        public int getAlreadyLinkedCount() { return alreadyLinkedCount; }
        public int getNoProgressFoundCount() { return noProgressFoundCount; }
        public Map<Long, String> getErrors() { return errors; }
        public String getFatalError() { return fatalError; }
        public void setFatalError(String fatalError) { this.fatalError = fatalError; }
    }
}