package com.edu.platform.service.individual;

import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * ✅ FIXED: Service to manage period dependencies in multi-period lessons.
 * Now respects week boundaries - periods only depend on previous periods in SAME week.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class PeriodDependencyService {

    private final StudentLessonProgressRepository progressRepository;

    /**
     * Result of dependency check
     */
    public static class DependencyCheckResult {
        private final boolean canAccess;
        private final String blockingReason;
        private final Long blockingProgressId;
        private final List<String> requirements;

        public DependencyCheckResult(boolean canAccess, String blockingReason, 
                                   Long blockingProgressId, List<String> requirements) {
            this.canAccess = canAccess;
            this.blockingReason = blockingReason;
            this.blockingProgressId = blockingProgressId;
            this.requirements = requirements;
        }

        public static DependencyCheckResult allowed() {
            return new DependencyCheckResult(true, null, null, new ArrayList<>());
        }

        public static DependencyCheckResult blocked(String reason, Long progressId, List<String> requirements) {
            return new DependencyCheckResult(false, reason, progressId, requirements);
        }

        public boolean canAccess() { return canAccess; }
        public String getBlockingReason() { return blockingReason; }
        public Long getBlockingProgressId() { return blockingProgressId; }
        public List<String> getRequirements() { return requirements; }
    }

    /**
     * Check if a student can access a specific progress record
     * @param progressId Progress record ID
     * @return Dependency check result
     */
    public DependencyCheckResult checkAccess(Long progressId) {
        StudentLessonProgress progress = progressRepository.findById(progressId)
                .orElse(null);

        if (progress == null) {
            return DependencyCheckResult.blocked("Progress record not found", null, List.of());
        }

        return checkAccess(progress);
    }

    /**
     * ✅ FIXED: Check if a student can access a progress record
     * Now respects week boundaries - only checks previous period if in SAME week
     * @param progress Progress record to check
     * @return Dependency check result
     */
    public DependencyCheckResult checkAccess(StudentLessonProgress progress) {
        List<String> requirements = new ArrayList<>();

        // ✅ Check 1: Previous period must be completed (WITHIN SAME WEEK ONLY)
        if (progress.hasPreviousPeriod()) {
            StudentLessonProgress previousPeriod = progress.getPreviousPeriodProgress();
            
            // ✅ NEW: Check if previous period is in the same week
            LocalDate progressWeekStart = progress.getScheduledDate().with(DayOfWeek.MONDAY);
            LocalDate prevWeekStart = previousPeriod.getScheduledDate().with(DayOfWeek.MONDAY);
            
            log.debug("🗓️ Checking dependency: Progress {} (week starting {}), Previous {} (week starting {})",
                    progress.getId(), progressWeekStart, previousPeriod.getId(), prevWeekStart);
            
            // ✅ Only enforce dependency if in SAME week
            if (progressWeekStart.equals(prevWeekStart)) {
                if (!previousPeriod.isCompleted()) {
                    log.debug("🔒 Period {} blocked by incomplete Period {} (same week)",
                            progress.getPeriodSequence(), previousPeriod.getPeriodSequence());
                    
                    requirements.add(String.format("Complete Period %d", 
                            previousPeriod.getPeriodSequence()));
                    
                    return DependencyCheckResult.blocked(
                            "Previous period not completed",
                            previousPeriod.getId(),
                            requirements
                    );
                }
            } else {
                // ✅ Different weeks - ignore dependency
                log.debug("🗓️ Previous period is in different week - ignoring dependency for Period {}",
                        progress.getPeriodSequence());
            }
        }

        // Check 2: If requires custom assessment, it must exist
        if (progress.needsTeacherAssessment()) {
            requirements.add("Teacher must create custom assessment");
            
            return DependencyCheckResult.blocked(
                    "Waiting for teacher to create custom assessment",
                    null,
                    requirements
            );
        }

        // Check 3: Assessment must be assigned
        if (progress.getAssessment() == null) {
            requirements.add("Assessment must be assigned");
            
            return DependencyCheckResult.blocked(
                    "No assessment assigned to this period",
                    null,
                    requirements
            );
        }

        // All checks passed
        return DependencyCheckResult.allowed();
    }

    /**
     * Check if previous period is completed
     * @param progressId Progress record ID
     * @return true if previous period is completed or no previous period exists
     */
    public boolean isPreviousPeriodCompleted(Long progressId) {
        StudentLessonProgress progress = progressRepository.findById(progressId)
                .orElse(null);

        if (progress == null) {
            return false;
        }

        return progress.isPreviousPeriodCompleted();
    }

    /**
     * Get the dependency chain for a progress record
     * Returns list of all previous periods in order
     * @param progressId Progress record ID
     * @return List of progress IDs in dependency order (oldest first)
     */
    public List<Long> getDependencyChain(Long progressId) {
        List<Long> chain = new ArrayList<>();
        StudentLessonProgress current = progressRepository.findById(progressId)
                .orElse(null);

        while (current != null && current.hasPreviousPeriod()) {
            Long previousId = current.getPreviousPeriodProgressId();
            if (previousId != null && !chain.contains(previousId)) {
                chain.add(0, previousId); // Add to front
                current = current.getPreviousPeriodProgress();
            } else {
                break; // Prevent infinite loops
            }
        }

        return chain;
    }

    /**
     * Check if all dependencies in the chain are satisfied
     * @param progressId Progress record ID
     * @return true if all previous periods are completed
     */
    public boolean areAllDependenciesSatisfied(Long progressId) {
        List<Long> chain = getDependencyChain(progressId);

        for (Long dependencyId : chain) {
            StudentLessonProgress dependency = progressRepository.findById(dependencyId)
                    .orElse(null);

            if (dependency == null || !dependency.isCompleted()) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get next accessible period for a student in a topic sequence
     * @param studentId Student profile ID
     * @param subjectId Subject ID
     * @param topicId Lesson topic ID
     * @return Next period that student can access, or null if all done
     */
    public StudentLessonProgress getNextAccessiblePeriod(Long studentId, Long subjectId, Long topicId) {
        List<StudentLessonProgress> allPeriods = progressRepository.findByStudentProfileId(studentId).stream()
                .filter(p -> p.getSubjectId() != null && p.getSubjectId().equals(subjectId))
                .toList();

        // Filter to this specific topic
        List<StudentLessonProgress> topicPeriods = allPeriods.stream()
                .filter(p -> p.getTopicId() != null && p.getTopicId().equals(topicId))
                .sorted((p1, p2) -> {
                    if (p1.getPeriodSequence() != null && p2.getPeriodSequence() != null) {
                        return p1.getPeriodSequence().compareTo(p2.getPeriodSequence());
                    }
                    return p1.getScheduledDate().compareTo(p2.getScheduledDate());
                })
                .toList();

        // Find first period that is not completed and can be accessed
        for (StudentLessonProgress period : topicPeriods) {
            if (!period.isCompleted() && checkAccess(period).canAccess()) {
                return period;
            }
        }

        return null; // All periods completed or none accessible
    }

    /**
     * Get all blocked progress records for a student
     * @param studentId Student profile ID
     * @return List of blocked progress records with reasons
     */
    public List<StudentLessonProgress> getBlockedProgress(Long studentId) {
        return progressRepository.findByStudentProfileId(studentId).stream()
                .filter(p -> !p.isCompleted())
                .filter(p -> {
                    DependencyCheckResult check = checkAccess(p);
                    return !check.canAccess();
                })
                .toList();
    }

    /**
     * Count how many periods are blocked for a student
     * @param studentId Student profile ID
     * @return Count of blocked periods
     */
    public long countBlockedPeriods(Long studentId) {
        return getBlockedProgress(studentId).size();
    }

    /**
     * Validate period dependency setup
     * Checks for circular dependencies or missing links
     * @param progressId Progress record ID
     * @return List of validation errors (empty if valid)
     */
    public List<String> validateDependencySetup(Long progressId) {
        List<String> errors = new ArrayList<>();
        List<Long> visitedIds = new ArrayList<>();
        
        StudentLessonProgress current = progressRepository.findById(progressId)
                .orElse(null);

        if (current == null) {
            errors.add("Progress record not found");
            return errors;
        }

        // Check for circular dependencies
        while (current != null && current.hasPreviousPeriod()) {
            Long currentId = current.getId();
            
            if (visitedIds.contains(currentId)) {
                errors.add("Circular dependency detected at progress ID: " + currentId);
                break;
            }
            
            visitedIds.add(currentId);
            
            Long previousId = current.getPreviousPeriodProgressId();
            if (previousId == null) {
                break;
            }
            
            current = progressRepository.findById(previousId).orElse(null);
            
            if (current == null) {
                errors.add("Broken dependency chain - previous period not found: " + previousId);
                break;
            }
        }

        return errors;
    }

    /**
     * Check if a period sequence is properly configured
     * @param studentId Student profile ID
     * @param subjectId Subject ID
     * @param topicId Topic ID
     * @return true if all periods are properly linked
     */
    public boolean isPeriodSequenceValid(Long studentId, Long subjectId, Long topicId) {
        List<StudentLessonProgress> periods = progressRepository.findByStudentProfileId(studentId).stream()
                .filter(p -> p.getSubjectId() != null && p.getSubjectId().equals(subjectId))
                .filter(p -> p.getTopicId() != null && p.getTopicId().equals(topicId))
                .sorted((p1, p2) -> {
                    if (p1.getPeriodSequence() != null && p2.getPeriodSequence() != null) {
                        return p1.getPeriodSequence().compareTo(p2.getPeriodSequence());
                    }
                    return 0;
                })
                .toList();

        if (periods.size() <= 1) {
            return true; // Single period, no dependencies needed
        }

        // Check that each period (except first) has previous period set
        for (int i = 1; i < periods.size(); i++) {
            StudentLessonProgress current = periods.get(i);
            StudentLessonProgress expectedPrevious = periods.get(i - 1);

            if (!current.hasPreviousPeriod()) {
                log.warn("Period {} missing previous period link", current.getId());
                return false;
            }

            if (!current.getPreviousPeriodProgressId().equals(expectedPrevious.getId())) {
                log.warn("Period {} has incorrect previous period link", current.getId());
                return false;
            }
        }

        return true;
    }
}