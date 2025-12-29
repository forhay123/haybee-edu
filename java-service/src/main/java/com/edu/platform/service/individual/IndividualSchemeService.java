package com.edu.platform.service.individual;

import com.edu.platform.dto.individual.IndividualSchemeDto;
import com.edu.platform.dto.individual.SchemeUploadRequest;
import com.edu.platform.dto.individual.SchemeUploadResponse;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.exception.ValidationException;
import com.edu.platform.integration.PythonIndividualClient;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.model.Term;
import com.edu.platform.model.individual.IndividualStudentScheme;
import com.edu.platform.repository.StudentProfileRepository;
import com.edu.platform.repository.SubjectRepository;
import com.edu.platform.repository.TermRepository;
import com.edu.platform.repository.individual.IndividualSchemeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class IndividualSchemeService {
    
    private final IndividualSchemeRepository schemeRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final SubjectRepository subjectRepository;
    private final TermRepository termRepository;
    private final PythonIndividualClient pythonClient;  // ✅ INJECTED
    
    @Value("${file.upload.directory:uploads/individual/schemes}")
    private String uploadDirectory;
    
    @Value("${file.upload.max-size:10485760}") // 10MB default
    private long maxFileSize;
    
    @Value("${server.base-url:http://localhost:8080}")
    private String serverBaseUrl;
    
    private static final List<String> ALLOWED_FILE_TYPES = Arrays.asList(
        "application/pdf",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png"
    );
    
    /**
     * Upload and store scheme of work file
     */
    @Transactional
    public SchemeUploadResponse uploadScheme(
            MultipartFile file, 
            SchemeUploadRequest request) throws IOException {
        
        log.info("📥 Processing scheme upload for student: {}, subject: {}", 
            request.getStudentProfileId(), request.getSubjectId());
        
        // Validate file
        validateFile(file);
        
        // Load student
        StudentProfile student = studentProfileRepository.findById(request.getStudentProfileId())
            .orElseThrow(() -> new ResourceNotFoundException(
                "Student not found: " + request.getStudentProfileId()));
        
        // Verify student is INDIVIDUAL type
        if (!"INDIVIDUAL".equals(student.getStudentType())) {
            throw new ValidationException("Only INDIVIDUAL students can upload schemes");
        }
        
        // Load subject
        Subject subject = subjectRepository.findById(request.getSubjectId())
            .orElseThrow(() -> new ResourceNotFoundException(
                "Subject not found: " + request.getSubjectId()));
        
        // Load term if provided
        Term term = null;
        if (request.getTermId() != null) {
            term = termRepository.findById(request.getTermId())
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Term not found: " + request.getTermId()));
        }
        
        // Save file to disk
        String savedFilePath = saveFile(file, subject.getName());
        String fileUrl = serverBaseUrl + "/uploads/individual/schemes/" + 
                        Paths.get(savedFilePath).getFileName().toString();
        
        // Create entity
        IndividualStudentScheme scheme = IndividualStudentScheme.builder()
            .studentProfile(student)
            .subject(subject)
            .term(term)
            .academicYear(request.getAcademicYear())
            .originalFilename(file.getOriginalFilename())
            .fileUrl(fileUrl)
            .fileType(getFileTypeFromContentType(file.getContentType()))
            .fileSizeBytes(file.getSize())
            .processingStatus("PENDING")
            .uploadedAt(Instant.now())
            .build();
        
        scheme = schemeRepository.save(scheme);
        
        log.info("✅ Scheme uploaded successfully. ID: {}", scheme.getId());
        
        // ✅ TRIGGER PYTHON AI PROCESSING (Async - don't wait)
        Long finalSchemeId = scheme.getId();
        String finalSavedFilePath = savedFilePath;
        Long finalSubjectId = subject.getId(); // ✅ ADD THIS LINE

        // Run in separate thread to avoid blocking
        new Thread(() -> {
            try {
                log.info("🚀 Triggering Python AI processing for scheme ID: {}", finalSchemeId);
                Map<String, Object> result = pythonClient.processScheme(
                    finalSchemeId, 
                    student.getId(), 
                    finalSubjectId,        // ✅ ADD THIS PARAMETER
                    finalSavedFilePath
                );
                log.info("✅ Python AI processing triggered: {}", result);
            } catch (Exception e) {
                log.error("❌ Failed to trigger Python AI: {}", e.getMessage());
                // Update status to failed
                updateProcessingStatus(finalSchemeId, "FAILED", e.getMessage());
            }
        }).start();
        
        return SchemeUploadResponse.builder()
            .schemeId(scheme.getId())
            .filename(scheme.getOriginalFilename())
            .fileUrl(scheme.getFileUrl())
            .subjectId(subject.getId())
            .subjectName(subject.getName())
            .processingStatus(scheme.getProcessingStatus())
            .uploadedAt(scheme.getUploadedAt())
            .message("Scheme uploaded successfully and queued for AI processing")
            .build();
    }
    
    /**
     * Get scheme by ID
     */
    public IndividualSchemeDto getSchemeById(Long id) {
        IndividualStudentScheme scheme = schemeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Scheme not found: " + id));
        return mapToDto(scheme);
    }
    
    /**
     * Get all schemes for a student
     */
    public List<IndividualSchemeDto> getSchemesForStudent(Long studentProfileId) {
        List<IndividualStudentScheme> schemes = 
            schemeRepository.findByStudentProfileIdOrderByUploadedAtDesc(studentProfileId);
        return schemes.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }
    
    /**
     * Get schemes for a student and subject
     */
    public List<IndividualSchemeDto> getSchemesForStudentAndSubject(
            Long studentProfileId, Long subjectId) {
        StudentProfile student = studentProfileRepository.findById(studentProfileId)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        Subject subject = subjectRepository.findById(subjectId)
            .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
        
        List<IndividualStudentScheme> schemes = 
            schemeRepository.findByStudentProfileAndSubjectOrderByUploadedAtDesc(student, subject);
        return schemes.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }
    
    /**
     * Get latest scheme for a student and subject
     */
    public IndividualSchemeDto getLatestScheme(Long studentProfileId, Long subjectId) {
        StudentProfile student = studentProfileRepository.findById(studentProfileId)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        Subject subject = subjectRepository.findById(subjectId)
            .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
        
        return schemeRepository.findFirstByStudentProfileAndSubjectOrderByUploadedAtDesc(student, subject)
            .map(this::mapToDto)
            .orElse(null);
    }
    
    /**
     * Get latest COMPLETED scheme for a student and subject
     */
    public IndividualSchemeDto getLatestCompletedScheme(Long studentProfileId, Long subjectId) {
        StudentProfile student = studentProfileRepository.findById(studentProfileId)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        Subject subject = subjectRepository.findById(subjectId)
            .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
        
        return schemeRepository
            .findFirstByStudentProfileAndSubjectAndProcessingStatusOrderByProcessedAtDesc(
                student, subject, "COMPLETED")
            .map(this::mapToDto)
            .orElse(null);
    }
    
    /**
     * Delete scheme
     */
    @Transactional
    public void deleteScheme(Long id) {
        IndividualStudentScheme scheme = schemeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Scheme not found: " + id));
        
        // Delete file from disk
        try {
            Path filePath = Paths.get(scheme.getFileUrl());
            Files.deleteIfExists(filePath);
            log.info("🗑️ Deleted file: {}", scheme.getFileUrl());
        } catch (IOException e) {
            log.warn("⚠️ Failed to delete file: {}", scheme.getFileUrl(), e);
        }
        
        schemeRepository.delete(scheme);
        log.info("✅ Scheme deleted: {}", id);
    }
    
    /**
     * Update processing status (called by Python service via callback)
     */
    @Transactional
    public void updateProcessingStatus(Long schemeId, String status, String error) {
        IndividualStudentScheme scheme = schemeRepository.findById(schemeId)
            .orElseThrow(() -> new ResourceNotFoundException("Scheme not found: " + schemeId));
        
        scheme.setProcessingStatus(status);
        
        if ("FAILED".equals(status)) {
            scheme.markAsFailed(error);
        } else if ("COMPLETED".equals(status)) {
            scheme.markAsCompleted();
        }
        
        schemeRepository.save(scheme);
        log.info("📊 Updated scheme {} status to: {}", schemeId, status);
    }
    
    /**
     * Update extraction results (called by Python service after processing)
     */
    @Transactional
    public void updateExtractionResults(Long schemeId, Integer totalTopics, 
                                       Integer weeksCount, Double confidence) {
        IndividualStudentScheme scheme = schemeRepository.findById(schemeId)
            .orElseThrow(() -> new ResourceNotFoundException("Scheme not found: " + schemeId));
        
        scheme.setTotalTopicsExtracted(totalTopics);
        scheme.setWeeksCovered(weeksCount);
        scheme.setConfidenceScore(java.math.BigDecimal.valueOf(confidence));
        
        schemeRepository.save(scheme);
        log.info("📊 Updated extraction results for scheme {}: {} topics, {} weeks", 
                 schemeId, totalTopics, weeksCount);
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
                "Invalid file type. Allowed types: PDF, Excel, Word, JPEG, PNG");
        }
    }
    
    private String saveFile(MultipartFile file, String subjectName) throws IOException {
        // Create upload directory if it doesn't exist
        Path uploadPath = Paths.get(uploadDirectory);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
            log.info("📁 Created upload directory: {}", uploadPath);
        }
        
        // Generate unique filename with subject context
        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename != null && originalFilename.contains(".") 
            ? originalFilename.substring(originalFilename.lastIndexOf("."))
            : "";
        
        // Sanitize subject name for filename
        String sanitizedSubject = subjectName.replaceAll("[^a-zA-Z0-9]", "_");
        String uniqueFilename = sanitizedSubject + "_" + UUID.randomUUID().toString() + extension;
        
        // Save file
        Path filePath = uploadPath.resolve(uniqueFilename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
        
        log.info("💾 File saved: {}", filePath);
        return filePath.toString();
    }
    
    private String getFileTypeFromContentType(String contentType) {
        if (contentType.contains("pdf")) return "PDF";
        if (contentType.contains("excel") || contentType.contains("spreadsheet")) return "EXCEL";
        if (contentType.contains("word") || contentType.contains("document")) return "WORD";
        if (contentType.contains("image")) return "IMAGE";
        return "UNKNOWN";
    }
    
    private IndividualSchemeDto mapToDto(IndividualStudentScheme scheme) {
        return IndividualSchemeDto.builder()
            .id(scheme.getId())
            .studentProfileId(scheme.getStudentProfile().getId())
            .studentName(scheme.getStudentProfile().getUser().getFullName())
            .subjectId(scheme.getSubject().getId())
            .subjectName(scheme.getSubject().getName())
            .originalFilename(scheme.getOriginalFilename())
            .fileUrl(scheme.getFileUrl())
            .fileType(scheme.getFileType())
            .fileSizeBytes(scheme.getFileSizeBytes())
            .processingStatus(scheme.getProcessingStatus())
            .processingError(scheme.getProcessingError())
            .totalTopicsExtracted(scheme.getTotalTopicsExtracted())
            .weeksCovered(scheme.getWeeksCovered())
            .confidenceScore(scheme.getConfidenceScore())
            .termId(scheme.getTerm() != null ? scheme.getTerm().getId() : null)
            .termName(scheme.getTerm() != null ? scheme.getTerm().getName() : null)
            .academicYear(scheme.getAcademicYear())
            .uploadedAt(scheme.getUploadedAt())
            .processedAt(scheme.getProcessedAt())
            .createdAt(scheme.getCreatedAt())
            .build();
    }
}