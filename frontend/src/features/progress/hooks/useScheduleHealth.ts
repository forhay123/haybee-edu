// frontend/src/features/progress/hooks/useScheduleHealth.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scheduleHealthApi } from '../api/scheduleHealthApi';
import { toast } from 'react-hot-toast';

/**
 * Fetch all students' health status
 */
export const useAllStudentsHealth = () => {
  return useQuery({
    queryKey: ['schedule-health', 'all-students'],
    queryFn: scheduleHealthApi.getAllStudentsHealth,
    staleTime: 30000, // 30 seconds
  });
};

/**
 * Fetch single student's health status
 */
export const useStudentHealth = (studentId: number) => {
  return useQuery({
    queryKey: ['schedule-health', 'student', studentId],
    queryFn: () => scheduleHealthApi.getStudentHealth(studentId),
    enabled: !!studentId,
  });
};

/**
 * Fetch health summary
 */
export const useHealthSummary = () => {
  return useQuery({
    queryKey: ['schedule-health', 'summary'],
    queryFn: scheduleHealthApi.getHealthSummary,
    staleTime: 30000,
  });
};

/**
 * Fix individual student's schedules
 */
export const useFixStudentSchedules = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, forceRegenerate }: { studentId: number; forceRegenerate: boolean }) => 
      scheduleHealthApi.fixStudentSchedules(studentId, forceRegenerate),
    onSuccess: (data, { studentId, forceRegenerate }) => {
      const action = forceRegenerate ? 'synced assessments for' : 'generated schedules for';
      toast.success(`✅ Successfully ${action} student ${studentId} (${data.schedulesProcessed} schedules)`);
      queryClient.invalidateQueries({ queryKey: ['schedule-health'] });
    },
    onError: (error: any) => {
      toast.error(`❌ Failed to fix schedules: ${error.response?.data?.message || error.message}`);
    },
  });
};

/**
 * Fix all students with issues
 */
export const useFixAllStudents = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (forceRegenerate: boolean = false) => scheduleHealthApi.fixAllStudents(forceRegenerate),
    onSuccess: (data) => {
      toast.success(`✅ Fixed ${data.successCount} students`);
      if (data.failCount > 0) {
        toast.error(`⚠️ ${data.failCount} students failed`);
      }
      queryClient.invalidateQueries({ queryKey: ['schedule-health'] });
    },
    onError: (error: any) => {
      toast.error(`❌ Bulk fix failed: ${error.response?.data?.message || error.message}`);
    },
  });
};