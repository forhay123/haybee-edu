package com.edu.platform.controller;

import com.edu.platform.model.StudentProfile;
import com.edu.platform.model.Subject;
import com.edu.platform.model.User;
import com.edu.platform.service.StudentProfileService;
import com.edu.platform.service.StudentSubjectService;
import com.edu.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

@RestController
@RequestMapping("/aspirant/subjects")
@RequiredArgsConstructor
public class StudentSubjectController {

    private final StudentSubjectService studentSubjectService;
    private final StudentProfileService studentProfileService;
    private final UserRepository userRepository;

    /** ✅ Get subjects for logged-in aspirant student */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/me")
    public ResponseEntity<Set<Subject>> getMySubjects(@RequestParam Long studentProfileId) {

        StudentProfile student = studentProfileService.getById(studentProfileId)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        if (!student.getStudentType().name().equals("ASPIRANT")) {
            return ResponseEntity.badRequest().build();
        }

        Set<Subject> subjects = studentSubjectService.getAspirantSubjects(studentProfileId);
        return ResponseEntity.ok(subjects);
    }

    /** ✅ Admin: get any aspirant student's subjects */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{studentProfileId}")
    public ResponseEntity<Set<Subject>> getAspirantSubjectsAdmin(@PathVariable Long studentProfileId) {
        StudentProfile student = studentProfileService.getById(studentProfileId)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        if (!student.getStudentType().name().equals("ASPIRANT")) {
            return ResponseEntity.badRequest().build();
        }

        Set<Subject> subjects = studentSubjectService.getAspirantSubjects(studentProfileId);
        return ResponseEntity.ok(subjects);
    }

    /** ✅ Add a subject to aspirant student (student can self-assign) */
    @PreAuthorize("isAuthenticated()")
    @PostMapping("/me/{subjectId}")
    public ResponseEntity<Void> addMySubject(@RequestParam Long studentProfileId,
                                             @PathVariable Long subjectId) {

        studentSubjectService.addSubjectToAspirant(studentProfileId, subjectId);
        return ResponseEntity.ok().build();
    }

    /** ✅ Remove a subject from aspirant student (student can self-remove) */
    @PreAuthorize("isAuthenticated()")
    @DeleteMapping("/me/{subjectId}")
    public ResponseEntity<Void> removeMySubject(@RequestParam Long studentProfileId,
                                                @PathVariable Long subjectId) {

        studentSubjectService.removeSubjectFromAspirant(studentProfileId, subjectId);
        return ResponseEntity.ok().build();
    }

    /** ✅ Admin can add subject to any aspirant */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{studentProfileId}/{subjectId}")
    public ResponseEntity<Void> addSubjectAdmin(@PathVariable Long studentProfileId,
                                                @PathVariable Long subjectId) {

        studentSubjectService.addSubjectToAspirant(studentProfileId, subjectId);
        return ResponseEntity.ok().build();
    }

    /** ✅ Admin can remove subject from any aspirant */
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{studentProfileId}/{subjectId}")
    public ResponseEntity<Void> removeSubjectAdmin(@PathVariable Long studentProfileId,
                                                   @PathVariable Long subjectId) {

        studentSubjectService.removeSubjectFromAspirant(studentProfileId, subjectId);
        return ResponseEntity.ok().build();
    }
}
