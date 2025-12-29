package com.edu.platform.service;

import com.edu.platform.model.*;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClassService {
    private final ClassRepository classRepository;
    private final TeacherProfileRepository teacherProfileRepository;
    private final UserRepository userRepository;

    public List<ClassEntity> getAllClasses() {
        return classRepository.findAll();
    }

    public Optional<ClassEntity> getClassById(Long id) {
        return classRepository.findById(id);
    }

    public ClassEntity createClass(ClassEntity classEntity) {
        return classRepository.save(classEntity);
    }

    public ClassEntity updateClass(Long id, ClassEntity updated) {
        return classRepository.findById(id)
                .map(existing -> {
                    existing.setName(updated.getName());
                    existing.setLevel(updated.getLevel());
                    existing.setStudentType(updated.getStudentType());
                    existing.setDepartment(updated.getDepartment());
                    existing.setSubjects(updated.getSubjects());
                    return classRepository.save(existing);
                })
                .orElseThrow(() -> new RuntimeException("Class not found with id " + id));
    }

    public void deleteClass(Long id) {
        ClassEntity classEntity = classRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Class not found with id " + id));
        try {
            classRepository.delete(classEntity);
        } catch (DataIntegrityViolationException ex) {
            throw new IllegalStateException(
                "Cannot delete class with id " + id + " because it has related entities"
            );
        }
    }

    public List<ClassEntity> getClassesByStudentType(StudentType type) {
        return classRepository.findByStudentType(type);
    }

    public List<ClassEntity> getClassesByLevel(String level) {
        return classRepository.findByLevel(level);
    }

    /**
     * ✅ FIXED: Get classes for a teacher/admin
     * - Admins get ALL classes
     * - Teachers get classes derived from their assigned subjects
     */
    public List<ClassEntity> getTeacherClasses(String email) {
        log.info("📖 getTeacherClasses - User: {}", email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));

        // ✅ Check if user is admin using userType field or roles
        boolean isAdmin = "ADMIN".equalsIgnoreCase(user.getUserType()) ||
                         user.getRoles().stream()
                             .anyMatch(role -> "ADMIN".equalsIgnoreCase(role.getName()));

        if (isAdmin) {
            log.info("🔓 Admin user detected - returning all classes");
            List<ClassEntity> allClasses = classRepository.findAll();
            allClasses.sort(Comparator.comparing(ClassEntity::getName));
            log.info("✅ Returning {} classes for admin {}", allClasses.size(), email);
            return allClasses;
        }

        // ✅ Handle teacher users - get classes from assigned subjects
        TeacherProfile profile = teacherProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Teacher profile not found for user: " + email));

        Set<Subject> teacherSubjects = profile.getSubjects();
        
        if (teacherSubjects == null || teacherSubjects.isEmpty()) {
            log.warn("⚠️ No subjects assigned to teacher {}", email);
            return Collections.emptyList();
        }

        log.info("📚 Teacher has {} assigned subjects", teacherSubjects.size());

        // Extract unique class IDs from subjects
        Set<Long> classIds = teacherSubjects.stream()
                .map(Subject::getClassEntity)
                .filter(Objects::nonNull)
                .map(ClassEntity::getId)
                .collect(Collectors.toSet());

        log.info("🔍 Found {} unique class IDs from subjects: {}", classIds.size(), classIds);

        if (classIds.isEmpty()) {
            log.warn("⚠️ No classes found from teacher's subjects");
            return Collections.emptyList();
        }

        // Fetch the actual class entities
        List<ClassEntity> classes = classRepository.findAllById(classIds);
        classes.sort(Comparator.comparing(ClassEntity::getName));

        log.info("✅ Returning {} classes for teacher {}", classes.size(), email);
        classes.forEach(c -> log.info("   🏫 {} (ID: {}, Type: {})", 
            c.getName(), c.getId(), c.getStudentType()));

        return classes;
    }
}