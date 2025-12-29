package com.edu.platform.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "teacher_profiles", schema = "academic")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;
    
    @ManyToOne
    @JoinColumn(name = "department_id")
    private Department department;
    
    @Column(columnDefinition = "TEXT")
    private String specialization; // Keep for backward compatibility
    
    // ✅ NEW: Many-to-Many with Subjects
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "teacher_subjects",
        schema = "academic",
        joinColumns = @JoinColumn(name = "teacher_profile_id"),
        inverseJoinColumns = @JoinColumn(name = "subject_id")
    )
    @Builder.Default
    private Set<Subject> subjects = new HashSet<>();
    
    @ManyToMany
    @JoinTable(
        name = "teacher_classes",
        schema = "academic",
        joinColumns = @JoinColumn(name = "teacher_profile_id"),
        inverseJoinColumns = @JoinColumn(name = "class_id")
    )
    @Builder.Default
    private Set<ClassEntity> assignedClasses = new HashSet<>();
}