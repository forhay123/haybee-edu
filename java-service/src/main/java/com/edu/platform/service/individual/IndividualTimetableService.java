package com.edu.platform.service.individual;

import com.edu.platform.dto.individual.*;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.exception.ValidationException;
import com.edu.platform.integration.PythonIndividualClient;
import com.edu.platform.model.ClassEntity;
import com.edu.platform.model.DailySchedule;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Term;
import com.edu.platform.model.TeacherProfile;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.model.individual.IndividualStudentTimetable;
import com.edu.platform.model.progress.StudentLessonProgress;
import com.edu.platform.repository.ClassRepository;
import com.edu.platform.repository.DailyScheduleRepository;
import com.edu.platform.repository.StudentProfileRepository;
import com.edu.platform.repository.SubjectRepository;
import com.edu.platform.repository.TeacherProfileRepository;
import com.edu.platform.repository.TermRepository;
import com.edu.platform.repository.individual.IndividualTimetableRepository;
import com.edu.platform.repository.progress.StudentLessonProgressRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class IndividualTimetableService {
    
    private final IndividualTimetableRepository timetableRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final TeacherProfileRepository teacherProfileRepository;
    private final TermRepository termRepository;
    private final PythonIndividualClient pythonClient;
    private final ClassRepository classRepository;
    private final SubjectRepository subjectRepository;
    private final TermWeekCalculator termWeekCalculator;
    private final DailyScheduleRepository scheduleRepository;
    private final StudentLessonProgressRepository progressRepository;
    
    @Value("${file.upload.directory:uploads/individual/timetables}")
    private String uploadDirectory;
    
    @Value("${file.upload.base-path:/app}")
    private String uploadBasePath;
    
    @Value("${file.upload.max-size:10485760}") // 10MB default
    private long maxFileSize;
    
    @Value("${server.base-url:http://localhost:8080}")
    private String serverBaseUrl;
    
    private static final List<String> ALLOWED_FILE_TYPES = Arrays.asList(
        "application/pdf",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "image/jpeg",
        "image/png"
    );
    
    // ============================================================
    // STUDENT & ADMIN UPLOAD
    // ============================================================
    
    /**
     * Upload and store timetable file
     */
    @Transactional
    public TimetableUploadResponse uploadTimetable(
            MultipartFile file, 
            TimetableUploadRequest request) throws IOException {
        
        log.info("📥 Processing timetable upload for student: {}, class: {}", 
                 request.getStudentProfileId(), request.getClassId());
        
        validateFile(file);
        
        // ✅ NEW: Validate upload timing
        try {
            validateUploadTiming(request);
        } catch (ValidationException e) {
            log.warn("❌ Upload timing validation failed: {}", e.getMessage());
            throw e;
        }
        
        // ✅ SPRINT 4: Validate one-timetable rule
        // ADD THIS BLOCK HERE ⬇️⬇️⬇️
        try {
            validateOneTimetableRule(request.getStudentProfileId());
        } catch (ValidationException e) {
            log.warn("❌ One-timetable validation failed: {}", e.getMessage());
            throw e;
        }
        
        StudentProfile student = studentProfileRepository.findById(request.getStudentProfileId())
        	    .orElseThrow(() -> new ResourceNotFoundException(
        	        "Student not found: " + request.getStudentProfileId()));
        
        StudentType studentType = student.getStudentType();
        log.info("🔍 Checking student type. Current value: {} (enum)", studentType);
        
        if (studentType == null || studentType != StudentType.INDIVIDUAL) {
            String errorMsg = String.format(
                "Only INDIVIDUAL students can upload timetables. Current student type: %s", 
                studentType
            );
            log.warn("❌ {}", errorMsg);
            throw new ValidationException(errorMsg);
        }
        
        log.info("✅ Student type validated successfully: INDIVIDUAL");
        
        // ✅ Validate class if provided
        ClassEntity classEntity = null;
        if (request.getClassId() != null) {
            classEntity = classRepository.findById(request.getClassId())
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Class not found: " + request.getClassId()));
            
            // ✅ Verify it's an INDIVIDUAL class
            if (classEntity.getStudentType() != StudentType.INDIVIDUAL) {
                throw new ValidationException(
                    "Class must be of type INDIVIDUAL. Found: " + classEntity.getStudentType()
                );
            }
            
            log.info("✅ Class validated: {} ({})", classEntity.getName(), classEntity.getId());
        } else {
            log.warn("⚠️ No class ID provided - subject mapping may be less accurate");
        }
        
        Term term = null;
        if (request.getTermId() != null) {
            term = termRepository.findById(request.getTermId())
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Term not found: " + request.getTermId()));
        }
        
        String relativePath = saveFile(file);
        Path absolutePath = Paths.get(uploadBasePath, relativePath);
        String pythonFilePath = absolutePath.toString();
        String filename = Paths.get(relativePath).getFileName().toString();
        String fileUrl = serverBaseUrl + "/api/v1/individual/timetable/files/" + filename;
        
        log.info("📁 File paths:");
        log.info("   Relative: {}", relativePath);
        log.info("   Absolute (for Python): {}", pythonFilePath);
        log.info("   URL: {}", fileUrl);
        
        // ✅ Store classEntity in timetable record
        IndividualStudentTimetable timetable = IndividualStudentTimetable.builder()
        	    .studentProfile(student)
        	    .classEntity(classEntity)
        	    .term(term)
        	    .academicYear(request.getAcademicYear())
        	    .originalFilename(file.getOriginalFilename())
        	    .fileUrl(relativePath)
        	    .fileType(getFileTypeFromContentType(file.getContentType()))
        	    .fileSizeBytes(file.getSize())
        	    .uploadType(request.getUploadType() != null ? request.getUploadType() : "file") // ✅ NEW
        	    .processingStatus("PENDING")
        	    .uploadedAt(Instant.now())
        	    .build();
        
        timetable = timetableRepository.save(timetable);
        
        log.info("✅ Timetable uploaded successfully. ID: {}", timetable.getId());
        
        Long finalTimetableId = timetable.getId();
        String finalFileUrl = fileUrl;
        Long finalClassId = request.getClassId(); // ✅ Capture for async call
        
        // ✅ Trigger Python processing with class ID
        new Thread(() -> {
            try {
                log.info("🚀 Triggering Python AI processing for timetable ID: {}", finalTimetableId);
                log.info("   File path: {}", finalFileUrl);
                log.info("   Class ID: {}", finalClassId); // ✅ Log class ID
                
                // ✅ Pass class ID to Python
                Map<String, Object> result = pythonClient.processTimetableWithClass(
                    finalTimetableId, 
                    student.getId(), 
                    finalFileUrl,
                    finalClassId // ✅ NEW: Pass class ID to Python
                );
                log.info("✅ Python AI processing triggered: {}", result);
            } catch (Exception e) {
                log.error("❌ Failed to trigger Python AI: {}", e.getMessage(), e);
                updateProcessingStatus(finalTimetableId, "FAILED", e.getMessage());
            }
        }).start();
        
        // ✅ Include class info in response
        return TimetableUploadResponse.builder()
            .timetableId(timetable.getId())
            .filename(timetable.getOriginalFilename())
            .fileUrl(fileUrl)
            .processingStatus(timetable.getProcessingStatus())
            .uploadedAt(timetable.getUploadedAt())
            .classId(finalClassId) // ✅ Include in response
            .className(classEntity != null ? classEntity.getName() : null)
            .message("Timetable uploaded successfully and queued for AI processing")
            .build();
    }
    
    // ============================================================
    // BASIC QUERIES (ALL ROLES)
    // ============================================================
    
    /**
     * Get timetable by ID
     */
    public IndividualTimetableDto getTimetableById(Long id) {
        IndividualStudentTimetable timetable = timetableRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Timetable not found: " + id));
        return mapToDto(timetable);
    }
    
    /**
     * Get all timetables for a student
     */
    public List<IndividualTimetableDto> getTimetablesForStudent(Long studentProfileId) {
        List<IndividualStudentTimetable> timetables = 
            timetableRepository.findByStudentProfileIdOrderByUploadedAtDesc(studentProfileId);
        return timetables.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }
    
    /**
     * Get latest timetable for a student
     */
    public IndividualTimetableDto getLatestTimetable(Long studentProfileId) {
        StudentProfile student = studentProfileRepository.findById(studentProfileId)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        
        return timetableRepository.findFirstByStudentProfileOrderByUploadedAtDesc(student)
            .map(this::mapToDto)
            .orElse(null);
    }
    
    /**
     * Get latest COMPLETED timetable for schedule generation
     */
    public IndividualTimetableDto getLatestCompletedTimetable(Long studentProfileId) {
        StudentProfile student = studentProfileRepository.findById(studentProfileId)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        
        return timetableRepository
            .findFirstByStudentProfileAndProcessingStatusOrderByUploadedAtDesc(student, "COMPLETED")
            .map(this::mapToDto)
            .orElse(null);
    }
    
    /**
     * Get all entries for a timetable (from JSON field)
     */
    public List<TimetableEntryDto> getTimetableEntries(Long timetableId) {
        log.info("📋 Fetching entries for timetable ID: {}", timetableId);
        
        IndividualStudentTimetable timetable = timetableRepository.findById(timetableId)
            .orElseThrow(() -> new ResourceNotFoundException("Timetable not found: " + timetableId));
        
        if (timetable.getExtractedEntries() == null || timetable.getExtractedEntries().isEmpty()) {
            log.info("⚠️ No entries found for timetable ID: {}", timetableId);
            return List.of();
        }
        
        List<TimetableEntryDto> entries = timetable.getExtractedEntries().stream()
            .map(this::mapJsonToEntryDto)
            .collect(Collectors.toList());
        
        log.info("✅ Found {} entries for timetable ID: {}", entries.size(), timetableId);
        return entries;
    }
    
    /**
     * SPRINT 4: Enhanced delete timetable with schedule cleanup
     * 
     * Deletes:
     * - The timetable record
     * - All future schedules
     * - All incomplete progress records
     * 
     * Preserves:
     * - Completed assessment records (moved to archive)
     */
    @Transactional
    public TimetableDeleteResponse deleteTimetableWithCleanup(TimetableDeleteRequest request) {
        log.info("🗑️ Deleting timetable {} for student {} with cleanup", 
            request.getTimetableId(), request.getStudentProfileId());
        
        // Validate confirmation
        if (request.getConfirmDeletion() == null || !request.getConfirmDeletion()) {
            throw new ValidationException("Deletion must be explicitly confirmed");
        }
        
        // Get timetable
        IndividualStudentTimetable timetable = timetableRepository.findById(request.getTimetableId())
            .orElseThrow(() -> new ResourceNotFoundException("Timetable not found: " + request.getTimetableId()));
        
        // Verify ownership
        if (!timetable.getStudentProfile().getId().equals(request.getStudentProfileId())) {
            throw new ValidationException("Timetable does not belong to this student");
        }
        
        TimetableDeleteResponse response = TimetableDeleteResponse.builder()
            .deletedTimetableId(request.getTimetableId())
            .deletedAt(Instant.now())
            .success(false)
            .build();
        
        try {
            // Step 1: Delete future schedules
            LocalDate today = LocalDate.now();
            int schedulesDeleted = scheduleRepository.deleteByIndividualTimetableIdAndScheduledDateGreaterThanEqual(
                request.getTimetableId(), today
            );
            response.setSchedulesDeleted(schedulesDeleted);
            log.info("🗑️ Deleted {} future schedules", schedulesDeleted);
            
            // Step 2: Delete incomplete progress records
            int incompleteProgressDeleted = progressRepository
                .deleteIncompleteProgressForStudent(
                    timetable.getStudentProfile(), 
                    today, 
                    LocalDate.now().plusYears(1)
                );
            response.setIncompleteProgressDeleted(incompleteProgressDeleted);
            log.info("🗑️ Deleted {} incomplete progress records", incompleteProgressDeleted);
            
            // Step 3: Count completed assessments (will be preserved in archive)
            if (request.getPreserveCompletedAssessments()) {
                int completedCount = progressRepository.countCompletedProgressForStudent(
                    timetable.getStudentProfile(),
                    LocalDate.now().minusMonths(6),
                    today
                );
                response.setCompletedAssessmentsPreserved(completedCount);
                log.info("✅ Preserving {} completed assessments in archive", completedCount);
            }
            
            // Step 4: Delete physical file
            try {
                Path filePath = Paths.get(uploadBasePath, timetable.getFileUrl());
                Files.deleteIfExists(filePath);
                log.info("🗑️ Deleted file: {}", filePath);
            } catch (IOException e) {
                log.warn("⚠️ Failed to delete file: {}", timetable.getFileUrl(), e);
            }
            
            // Step 5: Delete timetable record
            timetableRepository.delete(timetable);
            
            response.setSuccess(true);
            response.setMessage("Timetable deleted successfully. You can now upload a new timetable.");
            response.setCanUploadNew(true);
            
            log.info("✅ Timetable {} deleted successfully", request.getTimetableId());
            
        } catch (Exception e) {
            log.error("❌ Failed to delete timetable: {}", e.getMessage(), e);
            response.setSuccess(false);
            response.setMessage("Failed to delete timetable: " + e.getMessage());
            response.setCanUploadNew(false);
        }
        
        return response;
    }
    
    

	
	/**
	 * SPRINT 4: Keep simple delete for admin use
	 */
	@Transactional
	public void deleteTimetable(Long id) {
	    IndividualStudentTimetable timetable = timetableRepository.findById(id)
	        .orElseThrow(() -> new ResourceNotFoundException("Timetable not found: " + id));
	    
	    try {
	        Path filePath = Paths.get(uploadBasePath, timetable.getFileUrl());
	        Files.deleteIfExists(filePath);
	        log.info("🗑️ Deleted file: {}", filePath);
	    } catch (IOException e) {
	        log.warn("⚠️ Failed to delete file: {}", timetable.getFileUrl(), e);
	    }
	    
	    timetableRepository.delete(timetable);
	    log.info("✅ Timetable deleted: {}", id);
	}

    
    // ============================================================
    // ADMIN-SPECIFIC METHODS
    // ============================================================
    
    /**
     * Get all timetables across all students (ADMIN ONLY)
     */
    public List<IndividualTimetableDto> getAllTimetables() {
        log.info("📊 Admin: Fetching all timetables");
        List<IndividualStudentTimetable> timetables = timetableRepository.findAll();
        return timetables.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }
    
    /**
     * Get timetables filtered by processing status (ADMIN ONLY)
     */
    public List<IndividualTimetableDto> getTimetablesByStatus(String status) {
        log.info("📊 Admin: Fetching timetables with status: {}", status);
        List<IndividualStudentTimetable> timetables = 
            timetableRepository.findByProcessingStatusOrderByUploadedAtAsc(status);
        return timetables.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }
    
    /**
     * ✅ FIXED V2: Replace bulkDelete in IndividualTimetableService.java
     * Handles linked progress records (previousPeriodProgress/nextPeriodProgress)
     */

    @Transactional
    public BulkOperationResultDto bulkDelete(List<Long> ids) {
        log.info("🗑️ Admin: Bulk deleting {} timetables", ids.size());
        
        if (ids == null || ids.isEmpty()) {
            log.warn("⚠️ Empty ID list provided for bulk delete");
            return BulkOperationResultDto.builder()
                .successCount(0)
                .failedCount(0)
                .failedIds(new ArrayList<>())
                .build();
        }
        
        int successCount = 0;
        List<Long> failedIds = new ArrayList<>();
        Map<Long, String> failureReasons = new HashMap<>();
        
        for (Long id : ids) {
            try {
                log.debug("🗑️ Attempting to delete timetable {}", id);
                
                // Check if timetable exists
                Optional<IndividualStudentTimetable> timetableOpt = timetableRepository.findById(id);
                if (timetableOpt.isEmpty()) {
                    log.warn("⚠️ Timetable {} not found", id);
                    failedIds.add(id);
                    failureReasons.put(id, "Timetable not found");
                    continue;
                }
                
                IndividualStudentTimetable timetable = timetableOpt.get();
                StudentProfile student = timetable.getStudentProfile();
                
                // ✅ Step 1: Get all schedules for this timetable
                List<DailySchedule> schedulesToDelete = scheduleRepository
                    .findByIndividualTimetableId(id);
                
                if (!schedulesToDelete.isEmpty()) {
                    log.debug("  📋 Found {} schedules to delete", schedulesToDelete.size());
                    
                    int progressPreserved = 0;
                    int progressDeleted = 0;
                    
                    // ✅ Step 2: Collect ALL progress records first
                    Set<StudentLessonProgress> allProgressRecords = new HashSet<>();
                    
                    for (DailySchedule schedule : schedulesToDelete) {
                        List<StudentLessonProgress> progressRecords = progressRepository
                            .findByScheduledDateBetweenAndStudentProfile(
                                schedule.getScheduledDate(),
                                schedule.getScheduledDate(),
                                student
                            ).stream()
                            .filter(p -> p.getSchedule() != null && 
                                        p.getSchedule().getId().equals(schedule.getId()))
                            .collect(Collectors.toList());
                        
                        allProgressRecords.addAll(progressRecords);
                    }
                    
                    log.debug("  📊 Collected {} total progress records to process", allProgressRecords.size());
                    
                    // ✅ Step 3: FIRST - Unlink all previousPeriodProgress references
                    for (StudentLessonProgress progress : allProgressRecords) {
                        try {
                            if (progress.getPreviousPeriodProgress() != null) {
                                log.debug("    🔗 Unlinking progress {} from previous period {}", 
                                    progress.getId(), progress.getPreviousPeriodProgress().getId());
                                progress.setPreviousPeriodProgress(null);
                                progressRepository.save(progress);
                            }
                        } catch (Exception e) {
                            log.warn("    ⚠️ Failed to unlink progress {}: {}", 
                                progress.getId(), e.getMessage());
                            // Continue - we'll try to delete it anyway
                        }
                    }
                    
                    // Force flush to ensure all unlinks are persisted
                    progressRepository.flush();
                    
                    log.debug("  ✅ Unlinked all multi-period references");
                    
                    // ✅ Step 4: NOW delete or preserve progress records
                    for (StudentLessonProgress progress : allProgressRecords) {
                        try {
                            if (progress.getAssessmentSubmission() != null) {
                                // Preserve progress with submissions - unlink from schedule
                                progress.setSchedule(null);
                                progressRepository.save(progress);
                                progressPreserved++;
                                log.debug("    🔒 Preserved progress {} (has submission)", progress.getId());
                            } else {
                                // Delete progress without submissions
                                progressRepository.delete(progress);
                                progressDeleted++;
                                log.debug("    🗑️ Deleted progress {} (no submission)", progress.getId());
                            }
                        } catch (Exception e) {
                            log.error("    ❌ Failed to handle progress {}: {}", 
                                progress.getId(), e.getMessage());
                            // Continue with next progress
                        }
                    }
                    
                    // Force flush again before deleting schedules
                    progressRepository.flush();
                    
                    // ✅ Step 5: Delete schedules (now safe - no FK references)
                    try {
                        scheduleRepository.deleteAll(schedulesToDelete);
                        scheduleRepository.flush();
                        log.debug("  ✅ Deleted {} schedules (preserved {} progress, deleted {} progress)", 
                            schedulesToDelete.size(), progressPreserved, progressDeleted);
                    } catch (Exception e) {
                        log.error("  ❌ Failed to delete schedules: {}", e.getMessage());
                        throw e;
                    }
                } else {
                    log.debug("  ℹ️ No schedules found for timetable {}", id);
                }
                
                // ✅ Step 6: Delete physical file if exists
                if (timetable.getFileUrl() != null && !timetable.getFileUrl().trim().isEmpty()) {
                    try {
                        Path filePath = Paths.get(uploadBasePath, timetable.getFileUrl());
                        boolean deleted = Files.deleteIfExists(filePath);
                        if (deleted) {
                            log.debug("  ✅ Deleted file: {}", filePath);
                        } else {
                            log.debug("  ℹ️ File not found (already deleted): {}", filePath);
                        }
                    } catch (IOException e) {
                        log.warn("  ⚠️ Failed to delete file for timetable {}: {}", id, e.getMessage());
                    }
                } else {
                    log.debug("  ℹ️ No file to delete (manual timetable or NULL file_url)");
                }
                
                // ✅ Step 7: Delete timetable record
                timetableRepository.delete(timetable);
                timetableRepository.flush();
                successCount++;
                log.debug("  ✅ Deleted timetable {}", id);
                
            } catch (Exception e) {
                log.error("❌ Failed to delete timetable {}: {}", id, e.getMessage(), e);
                failedIds.add(id);
                failureReasons.put(id, e.getMessage());
            }
        }
        
        log.info("✅ Bulk delete completed: {} success, {} failed", successCount, failedIds.size());
        
        if (!failedIds.isEmpty()) {
            log.warn("⚠️ Failed deletions: {}", failureReasons);
        }
        
        return BulkOperationResultDto.builder()
            .successCount(successCount)
            .failedCount(failedIds.size())
            .failedIds(failedIds)
            .build();
    }
    
    /**
     * Reprocess a failed timetable (ADMIN ONLY)
     */
    @Transactional
    public void reprocessTimetable(Long id) {
        log.info("🔄 Admin: Reprocessing timetable ID: {}", id);
        
        IndividualStudentTimetable timetable = timetableRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Timetable not found: " + id));
        
        // Reset status
        timetable.setProcessingStatus("PENDING");
        timetable.setProcessingError(null);
        timetable.setProcessedAt(null);
        timetableRepository.save(timetable);
        
        // Re-trigger Python processing
        Path absolutePath = Paths.get(uploadBasePath, timetable.getFileUrl());
        String pythonFilePath = absolutePath.toString();
        
        new Thread(() -> {
            try {
                log.info("🚀 Re-triggering Python AI for timetable ID: {}", id);
                Map<String, Object> result = pythonClient.processTimetable(
                    id,
                    timetable.getStudentProfile().getId(),
                    pythonFilePath
                );
                log.info("✅ Python AI re-processing triggered: {}", result);
            } catch (Exception e) {
                log.error("❌ Failed to re-trigger Python AI: {}", e.getMessage(), e);
                updateProcessingStatus(id, "FAILED", e.getMessage());
            }
        }).start();
        
        log.info("✅ Timetable {} queued for reprocessing", id);
    }
    
    /**
     * Get system-wide statistics (ADMIN ONLY)
     */
    public TimetableSystemStatsDto getSystemStats() {
        log.info("📊 Admin: Computing system statistics");
        
        List<IndividualStudentTimetable> allTimetables = timetableRepository.findAll();
        
        long totalCount = allTimetables.size();
        long pendingCount = allTimetables.stream().filter(t -> "PENDING".equals(t.getProcessingStatus())).count();
        long processingCount = allTimetables.stream().filter(t -> "PROCESSING".equals(t.getProcessingStatus())).count();
        long completedCount = allTimetables.stream().filter(t -> "COMPLETED".equals(t.getProcessingStatus())).count();
        long failedCount = allTimetables.stream().filter(t -> "FAILED".equals(t.getProcessingStatus())).count();
        
        // Calculate average processing time
        OptionalDouble avgProcessingSeconds = allTimetables.stream()
            .filter(t -> "COMPLETED".equals(t.getProcessingStatus()) && t.getProcessedAt() != null)
            .mapToLong(t -> Duration.between(t.getUploadedAt(), t.getProcessedAt()).getSeconds())
            .average();
        
        // Calculate success rate
        double successRate = totalCount > 0 ? (double) completedCount / totalCount * 100 : 0.0;
        
        // Get unique students count
        long uniqueStudents = allTimetables.stream()
            .map(t -> t.getStudentProfile().getId())
            .distinct()
            .count();
        
        log.info("✅ System stats computed: {} total, {} completed, {:.2f}% success rate", 
                 totalCount, completedCount, successRate);
        
        return TimetableSystemStatsDto.builder()
            .totalTimetables((int) totalCount)
            .pendingTimetables((int) pendingCount)
            .processingTimetables((int) processingCount)
            .completedTimetables((int) completedCount)
            .failedTimetables((int) failedCount)
            .averageProcessingTimeSeconds(avgProcessingSeconds.isPresent() ? 
                (int) avgProcessingSeconds.getAsDouble() : 0)
            .successRatePercentage(BigDecimal.valueOf(successRate))
            .uniqueStudentsCount((int) uniqueStudents)
            .build();
    }
    
    /**
     * Update subject mapping for a timetable entry (ADMIN ONLY)
     */
    @Transactional
    public void updateSubjectMapping(Long timetableId, int entryIndex, Long newSubjectId) {
        log.info("🔧 Admin: Updating subject mapping for timetable {} entry {}", timetableId, entryIndex);
        
        IndividualStudentTimetable timetable = timetableRepository.findById(timetableId)
            .orElseThrow(() -> new ResourceNotFoundException("Timetable not found: " + timetableId));
        
        List<Map<String, Object>> entries = timetable.getExtractedEntries();
        if (entries == null || entryIndex < 0 || entryIndex >= entries.size()) {
            throw new ValidationException("Invalid entry index: " + entryIndex);
        }
        
        Map<String, Object> entry = entries.get(entryIndex);
        entry.put("subjectId", newSubjectId);
        entry.put("mappingConfidence", 1.0); // Manually verified = 100% confidence
        
        timetable.setExtractedEntries(entries);
        timetableRepository.save(timetable);
        
        log.info("✅ Subject mapping updated for entry {}", entryIndex);
    }
    
	 // ============================================================
	 // TEACHER-SPECIFIC METHODS
	 // ============================================================
	
    /**
     * ✅ UPDATED: Get timetables for students who offer subjects taught by this teacher
     * 
     * Teachers can only see INDIVIDUAL students whose timetables contain at least
     * one subject that the teacher teaches.
     */
    public List<IndividualTimetableDto> getTimetablesForTeacher(Long teacherProfileId) {
        log.info("👨‍🏫 Teacher {}: Fetching timetables for students offering teacher's subjects", 
                 teacherProfileId);
        
        TeacherProfile teacher = teacherProfileRepository.findById(teacherProfileId)
            .orElseThrow(() -> new ResourceNotFoundException("Teacher not found: " + teacherProfileId));
        
        // ✅ Get teacher's subjects
        if (teacher.getSubjects() == null || teacher.getSubjects().isEmpty()) {
            log.warn("⚠️ Teacher {} has no subjects assigned. Cannot access any student timetables.", 
                     teacherProfileId);
            return List.of();
        }
        
        log.info("📚 Teacher teaches {} subjects: {}", 
                 teacher.getSubjects().size(),
                 teacher.getSubjects().stream()
                     .map(s -> s.getName())
                     .collect(Collectors.joining(", ")));
        
        // ✅ Use the new repository method to get filtered timetables
        List<IndividualStudentTimetable> timetables = 
            timetableRepository.findTimetablesForTeacherSubjects(teacherProfileId);
        
        log.info("✅ Found {} timetables from students offering teacher's subjects", timetables.size());
        
        // ✅ Log which students the teacher can see
        if (!timetables.isEmpty()) {
            Set<String> studentNames = timetables.stream()
                .map(t -> t.getStudentProfile().getUser().getFullName())
                .collect(Collectors.toSet());
            log.info("📋 Students visible to teacher: {}", String.join(", ", studentNames));
        }
        
        return timetables.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }

    /**
     * ✅ UPDATED: Get timetable for a specific student with teacher permission check
     * 
     * Teacher can only access if:
     * 1. Student is INDIVIDUAL type
     * 2. Student's timetable contains at least one subject taught by the teacher
     */
    public IndividualTimetableDto getStudentTimetableForTeacher(
            Long teacherProfileId, 
            Long studentProfileId) {
        
        log.info("👨‍🏫 Teacher {}: Requesting timetable for student {}", 
                 teacherProfileId, studentProfileId);
        
        TeacherProfile teacher = teacherProfileRepository.findById(teacherProfileId)
            .orElseThrow(() -> new ResourceNotFoundException("Teacher not found: " + teacherProfileId));
        
        // ✅ Verify student exists and is INDIVIDUAL type
        StudentProfile student = studentProfileRepository.findById(studentProfileId)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + studentProfileId));
        
        if (student.getStudentType() != StudentType.INDIVIDUAL) {
            throw new ValidationException("This endpoint is only for INDIVIDUAL students");
        }
        
        // ✅ Check if teacher teaches any subjects in this student's timetable
        if (teacher.getSubjects() == null || teacher.getSubjects().isEmpty()) {
            log.warn("🚫 Teacher {} has no subjects assigned", teacherProfileId);
            throw new ValidationException("You have no subjects assigned. Cannot access student data.");
        }
        
        // ✅ Use repository method to check permission
        Optional<IndividualStudentTimetable> timetable = 
            timetableRepository.findLatestTimetableForTeacherStudent(teacherProfileId, studentProfileId);
        
        if (timetable.isEmpty()) {
            log.warn("🚫 Teacher {} cannot access student {} - no matching subjects found", 
                     teacherProfileId, studentProfileId);
            throw new ValidationException(
                "You do not have access to this student's timetable. " +
                "Student does not offer any subjects you teach."
            );
        }
        
        log.info("✅ Teacher {} authorized to view student {} timetable", 
                 teacherProfileId, studentProfileId);
        
        return mapToDto(timetable.get());
    }
    
    /**
     * ✅ NEW: Get list of subjects that match between teacher and student's timetable
     * Useful for showing teacher which subjects they share with the student
     */
    public List<String> getMatchingSubjects(Long teacherProfileId, Long studentProfileId) {
        TeacherProfile teacher = teacherProfileRepository.findById(teacherProfileId)
            .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        
        IndividualStudentTimetable timetable = timetableRepository
            .findLatestTimetableForTeacherStudent(teacherProfileId, studentProfileId)
            .orElseThrow(() -> new ValidationException("No matching timetable found"));
        
        // Get teacher's subject IDs
        Set<Long> teacherSubjectIds = teacher.getSubjects().stream()
            .map(s -> s.getId())
            .collect(Collectors.toSet());
        
        // Extract subject names from timetable entries that match teacher's subjects
        List<String> matchingSubjects = timetable.getExtractedEntries().stream()
            .filter(entry -> {
                Object subjectId = entry.get("subjectId");
                if (subjectId instanceof Number) {
                    return teacherSubjectIds.contains(((Number) subjectId).longValue());
                }
                return false;
            })
            .map(entry -> (String) entry.get("subjectName"))
            .filter(Objects::nonNull)
            .distinct()
            .collect(Collectors.toList());
        
        log.info("🎯 Teacher {} and student {} share {} subjects: {}", 
                 teacherProfileId, studentProfileId, matchingSubjects.size(),
                 String.join(", ", matchingSubjects));
        
        return matchingSubjects;
    }
	 
	 
	 /**
	  * Update extraction results (called by Python service after processing)
	  * 
	  * @deprecated Use updateExtractionResultsWithEntries instead
	  */
	 @Transactional
	 public void updateExtractionResults(Long timetableId, Integer totalPeriods, 
	                                    Integer subjectsCount, Double confidence) {
	     IndividualStudentTimetable timetable = timetableRepository.findById(timetableId)
	         .orElseThrow(() -> new ResourceNotFoundException("Timetable not found: " + timetableId));
	     
	     timetable.setTotalPeriodsExtracted(totalPeriods);
	     timetable.setSubjectsIdentified(subjectsCount);
	     timetable.setConfidenceScore(BigDecimal.valueOf(confidence));
	     
	     timetableRepository.save(timetable);
	     log.info("📊 Updated extraction results for timetable {}: {} periods, {} subjects", 
	              timetableId, totalPeriods, subjectsCount);
	 }
	 
	 
    
    // ============================================================
    // PYTHON CALLBACK METHODS
    // ============================================================
    
    /**
     * Update processing status (called by Python service)
     */
    @Transactional
    public void updateProcessingStatus(Long timetableId, String status, String error) {
        IndividualStudentTimetable timetable = timetableRepository.findById(timetableId)
            .orElseThrow(() -> new ResourceNotFoundException("Timetable not found: " + timetableId));
        
        timetable.setProcessingStatus(status);
        
        if ("FAILED".equals(status)) {
            timetable.markAsFailed(error);
        } else if ("COMPLETED".equals(status)) {
            timetable.markAsCompleted();
        }
        
        timetableRepository.save(timetable);
        log.info("📊 Updated timetable {} status to: {}", timetableId, status);
    }
    
    /**
     * Update extraction results and entries (called by Python service)
     */
    @Transactional
    public void updateExtractionResultsWithEntries(
            Long timetableId, 
            Integer totalPeriods,
            Integer subjectsCount, 
            Double confidence,
            List<Map<String, Object>> entries) {
        
        IndividualStudentTimetable timetable = timetableRepository.findById(timetableId)
            .orElseThrow(() -> new ResourceNotFoundException("Timetable not found: " + timetableId));
        
        timetable.setTotalPeriodsExtracted(totalPeriods);
        timetable.setSubjectsIdentified(subjectsCount);
        timetable.setConfidenceScore(BigDecimal.valueOf(confidence));
        timetable.setExtractedEntries(entries);
        
        timetableRepository.save(timetable);
        
        log.info("📊 Updated extraction results for timetable {}: {} periods, {} subjects, {} entries", 
                 timetableId, totalPeriods, subjectsCount, entries != null ? entries.size() : 0);
    }
    
    // ============================================================
    // HELPER METHODS
    // ============================================================
    
    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException("File is required");
        }
        
        if (file.getSize() > maxFileSize) {
            throw new ValidationException(
                String.format("File size exceeds maximum allowed size of %d bytes", maxFileSize));
        }
        
        if (!ALLOWED_FILE_TYPES.contains(file.getContentType())) {
            throw new ValidationException(
                "Invalid file type. Allowed types: PDF, Excel, JPEG, PNG");
        }
    }
    
    private String saveFile(MultipartFile file) throws IOException {
        Path uploadPath = Paths.get(uploadDirectory);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
            log.info("📁 Created upload directory: {}", uploadPath.toAbsolutePath());
        }
        
        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename != null && originalFilename.contains(".") 
            ? originalFilename.substring(originalFilename.lastIndexOf("."))
            : "";
        String uniqueFilename = UUID.randomUUID().toString() + extension;
        
        Path filePath = uploadPath.resolve(uniqueFilename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
        
        log.info("💾 File saved to: {}", filePath.toAbsolutePath());
        
        return filePath.toString();
    }
    
    private String getFileTypeFromContentType(String contentType) {
        if (contentType.contains("pdf")) return "PDF";
        if (contentType.contains("excel") || contentType.contains("spreadsheet")) return "EXCEL";
        if (contentType.contains("image")) return "IMAGE";
        return "UNKNOWN";
    }
    
    private IndividualTimetableDto mapToDto(IndividualStudentTimetable timetable) {
        // ✅ Use email as fallback if fullName is null
        String studentName = "Unknown Student"; // default fallback
        
        if (timetable.getStudentProfile() != null && 
            timetable.getStudentProfile().getUser() != null) {
            
            String fullName = timetable.getStudentProfile().getUser().getFullName();
            String email = timetable.getStudentProfile().getUser().getEmail();
            
            // Priority: fullName > email > "Student {id}"
            if (fullName != null && !fullName.trim().isEmpty()) {
                studentName = fullName;
            } else if (email != null && !email.trim().isEmpty()) {
                studentName = email;
            } else {
                studentName = "Student " + timetable.getStudentProfile().getId();
            }
        }
        
        // ✅ NEW: Map entries if they exist
        List<TimetableEntryDto> entries = null;
        if (timetable.getExtractedEntries() != null && !timetable.getExtractedEntries().isEmpty()) {
            entries = timetable.getExtractedEntries().stream()
                .map(this::mapJsonToEntryDto)
                .collect(Collectors.toList());
        }
        
        return IndividualTimetableDto.builder()
            .id(timetable.getId())
            .studentProfileId(timetable.getStudentProfile().getId())
            .studentName(studentName)
            .originalFilename(timetable.getOriginalFilename())
            .fileUrl(timetable.getFileUrl())
            .fileType(timetable.getFileType())
            .fileSizeBytes(timetable.getFileSizeBytes())
            .processingStatus(timetable.getProcessingStatus())
            .processingError(timetable.getProcessingError())
            .totalPeriodsExtracted(timetable.getTotalPeriodsExtracted())
            .subjectsIdentified(timetable.getSubjectsIdentified())
            .confidenceScore(timetable.getConfidenceScore())
            .termId(timetable.getTerm() != null ? timetable.getTerm().getId() : null)
            .termName(timetable.getTerm() != null ? timetable.getTerm().getName() : null)
            .academicYear(timetable.getAcademicYear())
            .uploadedAt(timetable.getUploadedAt())
            .processedAt(timetable.getProcessedAt())
            .createdAt(timetable.getCreatedAt())
            .entries(entries)  // ✅ ADD THIS
            .build();
    }
    
    private TimetableEntryDto mapJsonToEntryDto(Map<String, Object> json) {
        TimetableEntryDto.TimetableEntryDtoBuilder builder = TimetableEntryDto.builder();
        
        if (json.containsKey("dayOfWeek")) {
            builder.dayOfWeek((String) json.get("dayOfWeek"));
        }
        
        if (json.containsKey("periodNumber")) {
            Object period = json.get("periodNumber");
            builder.periodNumber(period instanceof Integer ? (Integer) period : 
                               Integer.parseInt(period.toString()));
        }
        
        if (json.containsKey("startTime")) {
            builder.startTime((String) json.get("startTime"));
        }
        
        if (json.containsKey("endTime")) {
            builder.endTime((String) json.get("endTime"));
        }
        
        if (json.containsKey("subjectName")) {
            builder.subjectName((String) json.get("subjectName"));
        }
        
        // ✅ UPDATED: Fetch subject code if subjectId exists
        if (json.containsKey("subjectId")) {
            Object subjectId = json.get("subjectId");
            if (subjectId != null) {
                Long subjectIdLong = subjectId instanceof Long ? (Long) subjectId : 
                                    Long.parseLong(subjectId.toString());
                builder.subjectId(subjectIdLong);
                
                // ✅ NEW: Fetch subject code from database
                try {
                    subjectRepository.findById(subjectIdLong).ifPresent(subject -> {
                        builder.subjectCode(subject.getCode());
                    });
                } catch (Exception e) {
                    log.warn("⚠️ Could not fetch subject code for subjectId: {}", subjectIdLong);
                }
            }
        }
        
        if (json.containsKey("mappingConfidence")) {
            Object confidence = json.get("mappingConfidence");
            if (confidence != null) {
                if (confidence instanceof BigDecimal) {
                    builder.mappingConfidence((BigDecimal) confidence);
                } else if (confidence instanceof Double) {
                    builder.mappingConfidence(BigDecimal.valueOf((Double) confidence));
                } else if (confidence instanceof Number) {
                    builder.mappingConfidence(BigDecimal.valueOf(((Number) confidence).doubleValue()));
                }
            }
        }
        
        if (json.containsKey("room")) {
            builder.room((String) json.get("room"));
        }
        
        if (json.containsKey("teacher")) {
            builder.teacher((String) json.get("teacher"));
        }
        
        return builder.build();
    }
    
    
    /**
     * UPDATED: Allow timetable upload ANYTIME.
     * If upload is late (Week 2+), mark all previous weeks' schedules as INCOMPLETE.
     */
    private void validateUploadTiming(TimetableUploadRequest request) {
        log.info("🕒 Validating upload timing (UPDATED RULES)...");

        Optional<Term> activeTerm = termWeekCalculator.getActiveTerm();
        if (activeTerm.isEmpty()) {
            throw new ValidationException("No active term found.");
        }

        Term term = activeTerm.get();
        Integer currentWeek = termWeekCalculator.getCurrentTermWeek();

        if (currentWeek == null) {
            log.info("✅ Upload allowed: Before term starts.");
            return;
        }

        // Week 1 — always allowed  
        if (currentWeek == 1) {
            log.info("✅ Upload allowed: Week 1 (adjustment).");
            return;
        }

        // Week 2+ — NOW ALLOWED
        log.warn("⚠️ Uploading in Week {}: marking all previous weeks as INCOMPLETE", currentWeek);

        LocalDate today = LocalDate.now();
        LocalDate termStart = term.getStartDate();

        // Mark all past schedules as incomplete
        int updated = progressRepository
                .markPastLessonsAsIncomplete(request.getStudentProfileId(), termStart, today.minusDays(1));

        log.info("🗂️ {} past lesson records marked as INCOMPLETE", updated);

        log.info("✅ Upload allowed: continuing from Week {}", currentWeek);
    }

    
    
    
	
	/**
	 * SPRINT 4: Validate one-timetable-per-student rule
	 * Students can only have ONE timetable at a time
	 */
	private void validateOneTimetableRule(Long studentProfileId) {
	    log.info("🔍 Validating one-timetable rule for student {}", studentProfileId);
	    
	    StudentProfile student = studentProfileRepository.findById(studentProfileId)
	        .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
	    
	    // Check for existing timetables
	    List<IndividualStudentTimetable> existingTimetables = timetableRepository
	        .findByStudentProfileIdOrderByUploadedAtDesc(studentProfileId);
	    
	    // Filter for non-deleted timetables
	    long activeCount = existingTimetables.stream()
	        .filter(t -> !"DELETED".equals(t.getProcessingStatus()))
	        .count();
	    
	    if (activeCount > 0) {
	        IndividualStudentTimetable existing = existingTimetables.get(0);
	        
	        throw new ValidationException(
	            String.format(
	                "You have already uploaded a timetable. " +
	                "Please delete your existing timetable (ID: %d, File: %s, Uploaded: %s) " +
	                "before uploading a new one. " +
	                "Only ONE timetable is allowed per student at a time.",
	                existing.getId(),
	                existing.getOriginalFilename(),
	                existing.getUploadedAt()
	            )
	        );
	    }
	    
	    log.info("✅ One-timetable rule validated: No existing timetable found");
	}
	
	
	
	

    /**
     * ✅ NEW: Validate timetable entries for schedule generation readiness
     */
    private void validateTimetableEntries(IndividualStudentTimetable timetable) {
        log.info("🔍 Validating timetable entries for schedule generation...");
        
        List<Map<String, Object>> entries = timetable.getExtractedEntries();
        
        if (entries == null || entries.isEmpty()) {
            throw new ValidationException(
                "Timetable has no extracted entries. Cannot generate schedules."
            );
        }
        
        // Check for required fields in each entry
        int invalidEntries = 0;
        List<String> missingFields = new ArrayList<>();
        
        for (int i = 0; i < entries.size(); i++) {
            Map<String, Object> entry = entries.get(i);
            List<String> entryIssues = new ArrayList<>();
            
            if (!entry.containsKey("dayOfWeek") || entry.get("dayOfWeek") == null) {
                entryIssues.add("dayOfWeek");
            }
            if (!entry.containsKey("periodNumber") || entry.get("periodNumber") == null) {
                entryIssues.add("periodNumber");
            }
            if (!entry.containsKey("startTime") || entry.get("startTime") == null) {
                entryIssues.add("startTime");
            }
            if (!entry.containsKey("endTime") || entry.get("endTime") == null) {
                entryIssues.add("endTime");
            }
            if (!entry.containsKey("subjectId") || entry.get("subjectId") == null) {
                entryIssues.add("subjectId");
            }
            
            if (!entryIssues.isEmpty()) {
                invalidEntries++;
                missingFields.add(String.format("Entry %d: missing %s", 
                    i + 1, String.join(", ", entryIssues)));
            }
        }
        
        if (invalidEntries > 0) {
            throw new ValidationException(
                String.format(
                    "Timetable has %d invalid entries. Missing required fields: %s",
                    invalidEntries,
                    String.join("; ", missingFields.subList(0, Math.min(5, missingFields.size())))
                )
            );
        }
        
        log.info("✅ All {} timetable entries validated successfully", entries.size());
    }

    /**
     * ✅ NEW: Check if student has a valid timetable for schedule generation
     */
    public boolean hasValidTimetableForGeneration(Long studentProfileId) {
        StudentProfile student = studentProfileRepository.findById(studentProfileId)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        
        if (student.getStudentType() != StudentType.INDIVIDUAL) {
            return false;
        }
        
        Optional<IndividualStudentTimetable> timetable = timetableRepository
            .findFirstByStudentProfileAndProcessingStatusOrderByUploadedAtDesc(
                student, "COMPLETED"
            );
        
        if (timetable.isEmpty()) {
            log.debug("Student {} has no completed timetable", studentProfileId);
            return false;
        }
        
        try {
            validateTimetableEntries(timetable.get());
            return true;
        } catch (ValidationException e) {
            log.warn("Student {} has completed timetable but entries are invalid: {}", 
                     studentProfileId, e.getMessage());
            return false;
        }
    }

    /**
     * ✅ NEW: Get timetable validation status
     * Useful for frontend to show upload readiness
     */
    public TimetableValidationStatusDto getTimetableValidationStatus(Long studentProfileId) {
        log.info("🔍 Checking timetable validation status for student {}", studentProfileId);
        
        StudentProfile student = studentProfileRepository.findById(studentProfileId)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        
        TimetableValidationStatusDto status = new TimetableValidationStatusDto();
        status.setStudentProfileId(studentProfileId);
        status.setStudentType(student.getStudentType());
        
        // Check student type
        if (student.getStudentType() != StudentType.INDIVIDUAL) {
            status.setValid(false);
            status.addIssue("Student is not of type INDIVIDUAL");
            return status;
        }
        
        // Check for completed timetable
        Optional<IndividualStudentTimetable> timetableOpt = timetableRepository
            .findFirstByStudentProfileAndProcessingStatusOrderByUploadedAtDesc(
                student, "COMPLETED"
            );
        
        if (timetableOpt.isEmpty()) {
            status.setValid(false);
            status.addIssue("No completed timetable found");
            status.setCanUpload(true);
            
            // Check if upload is allowed now
            try {
                validateUploadTiming(new TimetableUploadRequest());
                status.setUploadAllowed(true);
            } catch (ValidationException e) {
                status.setUploadAllowed(false);
                status.setUploadBlockReason(e.getMessage());
            }
            
            return status;
        }
        
        IndividualStudentTimetable timetable = timetableOpt.get();
        status.setTimetableId(timetable.getId());
        status.setUploadedAt(timetable.getUploadedAt());
        status.setTotalPeriodsExtracted(timetable.getTotalPeriodsExtracted());
        status.setSubjectsIdentified(timetable.getSubjectsIdentified());
        
        // Validate entries
        try {
            validateTimetableEntries(timetable);
            status.setValid(true);
            status.setEntriesValid(true);
        } catch (ValidationException e) {
            status.setValid(false);
            status.setEntriesValid(false);
            status.addIssue(e.getMessage());
        }
        
        // Check upload timing for potential re-upload
        try {
            validateUploadTiming(new TimetableUploadRequest());
            status.setCanUpload(true);
            status.setUploadAllowed(true);
        } catch (ValidationException e) {
            status.setCanUpload(false);
            status.setUploadAllowed(false);
            status.setUploadBlockReason(e.getMessage());
        }
        
        log.info("✅ Validation status: valid={}, canUpload={}", 
                 status.isValid(), status.isCanUpload());
        
        return status;
    }
	    
	    
	
	/**
	 * SPRINT 4: Check if student can upload a timetable
	 * Returns detailed information about upload eligibility
	 */
	public TimetableReplacementDto checkUploadEligibility(Long studentProfileId) {
	    log.info("🔍 Checking upload eligibility for student {}", studentProfileId);
	    
	    StudentProfile student = studentProfileRepository.findById(studentProfileId)
	        .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
	    
	    TimetableReplacementDto dto = new TimetableReplacementDto();
	    
	    // Check if INDIVIDUAL student
	    if (student.getStudentType() != StudentType.INDIVIDUAL) {
	        dto.setUploadAllowed(false);
	        dto.setBlockReason("Only INDIVIDUAL students can upload timetables");
	        dto.setMustDeleteFirst(false);
	        return dto;
	    }
	    
	    // Check for existing timetable
	    List<IndividualStudentTimetable> existing = timetableRepository
	        .findByStudentProfileIdOrderByUploadedAtDesc(studentProfileId);
	    
	    if (!existing.isEmpty() && !"DELETED".equals(existing.get(0).getProcessingStatus())) {
	        IndividualStudentTimetable existingTimetable = existing.get(0);
	        
	        // Build existing timetable info
	        TimetableReplacementDto.ExistingTimetableInfo existingInfo = 
	            TimetableReplacementDto.ExistingTimetableInfo.builder()
	                .id(existingTimetable.getId())
	                .filename(existingTimetable.getOriginalFilename())
	                .uploadedAt(existingTimetable.getUploadedAt())
	                .processingStatus(existingTimetable.getProcessingStatus())
	                .totalPeriods(existingTimetable.getTotalPeriodsExtracted())
	                .subjectsIdentified(existingTimetable.getSubjectsIdentified())
	                .deleteUrl("/individual/timetable/" + existingTimetable.getId())
	                .build();
	        
	        // Calculate deletion impact
	        LocalDate today = LocalDate.now();
	        int currentSchedules = scheduleRepository.countByIndividualTimetableIdAndScheduledDate(
	            existingTimetable.getId(), today
	        );
	        int futureSchedules = scheduleRepository.countByIndividualTimetableIdAndScheduledDateGreaterThanEqual(
	            existingTimetable.getId(), today
	        );
	        int completedAssessments = progressRepository.countCompletedProgressForStudent(
	            student, today.minusMonths(6), today
	        );
	        int pendingAssessments = progressRepository.countIncompleteProgressForStudent(
	            student, today, today.plusYears(1)
	        );
	        
	        TimetableReplacementDto.DeletionImpactInfo impactInfo =
	            TimetableReplacementDto.DeletionImpactInfo.builder()
	                .currentSchedulesCount(currentSchedules)
	                .futureSchedulesCount(futureSchedules)
	                .completedAssessmentsCount(completedAssessments)
	                .pendingAssessmentsCount(pendingAssessments)
	                .willPreserveCompletedAssessments(true)
	                .warningMessage(String.format(
	                    "Deleting will remove %d future schedules and %d pending assessments. " +
	                    "%d completed assessments will be preserved in your history.",
	                    futureSchedules, pendingAssessments, completedAssessments
	                ))
	                .build();
	        
	        dto.setUploadAllowed(false);
	        dto.setBlockReason("You already have a timetable uploaded. Delete it first to upload a new one.");
	        dto.setMustDeleteFirst(true);
	        dto.setExistingTimetable(existingInfo);
	        dto.setDeletionImpact(impactInfo);
	        
	        return dto;
	    }
	    
	    // Check upload timing
	    try {
	        validateUploadTiming(new TimetableUploadRequest());
	        dto.setUploadAllowed(true);
	        dto.setMustDeleteFirst(false);
	    } catch (ValidationException e) {
	        dto.setUploadAllowed(false);
	        dto.setBlockReason(e.getMessage());
	        dto.setMustDeleteFirst(false);
	    }
	    
	    return dto;
	}
	

}