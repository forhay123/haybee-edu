package com.edu.platform.service;

import com.edu.platform.model.StudentProfile;
import com.edu.platform.repository.StudentProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudentService {
    private final StudentProfileRepository studentProfileRepository;

    /**
     * Get all students enrolled in a specific class
     */
    public List<StudentProfile> getStudentsByClassId(Long classId) {
        log.info("📖 getStudentsByClassId - ClassId: {}", classId);
        List<StudentProfile> students = studentProfileRepository.findByClassLevelId(classId);
        log.info("✅ Found {} students in class {}", students.size(), classId);
        return students;
    }

    /**
     * Get all students across multiple class IDs (for a teacher)
     */
    public List<StudentProfile> getStudentsForTeacher(List<Long> classIds) {
        log.info("📖 getStudentsForTeacher - ClassIds: {}", classIds);
        if (classIds == null || classIds.isEmpty()) {
            log.warn("⚠️ No class IDs provided");
            return List.of();
        }
        List<StudentProfile> students = studentProfileRepository.findByClassLevelIdIn(classIds);
        log.info("✅ Found {} students across {} classes", students.size(), classIds.size());
        return students;
    }
}