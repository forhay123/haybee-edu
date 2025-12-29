package com.edu.platform.repository;

import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.enums.StudentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {
    
    Optional<StudentProfile> findByUserId(Long userId);
    
    List<StudentProfile> findByStudentType(StudentType studentType);
    
    List<StudentProfile> findByClassLevelId(Long classId);
    
    List<StudentProfile> findByClassLevelIdIn(List<Long> classIds);
    
    List<StudentProfile> findByDepartmentId(Long departmentId);
    
    Optional<StudentProfile> findByUserEmail(String email);
    
    boolean existsByUserEmail(String email);
    
    /**
     * ✅ FIXED: Changed from User_IsActiveTrue to User_EnabledTrue
     * This matches the actual field name in User entity (enabled, not isActive)
     * Used to find all INDIVIDUAL students for schedule generation
     */
    List<StudentProfile> findByStudentTypeAndUser_EnabledTrue(StudentType studentType);


    /**
     * ✅ NEW: Count active students by student type
     * Used for active student statistics
     */
    long countByStudentTypeAndUser_EnabledTrue(StudentType studentType);

}