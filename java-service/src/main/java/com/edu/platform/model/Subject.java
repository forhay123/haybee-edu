package com.edu.platform.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "subjects", schema = "academic")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Subject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 50)
    private String code;

    // Broad level: JUNIOR or SENIOR
    @Column(length = 20, nullable = false)
    private String level;

    // ✅ NEW: Specific grade within the level
    // This allows querying across departments at same grade
    @Column(length = 10, nullable = false)
    private String grade; // JSS1, JSS2, JSS3, SSS1, SSS2, SSS3

    @Column(name = "is_compulsory")
    private boolean compulsory;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Department department;

    // Keep for backward compatibility
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id")
    private ClassEntity classEntity;
}