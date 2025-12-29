package com.edu.platform.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Department entity — represents an academic department or faculty.
 */
@Entity
@Table(name = "departments", schema = "academic")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Department {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 20)
    private String code; // ✅ Added: department code (e.g. SCI, ART)

    @Column(length = 255)
    private String description;
}
