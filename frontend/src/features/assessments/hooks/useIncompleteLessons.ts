// ============================================================
// FILE 4: useIncompleteLessons.ts (FIXED)
// Location: frontend/src/features/assessments/hooks/useIncompleteLessons.ts
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react'; // ✅ FIXED: Import from 'react'
import { scheduleValidationApi } from '../api/scheduleValidationApi';
import type { IncompleteLessonsReport, IncompleteLessonInfo } from '../types/assessmentTypes';

export const incompleteLessonsKeys = {
  all: ['incomplete-lessons'] as const,
  report: (studentId: number, fromDate?: string, toDate?: string) => 
    [...incompleteLessonsKeys.all, 'report', studentId, fromDate, toDate] as const,
  grouped: (studentId: number) => 
    [...incompleteLessonsKeys.all, 'grouped', studentId] as const,
};

export const useIncompleteLessons = (
  studentId: number,
  fromDate?: string,
  toDate?: string
) => {
  return useQuery({
    queryKey: incompleteLessonsKeys.report(studentId, fromDate, toDate),
    queryFn: () => 
      scheduleValidationApi.getIncompleteLessons(studentId, fromDate, toDate),
    enabled: !!studentId,
  });
};

export const useGroupedIncompleteLessons = (studentId: number) => {
  const { data, isLoading, error } = useIncompleteLessons(studentId);

  const grouped = useMemo(() => {
    if (!data) {
      return {
        missedGracePeriod: [] as IncompleteLessonInfo[],
        lateSubmissions: [] as IncompleteLessonInfo[],
        noSubmission: [] as IncompleteLessonInfo[],
        total: 0,
        byReason: {} as Record<string, number>
      };
    }

    return {
      missedGracePeriod: data.groupedByReason.MISSED_GRACE_PERIOD || [],
      lateSubmissions: data.groupedByReason.LATE_SUBMISSION || [],
      noSubmission: data.groupedByReason.NO_SUBMISSION || [],
      total: data.totalIncomplete,
      byReason: {
        'MISSED_GRACE_PERIOD': (data.groupedByReason.MISSED_GRACE_PERIOD || []).length,
        'LATE_SUBMISSION': (data.groupedByReason.LATE_SUBMISSION || []).length,
        'NO_SUBMISSION': (data.groupedByReason.NO_SUBMISSION || []).length,
      }
    };
  }, [data]);

  return { grouped, rawData: data, isLoading, error };
};

export const useFilteredIncompleteLessons = (
  studentId: number,
  fromDate?: string,
  toDate?: string
) => {
  const { data, isLoading, error, refetch } = useIncompleteLessons(
    studentId,
    fromDate,
    toDate
  );

  return { 
    report: data,
    isLoading, 
    error,
    refetch,
    isEmpty: data && data.totalIncomplete === 0
  };
};

export const useCriticalIncompleteLessons = (studentId: number) => {
  const { grouped } = useGroupedIncompleteLessons(studentId);

  return {
    critical: grouped.missedGracePeriod,
    count: grouped.missedGracePeriod.length,
    hasCritical: grouped.missedGracePeriod.length > 0
  };
};

export const useIncompleteLessonsStats = (studentId: number) => {
  const { grouped, rawData } = useGroupedIncompleteLessons(studentId);

  return useMemo(() => {
    return {
      total: grouped.total,
      missedGracePeriodCount: grouped.byReason['MISSED_GRACE_PERIOD'] || 0,
      lateSubmissionCount: grouped.byReason['LATE_SUBMISSION'] || 0,
      noSubmissionCount: grouped.byReason['NO_SUBMISSION'] || 0,
      percentMissedGrace: grouped.total > 0 
        ? Math.round((grouped.byReason['MISSED_GRACE_PERIOD'] || 0) / grouped.total * 100)
        : 0,
      percentLate: grouped.total > 0 
        ? Math.round((grouped.byReason['LATE_SUBMISSION'] || 0) / grouped.total * 100)
        : 0,
      percentNoSubmission: grouped.total > 0 
        ? Math.round((grouped.byReason['NO_SUBMISSION'] || 0) / grouped.total * 100)
        : 0,
      studentId: rawData?.studentId
    };
  }, [grouped, rawData?.studentId]);
};
