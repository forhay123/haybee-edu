package com.edu.platform.model;

import com.edu.platform.model.enums.StudentType;
import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

/**
 * Academic profile for a student user.
 */
@Entity
@Table(name = "student_profiles", schema = "academic")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Linked user account */
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    /** Type of student: SCHOOL, HOME, ASPIRANT */
    @Enumerated(EnumType.STRING)
    @Column(name = "student_type", length = 20, nullable = false)
    private StudentType studentType;

    /** Class level reference */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id")
    private ClassEntity classLevel;

    /** Department/faculty reference */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    /** Enrolled subjects */
    @ManyToMany
    @JoinTable(
        name = "student_subjects",
        schema = "academic",
        joinColumns = @JoinColumn(name = "student_profile_id"),
        inverseJoinColumns = @JoinColumn(name = "subject_id")
    )
    @Builder.Default
    private Set<Subject> subjects = new HashSet<>();

    /** Student’s chosen or preferred language */
    @Column(name = "chosen_language", length = 50)
    private String chosenLanguage;
}
