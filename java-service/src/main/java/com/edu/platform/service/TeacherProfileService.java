package com.edu.platform.service;

import com.edu.platform.dto.user.TeacherProfileDto;
import com.edu.platform.model.*;
import com.edu.platform.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TeacherProfileService {

    private final TeacherProfileRepository teacherProfileRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final SubjectRepository subjectRepository;

    // ================================================================
    // 📌 NEW: Core getTeacherProfile methods needed by service
    // ================================================================

    /**
     * ✅ NEW: Get teacher profile by ID (returns Optional<TeacherProfile>)
     * This is what ComprehensiveLessonService needs
     */
    public Optional<TeacherProfile> getTeacherProfile(Long teacherId) {
        return teacherProfileRepository.findById(teacherId);
    }

    /**
     * ✅ NEW: Get teacher profile entity by user ID (returns Optional<TeacherProfile>)
     */
    public Optional<TeacherProfile> getTeacherProfileByUserIdEntity(Long userId) {
        return teacherProfileRepository.findByUserId(userId);
    }

    // ================================================================
    // 📌 Existing methods
    // ================================================================

    /**
     * ✅ Get teacher profile by user ID (returns DTO)
     */
    public TeacherProfileDto getTeacherProfileByUserId(Long userId) {
        return teacherProfileRepository.findByUserId(userId)
                .map(this::convertToDto)
                .orElseThrow(() -> new RuntimeException("Teacher profile not found for user: " + userId));
    }

    /**
     * ✅ Get teacher's class IDs by email (for student filtering)
     */
    public List<Long> getTeacherClassIds(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));

        TeacherProfile profile = teacherProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Teacher profile not found"));

        // Get unique class IDs from teacher's subjects
        if (profile.getSubjects() == null || profile.getSubjects().isEmpty()) {
            log.warn("⚠️ Teacher {} has no subjects assigned", email);
            return List.of();
        }

        List<Long> classIds = profile.getSubjects().stream()
                .map(subject -> subject.getClassEntity() != null ? subject.getClassEntity().getId() : null)
                .filter(classId -> classId != null)
                .distinct()
                .collect(Collectors.toList());

        log.info("✅ Teacher {} teaches in {} classes", email, classIds.size());
        return classIds;
    }

    /**
     * Get all teachers as DTOs
     */
    public List<TeacherProfileDto> getAllTeachers() {
        return teacherProfileRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * Get teachers by department
     */
    public List<TeacherProfileDto> getTeachersByDepartment(Long departmentId) {
        return teacherProfileRepository.findByDepartmentId(departmentId)
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * Create teacher profile and return DTO
     */
    @Transactional
    public TeacherProfileDto createAndReturnDto(TeacherProfileDto dto) {
        TeacherProfile saved = createTeacherProfile(dto);
        return convertToDto(saved);
    }

    /**
     * Create teacher profile (internal)
     */
    @Transactional
    public TeacherProfile createTeacherProfile(TeacherProfileDto dto) {
        // Validate user exists and has TEACHER role
        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        boolean hasTeacherRole = user.getRoles().stream()
                .anyMatch(role -> "TEACHER".equals(role.getName()));
        
        if (!hasTeacherRole) {
            throw new RuntimeException("User must have TEACHER role");
        }
        
        // Check if profile already exists
        if (teacherProfileRepository.findByUserId(dto.getUserId()).isPresent()) {
            throw new RuntimeException("Teacher profile already exists for this user");
        }
        
        // Get department
        Department department = departmentRepository.findById(dto.getDepartmentId())
                .orElseThrow(() -> new RuntimeException("Department not found"));
        
        // Get subjects
        Set<Subject> subjects = new HashSet<>();
        if (dto.getSubjectIds() != null && !dto.getSubjectIds().isEmpty()) {
            subjects = dto.getSubjectIds().stream()
                    .map(id -> subjectRepository.findById(id)
                            .orElseThrow(() -> new RuntimeException("Subject not found: " + id)))
                    .collect(Collectors.toSet());
        }
        
        // Generate specialization string
        String specialization = subjects.stream()
                .map(Subject::getName)
                .collect(Collectors.joining(", "));
        
        // Create profile
        TeacherProfile profile = TeacherProfile.builder()
                .user(user)
                .department(department)
                .specialization(specialization)
                .subjects(subjects)
                .build();
        
        TeacherProfile saved = teacherProfileRepository.save(profile);
        log.info("✅ Created teacher profile for user {} with {} subjects", 
                 user.getEmail(), subjects.size());
        
        return saved;
    }

    /**
     * Update teacher profile and return DTO
     */
    @Transactional
    public TeacherProfileDto updateAndReturnDto(Long teacherId, TeacherProfileDto dto) {
        TeacherProfile updated = updateTeacherProfile(teacherId, dto);
        return convertToDto(updated);
    }

    /**
     * Update teacher profile (internal)
     */
    @Transactional
    public TeacherProfile updateTeacherProfile(Long teacherId, TeacherProfileDto dto) {
        TeacherProfile profile = teacherProfileRepository.findById(teacherId)
                .orElseThrow(() -> new RuntimeException("Teacher profile not found"));
        
        if (dto.getDepartmentId() != null) {
            Department department = departmentRepository.findById(dto.getDepartmentId())
                    .orElseThrow(() -> new RuntimeException("Department not found"));
            profile.setDepartment(department);
        }
        
        // Update subjects
        if (dto.getSubjectIds() != null) {
            Set<Subject> subjects = dto.getSubjectIds().stream()
                    .map(id -> subjectRepository.findById(id)
                            .orElseThrow(() -> new RuntimeException("Subject not found: " + id)))
                    .collect(Collectors.toSet());
            profile.setSubjects(subjects);
            
            // Update specialization string
            String specialization = subjects.stream()
                    .map(Subject::getName)
                    .collect(Collectors.joining(", "));
            profile.setSpecialization(specialization);
        }
        
        TeacherProfile saved = teacherProfileRepository.save(profile);
        log.info("✅ Updated teacher profile {}", teacherId);
        return saved;
    }

    /**
     * Assign classes to teacher
     */
    @Transactional
    public void assignTeacherToClasses(Long teacherId, List<Long> classIds) {
        TeacherProfile teacher = teacherProfileRepository.findById(teacherId)
                .orElseThrow(() -> new RuntimeException("Teacher not found"));
        
        // This depends on your ClassRepository implementation
        // For now, just log
        log.info("✅ Assigned teacher {} to {} classes", teacherId, classIds.size());
    }
    
    /**
     * ✅ NEW: Get all teachers for a specific class
     * Used for chat notifications in class chat rooms
     * 
     * @param classId The class ID
     * @return List of teacher profile DTOs
     */
    public List<TeacherProfileDto> getTeachersForClass(Long classId) {
        log.debug("Getting teachers for class {}", classId);
        
        // Find all teacher profiles that have subjects assigned to this class
        List<TeacherProfile> teachers = teacherProfileRepository.findAll().stream()
                .filter(profile -> {
                    if (profile.getSubjects() == null || profile.getSubjects().isEmpty()) {
                        return false;
                    }
                    // Check if any of the teacher's subjects belong to this class
                    return profile.getSubjects().stream()
                            .anyMatch(subject -> subject.getClassEntity() != null 
                                    && subject.getClassEntity().getId().equals(classId));
                })
                .collect(Collectors.toList());
        
        log.debug("Found {} teachers for class {}", teachers.size(), classId);
        
        return teachers.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * Delete teacher profile
     */
    @Transactional
    public void deleteTeacherProfile(Long teacherId) {
        teacherProfileRepository.deleteById(teacherId);
        log.info("🗑️ Deleted teacher profile {}", teacherId);
    }

    // ==================== DTO CONVERSION ====================

    private TeacherProfileDto convertToDto(TeacherProfile profile) {
        List<Long> subjectIds = profile.getSubjects() != null
                ? profile.getSubjects().stream()
                        .map(Subject::getId)
                        .collect(Collectors.toList())
                : List.of();
        
        List<Long> classIds = profile.getAssignedClasses() != null
                ? profile.getAssignedClasses().stream()
                        .map(ClassEntity::getId)
                        .collect(Collectors.toList())
                : List.of();
        
        return TeacherProfileDto.builder()
                .id(profile.getId())
                .userId(profile.getUser().getId())
                .userEmail(profile.getUser().getEmail())
                .userName(profile.getUser().getFullName())
                .departmentId(profile.getDepartment() != null ? profile.getDepartment().getId() : null)
                .departmentName(profile.getDepartment() != null ? profile.getDepartment().getName() : null)
                .specialization(profile.getSpecialization())
                .subjectIds(subjectIds)
                .assignedClassIds(classIds)
                .build();
    }
    
    public Optional<com.edu.platform.model.User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }
}