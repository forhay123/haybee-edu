package com.edu.platform.repository;

import com.edu.platform.model.ClassEntity;
import com.edu.platform.model.enums.StudentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for managing academic classes.
 */
@Repository
public interface ClassRepository extends JpaRepository<ClassEntity, Long> {

    Optional<ClassEntity> findByName(String name);

    List<ClassEntity> findByLevel(String level);

    List<ClassEntity> findByStudentType(StudentType studentType);
}
