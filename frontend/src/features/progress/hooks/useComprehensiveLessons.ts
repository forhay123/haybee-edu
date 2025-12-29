import { useQuery } from '@tanstack/react-query';
import { comprehensiveLessonsApi, type TeacherLessonFilters } from '../api/comprehensiveLessonsApi';

// Query keys
export const comprehensiveKeys = {
  all: ['comprehensive-lessons'] as const,

  // Student keys
  report: (studentId: number, fromDate?: string, toDate?: string, statusFilter?: string) =>
    [...comprehensiveKeys.all, 'report', studentId, fromDate, toDate, statusFilter] as const,
  myReport: (fromDate?: string, toDate?: string, statusFilter?: string) =>
    [...comprehensiveKeys.all, 'my-report', fromDate, toDate, statusFilter] as const,
  urgent: (studentId: number) => [...comprehensiveKeys.all, 'urgent', studentId] as const,
  myUrgent: () => [...comprehensiveKeys.all, 'my-urgent'] as const,
  bySubject: (studentId: number, fromDate?: string, toDate?: string) =>
    [...comprehensiveKeys.all, 'by-subject', studentId, fromDate, toDate] as const,
  stats: (studentId: number, fromDate?: string, toDate?: string) =>
    [...comprehensiveKeys.all, 'stats', studentId, fromDate, toDate] as const,
  myStats: (fromDate?: string, toDate?: string) =>
    [...comprehensiveKeys.all, 'my-stats', fromDate, toDate] as const,

  // Teacher keys
  teacherLessons: (filters: TeacherLessonFilters) =>
    [...comprehensiveKeys.all, 'teacher-lessons', filters] as const,
  teacherStats: (filters: TeacherLessonFilters) =>
    [...comprehensiveKeys.all, 'teacher-stats', filters] as const,
  teacherStudentLessons: (studentId: number, fromDate?: string, toDate?: string, statusFilter?: string) =>
    [...comprehensiveKeys.all, 'teacher-student-lessons', studentId, fromDate, toDate, statusFilter] as const,
  teacherStudentStats: (studentId: number, fromDate?: string, toDate?: string) =>
    [...comprehensiveKeys.all, 'teacher-student-stats', studentId, fromDate, toDate] as const,

  // Admin keys
  adminLessons: (filters: TeacherLessonFilters) =>
    [...comprehensiveKeys.all, 'admin-lessons', filters] as const,
  adminStats: (filters: TeacherLessonFilters) =>
    [...comprehensiveKeys.all, 'admin-stats', filters] as const,
};

// ========================================================
// =============== STUDENT HOOKS ==========================
// ========================================================

export const useComprehensiveLessons = (
  studentId: number,
  fromDate?: string,
  toDate?: string,
  statusFilter?: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: comprehensiveKeys.report(studentId, fromDate, toDate, statusFilter),
    queryFn: () =>
      comprehensiveLessonsApi.getComprehensiveLessons(
        studentId,
        fromDate,
        toDate,
        statusFilter
      ),
    enabled: options?.enabled !== false && !!studentId && studentId > 0,
    staleTime: 60000,
    gcTime: 300000,
  });
};

export const useMyComprehensiveLessons = (
  fromDate?: string,
  toDate?: string,
  statusFilter?: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: comprehensiveKeys.myReport(fromDate, toDate, statusFilter),
    queryFn: () =>
      comprehensiveLessonsApi.getMyComprehensiveLessons(
        fromDate,
        toDate,
        statusFilter
      ),
    enabled: options?.enabled !== false,
    staleTime: 60000,
    gcTime: 300000,
  });
};

export const useUrgentLessons = (
  studentId: number,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: comprehensiveKeys.urgent(studentId),
    queryFn: () => comprehensiveLessonsApi.getUrgentLessons(studentId),
    enabled: options?.enabled !== false && !!studentId && studentId > 0,
    staleTime: 30000,
  });
};

export const useMyUrgentLessons = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: comprehensiveKeys.myUrgent(),
    queryFn: () => comprehensiveLessonsApi.getMyUrgentLessons(),
    enabled: options?.enabled !== false,
    staleTime: 30000,
  });
};

export const useLessonsBySubject = (
  studentId: number,
  fromDate?: string,
  toDate?: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: comprehensiveKeys.bySubject(studentId, fromDate, toDate),
    queryFn: () =>
      comprehensiveLessonsApi.getLessonsBySubject(studentId, fromDate, toDate),
    enabled: options?.enabled !== false && !!studentId && studentId > 0,
    staleTime: 60000,
  });
};

export const useStatusStats = (
  studentId: number,
  fromDate?: string,
  toDate?: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: comprehensiveKeys.stats(studentId, fromDate, toDate),
    queryFn: () =>
      comprehensiveLessonsApi.getStatusStats(studentId, fromDate, toDate),
    enabled: options?.enabled !== false && !!studentId && studentId > 0,
    staleTime: 60000,
  });
};

export const useMyStatusStats = (
  fromDate?: string,
  toDate?: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: comprehensiveKeys.myStats(fromDate, toDate),
    queryFn: () => comprehensiveLessonsApi.getMyStats(fromDate, toDate),
    enabled: options?.enabled !== false,
    staleTime: 60000,
  });
};

// ========================================================
// =============== TEACHER HOOKS ==========================
// ========================================================

export const useTeacherLessons = (
  filters: TeacherLessonFilters,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: comprehensiveKeys.teacherLessons(filters),
    queryFn: () => comprehensiveLessonsApi.getTeacherLessons(filters),
    enabled: options?.enabled !== false,
    staleTime: 60000,
    gcTime: 300000,
  });
};

export const useTeacherStats = (
  filters: TeacherLessonFilters,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: comprehensiveKeys.teacherStats(filters),
    queryFn: () => comprehensiveLessonsApi.getTeacherStats(filters),
    enabled: options?.enabled !== false,
    staleTime: 60000,
    gcTime: 300000,
  });
};

// ========================================================
// =============== TEACHER VIEWING SPECIFIC STUDENT =======
// ========================================================

export const useTeacherStudentLessons = (
  studentId: number,
  fromDate?: string,
  toDate?: string,
  statusFilter?: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: comprehensiveKeys.teacherStudentLessons(studentId, fromDate, toDate, statusFilter),
    queryFn: () =>
      comprehensiveLessonsApi.getTeacherStudentLessons(
        studentId,
        fromDate,
        toDate,
        statusFilter
      ),
    enabled: options?.enabled !== false && !!studentId && studentId > 0,
    staleTime: 60000,
    gcTime: 300000,
  });
};

export const useTeacherStudentStats = (
  studentId: number,
  fromDate?: string,
  toDate?: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: comprehensiveKeys.teacherStudentStats(studentId, fromDate, toDate),
    queryFn: () =>
      comprehensiveLessonsApi.getTeacherStudentStats(
        studentId,
        fromDate,
        toDate
      ),
    enabled: options?.enabled !== false && !!studentId && studentId > 0,
    staleTime: 60000,
    gcTime: 300000,
  });
};

// ========================================================
// =============== ADMIN HOOKS ============================
// ========================================================

export const useAdminLessons = (
  filters: TeacherLessonFilters,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: comprehensiveKeys.adminLessons(filters),
    queryFn: () => comprehensiveLessonsApi.getAdminLessons(filters),
    enabled: options?.enabled !== false,
    staleTime: 60000,
    gcTime: 300000,
  });
};

export const useAdminStats = (
  filters: TeacherLessonFilters,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: comprehensiveKeys.adminStats(filters),
    queryFn: () => comprehensiveLessonsApi.getAdminStats(filters),
    enabled: options?.enabled !== false,
    staleTime: 60000,
    gcTime: 300000,
  });
};