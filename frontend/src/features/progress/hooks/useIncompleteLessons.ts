
// frontend/src/features/progress/hooks/useIncompleteLessons.ts
// ✅ FIXED: Properly disable unused queries to prevent unnecessary API calls

import { useQuery, useMutation } from '@tanstack/react-query';
import { useMemo } from 'react';
import axiosInstance from '../../../api/axios';

export interface IncompleteLessonInfo {
  progressId: number;
  lessonTopicId: number;
  lessonTopicTitle: string;
  subjectName: string;
  scheduledDate: string;
  periodNumber: number;
  incompleteReason: string;
  autoMarkedIncompleteAt?: string;
  assessmentWindowStart?: string;
  assessmentWindowEnd?: string;
  canStillComplete: boolean;
  id?: number;
}

export interface IncompleteLessonsReport {
  studentId: number;
  studentName: string;
  totalIncomplete: number;
  incompleteByReason: {
    [key: string]: IncompleteLessonInfo[];
  };
  fromDate?: string;
  toDate?: string;
}

export interface IncompleteLessonGrouped {
  missedGracePeriod: IncompleteLessonInfo[];
  lateSubmissions: IncompleteLessonInfo[];
  noSubmission: IncompleteLessonInfo[];
}

export interface IncompleteLessonStats {
  total: number;
  missedGracePeriodCount: number;
  lateSubmissionCount: number;
  noSubmissionCount: number;
  percentMissedGrace: number;
  percentLate: number;
  percentNoSubmission: number;
}

const syncIncompleteLessons = async (): Promise<void> => {
  await axiosInstance.post('/progress/sync-incomplete');
};

// ✅ FIXED: Use teacher/admin endpoint
const fetchIncompleteLessons = async (studentId: number): Promise<IncompleteLessonsReport> => {
  console.log('📡 Fetching incomplete lessons for studentId:', studentId);
  const response = await axiosInstance.get(`/progress/students/${studentId}/incomplete-lessons`);
  console.log('✅ Received teacher/admin incomplete lessons:', response.data);
  return response.data;
};

// ✅ Student endpoint (for authenticated student viewing their own)
const fetchMyIncompleteLessons = async (): Promise<IncompleteLessonsReport> => {
  console.log('📡 Fetching MY incomplete lessons (student endpoint)');
  const response = await axiosInstance.get('/progress/incomplete-lessons/me');
  console.log('✅ Received my incomplete lessons:', response.data);
  return response.data;
};

export const incompleteLessonsKeys = {
  all: ['incomplete-lessons'] as const,
  student: (studentId: number) => [...incompleteLessonsKeys.all, 'student', studentId] as const,
  me: () => [...incompleteLessonsKeys.all, 'me'] as const,
};

export const useSyncIncompleteLessons = () => {
  return useMutation({
    mutationFn: syncIncompleteLessons,
    onSuccess: () => {
      console.log('✅ Synced incomplete lessons');
    },
  });
};

// ✅ FIXED: Teacher/Admin hook - fetches specific student data
export const useIncompleteLessons = (studentId: number, enabled: boolean = true) => {
  console.log('🎣 useIncompleteLessons hook called with studentId:', studentId, 'enabled:', enabled);
  
  return useQuery({
    queryKey: incompleteLessonsKeys.student(studentId),
    queryFn: () => {
      console.log('🔄 Query function executing for studentId:', studentId);
      return fetchIncompleteLessons(studentId);
    },
    enabled: enabled && !!studentId && studentId > 0,
  });
};

// ✅ Student hook - fetches authenticated student's own data
export const useMyIncompleteLessons = (options: { autoSync?: boolean; enabled?: boolean } = {}) => {
  const { autoSync = true, enabled = true } = options;
  
  console.log('🎣 useMyIncompleteLessons hook called, autoSync:', autoSync, 'enabled:', enabled);
  
  const syncMutation = useSyncIncompleteLessons();
  
  const query = useQuery({
    queryKey: incompleteLessonsKeys.me(),
    queryFn: async () => {
      console.log('🔄 Query function executing for MY incomplete lessons');
      if (autoSync) {
        try {
          await syncMutation.mutateAsync();
        } catch (error) {
          console.warn('⚠️ Sync failed, continuing with fetch:', error);
        }
      }
      return fetchMyIncompleteLessons();
    },
    enabled: enabled, // ✅ CRITICAL FIX: Respect the enabled flag
  });

  return {
    ...query,
    sync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
  };
};

/**
 * ✅ FIXED: Hook to get grouped incomplete lessons with proper endpoint selection
 * - If studentId provided AND > 0: use teacher/admin endpoint
 * - Otherwise: use student endpoint
 * - CRITICAL: Disable the query we're NOT using
 */
export const useGroupedIncompleteLessons = (studentId?: number) => {
  console.log('🎣 useGroupedIncompleteLessons called with studentId:', studentId);
  
  // ✅ Determine which endpoint to use BEFORE calling hooks
  const shouldUseTeacherEndpoint = studentId !== undefined && studentId > 0;
  
  console.log('🔍 shouldUseTeacherEndpoint:', shouldUseTeacherEndpoint);
  
  // ✅ CRITICAL FIX: Pass 'enabled' flag to each hook
  const teacherQuery = useIncompleteLessons(
    studentId || 0, 
    shouldUseTeacherEndpoint // Only enable if using teacher endpoint
  );
  
  const studentQuery = useMyIncompleteLessons({ 
    autoSync: false,
    enabled: !shouldUseTeacherEndpoint // Only enable if NOT using teacher endpoint
  });
  
  // ✅ Select the appropriate query result
  const activeQuery = shouldUseTeacherEndpoint ? teacherQuery : studentQuery;
  const { data, isLoading, error, refetch } = activeQuery;

  console.log('🔍 Selected query:', shouldUseTeacherEndpoint ? 'TEACHER' : 'STUDENT');
  console.log('🔍 Teacher query enabled:', shouldUseTeacherEndpoint);
  console.log('🔍 Student query enabled:', !shouldUseTeacherEndpoint);
  console.log('🔍 Query data:', data);
  console.log('🔍 Query isLoading:', isLoading);
  console.log('🔍 Query error:', error);

  const grouped = useMemo((): IncompleteLessonGrouped | null => {
    if (!data?.incompleteByReason) {
      console.log('⚠️ No incompleteByReason data available');
      return null;
    }

    const result = {
      missedGracePeriod: data.incompleteByReason['MISSED_GRACE_PERIOD'] || [],
      lateSubmissions: data.incompleteByReason['LATE_SUBMISSION'] || [],
      noSubmission: data.incompleteByReason['NO_SUBMISSION'] || [],
    };
    
    console.log('✅ Grouped incomplete lessons:', result);
    return result;
  }, [data]);

  return {
    grouped,
    isLoading,
    error,
    refetch,
  };
};

/**
 * ✅ FIXED: Hook to calculate statistics with proper endpoint selection
 */
export const useIncompleteLessonsStats = (studentId?: number): IncompleteLessonStats | null => {
  console.log('🎣 useIncompleteLessonsStats called with studentId:', studentId);
  
  // ✅ Determine which endpoint to use
  const shouldUseTeacherEndpoint = studentId !== undefined && studentId > 0;
  
  // ✅ CRITICAL FIX: Pass 'enabled' flag to each hook
  const teacherQuery = useIncompleteLessons(
    studentId || 0,
    shouldUseTeacherEndpoint
  );
  
  const studentQuery = useMyIncompleteLessons({
    autoSync: false,
    enabled: !shouldUseTeacherEndpoint
  });
  
  // ✅ Select the appropriate query result
  const activeQuery = shouldUseTeacherEndpoint ? teacherQuery : studentQuery;
  const { data } = activeQuery;

  return useMemo(() => {
    if (!data) {
      console.log('⚠️ No data available for stats calculation');
      return null;
    }

    const total = data.totalIncomplete;
    const missedGracePeriodCount = data.incompleteByReason['MISSED_GRACE_PERIOD']?.length || 0;
    const lateSubmissionCount = data.incompleteByReason['LATE_SUBMISSION']?.length || 0;
    const noSubmissionCount = data.incompleteByReason['NO_SUBMISSION']?.length || 0;

    const stats = {
      total,
      missedGracePeriodCount,
      lateSubmissionCount,
      noSubmissionCount,
      percentMissedGrace: total > 0 ? Math.round((missedGracePeriodCount / total) * 100) : 0,
      percentLate: total > 0 ? Math.round((lateSubmissionCount / total) * 100) : 0,
      percentNoSubmission: total > 0 ? Math.round((noSubmissionCount / total) * 100) : 0,
    };
    
    console.log('✅ Calculated stats:', stats);
    return stats;
  }, [data]);
};