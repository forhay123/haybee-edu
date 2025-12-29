// ============================================================
// FILE 2: IndividualSchemeRepository.java
// ============================================================
package com.edu.platform.repository.individual;

import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.model.individual.IndividualStudentScheme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IndividualSchemeRepository extends JpaRepository<IndividualStudentScheme, Long> {
    
    /**
     * Find all schemes for a student
     */
    List<IndividualStudentScheme> findByStudentProfileOrderByUploadedAtDesc(StudentProfile studentProfile);
    
    /**
     * Find all schemes for a student by ID
     */
    List<IndividualStudentScheme> findByStudentProfileIdOrderByUploadedAtDesc(Long studentProfileId);
    
    /**
     * Find schemes for a student and subject
     */
    List<IndividualStudentScheme> findByStudentProfileAndSubjectOrderByUploadedAtDesc(
        StudentProfile studentProfile, Subject subject);
    
    /**
     * Find the latest scheme for a student and subject
     */
    Optional<IndividualStudentScheme> findFirstByStudentProfileAndSubjectOrderByUploadedAtDesc(
        StudentProfile studentProfile, Subject subject);
    
    /**
     * Find the latest processed scheme for a student and subject
     */
    Optional<IndividualStudentScheme> findFirstByStudentProfileAndSubjectAndProcessingStatusOrderByProcessedAtDesc(
        StudentProfile studentProfile, Subject subject, String processingStatus);
    
    /**
     * Find all schemes by processing status
     */
    List<IndividualStudentScheme> findByProcessingStatusOrderByUploadedAtAsc(String processingStatus);
    
    /**
     * Count schemes by student
     */
    long countByStudentProfile(StudentProfile studentProfile);
    
    /**
     * Count schemes by student and status
     */
    long countByStudentProfileAndProcessingStatus(StudentProfile studentProfile, String processingStatus);
    
    /**
     * Count schemes by student and subject
     */
    long countByStudentProfileAndSubject(StudentProfile studentProfile, Subject subject);
    
    /**
     * Find all pending schemes for processing
     */
    @Query("SELECT s FROM IndividualStudentScheme s " +
           "WHERE s.processingStatus = 'PENDING' " +
           "ORDER BY s.uploadedAt ASC")
    List<IndividualStudentScheme> findPendingForProcessing();
    
    /**
     * Check if student has any completed scheme for a subject
     */
    boolean existsByStudentProfileAndSubjectAndProcessingStatus(
        StudentProfile studentProfile, Subject subject, String processingStatus);
    
    /**
     * Find all schemes for a term
     */
    List<IndividualStudentScheme> findByTermIdOrderByUploadedAtDesc(Long termId);
    
    /**
     * Find all schemes for a subject across all students
     */
    List<IndividualStudentScheme> findBySubjectOrderByUploadedAtDesc(Subject subject);
}