package com.edu.platform.service.progress;

import com.edu.platform.model.DailySchedule;
import com.edu.platform.model.LessonTopic;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.DailyScheduleRepository;
import com.edu.platform.repository.LessonTopicRepository;
import com.edu.platform.repository.SubjectRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service that bridges DailySchedule and StudentLessonProgress
 * to provide unified daily planner functionality
 * ✅ UPDATED: Now syncs Phase 2 fields (assessment, time windows)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DailyPlannerService {

    private final DailyScheduleRepository dailyScheduleRepository;
    private final StudentLessonProgressRepository progressRepository;
    private final LessonTopicRepository lessonTopicRepository;
    private final SubjectRepository subjectRepository;

    /**
     * Generate daily plan for a student on a specific date
     * This reads from daily_schedules and creates/fetches progress records
     */
    @Transactional
    public List<StudentLessonProgress> generateDailyPlan(StudentProfile student, LocalDate date) {
        log.info("🗓️ Generating daily plan for student {} on {}", student.getId(), date);

        // Get all scheduled lessons for this student on this date
        List<DailySchedule> schedules = dailyScheduleRepository
                .findByStudentProfileAndScheduledDate(student, date);

        log.info("📚 Found {} scheduled lessons for student {} on {}",
                schedules.size(), student.getId(), date);

        // For each schedule, get or create progress record
        List<StudentLessonProgress> progressList = schedules.stream()
                .map(schedule -> getOrCreateProgress(student, schedule))
                .collect(Collectors.toList());

        // ✅ NEW: Enrich INDIVIDUAL student progress immediately after creation
        if ("INDIVIDUAL".equals(student.getStudentType().name())) {
            enrichIndividualStudentProgress(progressList, student);
        }

        log.info("✅ Generated daily plan with {} lessons", progressList.size());
        return progressList;
    }

    /**
     * Get existing progress or create new progress record from schedule
     * ✅ UPDATED: Now syncs Phase 2 fields
     */
    private StudentLessonProgress getOrCreateProgress(
            StudentProfile student,
            DailySchedule schedule) {

        // Try to find existing progress
        if (schedule.getLessonTopic() != null) {
            // Standard lookup with lessonTopic
            return progressRepository
                    .findByStudentProfileAndLessonTopicAndScheduledDateAndPeriodNumber(
                            student,
                            schedule.getLessonTopic(),
                            schedule.getScheduledDate(),
                            schedule.getPeriodNumber()
                    )
                    .orElseGet(() -> createProgressFromSchedule(student, schedule));
        } else {
            // For INDIVIDUAL students without lessonTopic assigned yet
            List<StudentLessonProgress> existing = progressRepository
                    .findByStudentProfileAndScheduledDate(student, schedule.getScheduledDate());
            
            return existing.stream()
                    .filter(p -> p.getPeriodNumber() != null && 
                                 p.getPeriodNumber().equals(schedule.getPeriodNumber()))
                    .findFirst()
                    .orElseGet(() -> createProgressFromSchedule(student, schedule));
        }
    }

    /**
     * Create new progress record from schedule
     * ✅ UPDATED: Now includes Phase 2 fields (assessment, time windows)
     */
    private StudentLessonProgress createProgressFromSchedule(
            StudentProfile student,
            DailySchedule schedule) {
        
        log.debug("📝 Creating new progress record for student {} on {} period {}", 
                student.getId(), schedule.getScheduledDate(), schedule.getPeriodNumber());
        
        StudentLessonProgress progress = new StudentLessonProgress();
        
        // ✅ EXISTING FIELDS
        progress.setStudentProfile(student);
        progress.setSubject(schedule.getSubject());
        progress.setLessonTopic(schedule.getLessonTopic());
        progress.setTopic(schedule.getLessonTopic());
        progress.setScheduledDate(schedule.getScheduledDate());
        progress.setPeriodNumber(schedule.getPeriodNumber());
        progress.setPriority(schedule.getPriority());
        progress.setWeight(schedule.getWeight());
        progress.setCompleted(false);
        progress.setCreatedAt(LocalDateTime.now());
        progress.setDate(schedule.getScheduledDate());
        
        // ✅ NEW PHASE 2 FIELDS: Sync from DailySchedule
        progress.setAssessment(schedule.getAssessment());
        progress.setAssessmentWindowStart(schedule.getAssessmentWindowStart());
        progress.setAssessmentWindowEnd(schedule.getAssessmentWindowEnd());
        
        // Set assessmentAccessible based on current time
        if (schedule.getAssessmentWindowStart() != null && 
            schedule.getAssessmentWindowEnd() != null) {
            LocalDateTime now = LocalDateTime.now();
            boolean isAccessible = !now.isBefore(schedule.getAssessmentWindowStart()) && 
                                   !now.isAfter(schedule.getAssessmentWindowEnd());
            progress.setAssessmentAccessible(isAccessible);
        } else {
            progress.setAssessmentAccessible(false);
        }
        
        StudentLessonProgress saved = progressRepository.save(progress);
        
        log.debug("✅ Created progress record ID {} with subject: {}, assessment: {}", 
                saved.getId(), 
                saved.getSubject() != null ? saved.getSubject().getName() : "null",
                saved.getAssessment() != null ? saved.getAssessment().getId() : "null");
        
        return saved;
    }

    /**
     * ✅ NEW: Enrich INDIVIDUAL student progress with lesson assignments
     * This assigns lesson topics to progress records that only have subject info
     */
    private void enrichIndividualStudentProgress(
            List<StudentLessonProgress> progressList,
            StudentProfile student) {
        
        if (progressList == null || progressList.isEmpty()) {
            return;
        }
        
        log.info("🔍 Enriching {} progress records for INDIVIDUAL student {}", 
                progressList.size(), student.getId());
        
        int enrichedCount = 0;
        
        for (StudentLessonProgress progress : progressList) {
            // Skip if already has lesson
            if (progress.getLessonTopic() != null) {
                continue;
            }
            
            // Get subject
            Subject subject = progress.getSubject();
            Long subjectId = subject != null ? subject.getId() : progress.getSubjectId();
            
            if (subjectId == null) {
                log.warn("⚠️ Progress {} has no subject - cannot enrich", progress.getId());
                continue;
            }
            
            // Load subject if needed
            if (subject == null) {
                subject = subjectRepository.findById(subjectId).orElse(null);
                if (subject != null) {
                    progress.setSubject(subject);
                } else {
                    continue;
                }
            }
            
            // Find unassigned lessons
            List<LessonTopic> allLessons = lessonTopicRepository
                    .findBySubjectIdAndIsAspirantMaterialFalse(subjectId);
            
            if (allLessons.isEmpty()) {
                log.warn("⚠️ No lessons for subject {} - cannot enrich", subject.getName());
                continue;
            }
            
            // Get already assigned lessons
            List<StudentLessonProgress> allProgress = progressRepository
                    .findByStudentProfileAndSubject(student, subject);
            
            List<Long> assignedIds = allProgress.stream()
                    .filter(p -> p.getLessonTopic() != null)
                    .map(p -> p.getLessonTopic().getId())
                    .toList();
            
            // Filter unassigned
            List<LessonTopic> unassigned = allLessons.stream()
                    .filter(l -> !assignedIds.contains(l.getId()))
                    .sorted(Comparator.comparing(LessonTopic::getWeekNumber,
                            Comparator.nullsLast(Comparator.naturalOrder())))
                    .toList();
            
            if (unassigned.isEmpty()) {
                log.warn("⚠️ All lessons assigned for subject {}", subject.getName());
                continue;
            }
            
            // Assign first unassigned lesson
            LessonTopic lesson = unassigned.get(0);
            progress.setLessonTopic(lesson);
            progress.setTopic(lesson);
            
            progressRepository.save(progress);
            enrichedCount++;
            
            log.info("✅ Assigned lesson {} to progress {}", 
                    lesson.getTopicTitle(), progress.getId());
        }
        
        if (enrichedCount > 0) {
            progressRepository.flush();
            log.info("💾 Enriched and saved {} progress records", enrichedCount);
        }
    }

    /**
     * Get progress history for a student in a date range
     */
    @Transactional(readOnly = true)
    public List<StudentLessonProgress> getProgressHistory(
            StudentProfile student,
            LocalDate fromDate,
            LocalDate toDate) {

        log.info("📊 Getting progress history for student {} from {} to {}",
                student.getId(), fromDate, toDate);

        return progressRepository
                .findByStudentProfileAndScheduledDateBetween(student, fromDate, toDate);
    }
}