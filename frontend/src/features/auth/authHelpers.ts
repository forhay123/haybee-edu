// src/features/auth/authHelpers.ts

/**
 * Helper functions for auth-related checks
 */

interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

/**
 * Check if user has a specific role
 */
export const hasRole = (user: User | null, role: string): boolean => {
  if (!user || !user.roles || !Array.isArray(user.roles)) {
    return false;
  }
  return user.roles.some(r => r.toUpperCase() === role.toUpperCase());
};

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (user: User | null, roles: string[]): boolean => {
  if (!user || !user.roles || !Array.isArray(user.roles)) {
    return false;
  }
  return roles.some(role => 
    user.roles.some(r => r.toUpperCase() === role.toUpperCase())
  );
};

/**
 * Check if user has all of the specified roles
 */
export const hasAllRoles = (user: User | null, roles: string[]): boolean => {
  if (!user || !user.roles || !Array.isArray(user.roles)) {
    return false;
  }
  return roles.every(role => 
    user.roles.some(r => r.toUpperCase() === role.toUpperCase())
  );
};

/**
 * Check if user is an admin (ADMIN or SUPER_ADMIN)
 */
export const isAdmin = (user: User | null): boolean => {
  return hasAnyRole(user, ['ADMIN', 'SUPER_ADMIN']);
};

/**
 * Check if user is a super admin
 */
export const isSuperAdmin = (user: User | null): boolean => {
  return hasRole(user, 'SUPER_ADMIN');
};

/**
 * Check if user is a student
 */
export const isStudent = (user: User | null): boolean => {
  return hasRole(user, 'STUDENT');
};

/**
 * Check if user is a teacher
 */
export const isTeacher = (user: User | null): boolean => {
  return hasRole(user, 'TEACHER');
};

/**
 * Check if user is a parent
 */
export const isParent = (user: User | null): boolean => {
  return hasRole(user, 'PARENT');
};

/**
 * Get user's primary role (first role in the array)
 */
export const getPrimaryRole = (user: User | null): string | null => {
  if (!user || !user.roles || !Array.isArray(user.roles) || user.roles.length === 0) {
    return null;
  }
  return user.roles[0];
};

/**
 * Get all user roles as a comma-separated string
 */
export const getRolesString = (user: User | null): string => {
  if (!user || !user.roles || !Array.isArray(user.roles)) {
    return 'No roles';
  }
  return user.roles.join(', ');
};

/**
 * Check if user can perform admin actions (for UI permission checks)
 */
export const canPerformAdminActions = (user: User | null): boolean => {
  return isAdmin(user);
};

/**
 * Check if user can delete resources (typically only admins)
 */
export const canDeleteResources = (user: User | null): boolean => {
  return isAdmin(user);
};

/**
 * Check if user can modify resources (admins and sometimes teachers)
 */
export const canModifyResources = (user: User | null, allowTeachers: boolean = false): boolean => {
  if (isAdmin(user)) return true;
  if (allowTeachers && isTeacher(user)) return true;
  return false;
};