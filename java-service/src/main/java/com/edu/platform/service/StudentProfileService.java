package com.edu.platform.service;

import com.edu.platform.dto.user.StudentProfileDto;
import com.edu.platform.model.*;
import com.edu.platform.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudentProfileService {

    private final StudentProfileRepository studentProfileRepository;
    private final ClassRepository classRepository;
    private final DepartmentRepository departmentRepository;
    private final SubjectRepository subjectRepository;

    public Optional<StudentProfile> getStudentProfile(Long userId) {
        return studentProfileRepository.findByUserId(userId);
    }

    public Optional<StudentProfile> getById(Long id) {
        return studentProfileRepository.findById(id);
    }

    public Optional<StudentProfile> getByEmail(String email) {
        return studentProfileRepository.findByUserEmail(email);
    }

    public List<StudentProfile> getAllProfiles() {
        return studentProfileRepository.findAll();
    }

    @Transactional
    public StudentProfile saveStudentProfile(StudentProfile profile) {
        return studentProfileRepository.save(profile);
    }

    @Transactional
    public void deleteStudentProfile(Long id) {
        studentProfileRepository.deleteById(id);
    }

    public StudentProfileDto toDto(StudentProfile profile) {
        return StudentProfileDto.builder()
                .id(profile.getId())
                .userId(profile.getUser().getId())
                .fullName(profile.getUser().getFullName())
                .studentType(profile.getStudentType())
                .classId(profile.getClassLevel() != null ? profile.getClassLevel().getId() : null)
                .className(profile.getClassLevel() != null ? profile.getClassLevel().getName() : null)
                .departmentId(profile.getDepartment() != null ? profile.getDepartment().getId() : null)
                .departmentName(profile.getDepartment() != null ? profile.getDepartment().getName() : null)
                .subjectIds(profile.getSubjects() == null ? Set.of() :
                        profile.getSubjects().stream().map(Subject::getId).collect(Collectors.toSet()))
                .subjectNames(profile.getSubjects() == null ? Set.of() :
                        profile.getSubjects().stream().map(Subject::getName).collect(Collectors.toSet()))
                .chosenLanguage(profile.getChosenLanguage())
                .build();
    }

    public StudentProfile fromDto(StudentProfileDto dto, User user) {
        StudentProfile.StudentProfileBuilder builder = StudentProfile.builder()
                .user(user)
                .studentType(dto.getStudentType())
                .chosenLanguage(dto.getChosenLanguage());

        if (dto.getClassId() != null)
            classRepository.findById(dto.getClassId()).ifPresent(builder::classLevel);

        if (dto.getDepartmentId() != null)
            departmentRepository.findById(dto.getDepartmentId()).ifPresent(builder::department);

        if (dto.getSubjectIds() != null && !dto.getSubjectIds().isEmpty()) {
            Set<Subject> subjects = subjectRepository.findAllById(dto.getSubjectIds()).stream()
                    .collect(Collectors.toSet());
            builder.subjects(subjects);
        }

        return builder.build();
    }

    public boolean existsByUserId(Long userId) {
        return studentProfileRepository.findByUserId(userId).isPresent();
    }

    public List<StudentProfile> getProfilesByClassId(Long classId) {
        return studentProfileRepository.findByClassLevelId(classId);
    }

    public List<StudentProfile> getProfilesByDepartmentId(Long departmentId) {
        return studentProfileRepository.findByDepartmentId(departmentId);
    }
    
    public Optional<ClassEntity> getClassById(Long id) {
        return classRepository.findById(id);
    }



    public Optional<Department> getDepartmentById(Long id) {
        return departmentRepository.findById(id);
    }
}
