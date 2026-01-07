package com.edu.platform.service;

import com.edu.platform.dto.classdata.WeeklyScheduleDto;
import com.edu.platform.dto.validation.ValidationResult;
import com.edu.platform.exception.InsufficientQuestionsException;
import com.edu.platform.model.*;
import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.repository.*;
import com.edu.platform.service.assessment.AutoAssessmentService;
import com.edu.platform.service.schedule.WeeklyScheduleValidationService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class WeeklyScheduleService {

    private final WeeklyScheduleValidationService validationService;
    private final WeeklyScheduleRepository weeklyScheduleRepository;
    private final SubjectRepository subjectRepository;
    private final ClassRepository classRepository;
    private final LessonTopicRepository lessonTopicRepository;
    private final UserRepository userRepository;
    private final DailyScheduleService dailyScheduleService;
    private final StudentService studentService;
    private final DailyScheduleRepository dailyScheduleRepository;
    private final TermService termService;
    private final AutoAssessmentService autoAssessmentService;
    private final StudentProfileRepository studentProfileRepository;

    @Cacheable(value = "allWeeklySchedules", cacheManager = "cache12h", 
               unless = "#result == null || #result.isEmpty()")
    public List<WeeklySchedule> getAllSchedules() {
        return weeklyScheduleRepository.findAll();
    }

    @Cacheable(value = "classWeeklySchedules", key = "#classId", cacheManager = "cache12h", 
               unless = "#result == null || #result.isEmpty()")
    public List<WeeklySchedule> getSchedulesByClass(Long classId) {
        return weeklyScheduleRepository.findByClassEntityId(classId);
    }

    public WeeklySchedule getScheduleById(Long id) {
        return weeklyScheduleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Weekly schedule not found with ID: " + id));
    }

    @Transactional
    @CacheEvict(value = {"allWeeklySchedules", "classWeeklySchedules", "dailySchedules", 
                         "dailySchedulesByDate", "studentDailyProgress"}, allEntries = true)
    public WeeklySchedule createSchedule(WeeklyScheduleDto dto) {
        log.info("📅 Creating weekly schedule for class {} week {} on {} period {}", 
                 dto.classId(), dto.weekNumber(), dto.dayOfWeek(), dto.periodNumber());

        if (dto.classId() == null || dto.subjectId() == null || 
            dto.dayOfWeek() == null || dto.periodNumber() == null || dto.weekNumber() == null) {
            throw new IllegalArgumentException(
                "Class, Subject, Week Number, Day of Week, and Period Number are required"
            );
        }

        ValidationResult validation = validationService.validateScheduleCanBeCreated(dto);
        
        if (!validation.isCanCreate()) {
            log.error("❌ Validation failed: {}", validation.getReason());
            throw new InsufficientQuestionsException(validation.getReason());
        }
        
        log.info("✅ Validation passed: {} questions available", validation.getQuestionCount());

        ClassEntity classEntity = classRepository.findById(dto.classId())
                .orElseThrow(() -> new EntityNotFoundException("Class not found: " + dto.classId()));

        Subject subject = subjectRepository.findById(dto.subjectId())
                .orElseThrow(() -> new EntityNotFoundException("Subject not found: " + dto.subjectId()));

        LessonTopic lessonTopic = null;
        if (dto.lessonTopicId() != null) {
            lessonTopic = lessonTopicRepository.findById(dto.lessonTopicId())
                    .orElseThrow(() -> new EntityNotFoundException("Lesson topic not found: " + dto.lessonTopicId()));
        }

        User teacher = null;
        if (dto.teacherId() != null) {
            teacher = userRepository.findById(dto.teacherId())
                    .orElseThrow(() -> new EntityNotFoundException("Teacher not found: " + dto.teacherId()));
        }

        if (weeklyScheduleRepository.existsByClassEntityIdAndWeekNumberAndDayOfWeekAndPeriodNumber(
                classEntity.getId(), dto.weekNumber(), dto.dayOfWeek(), dto.periodNumber())) {
            throw new IllegalStateException(
                "Weekly schedule already exists for class " + classEntity.getName() + 
                " week " + dto.weekNumber() + " on " + dto.dayOfWeek() + " period " + dto.periodNumber()
            );
        }

        WeeklySchedule schedule = WeeklySchedule.builder()
                .classEntity(classEntity)
                .subject(subject)
                .lessonTopic(lessonTopic)
                .teacher(teacher)
                .weekNumber(dto.weekNumber())
                .dayOfWeek(dto.dayOfWeek())
                .periodNumber(dto.periodNumber())
                .startTime(dto.startTime())
                .endTime(dto.endTime())
                .priority(dto.priority() != null ? dto.priority() : 3)
                .weight(dto.weight() != null ? dto.weight() : 1.0)
                .build();

        Assessment assessment;
        try {
            assessment = autoAssessmentService.createMandatoryAssessment(schedule);
            int questionCount = assessment.getQuestionCount();
            log.info("✅ Created assessment {} with {} questions", 
                    assessment.getId(), questionCount);
                    
        } catch (InsufficientQuestionsException e) {
            log.error("❌ Failed to create assessment: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("❌ Unexpected error creating assessment", e);
            throw new RuntimeException("Failed to create mandatory assessment: " + e.getMessage(), e);
        }

        schedule.setAssessment(assessment);

        WeeklySchedule saved = weeklyScheduleRepository.save(schedule);
        log.info("✅ Created weekly schedule ID {} for week {} with {} questions", 
                saved.getId(), saved.getWeekNumber(), assessment.getQuestionCount());

        try {
            generateDailySchedulesForWeeklyTemplate(saved);
        } catch (Exception e) {
            log.error("❌ Failed to generate daily schedules for weekly schedule {}", saved.getId(), e);
        }

        return saved;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void generateDailySchedulesForWeeklyTemplate(WeeklySchedule weeklySchedule) {
        log.info("🔄 Auto-generating daily schedules from weekly template ID {} for week {}", 
            weeklySchedule.getId(), weeklySchedule.getWeekNumber());

        Term activeTerm = termService.getActiveTerm()
                .orElseThrow(() -> new IllegalStateException("No active term configured. Please set an active term first."));

        if (weeklySchedule.getWeekNumber() < 1 || weeklySchedule.getWeekNumber() > activeTerm.getWeekCount()) {
            throw new IllegalArgumentException(
                String.format("Week number %d is outside term range (1-%d)", 
                    weeklySchedule.getWeekNumber(), activeTerm.getWeekCount())
            );
        }

        List<StudentProfile> students = studentService.getStudentsByClassId(
                weeklySchedule.getClassEntity().getId()
        );

        if (students.isEmpty()) {
            log.warn("⚠️ No students found in class {}", weeklySchedule.getClassEntity().getName());
            return;
        }

        LocalDate targetDate = calculateDateForWeekAndDay(
            activeTerm, 
            weeklySchedule.getWeekNumber(), 
            weeklySchedule.getDayOfWeek()
        );

        log.info("📆 Target date for Week {} {}: {}", 
            weeklySchedule.getWeekNumber(), weeklySchedule.getDayOfWeek(), targetDate);

        if (!activeTerm.containsDate(targetDate)) {
            log.warn("⚠️ Calculated date {} is outside term range {}-{}", 
                targetDate, activeTerm.getStartDate(), activeTerm.getEndDate());
            return;
        }

        int generatedCount = 0;
        int skippedCount = 0;

        for (StudentProfile student : students) {
            boolean exists = dailyScheduleRepository.existsByStudentProfileAndScheduledDateAndPeriodNumber(
                student, 
                targetDate, 
                weeklySchedule.getPeriodNumber()
            );

            if (exists) {
                log.debug("⏭️ Skipping duplicate: Schedule already exists for student {} on {} period {}", 
                    student.getId(), targetDate, weeklySchedule.getPeriodNumber());
                skippedCount++;
                continue;
            }

            DailySchedule schedule = new DailySchedule();
            schedule.setStudentProfile(student);
            schedule.setSubject(weeklySchedule.getSubject());
            schedule.setLessonTopic(weeklySchedule.getLessonTopic());
            schedule.setScheduledDate(targetDate);
            schedule.setPeriodNumber(weeklySchedule.getPeriodNumber());
            schedule.setStartTime(weeklySchedule.getStartTime());
            schedule.setEndTime(weeklySchedule.getEndTime());
            schedule.setPriority(weeklySchedule.getPriority());
            schedule.setWeight(weeklySchedule.getWeight());
            schedule.setScheduleSource("CLASS");
            
            // ✅ CRITICAL FIX: Sync assessment from weekly schedule
            schedule.setAssessment(weeklySchedule.getAssessment());
            
            // ✅ CRITICAL FIX: Calculate time windows
            if (weeklySchedule.getStartTime() != null && weeklySchedule.getEndTime() != null) {
                LocalDateTime windowStart = LocalDateTime.of(targetDate, weeklySchedule.getStartTime());
                LocalDateTime windowEnd = LocalDateTime.of(targetDate, weeklySchedule.getEndTime());
                
                schedule.setAssessmentWindowStart(windowStart);
                schedule.setAssessmentWindowEnd(windowEnd);
                
                log.debug("✅ Set assessment window for student {}: {} to {}", 
                         student.getId(), windowStart, windowEnd);
            } else {
                log.warn("⚠️ WeeklySchedule {} has no start/end times - assessment window not set", 
                        weeklySchedule.getId());
            }

            dailyScheduleRepository.save(schedule);
            generatedCount++;
        }

        log.info("✅ Generated {} daily schedules with assessments for {} students on {} (Week {}, skipped {} duplicates)", 
                 generatedCount, students.size(), targetDate, weeklySchedule.getWeekNumber(), skippedCount);
    }

    private LocalDate calculateDateForWeekAndDay(Term term, Integer weekNumber, DayOfWeek dayOfWeek) {
        LocalDate weekStart = term.getWeekStartDate(weekNumber);
        LocalDate targetDate = weekStart;
        
        while (targetDate.getDayOfWeek() != dayOfWeek) {
            targetDate = targetDate.plusDays(1);
            
            if (targetDate.isAfter(weekStart.plusDays(6))) {
                throw new IllegalStateException(
                    String.format("Could not find %s in week %d starting %s", 
                        dayOfWeek, weekNumber, weekStart)
                );
            }
        }
        
        return targetDate;
    }

    @Transactional
    @CacheEvict(value = {"allWeeklySchedules", "classWeeklySchedules", "dailySchedules"}, allEntries = true)
    public WeeklySchedule updateSchedule(Long id, WeeklyScheduleDto dto) {
        WeeklySchedule existing = getScheduleById(id);

        if (dto.classId() != null) {
            ClassEntity classEntity = classRepository.findById(dto.classId())
                    .orElseThrow(() -> new EntityNotFoundException("Class not found"));
            existing.setClassEntity(classEntity);
        }

        if (dto.subjectId() != null) {
            Subject subject = subjectRepository.findById(dto.subjectId())
                    .orElseThrow(() -> new EntityNotFoundException("Subject not found"));
            existing.setSubject(subject);
        }

        if (dto.lessonTopicId() != null) {
            LessonTopic topic = lessonTopicRepository.findById(dto.lessonTopicId())
                    .orElseThrow(() -> new EntityNotFoundException("Lesson topic not found"));
            existing.setLessonTopic(topic);
        }

        if (dto.teacherId() != null) {
            User teacher = userRepository.findById(dto.teacherId())
                    .orElseThrow(() -> new EntityNotFoundException("Teacher not found"));
            existing.setTeacher(teacher);
        }

        if (dto.dayOfWeek() != null) existing.setDayOfWeek(dto.dayOfWeek());
        if (dto.periodNumber() != null) existing.setPeriodNumber(dto.periodNumber());
        if (dto.weekNumber() != null) existing.setWeekNumber(dto.weekNumber());
        if (dto.startTime() != null) existing.setStartTime(dto.startTime());
        if (dto.endTime() != null) existing.setEndTime(dto.endTime());
        if (dto.priority() != null) existing.setPriority(dto.priority());
        if (dto.weight() != null) existing.setWeight(dto.weight());

        return weeklyScheduleRepository.save(existing);
    }

    @Transactional
    @CacheEvict(value = {"allWeeklySchedules", "classWeeklySchedules"}, allEntries = true)
    public void deleteSchedule(Long id) {
        if (!weeklyScheduleRepository.existsById(id))
            throw new EntityNotFoundException("Weekly schedule not found with ID: " + id);
        weeklyScheduleRepository.deleteById(id);
    }

    public List<WeeklySchedule> getSchedulesByClassAndDay(Long classId, DayOfWeek dayOfWeek) {
        return weeklyScheduleRepository.findByClassEntityIdAndDayOfWeek(classId, dayOfWeek);
    }

    @Transactional
    @CacheEvict(value = {"dailySchedules", "dailySchedulesByDate", "studentDailyProgress"}, 
                allEntries = true)
    public int generateDailySchedulesForAllWeeks() {
        log.info("🔄 Generating daily schedules for ALL weeks in active term");
        
        Term activeTerm = termService.getActiveTerm()
                .orElseThrow(() -> new IllegalStateException(
                    "No active term configured. Please set an active term first."));
        
        List<WeeklySchedule> allWeeklySchedules = weeklyScheduleRepository.findAll();
        
        if (allWeeklySchedules.isEmpty()) {
            log.warn("⚠️ No weekly schedules found");
            return 0;
        }
        
        int totalGenerated = 0;
        int totalSkipped = 0;
        
        for (WeeklySchedule weeklySchedule : allWeeklySchedules) {
            try {
                if (weeklySchedule.getWeekNumber() < 1 || 
                    weeklySchedule.getWeekNumber() > activeTerm.getWeekCount()) {
                    log.debug("⏭️ Skipping weekly schedule {} - Week {} outside term range (1-{})", 
                        weeklySchedule.getId(), 
                        weeklySchedule.getWeekNumber(),
                        activeTerm.getWeekCount());
                    totalSkipped++;
                    continue;
                }
                
                LocalDate targetDate = calculateDateForWeekAndDay(
                    activeTerm, 
                    weeklySchedule.getWeekNumber(), 
                    weeklySchedule.getDayOfWeek()
                );
                
                if (!activeTerm.containsDate(targetDate)) {
                    log.debug("⏭️ Skipping - Date {} outside term bounds", targetDate);
                    totalSkipped++;
                    continue;
                }
                
                List<StudentProfile> students = studentService.getStudentsByClassId(
                    weeklySchedule.getClassEntity().getId()
                );
                
                if (students.isEmpty()) {
                    log.debug("⏭️ No students in class {}", 
                        weeklySchedule.getClassEntity().getName());
                    totalSkipped++;
                    continue;
                }
                
                int generatedForSchedule = 0;
                for (StudentProfile student : students) {
                    boolean exists = dailyScheduleRepository
                        .existsByStudentProfileAndScheduledDateAndPeriodNumber(
                            student, targetDate, weeklySchedule.getPeriodNumber()
                        );
                    
                    if (exists) {
                        continue;
                    }
                    
                    DailySchedule schedule = new DailySchedule();
                    schedule.setStudentProfile(student);
                    schedule.setSubject(weeklySchedule.getSubject());
                    schedule.setLessonTopic(weeklySchedule.getLessonTopic());
                    schedule.setScheduledDate(targetDate);
                    schedule.setPeriodNumber(weeklySchedule.getPeriodNumber());
                    schedule.setStartTime(weeklySchedule.getStartTime());
                    schedule.setEndTime(weeklySchedule.getEndTime());
                    schedule.setPriority(weeklySchedule.getPriority());
                    schedule.setWeight(weeklySchedule.getWeight());
                    schedule.setScheduleSource("CLASS");
                    
                    // ✅ CRITICAL FIX: Sync assessment and time windows
                    schedule.setAssessment(weeklySchedule.getAssessment());
                    
                    if (weeklySchedule.getStartTime() != null && weeklySchedule.getEndTime() != null) {
                        schedule.setAssessmentWindowStart(LocalDateTime.of(targetDate, weeklySchedule.getStartTime()));
                        schedule.setAssessmentWindowEnd(LocalDateTime.of(targetDate, weeklySchedule.getEndTime()));
                    }
                    
                    dailyScheduleRepository.save(schedule);
                    generatedForSchedule++;
                    totalGenerated++;
                }
                
                if (generatedForSchedule > 0) {
                    log.info("✅ Generated {} daily schedules from weekly schedule {} (Week {}, {}, Period {})",
                        generatedForSchedule,
                        weeklySchedule.getId(),
                        weeklySchedule.getWeekNumber(),
                        weeklySchedule.getDayOfWeek(),
                        weeklySchedule.getPeriodNumber());
                }
                
            } catch (Exception e) {
                log.error("❌ Failed to process weekly schedule {}: {}", 
                    weeklySchedule.getId(), e.getMessage(), e);
            }
        }
        
        log.info("✅ Generation complete: {} daily schedules created, {} skipped", 
            totalGenerated, totalSkipped);
        
        return totalGenerated;
    }

    /**
     * ✅ FIXED: Generate daily schedules for a specific student with assessment sync
     */
    @Transactional
    @CacheEvict(value = {"dailySchedules", "studentDailyProgress"}, allEntries = true)
    public int generateDailySchedulesForStudent(Long studentId) {
        log.info("🔄 Generating daily schedules for student {}", studentId);
        
        StudentProfile student = studentProfileRepository.findById(studentId)
                .orElseThrow(() -> new EntityNotFoundException("Student not found: " + studentId));
        
        Term activeTerm = termService.getActiveTerm()
                .orElseThrow(() -> new IllegalStateException("No active term configured"));
        
        ClassEntity studentClass = student.getClassLevel();
        if (studentClass == null) {
            log.warn("⚠️ Student {} has no class assigned", studentId);
            return 0;
        }
        
        List<WeeklySchedule> weeklySchedules = weeklyScheduleRepository
            .findByClassEntityId(studentClass.getId());
        
        if (weeklySchedules.isEmpty()) {
            log.warn("⚠️ No weekly schedules found for class {}", studentClass.getName());
            return 0;
        }
        
        int generatedCount = 0;
        
        for (WeeklySchedule weeklySchedule : weeklySchedules) {
            try {
                if (weeklySchedule.getWeekNumber() < 1 || 
                    weeklySchedule.getWeekNumber() > activeTerm.getWeekCount()) {
                    continue;
                }
                
                LocalDate targetDate = calculateDateForWeekAndDay(
                    activeTerm, 
                    weeklySchedule.getWeekNumber(), 
                    weeklySchedule.getDayOfWeek()
                );
                
                if (!activeTerm.containsDate(targetDate)) {
                    continue;
                }
                
                boolean exists = dailyScheduleRepository
                    .existsByStudentProfileAndScheduledDateAndPeriodNumber(
                        student, targetDate, weeklySchedule.getPeriodNumber()
                    );
                
                if (exists) {
                    continue;
                }
                
                DailySchedule schedule = new DailySchedule();
                schedule.setStudentProfile(student);
                schedule.setSubject(weeklySchedule.getSubject());
                schedule.setLessonTopic(weeklySchedule.getLessonTopic());
                schedule.setScheduledDate(targetDate);
                schedule.setPeriodNumber(weeklySchedule.getPeriodNumber());
                schedule.setStartTime(weeklySchedule.getStartTime());
                schedule.setEndTime(weeklySchedule.getEndTime());
                schedule.setPriority(weeklySchedule.getPriority());
                schedule.setWeight(weeklySchedule.getWeight());
                schedule.setScheduleSource("CLASS");
                
                // ✅ CRITICAL FIX: Sync assessment from weekly schedule
                schedule.setAssessment(weeklySchedule.getAssessment());
                
                // ✅ CRITICAL FIX: Calculate time windows
                if (weeklySchedule.getStartTime() != null && weeklySchedule.getEndTime() != null) {
                    LocalDateTime windowStart = LocalDateTime.of(targetDate, weeklySchedule.getStartTime());
                    LocalDateTime windowEnd = LocalDateTime.of(targetDate, weeklySchedule.getEndTime());
                    
                    schedule.setAssessmentWindowStart(windowStart);
                    schedule.setAssessmentWindowEnd(windowEnd);
                    
                    log.debug("✅ Set assessment window: {} to {}", windowStart, windowEnd);
                }
                
                dailyScheduleRepository.save(schedule);
                generatedCount++;
                
            } catch (Exception e) {
                log.error("❌ Failed to generate from weekly schedule {}: {}", 
                    weeklySchedule.getId(), e.getMessage());
            }
        }
        
        log.info("✅ Generated {} daily schedules with assessments for student {}", generatedCount, studentId);
        return generatedCount;
    }

    /**
     * ✅ FIXED: Regenerate daily schedules for a class with assessment sync
     */
    @Transactional
    @CacheEvict(value = {"dailySchedules", "dailySchedulesByDate", "studentDailyProgress"}, 
                allEntries = true)
    public int regenerateDailySchedulesForClass(Long classId) {
        log.info("🔄 Regenerating daily schedules for class {}", classId);
        
        Term activeTerm = termService.getActiveTerm()
                .orElseThrow(() -> new IllegalStateException("No active term configured"));
        
        List<WeeklySchedule> classSchedules = weeklyScheduleRepository.findByClassEntityId(classId);
        
        if (classSchedules.isEmpty()) {
            log.warn("⚠️ No weekly schedules found for class {}", classId);
            return 0;
        }
        
        List<StudentProfile> students = studentService.getStudentsByClassId(classId);
        
        if (students.isEmpty()) {
            log.warn("⚠️ No students found in class {}", classId);
            return 0;
        }
        
        int totalGenerated = 0;
        
        for (WeeklySchedule weeklySchedule : classSchedules) {
            try {
                if (weeklySchedule.getWeekNumber() < 1 || 
                    weeklySchedule.getWeekNumber() > activeTerm.getWeekCount()) {
                    continue;
                }
                
                LocalDate targetDate = calculateDateForWeekAndDay(
                    activeTerm, 
                    weeklySchedule.getWeekNumber(), 
                    weeklySchedule.getDayOfWeek()
                );
                
                if (!activeTerm.containsDate(targetDate)) {
                    continue;
                }
                
                for (StudentProfile student : students) {
                    boolean exists = dailyScheduleRepository
                        .existsByStudentProfileAndScheduledDateAndPeriodNumber(
                            student, targetDate, weeklySchedule.getPeriodNumber()
                        );
                    
                    if (exists) {
                        continue;
                    }
                    
                    DailySchedule schedule = new DailySchedule();
                    schedule.setStudentProfile(student);
                    schedule.setSubject(weeklySchedule.getSubject());
                    schedule.setLessonTopic(weeklySchedule.getLessonTopic());
                    schedule.setScheduledDate(targetDate);
                    schedule.setPeriodNumber(weeklySchedule.getPeriodNumber());
                    schedule.setStartTime(weeklySchedule.getStartTime());
                    schedule.setEndTime(weeklySchedule.getEndTime());
                    schedule.setPriority(weeklySchedule.getPriority());
                    schedule.setWeight(weeklySchedule.getWeight());
                    schedule.setScheduleSource("CLASS");
                    
                    // ✅ CRITICAL FIX: Sync assessment from weekly schedule
                    schedule.setAssessment(weeklySchedule.getAssessment());
                    
                    // ✅ CRITICAL FIX: Calculate time windows
                    if (weeklySchedule.getStartTime() != null && weeklySchedule.getEndTime() != null) {
                        LocalDateTime windowStart = LocalDateTime.of(targetDate, weeklySchedule.getStartTime());
                        LocalDateTime windowEnd = LocalDateTime.of(targetDate, weeklySchedule.getEndTime());
                        
                        schedule.setAssessmentWindowStart(windowStart);
                        schedule.setAssessmentWindowEnd(windowEnd);
                    }
                    
                    dailyScheduleRepository.save(schedule);
                    totalGenerated++;
                }
                
            } catch (Exception e) {
                log.error("❌ Failed to process weekly schedule {}: {}", 
                    weeklySchedule.getId(), e.getMessage());
            }
        }
        
        log.info("✅ Regenerated {} daily schedules with assessments for class {}", totalGenerated, classId);
        return totalGenerated;
    }
    
    
    /**
     * ✅ NEW METHOD: Regenerate daily schedules for a student
     * This UPDATES existing schedules with missing assessment references and time windows
     */
    @Transactional
    @CacheEvict(value = {"dailySchedules", "studentDailyProgress"}, allEntries = true)
    public int regenerateDailySchedulesForStudent(Long studentId) {
        log.info("🔄 REGENERATING daily schedules for student {} (will update existing)", studentId);
        
        StudentProfile student = studentProfileRepository.findById(studentId)
                .orElseThrow(() -> new EntityNotFoundException("Student not found: " + studentId));
        
        Term activeTerm = termService.getActiveTerm()
                .orElseThrow(() -> new IllegalStateException("No active term configured"));
        
        ClassEntity studentClass = student.getClassLevel();
        if (studentClass == null) {
            log.warn("⚠️ Student {} has no class assigned", studentId);
            return 0;
        }
        
        List<WeeklySchedule> weeklySchedules = weeklyScheduleRepository
            .findByClassEntityId(studentClass.getId());
        
        if (weeklySchedules.isEmpty()) {
            log.warn("⚠️ No weekly schedules found for class {}", studentClass.getName());
            return 0;
        }
        
        int updatedCount = 0;
        int createdCount = 0;
        
        for (WeeklySchedule weeklySchedule : weeklySchedules) {
            try {
                if (weeklySchedule.getWeekNumber() < 1 || 
                    weeklySchedule.getWeekNumber() > activeTerm.getWeekCount()) {
                    continue;
                }
                
                LocalDate targetDate = calculateDateForWeekAndDay(
                    activeTerm, 
                    weeklySchedule.getWeekNumber(), 
                    weeklySchedule.getDayOfWeek()
                );
                
                if (!activeTerm.containsDate(targetDate)) {
                    continue;
                }
                
                // ✅ CRITICAL: Find existing schedule OR create new one
                DailySchedule schedule = dailyScheduleRepository
                    .findByStudentProfileAndScheduledDateAndPeriodNumber(
                        student, targetDate, weeklySchedule.getPeriodNumber()
                    )
                    .orElse(null);
                
                if (schedule == null) {
                    // Create new schedule
                    schedule = new DailySchedule();
                    schedule.setStudentProfile(student);
                    schedule.setSubject(weeklySchedule.getSubject());
                    schedule.setLessonTopic(weeklySchedule.getLessonTopic());
                    schedule.setScheduledDate(targetDate);
                    schedule.setPeriodNumber(weeklySchedule.getPeriodNumber());
                    schedule.setStartTime(weeklySchedule.getStartTime());
                    schedule.setEndTime(weeklySchedule.getEndTime());
                    schedule.setPriority(weeklySchedule.getPriority());
                    schedule.setWeight(weeklySchedule.getWeight());
                    schedule.setScheduleSource("CLASS");
                    createdCount++;
                } else {
                    // Update existing schedule
                    log.debug("🔄 Updating existing schedule ID {} for student {} on {}", 
                             schedule.getId(), studentId, targetDate);
                    updatedCount++;
                }
                
                // ✅ ALWAYS sync assessment from weekly schedule
                schedule.setAssessment(weeklySchedule.getAssessment());
                
                // ✅ ALWAYS recalculate time windows
                if (weeklySchedule.getStartTime() != null && weeklySchedule.getEndTime() != null) {
                    LocalDateTime windowStart = LocalDateTime.of(targetDate, weeklySchedule.getStartTime());
                    LocalDateTime windowEnd = LocalDateTime.of(targetDate, weeklySchedule.getEndTime());
                    
                    schedule.setAssessmentWindowStart(windowStart);
                    schedule.setAssessmentWindowEnd(windowEnd);
                    
                    log.debug("✅ Synced assessment {} with window: {} to {}", 
                             weeklySchedule.getAssessment() != null ? weeklySchedule.getAssessment().getId() : "null",
                             windowStart, windowEnd);
                } else {
                    log.warn("⚠️ WeeklySchedule {} has no start/end times", weeklySchedule.getId());
                }
                
                DailySchedule savedSchedule = dailyScheduleRepository.save(schedule);

             // ✅ CRITICAL: Create progress record with correct time windows
             try {
                 dailyScheduleService.createProgressRecordForDailySchedule(savedSchedule);
                 log.debug("✅ Created progress record for schedule {}", savedSchedule.getId());
             } catch (Exception progressError) {
                 log.error("❌ Failed to create progress for schedule {}: {}", 
                          savedSchedule.getId(), progressError.getMessage());
             }

             } catch (Exception e) {
                 log.error("❌ Failed to regenerate from weekly schedule {}: {}", 
                     weeklySchedule.getId(), e.getMessage());
             }
        }
        
        log.info("✅ Regenerated {} schedules for student {} ({} updated, {} created)", 
                 updatedCount + createdCount, studentId, updatedCount, createdCount);
        return updatedCount + createdCount;
    }
}