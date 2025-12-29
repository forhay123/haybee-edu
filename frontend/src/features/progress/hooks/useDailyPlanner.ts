// src/features/progress/hooks/useDailyPlanner.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import type { 
  DailyProgressDto, 
  LessonProgressDto, 
  ProgressUpdateRequest 
} from '../api/dailyPlannerApi';
import { dailyPlannerApi } from '../api/dailyPlannerApi';

// Query keys
export const progressKeys = {
  all: ['progress'] as const,
  dailyProgress: (date?: string) => [...progressKeys.all, 'daily', date] as const,
  dailyProgressAdmin: (studentProfileId: number, date?: string) => 
    [...progressKeys.all, 'daily', studentProfileId, date] as const,
  history: (from: string, to: string) => [...progressKeys.all, 'history', from, to] as const,
  historyAdmin: (studentProfileId: number, from: string, to: string) => 
    [...progressKeys.all, 'history', studentProfileId, from, to] as const,
};

/**
 * Hook to get authenticated student's daily progress
 */
export const useMyDailyProgress = (date?: string) => {
  return useQuery({
    queryKey: progressKeys.dailyProgress(date),
    queryFn: () => dailyPlannerApi.getMyDailyProgress(date),
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });
};

/**
 * Admin hook to get any student's daily progress
 */
export const useDailyProgress = (studentProfileId: number, date?: string) => {
  return useQuery({
    queryKey: progressKeys.dailyProgressAdmin(studentProfileId, date),
    queryFn: () => dailyPlannerApi.getDailyProgress(studentProfileId, date),
    enabled: !!studentProfileId,
    staleTime: 30000,
    gcTime: 300000,
  });
};

/**
 * Hook to get authenticated student's progress history
 */
export const useMyHistory = (from: string, to: string) => {
  return useQuery({
    queryKey: progressKeys.history(from, to),
    queryFn: () => dailyPlannerApi.getMyHistory(from, to),
    staleTime: 60000, // 1 minute
    gcTime: 300000,
  });
};

/**
 * Admin hook to get any student's progress history
 */
export const useHistory = (studentProfileId: number, from: string, to: string) => {
  return useQuery({
    queryKey: progressKeys.historyAdmin(studentProfileId, from, to),
    queryFn: () => dailyPlannerApi.getHistory(studentProfileId, from, to),
    enabled: !!studentProfileId,
    staleTime: 60000,
    gcTime: 300000,
  });
};

/**
 * Mutation hook to mark lesson as complete with optimistic updates
 */
export const useMarkComplete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ProgressUpdateRequest) => 
      dailyPlannerApi.markComplete(request),
    
    onMutate: async (request) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: progressKeys.dailyProgress(request.scheduledDate) 
      });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<DailyProgressDto>(
        progressKeys.dailyProgress(request.scheduledDate)
      );

      // Optimistically update
      if (previousData) {
        queryClient.setQueryData<DailyProgressDto>(
          progressKeys.dailyProgress(request.scheduledDate),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              lessons: old.lessons.map((lesson) =>
                lesson.lessonId === request.lessonId && 
                lesson.periodNumber === request.periodNumber
                  ? { ...lesson, completed: true, completedAt: new Date().toISOString() }
                  : lesson
              ),
            };
          }
        );
      }

      return { previousData, request };
    },

    onError: (error, request, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          progressKeys.dailyProgress(context.request.scheduledDate),
          context.previousData
        );
      }
      
      toast.error('Failed to mark lesson as complete');
      console.error('Mark complete error:', error);
    },

    onSuccess: (data, request) => {
      toast.success('Lesson marked as complete! 🎉');
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ 
        queryKey: progressKeys.dailyProgress(request.scheduledDate) 
      });
      
      // Also invalidate history queries to reflect the change
      queryClient.invalidateQueries({ 
        queryKey: progressKeys.all 
      });
    },
  });
};