// src/features/assessments/hooks/useWindowReschedule.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { windowRescheduleApi } from '../api/windowRescheduleApi';
import { comprehensiveKeys } from '../../progress/hooks/useComprehensiveLessons';
import type {
  WindowRescheduleDto,
  WindowRescheduleRequest,
  RescheduleFilters
} from '../types/rescheduleTypes';

// ============================================================
// QUERY KEYS
// ============================================================

export const rescheduleKeys = {
  all: ['window-reschedules'] as const,
  
  // Teacher keys
  teacher: (studentId?: number) => 
    [...rescheduleKeys.all, 'teacher', studentId] as const,
  
  // Student keys
  my: () => 
    [...rescheduleKeys.all, 'my'] as const,
  
  // Admin keys
  admin: (filters?: RescheduleFilters) => 
    [...rescheduleKeys.all, 'admin', filters] as const,
  
  // Detail
  detail: (rescheduleId: number) => 
    [...rescheduleKeys.all, 'detail', rescheduleId] as const,
  
  // By lesson
  byLesson: (dailyScheduleId: number) => 
    [...rescheduleKeys.all, 'by-lesson', dailyScheduleId] as const,
};

// ============================================================
// QUERY HOOKS
// ============================================================

/**
 * Get reschedules created by authenticated teacher
 * @param studentId Optional student ID filter
 * @param options Query options
 */
export const useTeacherReschedules = (
  studentId?: number,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: rescheduleKeys.teacher(studentId),
    queryFn: () => windowRescheduleApi.getTeacherReschedules(studentId),
    enabled: options?.enabled !== false,
    staleTime: 60000, // 1 minute
    gcTime: 300000,   // 5 minutes
  });
};

/**
 * Get reschedules for authenticated student
 * @param options Query options
 */
export const useMyReschedules = (
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: rescheduleKeys.my(),
    queryFn: () => windowRescheduleApi.getMyReschedules(),
    enabled: options?.enabled !== false,
    staleTime: 60000,
    gcTime: 300000,
  });
};

/**
 * Get all reschedules (Admin only)
 * @param filters Filter options
 * @param options Query options
 */
export const useAdminReschedules = (
  filters?: RescheduleFilters,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: rescheduleKeys.admin(filters),
    queryFn: () => windowRescheduleApi.getAdminReschedules(filters),
    enabled: options?.enabled !== false,
    staleTime: 60000,
    gcTime: 300000,
  });
};

/**
 * Get reschedule by ID
 * @param rescheduleId Reschedule ID
 * @param options Query options
 */
export const useRescheduleDetail = (
  rescheduleId: number,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: rescheduleKeys.detail(rescheduleId),
    queryFn: () => windowRescheduleApi.getRescheduleById(rescheduleId),
    enabled: options?.enabled !== false && !!rescheduleId && rescheduleId > 0,
    staleTime: 60000,
    gcTime: 300000,
  });
};

/**
 * Get active reschedule for a specific lesson
 * @param dailyScheduleId Progress ID / daily schedule ID
 * @param options Query options
 */
export const useActiveRescheduleForLesson = (
  dailyScheduleId: number,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: rescheduleKeys.byLesson(dailyScheduleId),
    queryFn: () => windowRescheduleApi.getActiveRescheduleForLesson(dailyScheduleId),
    enabled: options?.enabled !== false && !!dailyScheduleId && dailyScheduleId > 0,
    staleTime: 60000,
    gcTime: 300000,
  });
};

// ============================================================
// MUTATION HOOKS
// ============================================================

/**
 * Reschedule an assessment
 * Invalidates relevant queries on success
 */
export const useRescheduleAssessment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: WindowRescheduleRequest) => 
      windowRescheduleApi.rescheduleAssessment(request),
    
    onSuccess: (data) => {
      // Invalidate teacher reschedules
      queryClient.invalidateQueries({ 
        queryKey: rescheduleKeys.teacher() 
      });
      
      // Invalidate student reschedules
      queryClient.invalidateQueries({ 
        queryKey: rescheduleKeys.my() 
      });
      
      // ✅ CRITICAL: Invalidate comprehensive lessons
      // This refreshes the lesson card to show reschedule badge
      queryClient.invalidateQueries({ 
        queryKey: comprehensiveKeys.teacherStudentLessons(data.studentId) 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: comprehensiveKeys.myReport() 
      });
      
      // Invalidate specific lesson reschedule
      queryClient.invalidateQueries({ 
        queryKey: rescheduleKeys.byLesson(data.dailyScheduleId) 
      });
      
      console.log('✅ Assessment rescheduled successfully:', data.id);
    },
    
    onError: (error: any) => {
      console.error('❌ Failed to reschedule assessment:', error);
    }
  });
};

/**
 * Cancel a reschedule
 * Invalidates relevant queries on success
 */
export const useCancelReschedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      rescheduleId, 
      reason 
    }: { 
      rescheduleId: number; 
      reason: string 
    }) => windowRescheduleApi.cancelReschedule(rescheduleId, reason),
    
    onSuccess: (_, variables) => {
      // Invalidate all reschedule queries
      queryClient.invalidateQueries({ 
        queryKey: rescheduleKeys.all 
      });
      
      // ✅ CRITICAL: Invalidate comprehensive lessons
      // This refreshes the lesson card to remove reschedule badge
      queryClient.invalidateQueries({ 
        queryKey: comprehensiveKeys.all 
      });
      
      console.log('✅ Reschedule cancelled successfully:', variables.rescheduleId);
    },
    
    onError: (error: any) => {
      console.error('❌ Failed to cancel reschedule:', error);
    }
  });
};

// ============================================================
// UTILITY HOOKS
// ============================================================

/**
 * Check if lesson has active reschedule
 * Returns both loading state and reschedule data
 * 
 * @param dailyScheduleId Progress ID
 * @returns Object with hasReschedule, reschedule, isLoading
 */
export const useHasActiveReschedule = (dailyScheduleId: number) => {
  const { data: reschedule, isLoading } = useActiveRescheduleForLesson(
    dailyScheduleId,
    { enabled: !!dailyScheduleId && dailyScheduleId > 0 }
  );
  
  return {
    hasReschedule: !!reschedule,
    reschedule,
    isLoading
  };
};

/**
 * Get reschedules for multiple lessons (batch)
 * Useful for displaying reschedule badges on multiple lesson cards
 * 
 * @param studentId Student ID
 * @returns Map of scheduleId -> reschedule
 */
export const useReschedulesForStudent = (studentId?: number) => {
  const { data: reschedules = [], isLoading } = useTeacherReschedules(
    studentId,
    { enabled: !!studentId && studentId > 0 }
  );
  
  // Create map for easy lookup
  const rescheduleMap = new Map<number, WindowRescheduleDto>();
  reschedules
    .filter(r => r.isActive && !r.cancelledAt)
    .forEach(r => rescheduleMap.set(r.dailyScheduleId, r));
  
  return {
    reschedules,
    rescheduleMap,
    isLoading,
    hasAnyReschedules: reschedules.length > 0
  };
};

/**
 * Get count of active reschedules for teacher
 * Useful for displaying notification badges
 */
export const useActiveReschedulesCount = () => {
  const { data: reschedules = [] } = useTeacherReschedules();
  
  const activeCount = reschedules.filter(
    r => r.isActive && !r.cancelledAt
  ).length;
  
  return {
    totalCount: reschedules.length,
    activeCount,
    cancelledCount: reschedules.length - activeCount
  };
};

/**
 * Prefetch reschedules when hovering over student
 * Optimizes performance for teacher dashboard
 */
export const usePrefetchStudentReschedules = () => {
  const queryClient = useQueryClient();
  
  return (studentId: number) => {
    queryClient.prefetchQuery({
      queryKey: rescheduleKeys.teacher(studentId),
      queryFn: () => windowRescheduleApi.getTeacherReschedules(studentId),
      staleTime: 60000,
    });
  };
};

// ============================================================
// HELPER HOOKS FOR OPTIMISTIC UPDATES
// ============================================================

/**
 * Optimistically update reschedule in cache
 * Used when you want immediate UI feedback before server responds
 */
export const useOptimisticRescheduleUpdate = () => {
  const queryClient = useQueryClient();
  
  return {
    addOptimisticReschedule: (reschedule: WindowRescheduleDto) => {
      queryClient.setQueryData<WindowRescheduleDto[]>(
        rescheduleKeys.teacher(reschedule.studentId),
        (old = []) => [...old, reschedule]
      );
    },
    
    removeOptimisticReschedule: (rescheduleId: number, studentId: number) => {
      queryClient.setQueryData<WindowRescheduleDto[]>(
        rescheduleKeys.teacher(studentId),
        (old = []) => old.filter(r => r.id !== rescheduleId)
      );
    },
    
    updateOptimisticReschedule: (
      rescheduleId: number, 
      studentId: number, 
      updates: Partial<WindowRescheduleDto>
    ) => {
      queryClient.setQueryData<WindowRescheduleDto[]>(
        rescheduleKeys.teacher(studentId),
        (old = []) => old.map(r => 
          r.id === rescheduleId ? { ...r, ...updates } : r
        )
      );
    }
  };
};