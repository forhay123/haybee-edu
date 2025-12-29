package com.edu.platform.repository;

import com.edu.platform.model.SchoolSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SchoolSessionRepository extends JpaRepository<SchoolSession, Long> {
}
