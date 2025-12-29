package com.edu.platform.service.progress;

import com.edu.platform.dto.progress.ComprehensiveLessonDto;
import com.edu.platform.dto.progress.ComprehensiveLessonsReport;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.model.TeacherProfile;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.StudentProfileRepository;
import com.edu.platform.repository.SubjectRepository;
import com.edu.platform.repository.TeacherProfileRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import com.edu.platform.service.TeacherProfileService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ✅ Complete comprehensive lesson tracking service
 * Supports STUDENT, TEACHER, and ADMIN views
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ComprehensiveLessonService {

    private final StudentLessonProgressRepository progressRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final TeacherProfileRepository teacherProfileRepository;
    private final TeacherProfileService teacherProfileService;
    private final SubjectRepository subjectRepository;

    // ================================================================
    // 📌 STUDENT METHODS (Original - Keep as is)
    // ================================================================

    /**
     * ✅ Get comprehensive lessons report for a student with optional filtering
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "comprehensiveLessons", 
               key = "#studentId + '_' + #fromDate + '_' + #toDate + '_' + #statusFilter", 
               cacheManager = "cache30m")
    public ComprehensiveLessonsReport getComprehensiveLessons(
            Long studentId,
            LocalDate fromDate,
            LocalDate toDate,
            String statusFilter) {

        log.info("📚 Fetching comprehensive lessons for student {} (from: {}, to: {}, status: {})",
                studentId, fromDate, toDate, statusFilter);

        StudentProfile student = studentProfileRepository.findById(studentId)
                .orElseThrow(() -> new EntityNotFoundException("Student not found: " + studentId));

        if (toDate == null) toDate = LocalDate.now();
        if (fromDate == null) fromDate = toDate.withDayOfMonth(1);

        List<StudentLessonProgress> allProgress = progressRepository
                .findByStudentProfileAndScheduledDateBetweenWithSubject(student, fromDate, toDate);

        log.debug("✅ Retrieved {} total progress records", allProgress.size());

        List<ComprehensiveLessonDto> lessons = allProgress.stream()
                .map(ComprehensiveLessonDto::fromEntity)
                .collect(Collectors.toList());

        if (statusFilter != null && !statusFilter.isEmpty()) {
            lessons = lessons.stream()
                    .filter(lesson -> lesson.getStatus().equalsIgnoreCase(statusFilter))
                    .collect(Collectors.toList());
        }

        lessons.sort((a, b) -> {
            if (a.getScheduledDate() == null) return 1;
            if (b.getScheduledDate() == null) return -1;
            return a.getScheduledDate().compareTo(b.getScheduledDate());
        });

        Map<String, List<ComprehensiveLessonDto>> groupedByStatus = lessons.stream()
                .collect(Collectors.groupingBy(
                        ComprehensiveLessonDto::getStatus,
                        Collectors.toList()
                ));

        ComprehensiveLessonsReport report = ComprehensiveLessonsReport.builder()
                .studentId(student.getId())
                .studentName(student.getUser().getFullName())
                .fromDate(fromDate)
                .toDate(toDate)
                .totalLessons(lessons.size())
                .completedCount(groupedByStatus.getOrDefault("COMPLETED", List.of()).size())
                .missedCount(groupedByStatus.getOrDefault("MISSED", List.of()).size())
                .inProgressCount(groupedByStatus.getOrDefault("IN_PROGRESS", List.of()).size())
                .scheduledCount(groupedByStatus.getOrDefault("SCHEDULED", List.of()).size())
                .lessonsByStatus(groupedByStatus)
                .allLessons(lessons)
                .build();

        report.calculateMetrics();
        report.calculateDateRangeDays();

        return report;
    }

    @Transactional(readOnly = true)
    public ComprehensiveLessonsReport getComprehensiveLessons(Long studentId) {
        return getComprehensiveLessons(studentId, null, null, null);
    }

    @Transactional(readOnly = true)
    public ComprehensiveLessonsReport getComprehensiveLessons(Long studentId, LocalDate fromDate, LocalDate toDate) {
        return getComprehensiveLessons(studentId, fromDate, toDate, null);
    }

    @Transactional(readOnly = true)
    public List<ComprehensiveLessonDto> getLessonsByStatus(
            Long studentId, String status, LocalDate fromDate, LocalDate toDate) {
        ComprehensiveLessonsReport report = getComprehensiveLessons(studentId, fromDate, toDate, status);
        return report.getAllLessons();
    }

    @Transactional(readOnly = true)
    public List<ComprehensiveLessonDto> getUrgentLessons(Long studentId) {
        ComprehensiveLessonsReport report = getComprehensiveLessons(studentId);
        return report.getUrgentLessons();
    }

    @Transactional(readOnly = true)
    public Map<String, List<ComprehensiveLessonDto>> getLessonsBySubject(
            Long studentId, LocalDate fromDate, LocalDate toDate) {
        ComprehensiveLessonsReport report = getComprehensiveLessons(studentId, fromDate, toDate);
        return report.getAllLessons().stream()
                .collect(Collectors.groupingBy(
                        ComprehensiveLessonDto::getSubjectName,
                        Collectors.toList()
                ));
    }

    @Transactional(readOnly = true)
    public Boolean isStudentOnTrack(Long studentId) {
        return getComprehensiveLessons(studentId).isOnTrack();
    }

    @Transactional(readOnly = true)
    public Boolean isStudentAtRisk(Long studentId) {
        return getComprehensiveLessons(studentId).isAtRisk();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStatusStats(Long studentId, LocalDate fromDate, LocalDate toDate) {
        ComprehensiveLessonsReport report = getComprehensiveLessons(studentId, fromDate, toDate);
        return Map.of(
                "totalLessons", report.getTotalLessons(),
                "completedCount", report.getCompletedCount(),
                "missedCount", report.getMissedCount(),
                "inProgressCount", report.getInProgressCount(),
                "scheduledCount", report.getScheduledCount(),
                "completionRate", report.getCompletionRate(),
                "isOnTrack", report.isOnTrack(),
                "isAtRisk", report.isAtRisk(),
                "urgentLessonsCount", report.getUrgentLessons().size()
        );
    }

    // ================================================================
    // 📌 NEW: TEACHER METHODS
    // ================================================================

    /**
     * ✅ FIXED: Get all lessons for teacher's subjects with filters
     */
    @Transactional(readOnly = true)
    public List<ComprehensiveLessonDto> getTeacherComprehensiveLessons(
            Long teacherId,
            LocalDate fromDate,
            LocalDate toDate,
            String status,
            Long subjectId,
            Long classId,
            Long studentId) {

        log.info("📚 TEACHER: Fetching lessons for teacher {} with filters", teacherId);

        // ✅ FIX: Use findById to get teacher by profile ID (not user ID)
        TeacherProfile teacher = teacherProfileRepository.findById(teacherId)
                .orElseThrow(() -> new EntityNotFoundException("Teacher profile not found: " + teacherId));

        log.info("✅ Teacher profile found: {} (User: {})", 
                 teacher.getId(), teacher.getUser() != null ? teacher.getUser().getEmail() : "N/A");

        if (toDate == null) toDate = LocalDate.now();
        if (fromDate == null) fromDate = toDate.withDayOfMonth(1);

        // Get all progress records for teacher's subjects
        List<StudentLessonProgress> allProgress;
        
        if (studentId != null) {
            // Filter by specific student
            StudentProfile student = studentProfileRepository.findById(studentId)
                    .orElseThrow(() -> new EntityNotFoundException("Student not found: " + studentId));
            allProgress = progressRepository
                    .findByStudentProfileAndScheduledDateBetweenWithSubject(student, fromDate, toDate);
        } else if (classId != null) {
            // Filter by class - get all students in class
            allProgress = progressRepository
                    .findByClassIdAndScheduledDateBetween(classId, fromDate, toDate);
        } else if (subjectId != null) {
            // Filter by specific subject
            allProgress = progressRepository
                    .findBySubjectIdAndScheduledDateBetween(subjectId, fromDate, toDate);
        } else {
            // Get all lessons for teacher's subjects
            allProgress = progressRepository
                    .findByTeacherIdAndScheduledDateBetween(teacherId, fromDate, toDate);
        }

        log.info("✅ Retrieved {} progress records for teacher", allProgress.size());

        // Convert to DTOs
        List<ComprehensiveLessonDto> lessons = allProgress.stream()
                .map(progress -> {
                    ComprehensiveLessonDto dto = ComprehensiveLessonDto.fromEntity(progress);
                    // Add student info for teacher view
                    dto.setStudentId(progress.getStudentProfile().getId());
                    dto.setStudentName(progress.getStudentProfile().getUser().getFullName());
                    return dto;
                })
                .collect(Collectors.toList());

        // Apply status filter
        if (status != null && !status.isEmpty()) {
            lessons = lessons.stream()
                    .filter(lesson -> lesson.getStatus().equalsIgnoreCase(status))
                    .collect(Collectors.toList());
        }

        // Sort by date (most recent first)
        lessons.sort((a, b) -> {
            if (a.getScheduledDate() == null) return 1;
            if (b.getScheduledDate() == null) return -1;
            return b.getScheduledDate().compareTo(a.getScheduledDate());
        });

        log.info("✅ Returning {} lessons for teacher", lessons.size());
        return lessons;
    }

    /**
     * ✅ NEW: Get aggregated statistics for teacher's subjects
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getTeacherStats(
            Long teacherId,
            LocalDate fromDate,
            LocalDate toDate,
            Long subjectId,
            Long classId) {

        log.info("📊 TEACHER: Calculating stats for teacher {}", teacherId);

        List<ComprehensiveLessonDto> lessons = getTeacherComprehensiveLessons(
                teacherId, fromDate, toDate, null, subjectId, classId, null);

        return calculateAggregatedStats(lessons, false);
    }

    // ================================================================
    // 📌 NEW: ADMIN METHODS
    // ================================================================

    /**
     * ✅ NEW: Get all lessons across all students with filters (ADMIN)
     */
    @Transactional(readOnly = true)
    public List<ComprehensiveLessonDto> getAdminComprehensiveLessons(
            LocalDate fromDate,
            LocalDate toDate,
            String status,
            Long subjectId,
            Long classId,
            Long studentId) {

        log.info("📚 ADMIN: Fetching all lessons with filters");

        if (toDate == null) toDate = LocalDate.now();
        if (fromDate == null) fromDate = toDate.withDayOfMonth(1);

        // Get progress records based on filters
        List<StudentLessonProgress> allProgress;

        if (studentId != null) {
            StudentProfile student = studentProfileRepository.findById(studentId)
                    .orElseThrow(() -> new EntityNotFoundException("Student not found: " + studentId));
            allProgress = progressRepository
                    .findByStudentProfileAndScheduledDateBetweenWithSubject(student, fromDate, toDate);
        } else if (classId != null) {
            allProgress = progressRepository
                    .findByClassIdAndScheduledDateBetween(classId, fromDate, toDate);
        } else if (subjectId != null) {
            allProgress = progressRepository
                    .findBySubjectIdAndScheduledDateBetween(subjectId, fromDate, toDate);
        } else {
            // Get ALL lessons in the system
            allProgress = progressRepository
                    .findByScheduledDateBetween(fromDate, toDate);
        }

        log.info("✅ Retrieved {} progress records for admin", allProgress.size());

        // Convert to DTOs with student info
        List<ComprehensiveLessonDto> lessons = allProgress.stream()
                .map(progress -> {
                    ComprehensiveLessonDto dto = ComprehensiveLessonDto.fromEntity(progress);
                    dto.setStudentId(progress.getStudentProfile().getId());
                    dto.setStudentName(progress.getStudentProfile().getUser().getFullName());
                    return dto;
                })
                .collect(Collectors.toList());

        // Apply status filter
        if (status != null && !status.isEmpty()) {
            lessons = lessons.stream()
                    .filter(lesson -> lesson.getStatus().equalsIgnoreCase(status))
                    .collect(Collectors.toList());
        }

        // Sort by date (most recent first)
        lessons.sort((a, b) -> {
            if (a.getScheduledDate() == null) return 1;
            if (b.getScheduledDate() == null) return -1;
            return b.getScheduledDate().compareTo(a.getScheduledDate());
        });

        log.info("✅ Returning {} lessons for admin", lessons.size());
        return lessons;
    }

    /**
     * ✅ NEW: Get system-wide statistics (ADMIN)
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getAdminStats(
            LocalDate fromDate,
            LocalDate toDate,
            Long subjectId,
            Long classId) {

        log.info("📊 ADMIN: Calculating system-wide stats");

        List<ComprehensiveLessonDto> lessons = getAdminComprehensiveLessons(
                fromDate, toDate, null, subjectId, classId, null);

        Map<String, Object> stats = calculateAggregatedStats(lessons, true);

        // Add admin-specific metrics
        long totalTeachers = lessons.stream()
                .map(ComprehensiveLessonDto::getSubjectId) // Assuming you can get teacher from subject
                .distinct()
                .count();

        long totalSubjects = lessons.stream()
                .map(ComprehensiveLessonDto::getSubjectId)
                .distinct()
                .count();

        stats.put("totalTeachers", totalTeachers);
        stats.put("totalSubjects", totalSubjects);

        return stats;
    }

    // ================================================================
    // 📌 HELPER METHODS
    // ================================================================

    /**
     * Calculate aggregated statistics from lessons list
     */
    private Map<String, Object> calculateAggregatedStats(
            List<ComprehensiveLessonDto> lessons, 
            boolean includeTeacherBreakdown) {

        long totalLessons = lessons.size();
        long completed = lessons.stream()
                .filter(l -> "COMPLETED".equals(l.getStatus()))
                .count();
        long missed = lessons.stream()
                .filter(l -> "MISSED".equals(l.getStatus()))
                .count();
        long inProgress = lessons.stream()
                .filter(l -> "IN_PROGRESS".equals(l.getStatus()))
                .count();
        long scheduled = lessons.stream()
                .filter(l -> "SCHEDULED".equals(l.getStatus()))
                .count();

        double completionRate = totalLessons > 0 ? (completed * 100.0 / totalLessons) : 0;
        double missedRate = totalLessons > 0 ? (missed * 100.0 / totalLessons) : 0;

        // Get unique students
        long totalStudents = lessons.stream()
                .map(ComprehensiveLessonDto::getStudentId)
                .filter(Objects::nonNull)
                .distinct()
                .count();

        // Calculate students at risk (>30% missed)
        Map<Long, Long> studentTotalCount = lessons.stream()
                .filter(l -> l.getStudentId() != null)
                .collect(Collectors.groupingBy(
                        ComprehensiveLessonDto::getStudentId,
                        Collectors.counting()
                ));

        Map<Long, Long> studentMissedCount = lessons.stream()
                .filter(l -> "MISSED".equals(l.getStatus()) && l.getStudentId() != null)
                .collect(Collectors.groupingBy(
                        ComprehensiveLessonDto::getStudentId,
                        Collectors.counting()
                ));

        long studentsAtRisk = studentMissedCount.entrySet().stream()
                .filter(e -> {
                    long total = studentTotalCount.getOrDefault(e.getKey(), 0L);
                    return total > 0 && (e.getValue() * 100.0 / total) > 30;
                })
                .count();

        // Group by subject
        Map<String, Map<String, Object>> bySubject = lessons.stream()
                .collect(Collectors.groupingBy(
                        ComprehensiveLessonDto::getSubjectName,
                        Collectors.collectingAndThen(
                                Collectors.toList(),
                                list -> {
                                    long subTotal = list.size();
                                    long subCompleted = list.stream()
                                            .filter(l -> "COMPLETED".equals(l.getStatus()))
                                            .count();
                                    double subRate = subTotal > 0 ? (subCompleted * 100.0 / subTotal) : 0;
                                    return Map.of(
                                            "totalLessons", (Object) subTotal,
                                            "completionRate", subRate
                                    );
                                }
                        )
                ));

        // Build response
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalLessons", totalLessons);
        stats.put("completedCount", completed);
        stats.put("missedCount", missed);
        stats.put("inProgressCount", inProgress);
        stats.put("scheduledCount", scheduled);
        stats.put("completionRate", completionRate);
        stats.put("missedRate", missedRate);
        stats.put("totalStudents", totalStudents);
        stats.put("studentsAtRisk", studentsAtRisk);
        stats.put("bySubject", bySubject);
        stats.put("byClass", new HashMap<>()); // TODO: Implement if you have class grouping

        return stats;
    }
    
    
    
    @Transactional
    public void syncIncompleteLessons(Long studentId) {
        log.info("🔄 Syncing incomplete lessons for student {}", studentId);
        
        StudentProfile student = studentProfileRepository.findById(studentId)
                .orElseThrow(() -> new EntityNotFoundException("Student not found: " + studentId));
        
        // Find all MISSED lessons without incomplete reason
        List<StudentLessonProgress> missedWithoutReason = progressRepository
                .findByStudentProfileAndCompletedFalseAndIncompleteReasonIsNull(student);
        
        LocalDateTime now = LocalDateTime.now();
        int synced = 0;
        
        for (StudentLessonProgress progress : missedWithoutReason) {
            // Check if grace period has expired
            if (progress.getAssessmentWindowEnd() != null && 
                progress.getAssessmentWindowEnd().isBefore(now)) {
                progress.markIncomplete("MISSED_GRACE_PERIOD");
                progressRepository.save(progress);
                synced++;
            }
            // Check if scheduled date is in the past (more than 1 day ago)
            else if (progress.getScheduledDate().isBefore(LocalDate.now().minusDays(1))) {
                progress.markIncomplete("NO_SUBMISSION");
                progressRepository.save(progress);
                synced++;
            }
        }
        
        log.info("✅ Synced {} incomplete lessons", synced);
    }
    
    
    /**
     * ✅ NEW: Get comprehensive lessons for a specific student (filtered by teacher's subjects)
     * This ensures teachers only see lessons for subjects they teach to this student
     */
    public ComprehensiveLessonsReport getTeacherStudentLessons(
            Long teacherId, 
            Long studentId, 
            LocalDate fromDate, 
            LocalDate toDate, 
            String statusFilter) {
        
        log.info("📚 Getting lessons for student {} filtered by teacher {}'s subjects", studentId, teacherId);
        
        // Get all lessons for the student
        ComprehensiveLessonsReport allLessons = getComprehensiveLessons(studentId, fromDate, toDate, statusFilter);
        
        // Get subjects that this teacher teaches to this student
        Set<Long> teacherSubjectIds = getTeacherSubjectsForStudent(teacherId, studentId);
        
        if (teacherSubjectIds.isEmpty()) {
            log.warn("⚠️ Teacher {} doesn't teach any subjects to student {}", teacherId, studentId);
            return ComprehensiveLessonsReport.builder()
                    .studentId(studentId)
                    .totalLessons(0)
                    .completedCount(0)
                    .missedCount(0)
                    .inProgressCount(0)
                    .scheduledCount(0)
                    .completionRate(0.0)
                    .missedRate(0.0)
                    .onTrackRate(0.0)
                    .isOnTrack(true)
                    .isAtRisk(false)
                    .lessonsByStatus(Map.of())
                    .allLessons(List.of())
                    .build();
        }
        
        // Filter lessons to only include teacher's subjects
        List<ComprehensiveLessonDto> filteredLessons = allLessons.getAllLessons().stream()
                .filter(lesson -> teacherSubjectIds.contains(lesson.getSubjectId()))
                .collect(Collectors.toList());
        
        // Recalculate statistics for filtered lessons
        return buildReportFromLessons(studentId, filteredLessons, fromDate, toDate);
    }

    /**
     * ✅ NEW: Get statistics for a specific student (filtered by teacher's subjects)
     */
    public Map<String, Object> getTeacherStudentStats(
            Long teacherId, 
            Long studentId, 
            LocalDate fromDate, 
            LocalDate toDate) {
        
        log.info("📊 Getting stats for student {} filtered by teacher {}'s subjects", studentId, teacherId);
        
        ComprehensiveLessonsReport report = getTeacherStudentLessons(teacherId, studentId, fromDate, toDate, null);
        
        return Map.of(
                "totalLessons", report.getTotalLessons(),
                "completedCount", report.getCompletedCount(),
                "missedCount", report.getMissedCount(),
                "inProgressCount", report.getInProgressCount(),
                "scheduledCount", report.getScheduledCount(),
                "completionRate", report.getCompletionRate(),
                "isOnTrack", report.isOnTrack(),
                "isAtRisk", report.isAtRisk(),
                "urgentLessonsCount", report.getUrgentLessons() != null ? report.getUrgentLessons().size() : 0
        );
    }


    
    
    /**
     * ✅ Helper: Get subject IDs that a teacher teaches to a specific student
     * Returns intersection of:
     * 1. Subjects the teacher teaches
     * 2. Subjects the student has enrolled in (different logic for ASPIRANT vs SCHOOL/HOME)
     */
    private Set<Long> getTeacherSubjectsForStudent(Long teacherProfileId, Long studentId) {
        log.debug("🔍 Finding subjects teacher {} teaches to student {}", teacherProfileId, studentId);
        
        // Get teacher's subjects
        TeacherProfile teacher = teacherProfileRepository.findById(teacherProfileId)
                .orElseThrow(() -> new EntityNotFoundException("Teacher not found: " + teacherProfileId));
        
        Set<Long> teacherSubjectIds = teacher.getSubjects().stream()
                .map(Subject::getId)
                .collect(Collectors.toSet());
        
        log.debug("✅ Teacher teaches {} subjects: {}", teacherSubjectIds.size(), teacherSubjectIds);
        
        // Get student
        StudentProfile student = studentProfileRepository.findById(studentId)
                .orElseThrow(() -> new EntityNotFoundException("Student not found: " + studentId));
        
        Set<Long> studentSubjectIds;
        
        // ✅ FIX: Different logic for ASPIRANT vs SCHOOL/HOME students
        if (student.getStudentType() == StudentType.ASPIRANT) {
            // ASPIRANT students choose their own subjects - use StudentProfile.subjects
            studentSubjectIds = student.getSubjects().stream()
                    .map(Subject::getId)
                    .collect(Collectors.toSet());
            log.debug("✅ ASPIRANT student has {} chosen subjects: {}", 
                     studentSubjectIds.size(), studentSubjectIds);
        } else {
            // SCHOOL/HOME students get subjects from their class
            if (student.getClassLevel() == null) {
                log.warn("⚠️ Student {} has no class assigned", studentId);
                return Set.of();
            }
            
            // Query subjects by class ID (from Subject.classEntity relationship)
            List<Subject> classSubjects = subjectRepository.findByClassEntityId(student.getClassLevel().getId());
            studentSubjectIds = classSubjects.stream()
                    .map(Subject::getId)
                    .collect(Collectors.toSet());
            log.debug("✅ Student's class has {} subjects: {}", 
                     studentSubjectIds.size(), studentSubjectIds);
        }
        
        // Return intersection (subjects teacher teaches that student is enrolled in)
        teacherSubjectIds.retainAll(studentSubjectIds);
        
        log.debug("✅ Common subjects: {} - {}", teacherSubjectIds.size(), teacherSubjectIds);
        
        return teacherSubjectIds;
    }

    /**
     * ✅ Helper: Build report from filtered lessons
     */
    private ComprehensiveLessonsReport buildReportFromLessons(
            Long studentId, 
            List<ComprehensiveLessonDto> lessons,
            LocalDate fromDate,
            LocalDate toDate) {
        
        // Get student name
        StudentProfile student = studentProfileRepository.findById(studentId)
                .orElseThrow(() -> new EntityNotFoundException("Student not found: " + studentId));
        
        int total = lessons.size();
        int completed = (int) lessons.stream().filter(l -> "COMPLETED".equals(l.getStatus())).count();
        int missed = (int) lessons.stream().filter(l -> "MISSED".equals(l.getStatus())).count();
        int inProgress = (int) lessons.stream().filter(l -> "IN_PROGRESS".equals(l.getStatus())).count();
        int scheduled = (int) lessons.stream().filter(l -> "SCHEDULED".equals(l.getStatus())).count();
        
        double completionRate = total > 0 ? (completed * 100.0 / total) : 0.0;
        double missedRate = total > 0 ? (missed * 100.0 / total) : 0.0;
        double onTrackRate = total > 0 ? ((completed + inProgress) * 100.0 / total) : 100.0;
        
        boolean isOnTrack = completionRate >= 75.0;
        boolean isAtRisk = missedRate > 20.0;
        
        // Group by status
        Map<String, List<ComprehensiveLessonDto>> byStatus = lessons.stream()
                .collect(Collectors.groupingBy(ComprehensiveLessonDto::getStatus));
        
        return ComprehensiveLessonsReport.builder()
                .studentId(studentId)
                .studentName(student.getUser().getFullName())
                .fromDate(fromDate)
                .toDate(toDate)
                .totalLessons(total)
                .completedCount(completed)
                .missedCount(missed)
                .inProgressCount(inProgress)
                .scheduledCount(scheduled)
                .completionRate(completionRate)
                .missedRate(missedRate)
                .onTrackRate(onTrackRate)
                .isOnTrack(isOnTrack)
                .isAtRisk(isAtRisk)
                .lessonsByStatus(byStatus)
                .allLessons(lessons)
                .build();
    }
}