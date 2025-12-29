package com.edu.platform.service.individual;

import com.edu.platform.dto.individual.*;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.exception.ValidationException;
import com.edu.platform.model.*;
import com.edu.platform.model.assessment.Assessment;
import com.edu.platform.model.assessment.AssessmentType;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.*;
import com.edu.platform.repository.assessment.AssessmentRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class ManualTopicAssignmentService {

    private final DailyScheduleRepository scheduleRepository;
    private final LessonTopicRepository lessonTopicRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;
    private final IndividualLessonAssigner lessonAssigner;
    private final MissingTopicNotificationService notificationService;
    private final AssessmentRepository assessmentRepository;
    private final StudentLessonProgressRepository progressRepository;
    
    // ✅ ADD: TeacherProfileRepository
    private final TeacherProfileRepository teacherProfileRepository;

    /**
     * ✅ UPDATED: Assign lesson topic to a single schedule WITH ASSESSMENT LINKING
     */
    @Transactional
    public ManualAssignmentResponse assignTopicToSchedule(ManualAssignmentRequest request) {
        log.info("📝 Manual assignment: scheduleId={}, topicId={}, method={}", 
            request.getScheduleId(), request.getLessonTopicId(), request.getAssignmentMethod());

        validateSingleAssignment(request);

        // Step 1: Assign the lesson topic
        DailySchedule updatedSchedule = lessonAssigner.manuallyAssignLessonTopic(
            request.getScheduleId(),
            request.getLessonTopicId(),
            request.getAssignedByUserId(),
            request.getAssignmentMethod()
        );

        LessonTopic topic = updatedSchedule.getLessonTopic();

        // ✅ Step 2: Check if lesson topic has an associated assessment
        Assessment assessment = findAssessmentForTopic(topic.getId());
        boolean assessmentLinked = false;
        
        if (assessment != null) {
            log.info("📝 Found assessment {} for topic {}", assessment.getId(), topic.getId());
            
            // Link assessment to schedule
            updatedSchedule.setAssessment(assessment);
            scheduleRepository.save(updatedSchedule);
            
            // Update progress record with assessment window
            updateProgressWithAssessmentWindow(updatedSchedule, assessment);
            
            assessmentLinked = true;
            log.info("✅ Assessment {} linked to schedule {}", assessment.getId(), updatedSchedule.getId());
        } else {
            log.warn("⚠️ No assessment found for topic {}", topic.getId());
        }

        ManualAssignmentResponse response = ManualAssignmentResponse.builder()
            .success(true)
            .message(assessmentLinked 
                ? "Lesson topic and assessment assigned successfully" 
                : "Lesson topic assigned successfully (no assessment available)")
            .updatedScheduleIds(List.of(updatedSchedule.getId()))
            .assignedTopicId(topic.getId())
            .assignedTopicTitle(topic.getTitle())
            .schedulesUpdatedCount(1)
            .assignedByUserId(request.getAssignedByUserId())
            .assignmentMethod(request.getAssignmentMethod())
            .assignedAt(Instant.now())
            .schedulesRegenerated(false)
            .notificationsSent(false)
            .build();

        // Send notifications if requested
        if (request.getSendNotifications()) {
            sendAssignmentNotifications(updatedSchedule, topic, request);
            response.setNotificationsSent(true);
            response.setNotificationsSentCount(1);
        }

        log.info("✅ Assignment complete for schedule {}", request.getScheduleId());
        return response;
    }

    /**
     * ✅ UPDATED: Bulk assign lesson topic WITH ASSESSMENT LINKING
     */
    @Transactional
    public ManualAssignmentResponse bulkAssignTopic(ManualAssignmentRequest request) {
        log.info("📝 Bulk assignment: topicId={}, scheduleIds count={}", 
            request.getLessonTopicId(), 
            request.getScheduleIds() != null ? request.getScheduleIds().size() : 0);

        validateBulkAssignment(request);

        LessonTopic topic = lessonTopicRepository.findById(request.getLessonTopicId())
            .orElseThrow(() -> new ResourceNotFoundException("Lesson topic not found"));

        // ✅ Check for assessment once (same topic = same assessment)
        Assessment assessment = findAssessmentForTopic(topic.getId());
        boolean hasAssessment = (assessment != null);
        
        if (hasAssessment) {
            log.info("📝 Assessment {} will be linked to all {} schedules", 
                assessment.getId(), request.getScheduleIds().size());
        }

        List<Long> updatedIds = new ArrayList<>();
        List<Long> failedIds = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        int assessmentsLinked = 0;

        for (Long scheduleId : request.getScheduleIds()) {
            try {
                // Assign topic
                DailySchedule schedule = lessonAssigner.manuallyAssignLessonTopic(
                    scheduleId,
                    request.getLessonTopicId(),
                    request.getAssignedByUserId(),
                    request.getAssignmentMethod()
                );
                
                // ✅ Link assessment if available
                if (hasAssessment) {
                    schedule.setAssessment(assessment);
                    scheduleRepository.save(schedule);
                    
                    // Update progress with assessment window
                    updateProgressWithAssessmentWindow(schedule, assessment);
                    assessmentsLinked++;
                }
                
                updatedIds.add(schedule.getId());
                
            } catch (Exception e) {
                log.error("❌ Failed to assign topic to schedule {}: {}", scheduleId, e.getMessage());
                failedIds.add(scheduleId);
                warnings.add(String.format("Schedule %d: %s", scheduleId, e.getMessage()));
            }
        }

        String message = hasAssessment 
            ? String.format("Assigned topic and assessment to %d of %d schedules", 
                updatedIds.size(), request.getScheduleIds().size())
            : String.format("Assigned topic to %d of %d schedules (no assessment available)", 
                updatedIds.size(), request.getScheduleIds().size());

        ManualAssignmentResponse response = ManualAssignmentResponse.builder()
            .success(failedIds.isEmpty())
            .message(message)
            .updatedScheduleIds(updatedIds)
            .assignedTopicId(topic.getId())
            .assignedTopicTitle(topic.getTitle())
            .schedulesUpdatedCount(updatedIds.size())
            .assignedByUserId(request.getAssignedByUserId())
            .assignmentMethod(request.getAssignmentMethod())
            .assignedAt(Instant.now())
            .schedulesRegenerated(false)
            .warnings(warnings)
            .failedScheduleIds(failedIds)
            .build();

        log.info("✅ Bulk assignment complete: {} success, {} failed, {} assessments linked", 
            updatedIds.size(), failedIds.size(), assessmentsLinked);

        return response;
    }

    /**
     * ✅ NEW: Find assessment for a lesson topic
     */
    private Assessment findAssessmentForTopic(Long lessonTopicId) {
        List<Assessment> assessments = assessmentRepository.findByLessonTopicIdAndType(
            lessonTopicId, 
            AssessmentType.LESSON_TOPIC_ASSESSMENT
        );
        
        if (assessments.isEmpty()) {
            return null;
        }
        
        // Return the first published assessment, or first unpublished if none published
        return assessments.stream()
            .filter(Assessment::getPublished)
            .findFirst()
            .orElse(assessments.get(0));
    }

    /**
     * ✅ FIXED: Update progress record with assessment window times
     */
    private void updateProgressWithAssessmentWindow(DailySchedule schedule, Assessment assessment) {
        try {
            // Find existing progress record
            List<StudentLessonProgress> progressList = progressRepository
                .findByStudentProfileAndLessonTopicAndScheduledDate(
                    schedule.getStudentProfile(),
                    schedule.getLessonTopic(),
                    schedule.getScheduledDate()
                );
            
            StudentLessonProgress progress;
            
            if (progressList.isEmpty()) {
                // Create new progress record
                progress = StudentLessonProgress.builder()
                    .studentProfile(schedule.getStudentProfile())
                    .lessonTopic(schedule.getLessonTopic())
                    .subject(schedule.getSubject())
                    .topic(schedule.getLessonTopic())
                    .scheduledDate(schedule.getScheduledDate())
                    .date(schedule.getScheduledDate())
                    .periodNumber(schedule.getPeriodNumber())
                    .completed(false)
                    .build();
                
                log.info("📝 Creating new progress record for student {} on {}", 
                    schedule.getStudentProfile().getId(), schedule.getScheduledDate());
            } else {
                progress = progressList.get(0);
                log.info("📝 Updating existing progress record {}", progress.getId());
            }
            
            // Set assessment entity
            progress.setAssessment(assessment);
            progress.setAssessmentAccessible(true);
            
            // Set assessment window based on schedule times
            LocalDateTime windowStart = LocalDateTime.of(
                schedule.getScheduledDate(), 
                schedule.getStartTime()
            );
            LocalDateTime windowEnd = LocalDateTime.of(
                schedule.getScheduledDate(), 
                schedule.getEndTime()
            );
            
            progress.setAssessmentWindowStart(windowStart);
            progress.setAssessmentWindowEnd(windowEnd);
            
            progressRepository.save(progress);
            
            log.info("✅ Assessment window set: {} to {}", 
                windowStart.toLocalTime(), windowEnd.toLocalTime());
                
        } catch (Exception e) {
            log.error("❌ Failed to update progress with assessment window: {}", e.getMessage(), e);
        }
    }

    /**
     * ✅ UPDATED: Get suggested topics with assessment information
     */
    public List<PendingAssignmentDto.SuggestedTopicDto> getSuggestedTopics(Long scheduleId) {
        log.info("💡 Finding suggested topics for schedule {}", scheduleId);

        DailySchedule schedule = scheduleRepository.findById(scheduleId)
            .orElseThrow(() -> new ResourceNotFoundException("Schedule not found"));

        if (schedule.getSubject() == null) {
            log.warn("⚠️ Schedule has no subject");
            return Collections.emptyList();
        }

        // Find topics for same subject
        List<LessonTopic> topicsForSubject = lessonTopicRepository
            .findBySubject(schedule.getSubject());

        return topicsForSubject.stream()
            .map(topic -> {
                // Check if student already used this topic
                boolean alreadyUsed = scheduleRepository.existsByStudentProfileAndLessonTopic(
                    schedule.getStudentProfile(), topic
                );

                // Check if topic has an assessment
                Assessment assessment = findAssessmentForTopic(topic.getId());
                boolean hasAssessment = (assessment != null);
                Long assessmentId = hasAssessment ? assessment.getId() : null;
                String assessmentTitle = hasAssessment ? assessment.getTitle() : null;
                Boolean assessmentPublished = hasAssessment ? assessment.getPublished() : null;
                int questionCount = 0;
                
                if (hasAssessment && assessment.getPublished()) {
                    questionCount = Math.toIntExact(
                        assessmentRepository.countQuestionsByAssessmentId(assessment.getId())
                    );
                }

                return PendingAssignmentDto.SuggestedTopicDto.builder()
                    .topicId(topic.getId())
                    .topicTitle(topic.getTitle())
                    .description(topic.getDescription())
                    .weekNumber(topic.getWeekNumber())
                    .alreadyUsedByStudent(alreadyUsed)
                    .usageCount(0)
                    .hasAssessment(hasAssessment)
                    .assessmentId(assessmentId)
                    .assessmentTitle(assessmentTitle)
                    .assessmentPublished(assessmentPublished)
                    .questionCount(questionCount)
                    .build();
            })
            .collect(Collectors.toList());
    }

    // ============================================================
    // QUERY METHODS
    // ============================================================

    public List<PendingAssignmentDto> getAllPendingAssignments() {
        log.info("📋 Fetching all pending assignments");
        List<DailySchedule> missingSchedules = scheduleRepository
            .findByMissingLessonTopicTrueAndScheduleSource("INDIVIDUAL");
        return missingSchedules.stream()
            .map(this::mapToPendingDto)
            .collect(Collectors.toList());
    }

    public List<PendingAssignmentDto> getPendingAssignmentsByWeek(Integer weekNumber) {
        log.info("📋 Fetching pending assignments for week {}", weekNumber);
        LocalDate[] weekRange = calculateWeekRange(weekNumber);
        if (weekRange == null) {
            return Collections.emptyList();
        }
        List<DailySchedule> missingSchedules = scheduleRepository
            .findMissingTopicsForWeek("INDIVIDUAL", weekRange[0], weekRange[1]);
        return missingSchedules.stream()
            .map(this::mapToPendingDto)
            .collect(Collectors.toList());
    }

    public List<PendingAssignmentDto> getPendingAssignmentsBySubject(Long subjectId) {
        log.info("📋 Fetching pending assignments for subject {}", subjectId);
        Subject subject = subjectRepository.findById(subjectId)
            .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
        List<DailySchedule> missingSchedules = scheduleRepository
            .findByMissingLessonTopicTrueAndSubjectAndScheduleSource(subject, "INDIVIDUAL");
        return missingSchedules.stream()
            .map(this::mapToPendingDto)
            .collect(Collectors.toList());
    }

    public List<PendingAssignmentDto> getPendingAssignmentsForStudent(Long studentProfileId) {
        log.info("📋 Fetching pending assignments for student {}", studentProfileId);
        StudentProfile student = studentProfileRepository.findById(studentProfileId)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        List<DailySchedule> missingSchedules = scheduleRepository
            .findByStudentProfileAndMissingLessonTopicTrue(student);
        return missingSchedules.stream()
            .map(this::mapToPendingDto)
            .collect(Collectors.toList());
    }

    /**
     * ✅ FIXED: Get pending assignments filtered by teacher's assigned subjects
     */
    public List<PendingAssignmentDto> getPendingAssignmentsForTeacher(Long teacherProfileId) {
        log.info("📋 Fetching pending assignments for teacher {}", teacherProfileId);

        // Step 1: Get teacher profile with subjects
        TeacherProfile teacher = teacherProfileRepository.findById(teacherProfileId)
            .orElseThrow(() -> new ResourceNotFoundException("Teacher profile not found: " + teacherProfileId));

        // ✅ FIX: Extract subject IDs from Set<Subject>
        Set<Subject> teacherSubjects = teacher.getSubjects();
        
        if (teacherSubjects == null || teacherSubjects.isEmpty()) {
            log.warn("⚠️ Teacher {} has no assigned subjects", teacherProfileId);
            return Collections.emptyList();
        }

        // Extract subject IDs
        List<Long> teacherSubjectIds = teacherSubjects.stream()
            .map(Subject::getId)
            .collect(Collectors.toList());

        log.info("🔍 Teacher {} teaches {} subjects: {}", 
            teacherProfileId, teacherSubjectIds.size(), teacherSubjectIds);

        // Step 2: Get all pending INDIVIDUAL schedules
        List<DailySchedule> allPendingSchedules = scheduleRepository
            .findByMissingLessonTopicTrueAndScheduleSource("INDIVIDUAL");

        log.info("📊 Found {} total pending schedules (before filtering)", allPendingSchedules.size());

        // Step 3: Filter to only schedules for teacher's subjects
        List<DailySchedule> teacherPendingSchedules = allPendingSchedules.stream()
            .filter(schedule -> schedule.getSubject() != null)
            .filter(schedule -> teacherSubjectIds.contains(schedule.getSubject().getId()))
            .collect(Collectors.toList());

        log.info("✅ Filtered to {} pending schedules for teacher's subjects", 
            teacherPendingSchedules.size());

        // Step 4: Log subject breakdown
        Map<String, Long> subjectBreakdown = teacherPendingSchedules.stream()
            .collect(Collectors.groupingBy(
                s -> s.getSubject().getName(), 
                Collectors.counting()
            ));
        
        subjectBreakdown.forEach((subject, count) -> 
            log.info("  - {}: {} pending", subject, count));

        // Step 5: Convert to DTOs
        return teacherPendingSchedules.stream()
            .map(this::mapToPendingDto)
            .collect(Collectors.toList());
    }

    /**
     * ✅ NEW: Get pending assignments for teacher filtered by specific subject
     */
    public List<PendingAssignmentDto> getPendingAssignmentsForTeacherAndSubject(
            Long teacherProfileId, 
            Long subjectId) {
        
        log.info("📋 Fetching pending assignments for teacher {} and subject {}", 
            teacherProfileId, subjectId);

        // Verify teacher teaches this subject
        TeacherProfile teacher = teacherProfileRepository.findById(teacherProfileId)
            .orElseThrow(() -> new ResourceNotFoundException("Teacher profile not found"));

        // ✅ FIX: Check if subject is in teacher's subjects Set
        boolean teachesSubject = teacher.getSubjects().stream()
            .anyMatch(subject -> subject.getId().equals(subjectId));

        if (!teachesSubject) {
            throw new ValidationException("Teacher does not teach subject " + subjectId);
        }

        // Get pending schedules for this subject
        Subject subject = subjectRepository.findById(subjectId)
            .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));

        List<DailySchedule> schedules = scheduleRepository
            .findByMissingLessonTopicTrueAndSubjectAndScheduleSource(subject, "INDIVIDUAL");

        log.info("✅ Found {} pending schedules for subject {}", 
            schedules.size(), subject.getName());

        return schedules.stream()
            .map(this::mapToPendingDto)
            .collect(Collectors.toList());
    }

    /**
     * ✅ NEW: Get count of pending assignments by subject for a teacher
     */
    public Map<Long, Integer> countPendingBySubjectForTeacher(Long teacherProfileId) {
        log.info("📊 Counting pending assignments by subject for teacher {}", teacherProfileId);

        List<PendingAssignmentDto> pending = getPendingAssignmentsForTeacher(teacherProfileId);

        return pending.stream()
            .filter(p -> p.getSubjectId() != null)
            .collect(Collectors.groupingBy(
                PendingAssignmentDto::getSubjectId,
                Collectors.collectingAndThen(Collectors.counting(), Long::intValue)
            ));
    }

    /**
     * ✅ NEW: Check if teacher can assign to a specific schedule
     */
    public boolean canTeacherAssignToSchedule(Long teacherProfileId, Long scheduleId) {
        DailySchedule schedule = scheduleRepository.findById(scheduleId)
            .orElseThrow(() -> new ResourceNotFoundException("Schedule not found"));

        TeacherProfile teacher = teacherProfileRepository.findById(teacherProfileId)
            .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));

        if (schedule.getSubject() == null) {
            return false;
        }

        // ✅ FIX: Check if subject is in teacher's subjects Set
        return teacher.getSubjects().stream()
            .anyMatch(subject -> subject.getId().equals(schedule.getSubject().getId()));
    }

    // ============================================================
    // HELPER METHODS
    // ============================================================

    private void validateSingleAssignment(ManualAssignmentRequest request) {
        if (request.getScheduleId() == null) {
            throw new ValidationException("Schedule ID is required");
        }
        if (request.getLessonTopicId() == null) {
            throw new ValidationException("Lesson topic ID is required");
        }
        if (request.getAssignedByUserId() == null) {
            throw new ValidationException("Assigned by user ID is required");
        }
        if (request.getAssignmentMethod() == null) {
            throw new ValidationException("Assignment method is required");
        }
    }

    private void validateBulkAssignment(ManualAssignmentRequest request) {
        if (request.getScheduleIds() == null || request.getScheduleIds().isEmpty()) {
            throw new ValidationException("Schedule IDs list is required and cannot be empty");
        }
        if (request.getLessonTopicId() == null) {
            throw new ValidationException("Lesson topic ID is required");
        }
        if (request.getAssignedByUserId() == null) {
            throw new ValidationException("Assigned by user ID is required");
        }
    }

    private PendingAssignmentDto mapToPendingDto(DailySchedule schedule) {
        StudentProfile student = schedule.getStudentProfile();
        User studentUser = student.getUser();

        long daysPending = ChronoUnit.DAYS.between(
            schedule.getScheduledDate(), 
            LocalDate.now()
        );

        return PendingAssignmentDto.builder()
            .scheduleId(schedule.getId())
            .scheduledDate(schedule.getScheduledDate())
            .dayOfWeek(schedule.getScheduledDate().getDayOfWeek().toString())
            .periodNumber(schedule.getPeriodNumber())
            .startTime(schedule.getStartTime())
            .endTime(schedule.getEndTime())
            .studentProfileId(student.getId())
            .studentName(studentUser.getFullName())
            .className(student.getClassLevel() != null ? 
                student.getClassLevel().getName() : "N/A")
            .studentType(student.getStudentType().name())
            .subjectId(schedule.getSubject() != null ? schedule.getSubject().getId() : null)
            .subjectName(schedule.getSubject() != null ? schedule.getSubject().getName() : "Unknown")
            .subjectCode(schedule.getSubject() != null ? schedule.getSubject().getCode() : null)
            .scheduleStatus(schedule.getScheduleStatus() != null ? 
                schedule.getScheduleStatus().name() : null)
            .missingLessonTopic(schedule.getMissingLessonTopic())
            .assignmentMethod(schedule.getLessonAssignmentMethod())
            .daysPending((int) daysPending)
            .hasConflict(schedule.getHasScheduleConflict())
            .build();
    }

    private LocalDate[] calculateWeekRange(Integer weekNumber) {
        log.warn("⚠️ Week range calculation not yet implemented");
        return null;
    }

    private void sendAssignmentNotifications(
            DailySchedule schedule, 
            LessonTopic topic, 
            ManualAssignmentRequest request) {
        log.info("📧 Sending assignment notifications");
        log.warn("⚠️ Assignment notifications not yet implemented");
    }
}