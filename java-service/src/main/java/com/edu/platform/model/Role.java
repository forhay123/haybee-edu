package com.edu.platform.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Represents a user role within the system.
 * Example roles: ADMIN, TEACHER, STUDENT, ACCOUNTANT
 * Lives inside the `core` schema (Supabase logical separation).
 */
@Entity
@Table(name = "roles", schema = "core", 
       uniqueConstraints = {@UniqueConstraint(columnNames = "name")})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Column(length = 150)
    private String description;
}
