package com.edu.platform.repository.individual;

import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.individual.IndividualStudentTimetable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface IndividualTimetableRepository extends JpaRepository<IndividualStudentTimetable, Long> {
    
    /**
     * Find all timetables for a student
     */
    List<IndividualStudentTimetable> findByStudentProfileOrderByUploadedAtDesc(StudentProfile studentProfile);
    
    /**
     * Find all timetables for a student by ID
     */
    List<IndividualStudentTimetable> findByStudentProfileIdOrderByUploadedAtDesc(Long studentProfileId);
    
    /**
     * ✅ UPDATED: Find the latest COMPLETED timetable for schedule generation
     */
    Optional<IndividualStudentTimetable> findFirstByStudentProfileAndProcessingStatusOrderByUploadedAtDesc(
        StudentProfile studentProfile, String processingStatus);
    
    /**
     * Find the most recent timetable for a student (any status)
     */
    Optional<IndividualStudentTimetable> findFirstByStudentProfileOrderByUploadedAtDesc(StudentProfile studentProfile);
    
    /**
     * Find all timetables by processing status
     */
    List<IndividualStudentTimetable> findByProcessingStatusOrderByUploadedAtAsc(String processingStatus);
    
    /**
     * ✅ ADDED: Find timetables by status within date range
     * Fixes: findByProcessingStatusAndUploadedAtBetween undefined error
     */
    List<IndividualStudentTimetable> findByProcessingStatusAndUploadedAtBetween(
        String processingStatus, LocalDateTime startDate, LocalDateTime endDate);
    
    /**
     * Count timetables by student
     */
    long countByStudentProfile(StudentProfile studentProfile);
    
    /**
     * Count timetables by student and status
     */
    long countByStudentProfileAndProcessingStatus(StudentProfile studentProfile, String processingStatus);
    
    /**
     * Find all pending timetables for processing
     */
    @Query("SELECT t FROM IndividualStudentTimetable t " +
           "WHERE t.processingStatus = 'PENDING' " +
           "ORDER BY t.uploadedAt ASC")
    List<IndividualStudentTimetable> findPendingForProcessing();
    
    /**
     * Check if student has any completed timetable
     */
    boolean existsByStudentProfileAndProcessingStatus(StudentProfile studentProfile, String processingStatus);
    
    /**
     * Find all timetables for a term
     */
    List<IndividualStudentTimetable> findByTermIdOrderByUploadedAtDesc(Long termId);
    
    
    /**
     * ✅ FIXED: Find timetables for students who offer subjects taught by a specific teacher
     * Uses jsonb_array_elements for more reliable matching
     */
    @Query(value = """
        SELECT DISTINCT t.* 
        FROM individual_student_timetables t
        WHERE t.processing_status = 'COMPLETED'
        AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(t.extracted_entries) AS entry,
                 teacher_subjects ts
            WHERE ts.teacher_profile_id = :teacherProfileId
            AND entry->>'subjectId' IS NOT NULL
            AND (entry->>'subjectId')::bigint = ts.subject_id
        )
        ORDER BY t.uploaded_at DESC
        """, nativeQuery = true)
    List<IndividualStudentTimetable> findTimetablesForTeacherSubjects(
        @Param("teacherProfileId") Long teacherProfileId);
	
    /**
     * ✅ ALTERNATIVE: More precise JSON query using jsonb_array_elements
     * Use this if your PostgreSQL version supports it
     */
    @Query(value = """
        SELECT DISTINCT t.* 
        FROM individual_student_timetables t
        CROSS JOIN LATERAL jsonb_array_elements(t.extracted_entries) AS entry
        WHERE t.processing_status = 'COMPLETED'
        AND (entry->>'subjectId')::bigint IN (
            SELECT ts.subject_id 
            FROM teacher_subjects ts 
            WHERE ts.teacher_profile_id = :teacherProfileId
        )
        ORDER BY t.uploaded_at DESC
        """, nativeQuery = true)
    List<IndividualStudentTimetable> findTimetablesForTeacherSubjectsPrecise(
        @Param("teacherProfileId") Long teacherProfileId);

    /**
     * ✅ FIXED: Get latest timetable for a student with teacher permission check
     */
    @Query(value = """
        SELECT t.* 
        FROM individual_student_timetables t
        WHERE t.student_profile_id = :studentProfileId
        AND t.processing_status = 'COMPLETED'
        AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(t.extracted_entries) AS entry,
                 teacher_subjects ts
            WHERE ts.teacher_profile_id = :teacherProfileId
            AND entry->>'subjectId' IS NOT NULL
            AND (entry->>'subjectId')::bigint = ts.subject_id
        )
        ORDER BY t.uploaded_at DESC
        LIMIT 1
        """, nativeQuery = true)
    Optional<IndividualStudentTimetable> findLatestTimetableForTeacherStudent(
        @Param("teacherProfileId") Long teacherProfileId,
        @Param("studentProfileId") Long studentProfileId);

}