package com.edu.platform.service;

import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.repository.StudentProfileRepository;
import com.edu.platform.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class StudentSubjectService {

    private final StudentProfileRepository studentProfileRepository;
    private final SubjectRepository subjectRepository;

    /**
     * Get all subjects currently assigned to an aspirant student
     */
    public Set<Subject> getAspirantSubjects(Long studentProfileId) {
        return studentProfileRepository.findById(studentProfileId)
                .map(StudentProfile::getSubjects)
                .orElse(Set.of());
    }

    /**
     * Add a subject for an aspirant student
     */
    @Transactional
    public void addSubjectToAspirant(Long studentProfileId, Long subjectId) {
        StudentProfile student = studentProfileRepository.findById(studentProfileId)
                .orElseThrow(() -> new IllegalArgumentException("Student not found: " + studentProfileId));

        if (student.getStudentType().name().equals("ASPIRANT")) {
            Subject subject = subjectRepository.findById(subjectId)
                    .orElseThrow(() -> new IllegalArgumentException("Subject not found: " + subjectId));
            Set<Subject> subjects = student.getSubjects();
            if (subjects == null) subjects = new HashSet<>();
            subjects.add(subject);
            student.setSubjects(subjects);
            studentProfileRepository.save(student);
        }
    }

    /**
     * Remove a subject from an aspirant student
     */
    @Transactional
    public void removeSubjectFromAspirant(Long studentProfileId, Long subjectId) {
        StudentProfile student = studentProfileRepository.findById(studentProfileId)
                .orElseThrow(() -> new IllegalArgumentException("Student not found: " + studentProfileId));

        if (student.getStudentType().name().equals("ASPIRANT")) {
            Set<Subject> subjects = student.getSubjects();
            if (subjects != null) {
                subjects.removeIf(s -> s.getId().equals(subjectId));
                student.setSubjects(subjects);
                studentProfileRepository.save(student);
            }
        }
    }
}
