package com.edu.platform.service;

import com.edu.platform.dto.classdata.LessonAiQuestionDto;
import com.edu.platform.dto.classdata.LessonAiStatusDto;
import com.edu.platform.dto.classdata.LessonTopicDto;
import com.edu.platform.model.*;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.repository.*;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LessonTopicService {

    private final LessonTopicRepository lessonRepository;
    private final SubjectRepository subjectRepository;
    private final TermRepository termRepository;
    private final IntegrationService integrationService;
    private final LessonAIQuestionRepository lessonAIQuestionRepository;
    private final TeacherProfileRepository teacherProfileRepository;
    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    
    // ✅ S3 Storage Service
    private final S3StorageService s3StorageService;

    @Value("${app.backend-base-url:http://localhost:8080/api/v1}")
    private String backendBaseUrl;

    // -------------------- Utility Methods --------------------

    private boolean isAdmin(String email) {
        if (email == null || email.isBlank()) return false;

        return userRepository.findByEmail(email)
                .map(user -> user.getRoles().stream()
                        .anyMatch(role -> "ADMIN".equals(role.getName())))
                .orElse(false);
    }

    private Set<Long> getTeacherSubjectIds(String email) {
        if (email == null || email.isBlank()) {
            log.warn("⚠️ Null or empty email provided to getTeacherSubjectIds");
            return Collections.emptySet();
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));

        if (isAdmin(email)) {
            log.info("🔓 Admin user detected - accessing all subjects");
            return subjectRepository.findAll().stream()
                    .map(Subject::getId)
                    .collect(Collectors.toSet());
        }

        TeacherProfile profile = teacherProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Teacher profile not found for user: " + email));

        return profile.getSubjects().stream()
                .map(Subject::getId)
                .collect(Collectors.toSet());
    }

    private void validateTeacherSubjectAccess(String email, Long subjectId) {
        if (email == null || email.isBlank()) {
            throw new RuntimeException("Email is required for subject access validation");
        }

        if (isAdmin(email)) {
            log.debug("🔓 Admin user - skipping subject access validation");
            return;
        }

        Set<Long> teacherSubjectIds = getTeacherSubjectIds(email);
        if (!teacherSubjectIds.contains(subjectId)) {
            throw new RuntimeException("You do not have permission to access this subject");
        }
    }

    public List<LessonTopic> getLessonsByTeacher(String teacherEmail) {
        if (teacherEmail == null || teacherEmail.isBlank() || isAdmin(teacherEmail)) {
            log.info("🔓 Admin or null email - returning all lessons");
            return lessonRepository.findAll();
        }

        Set<Long> subjectIds = getTeacherSubjectIds(teacherEmail);
        if (subjectIds.isEmpty()) {
            log.warn("⚠️ Teacher {} has no assigned subjects", teacherEmail);
            return Collections.emptyList();
        }

        return lessonRepository.findBySubjectIdIn(subjectIds);
    }

    // -------------------- Lesson CRUD --------------------

    @Transactional(propagation = Propagation.REQUIRED)
    public LessonTopic createLesson(LessonTopicDto dto, MultipartFile file, String teacherEmail) {
        validateTeacherSubjectAccess(teacherEmail, dto.getSubjectId());

        LessonTopic lesson = new LessonTopic();
        lesson.setTopicTitle(dto.getTopicTitle());
        lesson.setDescription(dto.getDescription());
        lesson.setWeekNumber(dto.getWeekNumber());
        lesson.setAspirantMaterial(dto.isAspirantMaterial());

        Subject subject = subjectRepository.findById(dto.getSubjectId())
                .orElseThrow(() -> new NoSuchElementException("Subject not found with id: " + dto.getSubjectId()));
        lesson.setSubject(subject);

        if (dto.getTermId() != null) {
            Term term = termRepository.findById(dto.getTermId())
                    .orElseThrow(() -> new NoSuchElementException("Term not found with id: " + dto.getTermId()));
            lesson.setTerm(term);
        }

        // ✅ Upload file to S3 instead of local filesystem
        if (file != null && !file.isEmpty()) {
            try {
                String s3Url = s3StorageService.uploadFile(file, "lessons");
                lesson.setFileUrl(s3Url);
                log.info("✅ File uploaded to S3: {}", s3Url);
            } catch (IOException e) {
                log.error("❌ Failed to upload file to S3: {}", e.getMessage());
                throw new RuntimeException("Failed to upload file", e);
            }
        }

        // Save and flush to get ID
        LessonTopic savedLesson = lessonRepository.save(lesson);
        lessonRepository.flush();
        log.info("✅ Lesson saved with ID: {} - preparing to trigger AI after commit", savedLesson.getId());

        // ✅ Schedule AI processing AFTER transaction commits
        if (savedLesson.getFileUrl() != null) {
            Long lessonId = savedLesson.getId();
            String fileUrl = savedLesson.getFileUrl();
            
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    log.info("🔒 Transaction committed for lesson {} - triggering AI now", lessonId);
                    try {
                        Thread.sleep(100);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                    triggerPythonAIAsync(lessonId, fileUrl);
                }
            });
        }

        return savedLesson;
    }

    @Async
    public void triggerPythonAIAsync(Long lessonId, String fileUrl) {
        try {
            LessonTopic lesson = lessonRepository.findById(lessonId)
                    .orElseThrow(() -> new RuntimeException("Lesson not found: " + lessonId));
            
            log.info("🚀 Triggering AI processing for lesson {} (subject={}, week={})", 
                    lessonId, lesson.getSubject().getId(), lesson.getWeekNumber());
            
            // ✅ Pass S3 URL directly to Python service
            // Your Python service will need to download from S3
            integrationService.processLessonWithPython(
                    lessonId,
                    lesson.getSubject().getId(),
                    lesson.getWeekNumber(),
                    fileUrl  // Pass S3 URL instead of local path
            );
            
            log.info("✅ AI processing request sent for lesson {}", lessonId);
        } catch (Exception e) {
            log.error("❌ Failed to trigger AI for lesson {}: {}", lessonId, e.getMessage(), e);
        }
    }

    @Transactional
    public void regenerateLessonAI(Long lessonId, String teacherEmail) {
        LessonTopic lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new NoSuchElementException("Lesson not found with id: " + lessonId));

        validateTeacherSubjectAccess(teacherEmail, lesson.getSubject().getId());

        if (lesson.getFileUrl() == null || lesson.getFileUrl().isBlank()) {
            throw new IllegalStateException("No uploaded file found for lesson, cannot regenerate AI");
        }

        Long finalLessonId = lessonId;
        String fileUrl = lesson.getFileUrl();
        
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                log.info("🔒 Regeneration transaction committed for lesson {} - triggering AI", finalLessonId);
                try {
                    Thread.sleep(100);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                triggerPythonAIAsync(finalLessonId, fileUrl);
            }
        });
    }

    @Transactional
    public LessonTopic updateLesson(Long id, LessonTopic updated, String teacherEmail) {
        return lessonRepository.findById(id)
                .map(existing -> {
                    validateTeacherSubjectAccess(teacherEmail, existing.getSubject().getId());

                    existing.setWeekNumber(updated.getWeekNumber());
                    existing.setTopicTitle(updated.getTopicTitle());
                    existing.setDescription(updated.getDescription());

                    if (updated.getSubject() != null &&
                            !Objects.equals(existing.getSubject().getId(), updated.getSubject().getId())) {
                        Subject newSubject = subjectRepository.findById(updated.getSubject().getId())
                                .orElseThrow(() -> new NoSuchElementException("Subject not found: " + updated.getSubject().getId()));
                        existing.setSubject(newSubject);
                    }

                    if (updated.getTerm() != null) {
                        Term term = termRepository.findById(updated.getTerm().getId())
                                .orElseThrow(() -> new NoSuchElementException("Term not found: " + updated.getTerm().getId()));
                        existing.setTerm(term);
                    } else {
                        existing.setTerm(null);
                    }

                    existing.setFileUrl(updated.getFileUrl());
                    existing.setAspirantMaterial(updated.isAspirantMaterial());

                    return lessonRepository.save(existing);
                })
                .orElseThrow(() -> new NoSuchElementException("Lesson not found with id: " + id));
    }

    @Transactional
    public void updateQuestionCount(Long lessonId, int questionCount) {
        LessonTopic lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new NoSuchElementException("Lesson not found: " + lessonId));
        lesson.setQuestionCount(questionCount);
        lessonRepository.save(lesson);
        log.info("✅ Updated question count for lesson {} to {}", lessonId, questionCount);
    }

    @Transactional
    public void deleteLesson(Long id, String teacherEmail) {
        LessonTopic lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Lesson not found: " + id));

        validateTeacherSubjectAccess(teacherEmail, lesson.getSubject().getId());

        // ✅ Delete file from S3
        if (lesson.getFileUrl() != null && !lesson.getFileUrl().isBlank()) {
            try {
                s3StorageService.deleteFile(lesson.getFileUrl());
                log.info("✅ Deleted file from S3 for lesson {}", id);
            } catch (Exception e) {
                log.error("❌ Failed to delete file from S3 for lesson {}: {}", id, e.getMessage());
            }
        }

        integrationService.deleteAIResultsForLesson(id);
        lessonRepository.deleteById(id);
        log.info("✅ Deleted lesson with id {}", id);
    }

    // -------------------- Fetch Lessons --------------------

    public List<LessonTopic> getLessonsBySubject(Long subjectId, String teacherEmail) {
        validateTeacherSubjectAccess(teacherEmail, subjectId);
        return lessonRepository.findBySubjectId(subjectId);
    }

    public List<LessonTopic> getLessonsBySubjectAndTerm(Long subjectId, Long termId) {
        return lessonRepository.findBySubjectIdAndTermId(subjectId, termId);
    }

    public List<LessonTopic> getLessonsByTermAndWeek(Long termId, int weekNumber) {
        return lessonRepository.findByTermIdAndWeekNumber(termId, weekNumber);
    }

    public List<LessonTopic> getAllLessons() {
        return lessonRepository.findAll();
    }

    public List<LessonTopicDto> getLessonsForStudent(Set<Long> subjectIds, String studentType) {
        if (subjectIds == null || subjectIds.isEmpty()) {
            return Collections.emptyList();
        }

        List<LessonTopic> lessons = "ASPIRANT".equalsIgnoreCase(studentType)
                ? lessonRepository.findBySubjectIdInAndIsAspirantMaterialTrue(subjectIds)
                : lessonRepository.findBySubjectIdInAndIsAspirantMaterialFalse(subjectIds);

        return lessons.stream()
                .map(this::convertToDto)
                .sorted(Comparator
                        .comparing((LessonTopicDto l) -> Optional.ofNullable(l.getSubjectName()).orElse(""))
                        .thenComparing(l -> Optional.ofNullable(l.getTermId()).orElse(0L))
                        .thenComparing(LessonTopicDto::getWeekNumber))
                .collect(Collectors.toList());
    }

    /**
     * Get lessons for a student by their profile ID
     */
    public List<LessonTopicDto> getLessonsForStudent(Long studentProfileId) {
        StudentProfile student = studentProfileRepository.findById(studentProfileId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Student not found: " + studentProfileId));

        if (student.getClassLevel() == null) {
            log.warn("⚠️ Student {} ({}) has no class assigned", 
                    studentProfileId, student.getStudentType());
            return Collections.emptyList();
        }
        
        Set<Long> subjectIds = student.getClassLevel().getSubjects().stream()
                .map(Subject::getId)
                .collect(Collectors.toSet());
        
        if (subjectIds.isEmpty()) {
            log.warn("⚠️ Student {} has class {} but no subjects", 
                    studentProfileId, student.getClassLevel().getName());
            return Collections.emptyList();
        }
        
        log.info("📌 {} student {} - Class: {} - Subjects: {}", 
                student.getStudentType(), 
                studentProfileId, 
                student.getClassLevel().getName(),
                subjectIds);

        return getLessonsForStudent(subjectIds, student.getStudentType().name());
    }

    /**
     * Get lessons for a student filtered by subject
     */
    public List<LessonTopicDto> getLessonsForStudentAndSubject(Long studentProfileId, Long subjectId) {
        StudentProfile student = studentProfileRepository.findById(studentProfileId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Student not found: " + studentProfileId));

        Set<Long> singleSubjectId = Collections.singleton(subjectId);
        
        log.info("📌 Fetching lessons for {} student {} in subject {}", 
                student.getStudentType(), studentProfileId, subjectId);

        List<LessonTopic> lessons = "ASPIRANT".equalsIgnoreCase(student.getStudentType().name())
                ? lessonRepository.findBySubjectIdInAndIsAspirantMaterialTrue(singleSubjectId)
                : lessonRepository.findBySubjectIdInAndIsAspirantMaterialFalse(singleSubjectId);
        
        log.info("✅ Found {} lessons for {} student in subject {}", 
                lessons.size(), student.getStudentType(), subjectId);

        return lessons.stream()
                .map(this::convertToDto)
                .sorted(Comparator
                        .comparing((LessonTopicDto l) -> Optional.ofNullable(l.getTermId()).orElse(0L))
                        .thenComparing(LessonTopicDto::getWeekNumber)
                        .thenComparing(LessonTopicDto::getTopicTitle))
                .collect(Collectors.toList());
    }

    // -------------------- AI Integration --------------------

    public LessonAiStatusDto getLessonAiStatus(Long lessonId) {
        return integrationService.getLessonAiStatus(lessonId);
    }

    public List<LessonAiQuestionDto> getAIQuestionsByLessonTopicIds(Set<Long> lessonTopicIds) {
        if (lessonTopicIds == null || lessonTopicIds.isEmpty()) return Collections.emptyList();

        List<LessonAIQuestion> questions = lessonAIQuestionRepository
                .findByLessonAIResultLessonTopicIdIn(lessonTopicIds);

        return questions.stream().map(q -> {
            LessonAiQuestionDto dto = new LessonAiQuestionDto();
            dto.setId(q.getId());
            if (q.getLessonAIResult() != null && q.getLessonAIResult().getLessonTopic() != null)
                dto.setLessonId(q.getLessonAIResult().getLessonTopic().getId());
            dto.setQuestionText(q.getQuestionText());
            dto.setAnswerText(q.getAnswerText());
            dto.setDifficulty(q.getDifficulty());
            dto.setMaxScore(q.getMaxScore());
            dto.setOptionA(q.getOptionA());
            dto.setOptionB(q.getOptionB());
            dto.setOptionC(q.getOptionC());
            dto.setOptionD(q.getOptionD());
            dto.setCorrectOption(q.getCorrectOption());
            dto.setStudentType(q.getStudentType());
            return dto;
        }).collect(Collectors.toList());
    }

    // -------------------- DTO Conversion --------------------

    private LessonTopicDto convertToDto(LessonTopic lesson) {
        LessonTopicDto dto = new LessonTopicDto();
        dto.setId(lesson.getId());
        dto.setSubjectId(lesson.getSubject().getId());
        dto.setSubjectName(lesson.getSubject().getName());
        dto.setTermId(lesson.getTerm() != null ? lesson.getTerm().getId() : null);
        dto.setTermName(lesson.getTerm() != null ? lesson.getTerm().getName() : null);
        dto.setWeekNumber(lesson.getWeekNumber());
        dto.setTopicTitle(lesson.getTopicTitle());
        dto.setDescription(lesson.getDescription());
        dto.setFileUrl(lesson.getFileUrl());
        dto.setAspirantMaterial(lesson.isAspirantMaterial());

        int questionCount = Optional.ofNullable(lesson.getQuestionCount()).orElse(0);
        dto.setQuestionCount(questionCount);

        if (questionCount > 0) {
            dto.setStatus("done");
            dto.setProgress(100.0);
        } else {
            try {
                LessonAiStatusDto aiStatus = integrationService.getLessonAiStatus(lesson.getId());
                dto.setStatus(aiStatus.getStatus());
                dto.setProgress(aiStatus.getProgress() != null ? aiStatus.getProgress().doubleValue() : 0.0);
            } catch (Exception e) {
                dto.setStatus("pending");
                dto.setProgress(0.0);
            }
        }

        return dto;
    }

    public List<LessonTopicDto> getLessonsBySubjectAsDto(Long subjectId, String teacherEmail) {
        if (teacherEmail != null && !teacherEmail.isBlank()) validateTeacherSubjectAccess(teacherEmail, subjectId);
        return lessonRepository.findBySubjectId(subjectId).stream().map(this::convertToDto).collect(Collectors.toList());
    }

    public List<LessonTopicDto> getAllLessonsAsDto(String teacherEmail) {
        return getLessonsByTeacher(teacherEmail).stream().map(this::convertToDto).collect(Collectors.toList());
    }

    public LessonTopic getLessonById(Long id) {
        return lessonRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Lesson topic not found: " + id));
    }

    public List<LessonTopicDto> getLessonsBySubjectIdPublic(Long subjectId) {
        return lessonRepository.findBySubjectId(subjectId).stream().map(this::convertToDto).collect(Collectors.toList());
    }
}