package com.edu.platform.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "school_sessions", schema = "academic")
@Getter 
@Setter 
@NoArgsConstructor 
@AllArgsConstructor 
@Builder
public class SchoolSession {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name; // e.g. 2024/2025

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL)
    @Builder.Default
    private Set<Term> terms = new HashSet<>();
}
