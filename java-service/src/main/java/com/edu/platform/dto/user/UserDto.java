package com.edu.platform.dto.user;

import com.edu.platform.model.enums.StudentType;
import lombok.*;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDto {
    private Long id;
    private String email;
    private String fullName;
    private String phone;
    private boolean enabled;
    private Set<String> roles;
    
    // ✅ NEW: Include student type and preferences
    private String userType; // "STUDENT" | "PARENT" | "TEACHER" | "ADMIN"
    private StudentType studentType; // SCHOOL, HOME, ASPIRANT, INDIVIDUAL
    private String preferredClass; // Student's preferred class
    private String preferredDepartment; // Student's preferred department
}