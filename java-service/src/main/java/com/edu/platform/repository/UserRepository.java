package com.edu.platform.repository;

import com.edu.platform.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository for managing User entities in `core.users`.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    // ✅ NEW: Fetch user + studentProfile + classLevel in one query
    @Query("""
        SELECT u FROM User u
        LEFT JOIN FETCH u.studentProfile sp
        LEFT JOIN FETCH sp.classLevel
        WHERE u.email = :email
    """)
    Optional<User> findByEmailWithStudentProfile(@Param("email") String email);
}
