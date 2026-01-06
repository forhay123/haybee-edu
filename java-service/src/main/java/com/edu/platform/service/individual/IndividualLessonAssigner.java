package com.edu.platform.service.individual;

import com.edu.platform.model.DailySchedule;
import com.edu.platform.model.LessonTopic;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.model.Term;
import com.edu.platform.model.enums.ScheduleStatus;
import com.edu.platform.repository.DailyScheduleRepository;
import com.edu.platform.repository.LessonTopicRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ✅ FIXED: Service for assigning lesson topics to INDIVIDUAL student schedules
 * Properly sets missing_lesson_topic flag based on topic availability
 * NOW SAVES schedules after assignment
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class IndividualLessonAssigner {

    private final LessonTopicRepository lessonTopicRepository;
    private final DailyScheduleRepository dailyScheduleRepository;
    private final TermWeekCalculator termWeekCalculator;

    /**
     * ✅ FIXED: Assign lesson topic to a schedule based on term week
     * Now properly sets missing_lesson_topic flag AND saves the schedule
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
            // ✅ CRITICAL FIX: Set flag to TRUE when no topic found
            log.warn("⚠️  No lesson topic found for subject {} week {} in term {} - marking as MISSING", 
                subject.getName(), weekNumber, term.getId());
            
            schedule.setLessonTopic(null);
            schedule.setMissingLessonTopic(true);
            schedule.setScheduleStatus(ScheduleStatus.IN_PROGRESS);
            schedule.setLessonAssignmentMethod("PENDING_MANUAL");
            
            // ✅ FIX: Save here!
            dailyScheduleRepository.save(schedule);
            
            return null;
        }

        // ✅ Topic found: assign it and set flag to FALSE
        LessonTopic topic = topicOpt.get();
        log.info("✅ Assigned lesson topic '{}' to schedule for student {} on {}", 
            topic.getTitle(), schedule.getStudentProfile().getId(), schedule.getScheduledDate());

        schedule.setLessonTopic(topic);
        schedule.setMissingLessonTopic(false);
        schedule.setScheduleStatus(ScheduleStatus.READY);
        schedule.setLessonAssignmentMethod("AUTO_WEEKLY_ROTATION");
        
        // ✅ FIX: Save here!
        dailyScheduleRepository.save(schedule);

        return topic;
    }

    /**
     * ✅ FIXED: Manually assign a lesson topic to a schedule (Admin or Teacher)
     * Properly updates the missing_lesson_topic flag
     */
    @Transactional
    public DailySchedule manuallyAssignLessonTopic(Long scheduleId, 
                                                    Long lessonTopicId, 
                                                    Long assignedByUserId,
                                                    String assignmentMethod) {
        log.info("📝 Manual lesson topic assignment: schedule={}, topic={}, user={}, method={}", 
            scheduleId, lessonTopicId, assignedByUserId, assignmentMethod);

        // Fetch schedule
        DailySchedule schedule = dailyScheduleRepository.findById(scheduleId)
            .orElseThrow(() -> new IllegalArgumentException("Schedule not found: " + scheduleId));

        // Fetch lesson topic
        LessonTopic lessonTopic = lessonTopicRepository.findById(lessonTopicId)
            .orElseThrow(() -> new IllegalArgumentException("Lesson topic not found: " + lessonTopicId));

        // Validate subject matches
        if (!schedule.getSubject().getId().equals(lessonTopic.getSubject().getId())) {
            throw new IllegalArgumentException(
                String.format("Subject mismatch: schedule has %s, topic has %s",
                    schedule.getSubject().getName(), lessonTopic.getSubject().getName())
            );
        }

        // ✅ FIX: Assign topic and set flag to FALSE
        schedule.setLessonTopic(lessonTopic);
        schedule.setMissingLessonTopic(false);
        schedule.setScheduleStatus(ScheduleStatus.READY);
        schedule.setLessonAssignmentMethod(assignmentMethod);
        schedule.setManuallyAssignedAt(LocalDateTime.now());
        schedule.setManuallyAssignedByUserId(assignedByUserId);

        dailyScheduleRepository.save(schedule);

        log.info("✅ Successfully assigned topic '{}' to schedule {} - flag set to FALSE", 
            lessonTopic.getTitle(), scheduleId);
        return schedule;
    }

    /**
     * Find all schedules with missing lesson topics for a specific week
     */
    public Map<Subject, List<DailySchedule>> findMissingTopicsForWeek(Integer weekNumber) {
        LocalDate[] weekRange = termWeekCalculator.getWeekDateRange(weekNumber);
        if (weekRange == null) {
            log.warn("Invalid week number: {}", weekNumber);
            return Collections.emptyMap();
        }

        LocalDate weekStart = weekRange[0];
        LocalDate weekEnd = weekRange[1];

        // Find all schedules with missing topics
        List<DailySchedule> missingSchedules = dailyScheduleRepository
            .findMissingTopicsForWeek("INDIVIDUAL", weekStart, weekEnd);

        if (missingSchedules.isEmpty()) {
            log.debug("No missing topics found for week {}", weekNumber);
            return Collections.emptyMap();
        }

        // Group by subject
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

    /**
     * Get detailed missing topic information for notifications
     */
    public List<MissingTopicInfo> getMissingTopicDetails(Integer weekNumber) {
        Map<Subject, List<DailySchedule>> missingBySubject = findMissingTopicsForWeek(weekNumber);
        
        List<MissingTopicInfo> result = new ArrayList<>();
        
        for (Map.Entry<Subject, List<DailySchedule>> entry : missingBySubject.entrySet()) {
            Subject subject = entry.getKey();
            List<DailySchedule> schedules = entry.getValue();
            
            // Get unique students affected
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

    /**
     * ✅ FIXED: Bulk assign lesson topics to all IN_PROGRESS schedules for a week
     * Properly handles the missing_lesson_topic flag
     * Note: assignLessonTopicForWeek now saves, so we don't need to save again
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

        // Find all IN_PROGRESS schedules (these have missing_lesson_topic = true)
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

            // Try to assign topic (this method now saves internally)
            LessonTopic assignedTopic = assignLessonTopicForWeek(schedule, subject, weekNumber, term);
            
            if (assignedTopic != null) {
                // ✅ Topic was assigned and saved by assignLessonTopicForWeek
                assignedCount++;
                log.debug("✅ Assigned topic to schedule {}", schedule.getId());
            } else {
                // ⚠️ Still no topic, but schedule was saved with missing flag
                stillMissingCount++;
                log.debug("⚠️  Schedule {} still has no topic", schedule.getId());
            }
        }

        log.info("✅ Bulk assignment complete: {} assigned, {} still missing", 
            assignedCount, stillMissingCount);
        
        return assignedCount;
    }

    /**
     * Check if a lesson topic exists for a subject and week
     */
    public boolean lessonTopicExistsForWeek(Subject subject, Integer weekNumber, Term term) {
        return lessonTopicRepository.findBySubjectAndWeekNumberAndTerm(subject, weekNumber, term)
            .isPresent();
    }

    /**
     * Get all subjects that are missing topics for a specific week
     */
    public List<Subject> getSubjectsMissingTopicsForWeek(Integer weekNumber, Term term) {
        Map<Subject, List<DailySchedule>> missingBySubject = findMissingTopicsForWeek(weekNumber);
        return new ArrayList<>(missingBySubject.keySet());
    }

    /**
     * Count total schedules with missing topics
     */
    public long countMissingTopicsForWeek(Integer weekNumber) {
        return dailyScheduleRepository.countByMissingLessonTopicTrueAndScheduleSource("INDIVIDUAL");
    }

    // ============================================================
    // DTO CLASSES
    // ============================================================

    /**
     * DTO for missing topic information
     */
    public static class MissingTopicInfo {
        private Subject subject;
        private Integer weekNumber;
        private int affectedStudentCount;
        private List<StudentProfile> affectedStudents;
        private List<DailySchedule> schedules;

        // Getters and setters
        public Subject getSubject() {
            return subject;
        }

        public void setSubject(Subject subject) {
            this.subject = subject;
        }

        public Integer getWeekNumber() {
            return weekNumber;
        }

        public void setWeekNumber(Integer weekNumber) {
            this.weekNumber = weekNumber;
        }

        public int getAffectedStudentCount() {
            return affectedStudentCount;
        }

        public void setAffectedStudentCount(int affectedStudentCount) {
            this.affectedStudentCount = affectedStudentCount;
        }

        public List<StudentProfile> getAffectedStudents() {
            return affectedStudents;
        }

        public void setAffectedStudents(List<StudentProfile> affectedStudents) {
            this.affectedStudents = affectedStudents;
        }

        public List<DailySchedule> getSchedules() {
            return schedules;
        }

        public void setSchedules(List<DailySchedule> schedules) {
            this.schedules = schedules;
        }
    }
}