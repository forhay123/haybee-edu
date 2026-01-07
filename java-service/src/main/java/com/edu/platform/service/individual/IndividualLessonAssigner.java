package com.edu.platform.service.individual;

import com.edu.platform.model.DailySchedule;
import com.edu.platform.model.LessonTopic;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.model.Term;
import com.edu.platform.model.WeeklySchedule;
import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.model.assessment.AssessmentType;
import com.edu.platform.model.enums.ScheduleStatus;
import com.edu.platform.repository.DailyScheduleRepository;
import com.edu.platform.repository.LessonTopicRepository;
import com.edu.platform.repository.assessment.AssessmentRepository;
import com.edu.platform.service.assessment.AutoAssessmentService;
import com.edu.platform.exception.InsufficientQuestionsException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ✅ COMPLETE FIX: Service for assigning lesson topics AND creating assessments
 * Now creates assessments when topics are assigned
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class IndividualLessonAssigner {

    private final LessonTopicRepository lessonTopicRepository;
    private final DailyScheduleRepository dailyScheduleRepository;
    private final TermWeekCalculator termWeekCalculator;
    private final AutoAssessmentService autoAssessmentService;  // ✅ NEW
    private final AssessmentRepository assessmentRepository;    // ✅ NEW

    /**
     * ✅ COMPLETE FIX: Assign lesson topic AND create assessment if needed
     * Now properly creates assessments for individual students
     */
    @Transactional
    public LessonTopic assignLessonTopicForWeek(DailySchedule schedule, 
                                                 Subject subject, 
                                                 Integer weekNumber, 
                                                 Term term) {
        log.debug("🔍 Attempting to assign lesson topic for subject {} week {}", 
            subject.getName(), weekNumber);

        // Find lesson topic for this subject and week
        Optional<LessonTopic> topicOpt = lessonTopicRepository
            .findBySubjectAndWeekNumberAndTerm(subject, weekNumber, term);

        if (topicOpt.isEmpty()) {
            log.warn("⚠️  No lesson topic found for subject {} week {} in term {} - marking as MISSING", 
                subject.getName(), weekNumber, term.getId());
            
            schedule.setLessonTopic(null);
            schedule.setMissingLessonTopic(true);
            schedule.setScheduleStatus(ScheduleStatus.IN_PROGRESS);
            schedule.setLessonAssignmentMethod("PENDING_MANUAL");
            
            dailyScheduleRepository.save(schedule);
            return null;
        }

        LessonTopic topic = topicOpt.get();
        log.info("✅ Assigned lesson topic '{}' to schedule for student {} on {}", 
            topic.getTitle(), schedule.getStudentProfile().getId(), schedule.getScheduledDate());

        // ✅ Assign topic to schedule
        schedule.setLessonTopic(topic);
        schedule.setMissingLessonTopic(false);
        schedule.setScheduleStatus(ScheduleStatus.READY);
        schedule.setLessonAssignmentMethod("AUTO_WEEKLY_ROTATION");
        
        dailyScheduleRepository.save(schedule);

        // ✅ NEW: Create or verify assessment exists for this topic
        ensureAssessmentExists(topic, subject);

        return topic;
    }

    /**
     * ✅ NEW: Ensure assessment exists for a lesson topic
     * Creates assessment if it doesn't exist
     */
    private void ensureAssessmentExists(LessonTopic lessonTopic, Subject subject) {
        // Check if assessment already exists
        Optional<Assessment> existingAssessment = assessmentRepository
            .findByLessonTopicAndType(lessonTopic, AssessmentType.LESSON_TOPIC_ASSESSMENT);
        
        if (existingAssessment.isPresent()) {
            log.debug("✅ Assessment already exists for topic '{}'", lessonTopic.getTitle());
            return;
        }

        // Assessment doesn't exist - create it
        try {
            log.info("📝 Creating assessment for topic: {}", lessonTopic.getTitle());
            
            // Create a temporary WeeklySchedule object for the assessment service
            WeeklySchedule tempSchedule = new WeeklySchedule();
            tempSchedule.setLessonTopic(lessonTopic);
            tempSchedule.setSubject(subject);
            
            Assessment newAssessment = autoAssessmentService.createMandatoryAssessment(tempSchedule);
            
            log.info("✅ Created assessment {} with {} questions for topic '{}'", 
                    newAssessment.getId(),
                    newAssessment.getQuestions() != null ? newAssessment.getQuestions().size() : 0,
                    lessonTopic.getTitle());
                    
        } catch (InsufficientQuestionsException e) {
            log.warn("⚠️ Cannot create assessment for topic '{}': {}", 
                    lessonTopic.getTitle(), 
                    e.getMessage());
            // This is OK - schedule exists but assessment will be missing
            // Admin can manually create assessment or add questions later
            
        } catch (Exception e) {
            log.error("❌ Failed to create assessment for topic '{}': {}", 
                    lessonTopic.getTitle(), 
                    e.getMessage(), e);
            // Don't fail the entire operation - schedule is still valid
        }
    }

    /**
     * ✅ FIXED: Manually assign a lesson topic AND ensure assessment exists
     */
    @Transactional
    public DailySchedule manuallyAssignLessonTopic(Long scheduleId, 
                                                    Long lessonTopicId, 
                                                    Long assignedByUserId,
                                                    String assignmentMethod) {
        log.info("📝 Manual lesson topic assignment: schedule={}, topic={}, user={}, method={}", 
            scheduleId, lessonTopicId, assignedByUserId, assignmentMethod);

        DailySchedule schedule = dailyScheduleRepository.findById(scheduleId)
            .orElseThrow(() -> new IllegalArgumentException("Schedule not found: " + scheduleId));

        LessonTopic lessonTopic = lessonTopicRepository.findById(lessonTopicId)
            .orElseThrow(() -> new IllegalArgumentException("Lesson topic not found: " + lessonTopicId));

        // Validate subject matches
        if (!schedule.getSubject().getId().equals(lessonTopic.getSubject().getId())) {
            throw new IllegalArgumentException(
                String.format("Subject mismatch: schedule has %s, topic has %s",
                    schedule.getSubject().getName(), lessonTopic.getSubject().getName())
            );
        }

        // Assign topic
        schedule.setLessonTopic(lessonTopic);
        schedule.setMissingLessonTopic(false);
        schedule.setScheduleStatus(ScheduleStatus.READY);
        schedule.setLessonAssignmentMethod(assignmentMethod);
        schedule.setManuallyAssignedAt(LocalDateTime.now());
        schedule.setManuallyAssignedByUserId(assignedByUserId);

        dailyScheduleRepository.save(schedule);

        // ✅ NEW: Ensure assessment exists
        ensureAssessmentExists(lessonTopic, schedule.getSubject());

        log.info("✅ Successfully assigned topic '{}' to schedule {} and ensured assessment exists", 
            lessonTopic.getTitle(), scheduleId);
        
        return schedule;
    }

    /**
     * ✅ UPDATED: Bulk assign topics AND create assessments
     */
    @Transactional
    public int bulkAssignTopicsForWeek(Integer weekNumber, Term term) {
        log.info("🔄 Starting bulk assignment for week {}", weekNumber);

        LocalDate[] weekRange = termWeekCalculator.getWeekDateRange(weekNumber);
        if (weekRange == null) {
            log.error("Invalid week number: {}", weekNumber);
            return 0;
        }

        LocalDate weekStart = weekRange[0];
        LocalDate weekEnd = weekRange[1];

        List<DailySchedule> inProgressSchedules = dailyScheduleRepository
            .findInProgressSchedulesInWeek(weekStart, weekEnd);

        if (inProgressSchedules.isEmpty()) {
            log.info("No IN_PROGRESS schedules found for week {}", weekNumber);
            return 0;
        }

        log.info("📋 Found {} IN_PROGRESS schedules to process", inProgressSchedules.size());

        int assignedCount = 0;
        int stillMissingCount = 0;
        
        for (DailySchedule schedule : inProgressSchedules) {
            Subject subject = schedule.getSubject();
            if (subject == null) {
                log.warn("Schedule {} has no subject, skipping", schedule.getId());
                continue;
            }

            // Try to assign topic (this now also creates assessment)
            LessonTopic assignedTopic = assignLessonTopicForWeek(schedule, subject, weekNumber, term);
            
            if (assignedTopic != null) {
                assignedCount++;
                log.debug("✅ Assigned topic and ensured assessment for schedule {}", schedule.getId());
            } else {
                stillMissingCount++;
                log.debug("⚠️  Schedule {} still has no topic", schedule.getId());
            }
        }

        log.info("✅ Bulk assignment complete: {} assigned, {} still missing", 
            assignedCount, stillMissingCount);
        
        return assignedCount;
    }

    // ... rest of your existing methods remain unchanged ...

    public Map<Subject, List<DailySchedule>> findMissingTopicsForWeek(Integer weekNumber) {
        LocalDate[] weekRange = termWeekCalculator.getWeekDateRange(weekNumber);
        if (weekRange == null) {
            log.warn("Invalid week number: {}", weekNumber);
            return Collections.emptyMap();
        }

        LocalDate weekStart = weekRange[0];
        LocalDate weekEnd = weekRange[1];

        List<DailySchedule> missingSchedules = dailyScheduleRepository
            .findMissingTopicsForWeek("INDIVIDUAL", weekStart, weekEnd);

        if (missingSchedules.isEmpty()) {
            log.debug("No missing topics found for week {}", weekNumber);
            return Collections.emptyMap();
        }

        Map<Subject, List<DailySchedule>> groupedBySubject = missingSchedules.stream()
            .filter(schedule -> schedule.getSubject() != null)
            .collect(Collectors.groupingBy(DailySchedule::getSubject));

        log.info("📊 Found {} subjects with missing topics in week {}: {}", 
            groupedBySubject.size(), weekNumber, 
            groupedBySubject.keySet().stream()
                .map(Subject::getName)
                .collect(Collectors.joining(", ")));

        return groupedBySubject;
    }

    public List<MissingTopicInfo> getMissingTopicDetails(Integer weekNumber) {
        Map<Subject, List<DailySchedule>> missingBySubject = findMissingTopicsForWeek(weekNumber);
        
        List<MissingTopicInfo> result = new ArrayList<>();
        
        for (Map.Entry<Subject, List<DailySchedule>> entry : missingBySubject.entrySet()) {
            Subject subject = entry.getKey();
            List<DailySchedule> schedules = entry.getValue();
            
            Set<StudentProfile> affectedStudents = schedules.stream()
                .map(DailySchedule::getStudentProfile)
                .collect(Collectors.toSet());
            
            MissingTopicInfo info = new MissingTopicInfo();
            info.setSubject(subject);
            info.setWeekNumber(weekNumber);
            info.setAffectedStudentCount(affectedStudents.size());
            info.setAffectedStudents(new ArrayList<>(affectedStudents));
            info.setSchedules(schedules);
            
            result.add(info);
        }
        
        return result;
    }

    public boolean lessonTopicExistsForWeek(Subject subject, Integer weekNumber, Term term) {
        return lessonTopicRepository.findBySubjectAndWeekNumberAndTerm(subject, weekNumber, term)
            .isPresent();
    }

    public List<Subject> getSubjectsMissingTopicsForWeek(Integer weekNumber, Term term) {
        Map<Subject, List<DailySchedule>> missingBySubject = findMissingTopicsForWeek(weekNumber);
        return new ArrayList<>(missingBySubject.keySet());
    }

    public long countMissingTopicsForWeek(Integer weekNumber) {
        return dailyScheduleRepository.countByMissingLessonTopicTrueAndScheduleSource("INDIVIDUAL");
    }

    // DTO class
    public static class MissingTopicInfo {
        private Subject subject;
        private Integer weekNumber;
        private int affectedStudentCount;
        private List<StudentProfile> affectedStudents;
        private List<DailySchedule> schedules;

        public Subject getSubject() { return subject; }
        public void setSubject(Subject subject) { this.subject = subject; }
        public Integer getWeekNumber() { return weekNumber; }
        public void setWeekNumber(Integer weekNumber) { this.weekNumber = weekNumber; }
        public int getAffectedStudentCount() { return affectedStudentCount; }
        public void setAffectedStudentCount(int affectedStudentCount) { 
            this.affectedStudentCount = affectedStudentCount; 
        }
        public List<StudentProfile> getAffectedStudents() { return affectedStudents; }
        public void setAffectedStudents(List<StudentProfile> affectedStudents) { 
            this.affectedStudents = affectedStudents; 
        }
        public List<DailySchedule> getSchedules() { return schedules; }
        public void setSchedules(List<DailySchedule> schedules) { 
            this.schedules = schedules; 
        }
    }
}