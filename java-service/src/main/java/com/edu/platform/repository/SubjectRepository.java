package com.edu.platform.repository;

import com.edu.platform.model.Subject;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubjectRepository extends JpaRepository<Subject, Long> {

    @EntityGraph(attributePaths = {"classEntity", "department"})
    List<Subject> findByGrade(String grade);

    @EntityGraph(attributePaths = {"classEntity", "department"})
    List<Subject> findByGradeAndDepartmentId(String grade, Long departmentId);

    // ✅ Filter by grade, department, AND class (or null class)
    @EntityGraph(attributePaths = {"classEntity", "department"})
    @Query("SELECT s FROM Subject s WHERE s.grade = :grade " +
           "AND s.department.id = :deptId " +
           "AND (s.classEntity.id = :classId OR s.classEntity IS NULL)")
    List<Subject> findByGradeDepartmentAndClass(
        @Param("grade") String grade,
        @Param("deptId") Long deptId,
        @Param("classId") Long classId
    );

    // ✅ FIXED: General subjects ONLY for the same student type (matching allowed class IDs)
    // Uses INNER JOIN to ensure classEntity is NOT NULL and must be in allowedClassIds
    @EntityGraph(attributePaths = {"classEntity", "department"})
    @Query("SELECT DISTINCT s FROM Subject s " +
           "INNER JOIN s.classEntity c " +
           "INNER JOIN s.department d " +
           "WHERE s.grade = :grade " +
           "AND d.id = :generalDeptId " +
           "AND c.id IN :allowedClassIds")
    List<Subject> findGeneralSubjectsByGradeAndAllowedClasses(
        @Param("grade") String grade,
        @Param("generalDeptId") Long generalDeptId,
        @Param("allowedClassIds") List<Long> allowedClassIds
    );

    // ✅ For grade + department (including general dept)
    @EntityGraph(attributePaths = {"classEntity", "department"})
    @Query("SELECT s FROM Subject s WHERE s.grade = :grade " +
           "AND (s.department.id = :deptId OR s.department.id = 4 OR s.department IS NULL)")
    List<Subject> findByGradeAndDepartmentOrGeneral(
        @Param("grade") String grade,
        @Param("deptId") Long departmentId
    );

    @EntityGraph(attributePaths = {"classEntity", "department"})
    List<Subject> findByLevel(String level);

    @EntityGraph(attributePaths = {"classEntity", "department"})
    List<Subject> findByLevelAndDepartmentId(String level, Long departmentId);

    @EntityGraph(attributePaths = {"classEntity", "department"})
    List<Subject> findByClassEntityId(Long classId);

    @EntityGraph(attributePaths = {"classEntity", "department"})
    List<Subject> findByClassEntityIdAndDepartmentId(Long classId, Long departmentId);


    /**
     * Find subject by name (case-insensitive)
     * Used for mapping INDIVIDUAL student subjects
     */
    @EntityGraph(attributePaths = {"classEntity", "department"})
    Optional<Subject> findByNameIgnoreCase(String name);

}