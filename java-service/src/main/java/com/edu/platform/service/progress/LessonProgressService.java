package com.edu.platform.service.progress;

import com.edu.platform.dto.progress.ProgressUpdateRequest;
import com.edu.platform.event.NotificationEventPublisher;
import com.edu.platform.model.LessonTopic;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.User;
import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.model.enums.NotificationPriority;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.LessonTopicRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import com.edu.platform.service.individual.AssessmentWindowCalculator;
import com.edu.platform.service.individual.AssessmentWindowCalculator.AssessmentWindow;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.math.BigDecimal;

/**
 * ✅ UPDATED SPRINT 5: Service for managing lesson progress completion
 * Now includes assessment window validation and completion logic
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LessonProgressService {

    private final StudentLessonProgressRepository progressRepository;
    private final LessonTopicRepository lessonTopicRepository;
    private final AssessmentWindowCalculator windowCalculator;
    private final NotificationEventPublisher eventPublisher;

    /**
     * Mark a specific lesson period as complete for a student
     */
    @Transactional
    @CacheEvict(value = {"dailySchedules", "studentDailyProgress"}, allEntries = true)
    public StudentLessonProgress markPeriodComplete(
            ProgressUpdateRequest request,
            StudentProfile student) {

        log.info("✅ Marking lesson complete - Student: {}, Lesson: {}, Date: {}, Period: {}",
                student.getId(), request.getLessonId(), request.getScheduledDate(), request.getPeriodNumber());

        // Parse date
        LocalDate date = LocalDate.parse(request.getScheduledDate());

        // Get lesson topic
        LessonTopic lessonTopic = lessonTopicRepository.findById(request.getLessonId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Lesson topic not found: " + request.getLessonId()));

        // Find existing progress record
        StudentLessonProgress progress = progressRepository
                .findByStudentProfileAndLessonTopicAndScheduledDateAndPeriodNumber(
                        student, lessonTopic, date, request.getPeriodNumber())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Progress record not found for student " + student.getId() +
                        ", lesson " + request.getLessonId() +
                        ", date " + date +
                        ", period " + request.getPeriodNumber()));

        // Mark as complete
        if (!progress.isCompleted()) {
            progress.setCompleted(true);
            progress.setCompletedAt(LocalDateTime.now());
            progress.setCompletionTime(LocalDateTime.now()); // Also set completionTime for compatibility
            progress = progressRepository.save(progress);
            
            // ✅ NEW: Update linked progress completion stats
            updateLinkedProgressCompletion(progress);
            
            log.info("🎉 Lesson marked complete: Progress ID {}", progress.getId());
        } else {
            log.info("ℹ️ Lesson already completed: Progress ID {}", progress.getId());
        }

        return progress;
    }

    /**
     * Unmark a lesson as complete
     */
    @Transactional
    @CacheEvict(value = {"dailySchedules", "studentDailyProgress"}, allEntries = true)
    public StudentLessonProgress unmarkComplete(Long progressId) {
        StudentLessonProgress progress = progressRepository.findById(progressId)
                .orElseThrow(() -> new EntityNotFoundException("Progress record not found"));

        progress.setCompleted(false);
        progress.setCompletedAt(null);
        progress.setCompletionTime(null);
        progress = progressRepository.save(progress);
        
        // ✅ NEW: Update linked progress completion stats
        updateLinkedProgressCompletion(progress);

        return progress;
    }

    /**
     * Get progress statistics for a student
     */
    @Transactional(readOnly = true)
    public ProgressStatistics getStudentStatistics(StudentProfile student) {
        long totalLessons = progressRepository.countByStudentProfile(student);
        long completedLessons = progressRepository.countByStudentProfileAndCompletedTrue(student);
        
        double completionRate = totalLessons > 0 
                ? (double) completedLessons / totalLessons * 100 
                : 0.0;

        return new ProgressStatistics(totalLessons, completedLessons, completionRate);
    }
    
    /**
     * ✅ FIXED: Auto-complete with custom assessment notification
     * Now correctly identifies the CURRENT ACCESSIBLE period only
     * 
     * KEY CHANGE: Added .filter(p -> p.isAssessmentAccessible()) to ensure
     * we only complete the period that's actually accessible right now
     */
    @Transactional
    @CacheEvict(value = {"dailySchedules", "studentDailyProgress"}, allEntries = true)
    public void autoCompleteOnAssessmentSubmission(
            StudentProfile student,
            LessonTopic lessonTopic,
            Long submissionId,
            LocalDate date,
            LocalDateTime submissionTime) {

        log.info("🎯 Auto-completing lesson progress - Student: {}, Lesson: {}, Date: {}, SubmissionID: {}, Time: {}",
                student.getId(), lessonTopic.getId(), date, submissionId, submissionTime);

        // Find today's progress records for this lesson
        List<StudentLessonProgress> progressList = progressRepository
                .findByStudentProfileAndLessonTopicAndScheduledDate(
                        student, lessonTopic, date);

        if (progressList.isEmpty()) {
            log.warn("⚠️ No progress record found for auto-completion");
            return;
        }

        // ✅ CRITICAL FIX: Find the CURRENTLY ACCESSIBLE period
        StudentLessonProgress currentProgress = progressList.stream()
                .filter(p -> !p.isCompleted())
                .filter(p -> p.isAssessmentAccessible())
                .findFirst()
                .orElse(null);

        if (currentProgress == null) {
            log.error("❌ No accessible, uncompleted progress record found!");
            log.error("   Progress records available: {}", 
                    progressList.stream()
                            .map(p -> String.format("Period %d: completed=%s, accessible=%s", 
                                    p.getPeriodSequence(), p.isCompleted(), p.isAssessmentAccessible()))
                            .collect(Collectors.joining(", ")));
            return;
        }

        log.info("✓ Found accessible period {} (ID: {})", 
                currentProgress.getPeriodSequence(), currentProgress.getId());

        // Validate submission time
        if (currentProgress.getAssessmentWindowEnd() != null) {
            LocalDateTime graceDeadline = currentProgress.getAssessmentWindowEnd().plusMinutes(5);
            
            if (submissionTime.isAfter(graceDeadline)) {
                log.error("❌ Submission rejected - past grace deadline ({})", graceDeadline);
                throw new IllegalStateException("Assessment window has closed");
            }
            
            if (submissionTime.isAfter(currentProgress.getAssessmentWindowEnd())) {
                log.warn("⚠️ Late submission accepted (within grace period)");
            }
        }

        // Mark ONLY this period as complete
        currentProgress.setCompleted(true);
        currentProgress.setCompletedAt(submissionTime);
        currentProgress.setCompletionTime(submissionTime);
        currentProgress.setAssessmentSubmissionId(submissionId);
        
        // ✅ FIXED: Make final reference for lambda
        final StudentLessonProgress savedProgress = progressRepository.save(currentProgress);
        
        log.info("✅ Marked ONLY period {} as complete (ID: {}, submission: {})", 
                savedProgress.getPeriodSequence(), savedProgress.getId(), submissionId);
        
        // Log other periods for verification (use final variable)
        progressList.forEach(p -> {
            if (p.getId().equals(savedProgress.getId())) {
                log.debug("   ✓ Period {} - COMPLETED (this submission)", p.getPeriodSequence());
            } else {
                log.debug("   ○ Period {} - {} (ID: {})", 
                        p.getPeriodSequence(),
                        p.isCompleted() ? "already completed" : "pending",
                        p.getId());
            }
        });
        
        // Update linked progress
        updateLinkedProgressCompletion(savedProgress);
        
        // Check if custom assessment needed
        checkAndNotifyCustomAssessmentNeeded(savedProgress, student);
    }



	/**
	 * ✅ NEW: Check if next period needs custom assessment and notify teacher
	 * Called after student completes any period
	 */
	private void checkAndNotifyCustomAssessmentNeeded(
	        StudentLessonProgress completedProgress,
	        StudentProfile student) {
	    
	    try {
	        // Check if this was a multi-period lesson
	        if (completedProgress.getTotalPeriodsInSequence() == null 
	                || completedProgress.getTotalPeriodsInSequence() <= 1) {
	            log.debug("Single-period lesson - no custom assessment needed");
	            return;
	        }
	        
	        // Check if there's a next period
	        Integer currentPeriodSeq = completedProgress.getPeriodSequence();
	        if (currentPeriodSeq == null 
	                || currentPeriodSeq >= completedProgress.getTotalPeriodsInSequence()) {
	            log.debug("This was the last period - no custom assessment needed");
	            return;
	        }
	        
	        // Find the next period's progress record
	        Integer nextPeriodSeq = currentPeriodSeq + 1;
	        List<StudentLessonProgress> allPeriods = progressRepository
	                .findByStudentProfileIdAndLessonTopicId(
	                        student.getId(),
	                        completedProgress.getTopicId()
	                );
	        
	        Optional<StudentLessonProgress> nextPeriodOpt = allPeriods.stream()
	                .filter(p -> nextPeriodSeq.equals(p.getPeriodSequence()))
	                .findFirst();
	        
	        if (nextPeriodOpt.isEmpty()) {
	            log.warn("⚠️ Next period record not found for student {}, topic {}", 
	                    student.getId(), completedProgress.getTopicId());
	            return;
	        }
	        
	        StudentLessonProgress nextPeriod = nextPeriodOpt.get();
	        
	        // Check if next period requires custom assessment
	        if (Boolean.TRUE.equals(nextPeriod.getRequiresCustomAssessment())) {
	            log.info("📢 Period {} complete - Period {} needs custom assessment", 
	                    currentPeriodSeq, nextPeriodSeq);
	            
	            // Get the assessment that was just completed (for context)
	            Assessment completedAssessment = completedProgress.getAssessment();
	            if (completedAssessment == null || completedAssessment.getCreatedBy() == null) {
	                log.warn("⚠️ Cannot notify teacher - no assessment or creator found");
	                return;
	            }
	            
	            User teacher = completedAssessment.getCreatedBy();
	            
	            // ✅ Publish notification event to teacher
	            publishCustomAssessmentNeededNotification(
	                    teacher,
	                    student,
	                    nextPeriod,
	                    completedProgress
	            );
	        }
	        
	    } catch (Exception e) {
	        // Don't fail progress completion if notification fails
	        log.error("❌ Error checking custom assessment notification: {}", e.getMessage(), e);
	    }
	}
	
	/**
	 * ✅ NEW: Publish notification to teacher that custom assessment is needed
	 */
	private void publishCustomAssessmentNeededNotification(
	        User teacher,
	        StudentProfile student,
	        StudentLessonProgress nextPeriod,
	        StudentLessonProgress completedPeriod) {
	    
	    try {
	        String studentName = student.getUser().getFullName();
	        String subjectName = nextPeriod.getSubject() != null 
	                ? nextPeriod.getSubject().getName() 
	                : "Unknown Subject";
	        String topicName = nextPeriod.getTopic() != null 
	                ? nextPeriod.getTopic().getTitle() 
	                : "Unknown Topic";
	        
	        String message = String.format(
	                "%s has completed Period %d of '%s' (%s). " +
	                "Please create a custom assessment for Period %d based on their performance.",
	                studentName,
	                completedPeriod.getPeriodSequence(),
	                topicName,
	                subjectName,
	                nextPeriod.getPeriodSequence()
	        );
	        
	        // Create notification data
	        Map<String, Object> data = new HashMap<>();
	        data.put("studentId", student.getId());
	        data.put("studentName", studentName);
	        data.put("subjectId", nextPeriod.getSubjectId());
	        data.put("subjectName", subjectName);
	        data.put("topicId", nextPeriod.getTopicId());
	        data.put("topicName", topicName);
	        data.put("periodNumber", nextPeriod.getPeriodSequence());
	        data.put("previousPeriodProgressId", completedPeriod.getId());
	        data.put("nextPeriodProgressId", nextPeriod.getId());
	        data.put("completedPeriodNumber", completedPeriod.getPeriodSequence());
	        data.put("submissionId", completedPeriod.getAssessmentSubmissionId());
	        data.put("actionUrl", String.format(
	                "/teacher/assessments/create-custom?studentId=%d&subjectId=%d&periodNumber=%d&previousProgressId=%d",
	                student.getId(),
	                nextPeriod.getSubjectId(),
	                nextPeriod.getPeriodSequence(),
	                completedPeriod.getId()
	        ));
	        
	        // Publish notification event
	        eventPublisher.publishCustomNotification(
	                teacher.getId(),
	                "CUSTOM_ASSESSMENT_NEEDED",
	                "Custom Assessment Required",
	                message,
	                NotificationPriority.HIGH,
	                data
	        );
	        
	        log.info("✅ Published custom assessment needed notification to teacher {} for student {}", 
	                teacher.getId(), student.getId());
	        
	    } catch (Exception e) {
	        log.error("❌ Failed to publish custom assessment notification: {}", e.getMessage(), e);
	    }
	}
	
	/**
	 * ✅ NEW: Get progress records waiting for custom assessment
	 * Used by teacher dashboard to show pending custom assessments
	 */
	@Transactional(readOnly = true)
	public List<StudentLessonProgress> getProgressWaitingForCustomAssessment(Long teacherId) {
	    log.info("📋 Getting progress records waiting for custom assessment (teacher: {})", teacherId);
	    
	    // Get all progress records that need custom assessment
	    List<StudentLessonProgress> waitingProgress = progressRepository.findAll().stream()
	            .filter(p -> Boolean.TRUE.equals(p.getRequiresCustomAssessment()))
	            .filter(p -> p.getAssessment() == null) // Not yet created
	            .filter(p -> p.isPreviousPeriodCompleted()) // Previous period is done
	            .collect(Collectors.toList());
	    
	    // Filter by teacher's subjects (if teacherId provided)
	    if (teacherId != null) {
	        // TODO: Get teacher's subject IDs and filter
	        // For now, return all
	    }
	    
	    log.info("✅ Found {} progress records waiting for custom assessment", waitingProgress.size());
	    return waitingProgress;
	}
	
	/**
	 * ✅ NEW: Count progress records waiting for custom assessment
	 * Used for dashboard badges
	 */
	@Transactional(readOnly = true)
	public long countProgressWaitingForCustomAssessment(Long teacherId) {
	    return getProgressWaitingForCustomAssessment(teacherId).size();
	}



	/**
	 * ✅ FIXED: Update linked progress records when one period completes
	 * Now uses correct method name from StudentLessonProgress
	 */
	private void updateLinkedProgressCompletion(StudentLessonProgress changedProgress) {
	    // Get linked progress IDs
	    List<Long> linkedProgressIds = changedProgress.getLinkedProgressIds();
	    
	    if (linkedProgressIds == null || linkedProgressIds.isEmpty()) {
	        log.debug("No linked progress for progress {}", changedProgress.getId());
	        return;
	    }
	
	    // Get all linked progress (including current)
	    List<StudentLessonProgress> allLinked = progressRepository.findAllById(linkedProgressIds);
	    allLinked.add(changedProgress);
	
	    // Calculate stats
	    long total = allLinked.size();
	    long completed = allLinked.stream().filter(StudentLessonProgress::isCompleted).count();
	    boolean allComplete = (completed == total);
	    
	    // Calculate average score
	    BigDecimal avgScore = null;
	    if (completed > 0) {
	        double avg = allLinked.stream()
	                .filter(StudentLessonProgress::isCompleted)
	                .filter(p -> p.getAssessmentScore() != null)
	                .mapToDouble(p -> p.getAssessmentScore().doubleValue())
	                .average()
	                .orElse(0.0);
	        avgScore = BigDecimal.valueOf(avg);
	    }
	
	    log.debug("📊 Linked progress stats: {} of {} complete, avg score: {}", 
	            completed, total, avgScore);
	
	    // Update all linked records
	    for (StudentLessonProgress progress : allLinked) {
	        progress.setAllPeriodsCompleted(allComplete);
	        if (avgScore != null) {
	            progress.setTopicAverageScore(avgScore);
	        }
	        progressRepository.save(progress);
	    }
	
	    log.debug("✅ Updated {} linked progress records", allLinked.size());
	}

    /**
     * ✅ NEW: Check if assessment is accessible now
     */
    @Transactional(readOnly = true)
    public boolean isAssessmentAccessible(Long progressId) {
        return progressRepository.findById(progressId)
                .map(progress -> {
                    if (!progress.isAssessmentAccessible()) {
                        return false;
                    }
                    
                    LocalDateTime now = LocalDateTime.now();
                    return !now.isBefore(progress.getAssessmentWindowStart()) &&
                           !now.isAfter(progress.getAssessmentWindowEnd());
                })
                .orElse(false);
    }

    /**
     * ✅ NEW: Get assessment window for progress record
     */
    @Transactional(readOnly = true)
    public AssessmentWindow getAssessmentWindow(Long progressId) {
        return progressRepository.findById(progressId)
                .map(progress -> new AssessmentWindow(
                        progress.getAssessmentWindowStart(),
                        progress.getAssessmentWindowEnd(),
                        progress.getAssessmentWindowEnd().plusMinutes(5) // grace
                ))
                .orElseThrow(() -> new EntityNotFoundException("Progress not found"));
    }

    public record ProgressStatistics(
            long totalLessons,
            long completedLessons,
            double completionRate
    ) {}
}