package com.edu.platform.service;

import com.edu.platform.model.Enrollment;
import com.edu.platform.repository.EnrollmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class EnrollmentService {
    
    private final EnrollmentRepository enrollmentRepository;
    private final EntityManager entityManager;

    /** Get all enrollments (active + inactive, for admin use) */
    public List<Enrollment> getAllEnrollments() {
        return enrollmentRepository.findAll();
    }

    /** Get all enrollments for a student */
    public List<Enrollment> getEnrollmentsByStudent(Long studentId) {
        return enrollmentRepository.findByStudentProfileId(studentId);
    }

    /** Get the active enrollment for a student */
    public Optional<Enrollment> getActiveEnrollment(Long studentId) {
        return enrollmentRepository.findByStudentProfileIdAndActiveTrue(studentId);
    }

    /** Create a new enrollment */
    public Enrollment createEnrollment(Enrollment enrollment) {
        return enrollmentRepository.save(enrollment);
    }

    /** Deactivate (soft-remove) an enrollment */
    public void deactivateEnrollment(Long id) {
        enrollmentRepository.findById(id).ifPresent(enrollment -> {
            enrollment.setActive(false);
            enrollmentRepository.save(enrollment);
        });
    }

    /** Delete enrollment permanently */
    public void deleteEnrollment(Long id) {
        enrollmentRepository.deleteById(id);
    }

    /** Check if a student has an active enrollment in a class */
    public boolean isActiveEnrollment(Long studentId, Long classId) {
        return enrollmentRepository.existsByStudentProfileIdAndClassEntityIdAndActiveTrue(studentId, classId);
    }

    /**
     * ✅ NEW METHOD: Get all student user IDs enrolled in a subject.
     * Used for sending notifications when assessments are published.
     * 
     * This uses a native SQL query to find students whose class matches the subject's class.
     * 
     * @param subjectId Subject ID
     * @return List of user IDs of enrolled students
     */
    @SuppressWarnings("unchecked")
    public List<Long> getStudentUserIdsBySubjectId(Long subjectId) {
        log.info("📚 Getting student user IDs for subject ID: {}", subjectId);

        // Native SQL query - matches the exact query we tested in the database
        String sql = """
            SELECT DISTINCT u.id AS user_id
            FROM academic.enrollments e
            JOIN academic.student_profiles sp ON e.student_profile_id = sp.id
            JOIN core.users u ON sp.user_id = u.id
            JOIN academic.subjects s ON s.class_id = e.class_id
            WHERE s.id = :subjectId
            AND e.active = true
            ORDER BY u.id
            """;

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("subjectId", subjectId);
        
        List<Long> userIds = (List<Long>) query.getResultList().stream()
                .map(result -> {
                    if (result instanceof Number) {
                        return ((Number) result).longValue();
                    }
                    return null;
                })
                .filter(id -> id != null)
                .toList();

        log.info("✅ Found {} students enrolled in subject {}", userIds.size(), subjectId);
        log.debug("Student user IDs: {}", userIds);

        return userIds;
    }
}