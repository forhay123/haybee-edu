package com.edu.platform.repository;

import com.edu.platform.model.Term;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TermRepository extends JpaRepository<Term, Long> {
    
    /**
     * ✅ NEW: Find the currently active term
     * Only one term should be active at a time
     */
    Optional<Term> findByIsActiveTrue();
    
    /**
     * Find term by name
     */
    Optional<Term> findByName(String name);
}