package com.edu.platform.model;

import com.edu.platform.model.enums.StudentType;
import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

/**
 * Represents an academic class (e.g. JSS1, SS2, Home Class A, Aspirant Batch).
 */
@Entity
@Table(name = "classes", schema = "academic")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Human-readable class name (e.g., "JSS1", "Home Batch 1") */
    @Column(nullable = false, length = 50)
    private String name;

    /** Academic level grouping (e.g. "JUNIOR", "SENIOR") */
    @Column(nullable = false, length = 20)
    private String level;

    /** Type of students for this class (SCHOOL, HOME, ASPIRANT) */
    @Enumerated(EnumType.STRING)
    @Column(name = "student_type", length = 20)
    private StudentType studentType;

    /** Department this class belongs to */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    /** Subjects taught in this class */
    @ManyToMany
    @JoinTable(
            name = "class_subjects",
            schema = "academic",
            joinColumns = @JoinColumn(name = "class_id"),
            inverseJoinColumns = @JoinColumn(name = "subject_id")
    )
    @Builder.Default
    private Set<Subject> subjects = new HashSet<>();
}
