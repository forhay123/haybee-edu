package com.edu.platform.dto.auth;

import com.edu.platform.model.enums.StudentType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * DTO for registering a new user.
 */
@Getter
@Setter
public class RegisterRequest {
    
    @NotBlank(message = "Full name is required")
    private String fullName;
    
    @Email(message = "Email must be valid")
    @NotBlank(message = "Email is required")
    private String email;
    
    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters long")
    private String password;
    
    @NotBlank(message = "Phone number is required")
    private String phone;
    
    @NotBlank(message = "User type is required")
    private String userType; // STUDENT, PARENT, TEACHER, ADMIN etc.
    
    // Optional, only required if userType == STUDENT
    private StudentType studentType;
    
    // ✅ NEW: Student's preferred class during registration
    // Optional - helps admin know what class to assign the student to
    private String preferredClass; // e.g., "JSS 1", "JSS 2", "SS 1", "SS 2", "SS 3"
    
    // ✅ NEW: Student's preferred department during registration
    // Optional - helps admin know what department to assign (for SS students)
    private String preferredDepartment; // e.g., "Science", "Arts", "Commercial", "Technical"
}