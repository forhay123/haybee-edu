// src/features/progress/hooks/useSchedules.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { schedulesApi, ScheduleCreateRequest } from '../api/schedulesApi';

// Query keys
export const scheduleKeys = {
  all: ['schedules'] as const,
  list: (fromDate?: string, toDate?: string) => 
    [...scheduleKeys.all, 'list', fromDate, toDate] as const,
  subjects: () => [...scheduleKeys.all, 'subjects'] as const,
  lessonTopics: (subjectId: number) => 
    [...scheduleKeys.all, 'lessonTopics', subjectId] as const,
  classes: () => [...scheduleKeys.all, 'classes'] as const,
};

/**
 * Get all schedules (for admin/teacher)
 */
export const useSchedules = (fromDate?: string, toDate?: string) => {
  return useQuery({
    queryKey: scheduleKeys.list(fromDate, toDate),
    queryFn: () => schedulesApi.getAllSchedules(fromDate, toDate),
    staleTime: 30000,
  });
};

/**
 * Get subjects for dropdown
 */
export const useSubjects = () => {
  return useQuery({
    queryKey: scheduleKeys.subjects(),
    queryFn: () => schedulesApi.getSubjects(),
    staleTime: 300000, // 5 minutes
  });
};

/**
 * Get lesson topics for a subject
 */
export const useLessonTopics = (subjectId: number) => {
  return useQuery({
    queryKey: scheduleKeys.lessonTopics(subjectId),
    queryFn: () => schedulesApi.getLessonTopics(subjectId),
    enabled: !!subjectId && subjectId > 0,
    staleTime: 300000,
  });
};

/**
 * Get classes for dropdown
 */
export const useClasses = () => {
  return useQuery({
    queryKey: scheduleKeys.classes(),
    queryFn: () => schedulesApi.getClasses(),
    staleTime: 300000, // 5 minutes
  });
};

/**
 * Create a new schedule
 */
export const useCreateSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ScheduleCreateRequest) => 
      schedulesApi.createSchedule(request),
    
    onSuccess: () => {
      toast.success('Lesson scheduled successfully! 📅');
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
    
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to schedule lesson';
      toast.error(message);
      console.error('Schedule creation error:', error);
    },
  });
};

/**
 * Delete a schedule
 */
export const useDeleteSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scheduleId: number) => schedulesApi.deleteSchedule(scheduleId),
    
    onSuccess: () => {
      toast.success('Schedule deleted successfully');
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
    
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to delete schedule';
      toast.error(message);
      console.error('Schedule deletion error:', error);
    },
  });
};
