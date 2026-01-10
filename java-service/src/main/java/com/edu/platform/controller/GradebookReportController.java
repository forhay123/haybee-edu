package com.edu.platform.controller;

import com.edu.platform.dto.assessment.GradebookReportDto;
import com.edu.platform.dto.assessment.SubjectGradebookDto;
import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.assessment.AssessmentType;
import com.edu.platform.repository.StudentProfileRepository;
import com.edu.platform.security.JwtTokenUtil;
import com.edu.platform.service.assessment.GradebookCalculationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 📊 Gradebook Report Controller
 * API endpoints for weighted grade reports
 * 
 * Routes:
 * - GET /api/v1/gradebook/report - Full report for logged-in student
 * - GET /api/v1/gradebook/report/subject/{subjectId} - Report for one subject
 * - GET /api/v1/gradebook/weights - Get assessment weights
 * - GET /api/v1/gradebook/admin/student/{studentId}/report - Admin view of student report
 */
@RestController
@RequestMapping("/gradebook")
@RequiredArgsConstructor
@Slf4j
public class GradebookReportController {
    
    private final GradebookCalculationService calculationService;
    private final StudentProfileRepository studentProfileRepository;
    private final JwtTokenUtil jwtTokenUtil;
    
    /**
     * ✅ GET /api/v1/gradebook/report
     * Get full gradebook report for logged-in student
     * 
     * Returns weighted grades for all subjects
     */
    @GetMapping("/report")
    @PreAuthorize("hasAnyRole('STUDENT', 'PARENT')")
    public ResponseEntity<GradebookReportDto> getMyGradebookReport(
            @RequestHeader("Authorization") String authHeader) {
        
        try {
            // Extract student profile ID from JWT
            String token = authHeader.substring(7);
            Long userId = jwtTokenUtil.getUserIdFromToken(token);
            
            // Get student profile
            StudentProfile student = studentProfileRepository
                .findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException(
                    "No student profile found for user " + userId));
            
            log.info("📊 Getting gradebook report for student {}", student.getId());
            
            // Calculate report
            GradebookReportDto report = calculationService.calculateStudentReport(student.getId());
            
            // Add student name
            report.setStudentName(student.getUser().getFullName());
            
            log.info("✅ Report generated: {} subjects, {}% average", 
                     report.getTotalSubjects(), 
                     String.format("%.2f", report.getOverallAverage()));
            
            return ResponseEntity.ok(report);
            
        } catch (IllegalArgumentException e) {
            log.error("❌ Student not found: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            log.error("❌ Error generating gradebook report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * ✅ GET /api/v1/gradebook/report/subject/{subjectId}
     * Get gradebook report for ONE subject
     * 
     * Returns detailed breakdown of all 6 components
     */
    @GetMapping("/report/subject/{subjectId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'PARENT')")
    public ResponseEntity<SubjectGradebookDto> getSubjectGradebook(
            @PathVariable Long subjectId,
            @RequestHeader("Authorization") String authHeader) {
        
        try {
            // Extract student profile ID from JWT
            String token = authHeader.substring(7);
            Long userId = jwtTokenUtil.getUserIdFromToken(token);
            
            // Get student profile
            StudentProfile student = studentProfileRepository
                .findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException(
                    "No student profile found for user " + userId));
            
            log.info("📊 Getting subject {} gradebook for student {}", 
                     subjectId, student.getId());
            
            // Calculate subject grade
            SubjectGradebookDto subjectReport = calculationService.calculateSubjectGrade(
                student.getId(),
                subjectId
            );
            
            log.info("✅ Subject report: {}%, Grade {}", 
                     String.format("%.2f", subjectReport.getFinalPercentage()), 
                     subjectReport.getGradeLetter());
            
            return ResponseEntity.ok(subjectReport);
            
        } catch (IllegalArgumentException e) {
            log.error("❌ Error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            log.error("❌ Error generating subject report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * ✅ GET /api/v1/gradebook/weights
     * Get assessment weights (publicly accessible)
     * 
     * Returns:
     * {
     *   "QUIZ": 20,
     *   "CLASSWORK": 10,
     *   "TEST1": 10,
     *   "TEST2": 10,
     *   "ASSIGNMENT": 10,
     *   "EXAM": 40
     * }
     */
    @GetMapping("/weights")
    public ResponseEntity<Map<AssessmentType, Integer>> getAssessmentWeights() {
        log.debug("📊 Getting assessment weights");
        Map<AssessmentType, Integer> weights = calculationService.getAllWeights();
        return ResponseEntity.ok(weights);
    }
    
    /**
     * ✅ GET /api/v1/gradebook/admin/student/{studentId}/report
     * Admin/Teacher view of student's gradebook report
     * 
     * Allows admins and teachers to view any student's report
     */
    @GetMapping("/admin/student/{studentId}/report")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<GradebookReportDto> getStudentGradebookReport(
            @PathVariable Long studentId) {
        
        try {
            log.info("📊 Admin getting gradebook report for student {}", studentId);
            
            // Verify student exists
            StudentProfile student = studentProfileRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException(
                    "Student not found: " + studentId));
            
            // Calculate report
            GradebookReportDto report = calculationService.calculateStudentReport(studentId);
            
            // Add student name
            report.setStudentName(student.getUser().getFullName());
            
            log.info("✅ Admin report generated: {} subjects, {}% average", 
                     report.getTotalSubjects(), 
                     String.format("%.2f", report.getOverallAverage()));
            
            return ResponseEntity.ok(report);
            
        } catch (IllegalArgumentException e) {
            log.error("❌ Student not found: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            log.error("❌ Error generating gradebook report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * ✅ GET /api/v1/gradebook/admin/student/{studentId}/subject/{subjectId}
     * Admin/Teacher view of student's subject grade
     */
    @GetMapping("/admin/student/{studentId}/subject/{subjectId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<SubjectGradebookDto> getStudentSubjectGradebook(
            @PathVariable Long studentId,
            @PathVariable Long subjectId) {
        
        try {
            log.info("📊 Admin getting subject {} gradebook for student {}", 
                     subjectId, studentId);
            
            // Verify student exists
            studentProfileRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException(
                    "Student not found: " + studentId));
            
            // Calculate subject grade
            SubjectGradebookDto subjectReport = calculationService.calculateSubjectGrade(
                studentId,
                subjectId
            );
            
            log.info("✅ Admin subject report: {}%, Grade {}", 
                     String.format("%.2f", subjectReport.getFinalPercentage()), 
                     subjectReport.getGradeLetter());
            
            return ResponseEntity.ok(subjectReport);
            
        } catch (IllegalArgumentException e) {
            log.error("❌ Error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            log.error("❌ Error generating subject report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}