package com.edu.platform.service;

import com.edu.platform.dto.classdata.SubjectDto;
import com.edu.platform.dto.classdata.SubjectResponseDto;
import com.edu.platform.model.*;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubjectService {

    private final SubjectRepository subjectRepository;
    private final DepartmentRepository departmentRepository;
    private final ClassRepository classRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final UserRepository userRepository;
    private final TeacherProfileRepository teacherProfileRepository;

    private static final Long GENERAL_DEPT_ID = 4L;
    private static final Long OPTIONAL_DEPT_ID = 5L;
    private static final String SSS3_GRADE = "SSS3";

    public SubjectResponseDto toDto(Subject subject) {
        return SubjectResponseDto.builder()
                .id(subject.getId())
                .name(subject.getName())
                .code(subject.getCode())
                .level(subject.getLevel())
                .grade(subject.getGrade())
                .compulsory(subject.isCompulsory())
                .departmentId(subject.getDepartment() != null ? subject.getDepartment().getId() : null)
                .classId(subject.getClassEntity() != null ? subject.getClassEntity().getId() : null)
                .build();
    }

    private String extractGradeFromClassName(String className) {
        if (className == null) return null;
        if (className.matches(".*[JS]SS[123].*")) {
            return className.replaceAll(".*((?:J|S)SS[123]).*", "$1");
        }
        return null;
    }

    public List<SubjectResponseDto> getAllSubjects() {
        List<Subject> subjects = subjectRepository.findAll();
        log.debug("📚 getAllSubjects: Found {} subjects", subjects.size());
        return subjects.stream().map(this::toDto).collect(Collectors.toList());
    }

    public Optional<SubjectResponseDto> getSubject(Long id) {
        return subjectRepository.findById(id).map(this::toDto);
    }

    public SubjectResponseDto createSubject(SubjectDto dto) {
        Subject subject = new Subject();
        subject.setName(dto.getName());
        subject.setCode(dto.getCode());
        subject.setCompulsory(dto.isCompulsory());

        if (dto.getDepartmentId() != null) {
            Department dept = departmentRepository.findById(dto.getDepartmentId())
                    .orElseThrow(() -> new RuntimeException("Department not found"));
            subject.setDepartment(dept);
        }

        if (dto.getClassId() != null) {
            ClassEntity cls = classRepository.findById(dto.getClassId())
                    .orElseThrow(() -> new RuntimeException("Class not found"));
            subject.setClassEntity(cls);
            subject.setLevel(cls.getLevel());

            String grade = extractGradeFromClassName(cls.getName());
            if (grade != null) {
                subject.setGrade(grade);
            } else {
                throw new RuntimeException("Cannot extract grade from class name: " + cls.getName());
            }
        } else if (dto.getLevel() != null && dto.getGrade() != null) {
            subject.setLevel(dto.getLevel());
            subject.setGrade(dto.getGrade());
        } else {
            throw new RuntimeException("Either classId or (level + grade) must be provided");
        }

        return toDto(subjectRepository.save(subject));
    }

    public SubjectResponseDto updateSubject(Long id, SubjectDto dto) {
        Subject updated = subjectRepository.findById(id)
                .map(existing -> {
                    existing.setName(dto.getName());
                    existing.setCode(dto.getCode());
                    existing.setCompulsory(dto.isCompulsory());

                    if (dto.getDepartmentId() != null) {
                        Department dept = departmentRepository.findById(dto.getDepartmentId())
                                .orElseThrow(() -> new RuntimeException("Department not found"));
                        existing.setDepartment(dept);
                    } else {
                        existing.setDepartment(null);
                    }

                    if (dto.getClassId() != null) {
                        ClassEntity cls = classRepository.findById(dto.getClassId())
                                .orElseThrow(() -> new RuntimeException("Class not found"));
                        existing.setClassEntity(cls);
                        existing.setLevel(cls.getLevel());

                        String grade = extractGradeFromClassName(cls.getName());
                        if (grade != null) {
                            existing.setGrade(grade);
                        }
                    } else if (dto.getLevel() != null && dto.getGrade() != null) {
                        existing.setLevel(dto.getLevel());
                        existing.setGrade(dto.getGrade());
                    }

                    return subjectRepository.save(existing);
                })
                .orElseThrow(() -> new RuntimeException("Subject not found"));

        return toDto(updated);
    }

    public void deleteSubject(Long id) {
        subjectRepository.deleteById(id);
    }

    /**
     * Get all subjects assigned to a specific class (includes Optional department subjects)
     */
    public List<SubjectResponseDto> getSubjectsByClass(Long classId) {
        log.info("📖 getSubjectsByClass - ClassId: {}", classId);
        
        ClassEntity classEntity = classRepository.findById(classId)
                .orElseThrow(() -> new RuntimeException("Class not found"));
        
        String grade = extractGradeFromClassName(classEntity.getName());
        StudentType studentType = classEntity.getStudentType();
        
        Set<Subject> subjectsSet = new LinkedHashSet<>();
        
        // Get subjects directly assigned to this class
        List<Subject> directSubjects = subjectRepository.findByClassEntityId(classId);
        log.info("📚 Found {} direct subjects for class {}", directSubjects.size(), classId);
        subjectsSet.addAll(directSubjects);
        
        // ✅ Add Optional department subjects for this grade and student type
        if (grade != null && studentType != null) {
            List<Long> allowedClassIds = findClassesByGradeAndStudentType(grade, studentType);
            if (!allowedClassIds.isEmpty()) {
                List<Subject> optionalSubjects = subjectRepository.findOptionalSubjectsByGradeAndAllowedClasses(
                        grade, OPTIONAL_DEPT_ID, allowedClassIds
                );
                log.info("🔄 Found {} optional subjects for grade={}, type={}", 
                        optionalSubjects.size(), grade, studentType);
                subjectsSet.addAll(optionalSubjects);
            }
        }
        
        List<SubjectResponseDto> dtos = subjectsSet.stream()
                .map(this::toResponseDto)
                .sorted(Comparator.comparing(SubjectResponseDto::getName))
                .collect(Collectors.toList());
        
        log.info("✅ Returning total {} subjects for class {}", dtos.size(), classId);
        return dtos;
    }

    /**
     * Helper method to convert Subject entity to SubjectResponseDto
     */
    private SubjectResponseDto toResponseDto(Subject subject) {
        return SubjectResponseDto.builder()
                .id(subject.getId())
                .name(subject.getName())
                .code(subject.getCode())
                .grade(subject.getGrade())
                .level(subject.getLevel())
                .compulsory(subject.isCompulsory())
                .classId(subject.getClassEntity() != null ? subject.getClassEntity().getId() : null)
                .departmentId(subject.getDepartment() != null ? subject.getDepartment().getId() : null)
                .build();
    }

    // ✅ UPDATED: Include Optional department subjects for all students
    public List<SubjectResponseDto> getSubjectsForStudent(Long classId, Long departmentId, StudentType type) {
        log.info("🔍 getSubjectsForStudent CALLED with classId={}, departmentId={}, type={}", classId, departmentId, type);

        if (type == StudentType.ASPIRANT) {
            return Collections.emptyList();
        }

        ClassEntity classEntity = classRepository.findById(classId)
                .orElseThrow(() -> new RuntimeException("Class not found"));

        String grade = extractGradeFromClassName(classEntity.getName());
        if (grade == null) throw new RuntimeException("Cannot determine grade from class: " + classEntity.getName());

        Set<Subject> subjectsSet = new LinkedHashSet<>();

        // ✅ Find allowed classes for this student type
        List<Long> allowedClassIds = findClassesByGradeAndStudentType(grade, type);
        log.info("🏫 Allowed class IDs for grade={}, type={}: {}", grade, type, allowedClassIds);

        // ✅ Only proceed if we have allowed classes
        if (!allowedClassIds.isEmpty()) {
            // Get general subjects (same type)
            List<Subject> generalSubjects = subjectRepository.findGeneralSubjectsByGradeAndAllowedClasses(
                    grade, GENERAL_DEPT_ID, allowedClassIds
            );
            log.info("📚 Found {} general subjects", generalSubjects.size());
            generalSubjects.forEach(s -> log.debug("  - General: {} (classId={})", s.getName(), s.getClassEntity() != null ? s.getClassEntity().getId() : "null"));
            subjectsSet.addAll(generalSubjects);
            
            // ✅ NEW: Get optional subjects (cross-departmental subjects)
            List<Subject> optionalSubjects = subjectRepository.findOptionalSubjectsByGradeAndAllowedClasses(
                    grade, OPTIONAL_DEPT_ID, allowedClassIds
            );
            log.info("🔄 Found {} optional subjects", optionalSubjects.size());
            optionalSubjects.forEach(s -> log.debug("  - Optional: {} (classId={})", s.getName(), s.getClassEntity() != null ? s.getClassEntity().getId() : "null"));
            subjectsSet.addAll(optionalSubjects);
        } else {
            log.warn("⚠️ No allowed classes found for grade={}, type={}", grade, type);
        }

        // ✅ Add department subjects for specific class
        if (departmentId != null && !departmentId.equals(GENERAL_DEPT_ID) && !departmentId.equals(OPTIONAL_DEPT_ID)) {
            List<Subject> deptSubjects = subjectRepository.findByGradeDepartmentAndClass(grade, departmentId, classId);
            log.info("🎓 Found {} departmental subjects", deptSubjects.size());
            deptSubjects.forEach(s -> log.debug("  - Dept: {} (classId={})", s.getName(), s.getClassEntity() != null ? s.getClassEntity().getId() : "null"));
            subjectsSet.addAll(deptSubjects);
        }

        log.info("✅ Returning total {} subjects for student", subjectsSet.size());
        return subjectsSet.stream()
                .map(this::toDto)
                .sorted(Comparator.comparing(SubjectResponseDto::getName))
                .collect(Collectors.toList());
    }

    public List<SubjectResponseDto> getAspirantAvailableSubjects(Long departmentId) {
        log.info("🎓 Getting ASPIRANT subjects for departmentId: {}", departmentId);
        
        Set<Subject> availableSubjects = new LinkedHashSet<>();
        
        // ✅ Find ALL ASPIRANT classes for SSS3 (across all departments)
        List<Long> aspirantClassIds = classRepository.findAll().stream()
                .filter(c -> {
                    String grade = extractGradeFromClassName(c.getName());
                    return SSS3_GRADE.equals(grade) && 
                           c.getStudentType() == StudentType.ASPIRANT;
                })
                .map(ClassEntity::getId)
                .collect(Collectors.toList());
        
        log.info("📋 Found ASPIRANT class IDs: {}", aspirantClassIds);
        
        if (aspirantClassIds.isEmpty()) {
            log.warn("⚠️ No ASPIRANT classes found for SSS3");
            return Collections.emptyList();
        }
        
        // ✅ Get general subjects for ALL ASPIRANT classes (available to all departments)
        List<Subject> generalSubjects = subjectRepository.findGeneralSubjectsByGradeAndAllowedClasses(
                SSS3_GRADE, GENERAL_DEPT_ID, aspirantClassIds
        );
        log.info("📚 Found {} general ASPIRANT subjects (available to all departments)", generalSubjects.size());
        availableSubjects.addAll(generalSubjects);
        
        // ✅ Get optional subjects for ALL ASPIRANT classes (available to all departments)
        List<Subject> optionalSubjects = subjectRepository.findOptionalSubjectsByGradeAndAllowedClasses(
                SSS3_GRADE, OPTIONAL_DEPT_ID, aspirantClassIds
        );
        log.info("🔄 Found {} optional ASPIRANT subjects (available to all departments)", optionalSubjects.size());
        availableSubjects.addAll(optionalSubjects);
        
        // ✅ Get departmental subjects for ALL departments if no specific department provided
        if (departmentId == null || departmentId.equals(GENERAL_DEPT_ID) || departmentId.equals(OPTIONAL_DEPT_ID)) {
            // Return subjects from ALL departments (Science, Commercial, Art)
            log.info("🌐 No specific department - fetching subjects from ALL departments");
            for (Long deptId : Arrays.asList(1L, 2L, 3L)) { // Science, Commercial, Art
                for (Long classId : aspirantClassIds) {
                    List<Subject> deptSubjects = subjectRepository.findByGradeDepartmentAndClass(
                            SSS3_GRADE, deptId, classId
                    );
                    log.info("🎓 Found {} subjects for department {} in class {}", 
                            deptSubjects.size(), deptId, classId);
                    availableSubjects.addAll(deptSubjects);
                }
            }
        } else {
            // Return subjects only for the specified department
            log.info("🎯 Specific department {} requested", departmentId);
            for (Long classId : aspirantClassIds) {
                List<Subject> deptSubjects = subjectRepository.findByGradeDepartmentAndClass(
                        SSS3_GRADE, departmentId, classId
                );
                log.info("🎓 Found {} departmental ASPIRANT subjects for class {}", 
                        deptSubjects.size(), classId);
                availableSubjects.addAll(deptSubjects);
            }
        }
        
        log.info("✅ Returning {} total ASPIRANT subjects", availableSubjects.size());
        
        return availableSubjects.stream()
                .map(this::toDto)
                .sorted(Comparator.comparing(SubjectResponseDto::getName))
                .collect(Collectors.toList());
    }

    
    
    public List<SubjectResponseDto> getEnrolledSubjects(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        StudentProfile profile = studentProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Student profile not found"));

        if (profile.getStudentType() == StudentType.ASPIRANT) {
            Set<Subject> subjects = profile.getSubjects();
            if (subjects == null || subjects.isEmpty()) return Collections.emptyList();
            return subjects.stream().map(this::toDto)
                    .sorted(Comparator.comparing(SubjectResponseDto::getName))
                    .collect(Collectors.toList());
        } else {
            return getSubjectsForStudent(
                    profile.getClassLevel().getId(),
                    profile.getDepartment() != null ? profile.getDepartment().getId() : null,
                    profile.getStudentType()
            );
        }
    }

    @Transactional
    public void enrollInSubjects(String email, List<Long> subjectIds) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        StudentProfile profile = studentProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Student profile not found"));

        if (profile.getStudentType() != StudentType.ASPIRANT)
            throw new RuntimeException("Only ASPIRANT students can enroll in subjects");

        List<Subject> subjects = subjectRepository.findAllById(subjectIds);
        boolean allSSS3 = subjects.stream().allMatch(s -> SSS3_GRADE.equals(s.getGrade()));
        if (!allSSS3) throw new RuntimeException("ASPIRANTS can only enroll in SSS3 subjects");

        profile.setSubjects(new HashSet<>(subjects));
        studentProfileRepository.save(profile);
    }

    public List<SubjectResponseDto> getTeacherSubjects(String email) {
        log.info("📖 getTeacherSubjects - User: {}", email);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean isAdmin = user.getRoles().stream()
                .anyMatch(role -> "ADMIN".equalsIgnoreCase(role.getName()));

        if (isAdmin) {
            log.info("🔓 Admin user detected - returning all subjects");
            return getAllSubjects();
        }

        TeacherProfile profile = teacherProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Teacher profile not found"));

        Set<Subject> subjects = profile.getSubjects();
        if (subjects == null || subjects.isEmpty()) {
            log.warn("⚠️ No subjects assigned to teacher {}", email);
            return Collections.emptyList();
        }

        return subjects.stream()
                .map(this::toDto)
                .sorted(Comparator.comparing(SubjectResponseDto::getName))
                .collect(Collectors.toList());
    }

    public List<StudentProfile> getStudentsByClassId(Long classId) {
        log.info("📖 getStudentsByClassId - ClassId: {}", classId);
        List<StudentProfile> students = studentProfileRepository.findByClassLevelId(classId);
        log.info("✅ Found {} students in class {}", students.size(), classId);
        return students;
    }

    // ✅ Use ClassEntity.studentType field directly
    private List<Long> findClassesByGradeAndStudentType(String grade, StudentType type) {
        log.info("🔎 Finding classes for grade={}, type={}", grade, type);
        
        List<ClassEntity> allClasses = classRepository.findAll();
        log.info("📋 Total classes in database: {}", allClasses.size());
        
        List<Long> result = allClasses.stream()
                .filter(cls -> {
                    String classGrade = extractGradeFromClassName(cls.getName());
                    boolean gradeMatches = grade.equals(classGrade);
                    
                    if (!gradeMatches) {
                        return false;
                    }
                    
                    StudentType classStudentType = cls.getStudentType();
                    boolean typeMatches = (classStudentType != null && classStudentType == type);
                    
                    log.debug("  📝 Class: {} | Grade: {} | Type: {} | RequestedType: {} | Matches: {}", 
                             cls.getName(), classGrade, classStudentType, type, typeMatches);
                    
                    return typeMatches;
                })
                .map(ClassEntity::getId)
                .collect(Collectors.toList());
        
        log.info("✅ Filtered to {} matching classes: {}", result.size(), result);
        return result;
    }
}