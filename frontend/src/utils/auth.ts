// src/utils/auth.ts
// import { RootState } from '@/store/store';

export const getUserFromLocalStorage = () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

export const getUserRole = (): string | null => {
  const user = getUserFromLocalStorage();
  return user?.roles?.[0] || null;
};

export const isStudent = () => getUserRole() === 'STUDENT';
export const isTeacher = () => getUserRole() === 'TEACHER';
export const isAdmin = () => getUserRole() === 'ADMIN';
export const isParent = () => getUserRole() === 'PARENT';

export const hasAnyRole = (roles: string[]) => {
  const userRole = getUserRole();
  return userRole ? roles.includes(userRole) : false;
};