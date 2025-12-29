package com.edu.platform.repository;

import com.edu.platform.model.TeacherProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for teacher profile data access.
 */
@Repository
public interface TeacherProfileRepository extends JpaRepository<TeacherProfile, Long> {

    Optional<TeacherProfile> findByUserId(Long userId);

    // ✅ NEW: Find all teachers belonging to a specific department
    List<TeacherProfile> findByDepartmentId(Long departmentId);
}
