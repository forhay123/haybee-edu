package com.edu.platform.repository;

import com.edu.platform.model.Enrollment;
import com.edu.platform.model.StudentProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Handles database operations related to student-class enrollments.
 */
@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
    
    /** All enrollments for a student */
    List<Enrollment> findByStudentProfileId(Long studentId);
    
    /** The currently active enrollment for a student */
    Optional<Enrollment> findByStudentProfileIdAndActiveTrue(Long studentId);
    
    /** Check if a student is actively enrolled in a given class */
    boolean existsByStudentProfileIdAndClassEntityIdAndActiveTrue(Long studentId, Long classId);
    
    /**
     * ✅ NEW: Get all students enrolled in a specific class
     * Used for chat notifications
     */
    @Query("SELECT e.studentProfile FROM Enrollment e WHERE e.classEntity.id = :classId AND e.active = true")
    List<StudentProfile> findStudentsByClassId(@Param("classId") Long classId);
    
    /**
     * ✅ NEW: Get all enrollments for a specific class
     * Alternative method if needed
     */
    @Query("SELECT e FROM Enrollment e WHERE e.classEntity.id = :classId AND e.active = true")
    List<Enrollment> findByClassEntityIdAndActiveTrue(@Param("classId") Long classId);
}