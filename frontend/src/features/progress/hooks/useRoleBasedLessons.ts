// src/features/progress/hooks/useRoleBasedLessons.ts

import { useQuery } from '@tanstack/react-query';
import { comprehensiveLessonsApi, type TeacherLessonFilters } from '../api/comprehensiveLessonsApi';
import { getUserFromLocalStorage, isStudent, isTeacher, isAdmin } from '../../../utils/auth';

/**
 * ✅ Smart hook that automatically calls the right endpoint based on user role
 * 
 * - STUDENT → calls /progress/lessons/comprehensive (student's own lessons)
 * - TEACHER → calls /progress/lessons/teacher/comprehensive (teacher's subjects)
 * - ADMIN → calls /progress/lessons/admin/comprehensive (all lessons)
 */
export const useRoleBasedComprehensiveLessons = (
  fromDate?: string,
  toDate?: string,
  statusFilter?: string,
  // Additional filters for teacher/admin
  subjectId?: number,
  classId?: number,
  studentId?: number
) => {
  const user = getUserFromLocalStorage();
  
  const userIsStudent = isStudent();
  const userIsTeacher = isTeacher();
  const userIsAdmin = isAdmin();

  // Determine which endpoint to call based on role
  const queryFn = async () => {
    if (userIsStudent) {
      // Students get their own lessons (no filters)
      return await comprehensiveLessonsApi.getMyComprehensiveLessons(
        fromDate,
        toDate,
        statusFilter
      );
    } else if (userIsTeacher && !userIsAdmin) {
      // Teachers get lessons from their subjects (with filters)
      const filters: TeacherLessonFilters = {
        fromDate,
        toDate,
        statusFilter,
        subjectId,
        classId,
        studentId
      };
      return comprehensiveLessonsApi.getTeacherLessons(filters)
        .then(lessons => {
          // Convert array response to report format for consistency
          const totalLessons = lessons.length;
          const completedCount = lessons.filter(l => l.status === 'COMPLETED').length;
          const missedCount = lessons.filter(l => l.status === 'MISSED').length;
          const inProgressCount = lessons.filter(l => l.status === 'IN_PROGRESS').length;
          const scheduledCount = lessons.filter(l => l.status === 'SCHEDULED').length;
          
          // Calculate rates
          const completionRate = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;
          const missedRate = totalLessons > 0 ? (missedCount / totalLessons) * 100 : 0;
          const onTrackRate = totalLessons > 0 ? ((completedCount + scheduledCount) / totalLessons) * 100 : 0;
          
          return {
            allLessons: lessons,
            totalLessons,
            completedCount,
            missedCount,
            inProgressCount,
            scheduledCount,
            completionRate,
            missedRate,
            onTrackRate,
            isOnTrack: completionRate >= 70,
            isAtRisk: missedRate > 30,
            lessonsByStatus: {
              COMPLETED: lessons.filter(l => l.status === 'COMPLETED'),
              MISSED: lessons.filter(l => l.status === 'MISSED'),
              IN_PROGRESS: lessons.filter(l => l.status === 'IN_PROGRESS'),
              SCHEDULED: lessons.filter(l => l.status === 'SCHEDULED'),
            }
          };
        });
    } else if (userIsAdmin) {
      // Admins get all lessons (with filters)
      const filters: TeacherLessonFilters = {
        fromDate,
        toDate,
        statusFilter,
        subjectId,
        classId,
        studentId
      };
      return comprehensiveLessonsApi.getAdminLessons(filters)
        .then(lessons => {
          // Convert array response to report format for consistency
          const totalLessons = lessons.length;
          const completedCount = lessons.filter(l => l.status === 'COMPLETED').length;
          const missedCount = lessons.filter(l => l.status === 'MISSED').length;
          const inProgressCount = lessons.filter(l => l.status === 'IN_PROGRESS').length;
          const scheduledCount = lessons.filter(l => l.status === 'SCHEDULED').length;
          
          // Calculate rates
          const completionRate = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;
          const missedRate = totalLessons > 0 ? (missedCount / totalLessons) * 100 : 0;
          const onTrackRate = totalLessons > 0 ? ((completedCount + scheduledCount) / totalLessons) * 100 : 0;
          
          return {
            allLessons: lessons,
            totalLessons,
            completedCount,
            missedCount,
            inProgressCount,
            scheduledCount,
            completionRate,
            missedRate,
            onTrackRate,
            isOnTrack: completionRate >= 70,
            isAtRisk: missedRate > 30,
            lessonsByStatus: {
              COMPLETED: lessons.filter(l => l.status === 'COMPLETED'),
              MISSED: lessons.filter(l => l.status === 'MISSED'),
              IN_PROGRESS: lessons.filter(l => l.status === 'IN_PROGRESS'),
              SCHEDULED: lessons.filter(l => l.status === 'SCHEDULED'),
            }
          };
        });
    }
    
    throw new Error('User role not recognized');
  };

  return useQuery<any, Error>({
    queryKey: [
      'role-based-lessons',
      user?.roles?.[0], // Include role in key
      fromDate,
      toDate,
      statusFilter,
      subjectId,
      classId,
      studentId
    ],
    queryFn,
    enabled: !!(user && (userIsStudent || userIsTeacher || userIsAdmin)),
    staleTime: 60000,
    gcTime: 300000,
  });
};

/**
 * ✅ Smart hook for statistics based on role
 */
export const useRoleBasedStats = (
  fromDate?: string,
  toDate?: string,
  subjectId?: number,
  classId?: number
) => {
  const user = getUserFromLocalStorage();
  
  const userIsStudent = isStudent();
  const userIsTeacher = isTeacher();
  const userIsAdmin = isAdmin();

  const queryFn = async () => {
    if (userIsStudent) {
      return await comprehensiveLessonsApi.getMyStats(fromDate, toDate);
    } else if (userIsTeacher && !userIsAdmin) {
      const filters: TeacherLessonFilters = {
        fromDate,
        toDate,
        subjectId,
        classId
      };
      return await comprehensiveLessonsApi.getTeacherStats(filters);
    } else if (userIsAdmin) {
      const filters: TeacherLessonFilters = {
        fromDate,
        toDate,
        subjectId,
        classId
      };
      return await comprehensiveLessonsApi.getAdminStats(filters);
    }
    
    throw new Error('User role not recognized');
  };

  return useQuery<any, Error>({
    queryKey: [
      'role-based-stats',
      user?.roles?.[0],
      fromDate,
      toDate,
      subjectId,
      classId
    ],
    queryFn,
    enabled: !!(user && (userIsStudent || userIsTeacher || userIsAdmin)),
    staleTime: 60000,
    gcTime: 300000,
  });
};

/**
 * ✅ Export individual role-based hooks for more specific use cases
 */

// Student-only hook
export const useStudentComprehensiveLessons = (
  fromDate?: string,
  toDate?: string,
  statusFilter?: string
) => {
  const user = getUserFromLocalStorage();
  
  return useQuery<any, Error>({
    queryKey: ['student-lessons', fromDate, toDate, statusFilter],
    queryFn: () => comprehensiveLessonsApi.getMyComprehensiveLessons(
      fromDate,
      toDate,
      statusFilter
    ),
    enabled: !!(user && isStudent()),
    staleTime: 60000,
    gcTime: 300000,
  });
};

// Teacher-only hook
export const useTeacherComprehensiveLessons = (filters: TeacherLessonFilters) => {
  const user = getUserFromLocalStorage();
  
  return useQuery<any, Error>({
    queryKey: ['teacher-lessons', filters],
    queryFn: () => comprehensiveLessonsApi.getTeacherLessons(filters),
    enabled: !!(user && isTeacher()),
    staleTime: 60000,
    gcTime: 300000,
  });
};

// Admin-only hook
export const useAdminComprehensiveLessons = (filters: TeacherLessonFilters) => {
  const user = getUserFromLocalStorage();
  
  return useQuery<any, Error>({
    queryKey: ['admin-lessons', filters],
    queryFn: () => comprehensiveLessonsApi.getAdminLessons(filters),
    enabled: !!(user && isAdmin()),
    staleTime: 60000,
    gcTime: 300000,
  });
};

// Teacher stats hook
export const useTeacherStats = (filters: Omit<TeacherLessonFilters, 'statusFilter' | 'studentId'>) => {
  const user = getUserFromLocalStorage();
  
  return useQuery<any, Error>({
    queryKey: ['teacher-stats', filters],
    queryFn: () => comprehensiveLessonsApi.getTeacherStats(filters),
    enabled: !!(user && isTeacher()),
    staleTime: 60000,
    gcTime: 300000,
  });
};

// Admin stats hook
export const useAdminStats = (filters: Omit<TeacherLessonFilters, 'statusFilter' | 'studentId'>) => {
  const user = getUserFromLocalStorage();
  
  return useQuery<any, Error>({
    queryKey: ['admin-stats', filters],
    queryFn: () => comprehensiveLessonsApi.getAdminStats(filters),
    enabled: !!(user && isAdmin()),
    staleTime: 60000,
    gcTime: 300000,
  });
};