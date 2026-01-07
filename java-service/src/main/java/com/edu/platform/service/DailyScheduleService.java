// ============================================================
// FIXED: DailyScheduleService with Assessment & Time Window Sync + Progress Creation
// ============================================================
package com.edu.platform.service;

import lombok.extern.slf4j.Slf4j;
import com.edu.platform.dto.classdata.DailyScheduleDto;
import com.edu.platform.model.*;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.*;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import com.edu.platform.service.individual.IndividualScheduleGenerator;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j 
public class DailyScheduleService {

    private final DailyScheduleRepository dailyScheduleRepository;
    private final WeeklyScheduleRepository weeklyScheduleRepository;
    private final SubjectRepository subjectRepository;
    private final LessonTopicRepository lessonTopicRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final ClassRepository classRepository;
    private final IndividualScheduleGenerator individualScheduleGenerator;
    private final StudentLessonProgressRepository progressRepository;

    private static final Long GENERAL_DEPT_ID = 4L;

    @Cacheable(value = "dailySchedules", key = "#fromDate + '_' + #toDate",
            cacheManager = "cache2h", unless = "#result == null || #result.isEmpty()")
    public List<DailyScheduleDto> getAllSchedules(LocalDate fromDate, LocalDate toDate) {
        List<DailySchedule> schedules;

        if (fromDate != null && toDate != null) {
            schedules = dailyScheduleRepository
                    .findByScheduledDateBetweenOrderByScheduledDateAscPeriodNumberAsc(fromDate, toDate);
        } else if (fromDate != null) {
            schedules = dailyScheduleRepository
                    .findByScheduledDateGreaterThanEqualOrderByScheduledDateAscPeriodNumberAsc(fromDate);
        } else if (toDate != null) {
            schedules = dailyScheduleRepository
                    .findByScheduledDateLessThanEqualOrderByScheduledDateAscPeriodNumberAsc(toDate);
        } else {
            schedules = dailyScheduleRepository.findAllByOrderByScheduledDateAscPeriodNumberAsc();
        }

        return schedules.stream()
                .map(DailyScheduleDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Cacheable(value = "dailySchedulesByDate", key = "#date",
            cacheManager = "cache1h", unless = "#result == null || #result.isEmpty()")
    public List<DailyScheduleDto> getSchedulesByDate(LocalDate date) {
        return dailyScheduleRepository.findByScheduledDateOrderByPeriodNumberAsc(date)
                .stream()
                .map(DailyScheduleDto::fromEntity)
                .collect(Collectors.toList());
    }

    public DailyScheduleDto getScheduleById(Long id) {
        DailySchedule schedule = dailyScheduleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Daily schedule not found with ID: " + id));
        return DailyScheduleDto.fromEntity(schedule);
    }

    @Transactional
    @CacheEvict(value = {"dailySchedules", "dailySchedulesByDate", "studentDailyProgress"}, allEntries = true)
    public DailyScheduleDto createSchedule(DailyScheduleDto dto) {
        if (dto.studentId() == null || dto.subjectId() == null || dto.lessonTopicId() == null) {
            throw new IllegalArgumentException("Student, Subject, and Lesson Topic are required");
        }

        if (dto.scheduledDate() == null || dto.periodNumber() == null) {
            throw new IllegalArgumentException("Scheduled date and period number are required");
        }

        StudentProfile student = studentProfileRepository.findById(dto.studentId())
                .orElseThrow(() -> new EntityNotFoundException("Student not found: " + dto.studentId()));

        Subject subject = subjectRepository.findById(dto.subjectId())
                .orElseThrow(() -> new EntityNotFoundException("Subject not found: " + dto.subjectId()));

        LessonTopic lessonTopic = lessonTopicRepository.findById(dto.lessonTopicId())
                .orElseThrow(() -> new EntityNotFoundException("Lesson topic not found: " + dto.lessonTopicId()));

        if (!lessonTopic.getSubject().getId().equals(subject.getId())) {
            throw new IllegalArgumentException("Lesson topic does not belong to the specified subject");
        }

        LocalDate date = LocalDate.parse(dto.scheduledDate());

        if (dailyScheduleRepository.existsByStudentProfileAndScheduledDateAndPeriodNumber(
                student, date, dto.periodNumber())) {
            throw new IllegalStateException(
                    "Schedule already exists for this student on date " + date + " and period " + dto.periodNumber()
            );
        }

        DailySchedule schedule = new DailySchedule();
        schedule.setStudentProfile(student);
        schedule.setSubject(subject);
        schedule.setLessonTopic(lessonTopic);
        schedule.setScheduledDate(date);
        schedule.setPeriodNumber(dto.periodNumber());
        schedule.setPriority(dto.priority() != null ? dto.priority() : 3);
        schedule.setWeight(dto.weight() != null ? dto.weight() : 1.0);

        DailySchedule saved = dailyScheduleRepository.save(schedule);
        return DailyScheduleDto.fromEntity(saved);
    }

    @Transactional
    @CacheEvict(value = {"dailySchedules", "dailySchedulesByDate", "studentDailyProgress"}, allEntries = true)
    public DailyScheduleDto updateSchedule(Long id, DailyScheduleDto dto) {
        DailySchedule existing = dailyScheduleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Daily schedule not found with ID: " + id));

        if (dto.studentId() != null) {
            StudentProfile student = studentProfileRepository.findById(dto.studentId())
                    .orElseThrow(() -> new EntityNotFoundException("Student not found"));
            existing.setStudentProfile(student);
        }

        if (dto.subjectId() != null) {
            Subject subject = subjectRepository.findById(dto.subjectId())
                    .orElseThrow(() -> new EntityNotFoundException("Subject not found"));
            existing.setSubject(subject);
        }

        if (dto.lessonTopicId() != null) {
            LessonTopic lessonTopic = lessonTopicRepository.findById(dto.lessonTopicId())
                    .orElseThrow(() -> new EntityNotFoundException("Lesson topic not found"));
            existing.setLessonTopic(lessonTopic);
        }

        if (dto.scheduledDate() != null) {
            existing.setScheduledDate(LocalDate.parse(dto.scheduledDate()));
        }

        if (dto.periodNumber() != null) {
            existing.setPeriodNumber(dto.periodNumber());
        }

        if (dto.priority() != null) {
            existing.setPriority(dto.priority());
        }

        if (dto.weight() != null) {
            existing.setWeight(dto.weight());
        }

        DailySchedule updated = dailyScheduleRepository.save(existing);
        return DailyScheduleDto.fromEntity(updated);
    }

    @Transactional
    @CacheEvict(value = {"dailySchedules", "dailySchedulesByDate", "studentDailyProgress"}, allEntries = true)
    public void deleteSchedule(Long id) {
        if (!dailyScheduleRepository.existsById(id)) {
            throw new EntityNotFoundException("Daily schedule not found with ID: " + id);
        }
        dailyScheduleRepository.deleteById(id);
    }

    @Cacheable(value = "dailySchedulesBySubject", key = "#subjectId",
            cacheManager = "cache2h", unless = "#result == null || #result.isEmpty()")
    public List<DailyScheduleDto> getSchedulesBySubject(Long subjectId) {
        return dailyScheduleRepository.findBySubjectIdOrderByScheduledDateAscPeriodNumberAsc(subjectId)
                .stream()
                .map(DailyScheduleDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Cacheable(value = "dailySchedulesByTopic", key = "#lessonTopicId",
            cacheManager = "cache2h", unless = "#result == null || #result.isEmpty()")
    public List<DailyScheduleDto> getSchedulesByLessonTopic(Long lessonTopicId) {
        return dailyScheduleRepository.findByLessonTopicIdOrderByScheduledDateAscPeriodNumberAsc(lessonTopicId)
                .stream()
                .map(DailyScheduleDto::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * ✅ CRITICAL FIX: Now syncs assessment and time windows from WeeklySchedule
     */
    @Transactional
    public DailySchedule createScheduleFromWeeklyTemplate(
            StudentProfile student,
            WeeklySchedule weeklySchedule,
            LocalDate scheduledDate) {

        if (dailyScheduleRepository.existsByStudentProfileAndScheduledDateAndPeriodNumber(
                student, scheduledDate, weeklySchedule.getPeriodNumber())) {
            throw new IllegalStateException(
                    "Schedule already exists for student " + student.getId() +
                            " on date " + scheduledDate + " and period " + weeklySchedule.getPeriodNumber()
            );
        }

        DailySchedule schedule = new DailySchedule();
        schedule.setStudentProfile(student);
        schedule.setSubject(weeklySchedule.getSubject());
        schedule.setLessonTopic(weeklySchedule.getLessonTopic());
        schedule.setScheduledDate(scheduledDate);
        schedule.setPeriodNumber(weeklySchedule.getPeriodNumber());
        schedule.setStartTime(weeklySchedule.getStartTime());
        schedule.setEndTime(weeklySchedule.getEndTime());
        schedule.setPriority(weeklySchedule.getPriority());
        schedule.setWeight(weeklySchedule.getWeight());
        
        // ✅ CRITICAL FIX: Sync assessment from weekly schedule
        schedule.setAssessment(weeklySchedule.getAssessment());
        
        // ✅ CRITICAL FIX: Calculate time windows based on scheduled date + period times
        if (weeklySchedule.getStartTime() != null && weeklySchedule.getEndTime() != null) {
            LocalDateTime windowStart = LocalDateTime.of(scheduledDate, weeklySchedule.getStartTime());
            LocalDateTime windowEnd = LocalDateTime.of(scheduledDate, weeklySchedule.getEndTime());
            
            schedule.setAssessmentWindowStart(windowStart);
            schedule.setAssessmentWindowEnd(windowEnd);
            
            log.debug("Set assessment window: {} to {} for schedule on {}", 
                     windowStart, windowEnd, scheduledDate);
        } else {
            log.warn("⚠️ WeeklySchedule {} has no start/end times - assessment window not set", 
                    weeklySchedule.getId());
        }

        DailySchedule saved = dailyScheduleRepository.save(schedule);
        
        // ✅ NEW: Create progress record
        createProgressRecordForDailySchedule(saved);
        
        return saved;
    }

    @Transactional
    @CacheEvict(value = {"dailySchedules", "dailySchedulesByDate", "studentDailyProgress"}, allEntries = true)
    public List<DailySchedule> generateDailySchedulesForStudent(
            StudentProfile student,
            LocalDate date) {
        
        // ✅ ROUTING LOGIC: Route INDIVIDUAL students to their generator
        if (student.getStudentType() == StudentType.INDIVIDUAL) {
            log.info("🎯 Routing INDIVIDUAL student {} to IndividualScheduleGenerator", student.getId());
            return individualScheduleGenerator.generateForDate(student, date);
        }
        
        // ✅ EXISTING LOGIC CONTINUES UNCHANGED FOR CLASS-BASED STUDENTS
        ClassEntity studentClass = student.getClassLevel();
        String grade = extractGradeFromClassName(studentClass.getName());
        StudentType studentType = studentClass.getStudentType();
        DayOfWeek dayOfWeek = date.getDayOfWeek();

        List<Long> allowedClassIds = findClassesByGradeAndStudentType(grade, studentType);

        List<WeeklySchedule> weeklySchedules = weeklyScheduleRepository
                .findByDayOfWeekAndClassIdIn(dayOfWeek, allowedClassIds);

        List<WeeklySchedule> relevantSchedules = filterRelevantSchedules(
                weeklySchedules,
                studentClass.getId(),
                student.getDepartment() != null ? student.getDepartment().getId() : null
        );

        List<DailySchedule> dailySchedules = new ArrayList<>();
        for (WeeklySchedule ws : relevantSchedules) {
            boolean exists = dailyScheduleRepository
                    .existsByStudentProfileAndLessonTopicAndScheduledDateAndPeriodNumber(
                            student, ws.getLessonTopic(), date, ws.getPeriodNumber()
                    );

            if (!exists) {
                DailySchedule ds = new DailySchedule();
                ds.setStudentProfile(student);
                ds.setSubject(ws.getSubject());
                ds.setLessonTopic(ws.getLessonTopic());
                ds.setScheduledDate(date);
                ds.setPeriodNumber(ws.getPeriodNumber());
                ds.setStartTime(ws.getStartTime());
                ds.setEndTime(ws.getEndTime());
                ds.setPriority(ws.getPriority());
                ds.setWeight(ws.getWeight());
                ds.setScheduleSource("CLASS");
                
                // ✅ CRITICAL FIX: Sync assessment and time windows
                ds.setAssessment(ws.getAssessment());
                if (ws.getStartTime() != null && ws.getEndTime() != null) {
                    ds.setAssessmentWindowStart(LocalDateTime.of(date, ws.getStartTime()));
                    ds.setAssessmentWindowEnd(LocalDateTime.of(date, ws.getEndTime()));
                }
                
                dailySchedules.add(ds);
            }
        }

        if (!dailySchedules.isEmpty()) {
            dailyScheduleRepository.saveAll(dailySchedules);
            
            // ✅ NEW: Create progress records for all new schedules
            for (DailySchedule ds : dailySchedules) {
                createProgressRecordForDailySchedule(ds);
            }
            
            log.info("✅ Generated {} daily schedules with assessments for student {} on {}", 
                    dailySchedules.size(), student.getId(), date);
        }

        return dailyScheduleRepository.findByStudentProfileAndScheduledDate(student, date);
    }

    /**
     * ✅ NEW: Create progress record when daily schedule is generated
     */
    @Transactional
    private void createProgressRecordForDailySchedule(DailySchedule dailySchedule) {
        // Check if progress already exists
        boolean exists = progressRepository.existsByStudentProfileAndScheduledDateAndLessonTopic(
            dailySchedule.getStudentProfile(),
            dailySchedule.getScheduledDate(),
            dailySchedule.getLessonTopic()
        );
        
        if (exists) {
            log.debug("Progress already exists for schedule {}", dailySchedule.getId());
            return;
        }
        
        StudentLessonProgress progress = StudentLessonProgress.builder()
            .studentProfile(dailySchedule.getStudentProfile())
            .lessonTopic(dailySchedule.getLessonTopic())
            .subject(dailySchedule.getSubject())
            .assessment(dailySchedule.getAssessment())
            .scheduledDate(dailySchedule.getScheduledDate())
            .date(dailySchedule.getScheduledDate())
            .periodNumber(dailySchedule.getPeriodNumber())
            .priority(dailySchedule.getPriority())
            .weight(dailySchedule.getWeight())
            .assessmentWindowStart(dailySchedule.getAssessmentWindowStart())
            .assessmentWindowEnd(dailySchedule.getAssessmentWindowEnd())
            .assessmentAccessible(true)
            .completed(false)
            .build();
        
        progressRepository.save(progress);
        
        log.info("✅ Created progress record for daily schedule {} with assessment window {} to {}", 
                 dailySchedule.getId(), 
                 progress.getAssessmentWindowStart(), 
                 progress.getAssessmentWindowEnd());
    }

    private List<WeeklySchedule> filterRelevantSchedules(
            List<WeeklySchedule> schedules,
            Long studentClassId,
            Long studentDeptId) {

        return schedules.stream()
                .filter(ws -> {
                    Long scheduleClassId = ws.getClassEntity() != null
                            ? ws.getClassEntity().getId()
                            : null;

                    Long scheduleDeptId = ws.getSubject() != null &&
                            ws.getSubject().getDepartment() != null
                            ? ws.getSubject().getDepartment().getId()
                            : null;

                    if (studentClassId.equals(scheduleClassId)) {
                        return true;
                    }

                    if (GENERAL_DEPT_ID.equals(scheduleDeptId)) {
                        return true;
                    }

                    return false;
                })
                .collect(Collectors.toList());
    }

    @Transactional
    @CacheEvict(value = {"dailySchedules", "dailySchedulesByDate", "studentDailyProgress"}, allEntries = true)
    public void generateDailySchedulesForClass(Long classId, LocalDate date) {
        List<StudentProfile> students = studentProfileRepository.findByClassLevelId(classId);

        for (StudentProfile student : students) {
            try {
                generateDailySchedulesForStudent(student, date);
            } catch (Exception e) {
                log.error("Failed to generate schedule for student {}: {}", student.getId(), e.getMessage());
            }
        }
    }

    @Transactional
    @CacheEvict(value = {"dailySchedules", "dailySchedulesByDate", "studentDailyProgress"}, allEntries = true)
    public void generateDailySchedulesForAllStudents(LocalDate date) {
        List<StudentProfile> allStudents = studentProfileRepository.findAll();

        for (StudentProfile student : allStudents) {
            try {
                generateDailySchedulesForStudent(student, date);
            } catch (Exception e) {
                log.error("Failed to generate schedule for student {}: {}", student.getId(), e.getMessage());
            }
        }
    }

    @Transactional
    @CacheEvict(value = {"dailySchedules", "dailySchedulesByDate", "studentDailyProgress"}, allEntries = true)
    public void deleteOldSchedules(LocalDate beforeDate) {
        dailyScheduleRepository.deleteByScheduledDateBefore(beforeDate);
    }

    private List<Long> findClassesByGradeAndStudentType(String grade, StudentType type) {
        return classRepository.findAll().stream()
                .filter(cls -> {
                    String classGrade = extractGradeFromClassName(cls.getName());
                    return grade.equals(classGrade) && type.equals(cls.getStudentType());
                })
                .map(ClassEntity::getId)
                .collect(Collectors.toList());
    }

    private String extractGradeFromClassName(String className) {
        if (className == null) return null;
        if (className.matches(".*[JS]SS[123].*")) {
            return className.replaceAll(".*((?:J|S)SS[123]).*", "$1");
        }
        return null;
    }
}