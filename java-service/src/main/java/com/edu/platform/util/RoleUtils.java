package com.edu.platform.util;

import com.edu.platform.model.Role;

import java.util.Set;

/**
 * Utility for checking user roles and access hierarchy.
 */
public class RoleUtils {

    public static final String ROLE_ADMIN = "ROLE_ADMIN";
    public static final String ROLE_TEACHER = "ROLE_TEACHER";
    public static final String ROLE_STUDENT = "ROLE_STUDENT";

    /**
     * Checks if a user has a specific role.
     */
    public static boolean hasRole(Set<Role> roles, String targetRole) {
        return roles.stream().anyMatch(r -> r.getName().equalsIgnoreCase(targetRole));
    }

    /**
     * Checks if a user has admin-level privileges.
     */
    public static boolean isAdmin(Set<Role> roles) {
        return hasRole(roles, ROLE_ADMIN);
    }

    /**
     * Checks if a user is a teacher (or higher, e.g. admin).
     */
    public static boolean isTeacherOrAbove(Set<Role> roles) {
        return isAdmin(roles) || hasRole(roles, ROLE_TEACHER);
    }

    /**
     * Checks if a user is a student.
     */
    public static boolean isStudent(Set<Role> roles) {
        return hasRole(roles, ROLE_STUDENT);
    }
}
