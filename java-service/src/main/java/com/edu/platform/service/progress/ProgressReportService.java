package com.edu.platform.service.progress;

import com.edu.platform.model.LessonTopic;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.LessonTopicRepository;
import com.edu.platform.repository.StudentProfileRepository;
import com.edu.platform.repository.SubjectRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProgressReportService {

    private final StudentLessonProgressRepository progressRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final LessonTopicRepository lessonTopicRepository;
    private final SubjectRepository subjectRepository;

    /**
     * Get progress history for a student in a date range
     */
    @Transactional(readOnly = false)
    // ✅ TEMPORARILY DISABLE CACHE for debugging
    // @Cacheable(value = "studentProgressHistory", 
    //            key = "#studentProfileId + '_' + #fromDate + '_' + #toDate",
    //            unless = "#result == null || #result.isEmpty()")
    public List<StudentLessonProgress> getProgressHistory(
            Long studentProfileId,
            LocalDate fromDate,
            LocalDate toDate) {
        
        log.info("📊 [DEBUG] Getting progress history for student {} from {} to {}",
                studentProfileId, fromDate, toDate);
        
        StudentProfile student = studentProfileRepository.findById(studentProfileId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Student profile not found: " + studentProfileId));
        
        log.info("📊 [DEBUG] Student type: {}", student.getStudentType().name());
        
        // ✅ CRITICAL FIX: Use explicit JOIN FETCH to ensure subjects are loaded
        List<StudentLessonProgress> history = progressRepository
                .findByStudentProfileAndScheduledDateBetweenWithSubject(student, fromDate, toDate);
        
        log.info("📝 [DEBUG] Found {} raw progress records", history.size());
        
        // ✅ DEBUG: Log each progress record BEFORE enrichment
        for (StudentLessonProgress p : history) {
            log.info("🔍 [BEFORE ENRICHMENT] Progress ID: {}, Subject: {}, SubjectId: {}, LessonTopic: {}, Topic: {}",
                    p.getId(),
                    p.getSubject() != null ? p.getSubject().getName() : "NULL",
                    p.getSubjectId(),
                    p.getLessonTopic() != null ? p.getLessonTopic().getTopicTitle() : "NULL",
                    p.getTopic() != null ? p.getTopic().getTopicTitle() : "NULL");
        }
        
        // ✅ FIX: Enrich INDIVIDUAL student progress with lesson details
        if ("INDIVIDUAL".equals(student.getStudentType().name())) {
            log.info("🔧 [DEBUG] Starting enrichment for INDIVIDUAL student");
            enrichAndSaveIndividualStudentProgress(history, student);
            
            // ✅ CRITICAL: Refresh entities from database after enrichment
            history = progressRepository
                    .findByStudentProfileAndScheduledDateBetweenWithSubject(student, fromDate, toDate);
            
            log.info("📝 [DEBUG] Reloaded {} progress records after enrichment", history.size());
            
            // ✅ DEBUG: Log each progress record AFTER enrichment
            for (StudentLessonProgress p : history) {
                log.info("🔍 [AFTER ENRICHMENT] Progress ID: {}, Subject: {}, SubjectId: {}, LessonTopic: {}, Topic: {}",
                        p.getId(),
                        p.getSubject() != null ? p.getSubject().getName() : "NULL",
                        p.getSubjectId(),
                        p.getLessonTopic() != null ? p.getLessonTopic().getTopicTitle() : "NULL",
                        p.getTopic() != null ? p.getTopic().getTopicTitle() : "NULL");
            }
        }
        
        log.info("✅ [DEBUG] Returning {} enriched progress records", history.size());
        return history;
    }

    /**
     * Get all completed lessons for a student
     */
    @Transactional(readOnly = false)
    public List<StudentLessonProgress> getCompletedLessons(Long studentProfileId) {
        StudentProfile student = studentProfileRepository.findById(studentProfileId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Student profile not found: " + studentProfileId));
        
        List<StudentLessonProgress> completed = progressRepository
                .findByStudentProfileAndCompletedTrue(student);
        
        if ("INDIVIDUAL".equals(student.getStudentType().name())) {
            enrichAndSaveIndividualStudentProgress(completed, student);
        }
        
        return completed;
    }

    /**
     * Get incomplete lessons for a student
     */
    @Transactional(readOnly = false)
    public List<StudentLessonProgress> getIncompleteLessons(Long studentProfileId) {
        StudentProfile student = studentProfileRepository.findById(studentProfileId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Student profile not found: " + studentProfileId));
        
        List<StudentLessonProgress> incomplete = progressRepository
                .findByStudentProfileAndCompletedFalse(student);
        
        if ("INDIVIDUAL".equals(student.getStudentType().name())) {
            enrichAndSaveIndividualStudentProgress(incomplete, student);
        }
        
        return incomplete;
    }

    /**
     * ✅ Enrich INDIVIDUAL student progress with lesson details AND SAVE
     */
    private void enrichAndSaveIndividualStudentProgress(
            List<StudentLessonProgress> progressList, 
            StudentProfile student) {
        
        if (progressList == null || progressList.isEmpty()) {
            log.info("⚠️ [DEBUG] No progress records to enrich");
            return;
        }
        
        log.info("🔍 [DEBUG] Starting enrichment for {} progress records", progressList.size());
        
        int enrichedCount = 0;
        int alreadyEnrichedCount = 0;
        int noSubjectCount = 0;
        int noLessonsCount = 0;
        int allAssignedCount = 0;
        
        for (StudentLessonProgress progress : progressList) {
            log.info("🔍 [DEBUG] Processing progress ID: {}", progress.getId());
            
            // Skip if lesson is already set
            if (progress.getLessonTopic() != null) {
                alreadyEnrichedCount++;
                log.info("✓ [DEBUG] Progress {} already has lesson topic: {}", 
                    progress.getId(), progress.getLessonTopic().getTopicTitle());
                continue;
            }
            
            // ✅ Try to get subject from progress record
            Subject subject = progress.getSubject();
            Long subjectId = subject != null ? subject.getId() : progress.getSubjectId();
            
            log.info("🔍 [DEBUG] Progress {} - Subject object: {}, SubjectId field: {}", 
                    progress.getId(),
                    subject != null ? "EXISTS (" + subject.getName() + ")" : "NULL",
                    subjectId);
            
            if (subjectId == null) {
                noSubjectCount++;
                log.warn("⚠️ [DEBUG] Progress {} has NO subject information - SKIPPING", progress.getId());
                continue;
            }
            
            // ✅ If subject object is null but subjectId exists, load it
            if (subject == null) {
                log.info("🔍 [DEBUG] Loading subject {} from database", subjectId);
                subject = subjectRepository.findById(subjectId).orElse(null);
                if (subject != null) {
                    progress.setSubject(subject);
                    log.info("✓ [DEBUG] Loaded subject: {}", subject.getName());
                } else {
                    log.warn("⚠️ [DEBUG] Subject {} not found in database - SKIPPING", subjectId);
                    continue;
                }
            }
            
            // Find lesson topics for this subject (INDIVIDUAL students use isAspirantMaterial=false)
            log.info("🔍 [DEBUG] Finding lessons for subject {} ({})", subjectId, subject.getName());
            List<LessonTopic> allLessons = lessonTopicRepository
                    .findBySubjectIdAndIsAspirantMaterialFalse(subjectId);
            
            log.info("📚 [DEBUG] Found {} total lessons for subject", allLessons.size());
            
            if (allLessons.isEmpty()) {
                noLessonsCount++;
                log.warn("⚠️ [DEBUG] No lessons found for subject {} - SKIPPING", subject.getName());
                continue;
            }
            
            // ✅ Find which lessons are already assigned
            log.info("🔍 [DEBUG] Checking already assigned lessons for student");
            List<StudentLessonProgress> allProgress = progressRepository
                    .findByStudentProfileAndSubject(student, subject);
            
            List<Long> assignedIds = allProgress.stream()
                    .filter(p -> p.getLessonTopic() != null)
                    .map(p -> p.getLessonTopic().getId())
                    .toList();
            
            log.info("🔒 [DEBUG] {} lessons already assigned: {}", assignedIds.size(), assignedIds);
            
            // Filter unassigned
            List<LessonTopic> unassigned = allLessons.stream()
                    .filter(l -> !assignedIds.contains(l.getId()))
                    .sorted(Comparator.comparing(LessonTopic::getWeekNumber,
                            Comparator.nullsLast(Comparator.naturalOrder())))
                    .toList();
            
            log.info("✅ [DEBUG] {} unassigned lessons available", unassigned.size());
            
            if (unassigned.isEmpty()) {
                allAssignedCount++;
                log.warn("⚠️ [DEBUG] All lessons for subject {} already assigned - SKIPPING", 
                    subject.getName());
                continue;
            }
            
            // Assign first unassigned lesson
            LessonTopic lesson = unassigned.get(0);
            log.info("✅ [DEBUG] Assigning lesson: {} (ID: {})", lesson.getTopicTitle(), lesson.getId());
            
            progress.setLessonTopic(lesson);
            progress.setTopic(lesson);
            
            StudentLessonProgress saved = progressRepository.save(progress);
            enrichedCount++;
            
            log.info("💾 [DEBUG] SAVED progress {} with lesson {} ({})", 
                    saved.getId(), lesson.getId(), lesson.getTopicTitle());
        }
        
        // Flush to ensure changes are persisted
        if (enrichedCount > 0) {
            progressRepository.flush();
            log.info("💾 [DEBUG] FLUSHED {} enrichments to database", enrichedCount);
        }
        
        log.info("✅ [DEBUG] Enrichment summary: {} NEW, {} ALREADY_ENRICHED, {} NO_SUBJECT, {} NO_LESSONS, {} ALL_ASSIGNED",
                enrichedCount, alreadyEnrichedCount, noSubjectCount, noLessonsCount, allAssignedCount);
    }
}