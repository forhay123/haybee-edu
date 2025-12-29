// frontend/src/features/individual/hooks/useMultiPeriodAssessment.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assessmentInstancesApi } from "../api/assessmentInstancesApi";
import type {
  AssessmentInstance,
  DailyProgressDto,
  ProgressUpdateRequest,
  ComprehensiveLessonsReport,
  IncompleteLessonsReport,
  LessonStats,
} from "../api/assessmentInstancesApi";

export const useMultiPeriodAssessment = (studentProfileId?: number) => {
  const queryClient = useQueryClient();

  const useMyDailyProgress = (date?: string, enabled = true) => {
    return useQuery<DailyProgressDto>({
      queryKey: ["dailyProgress", "me", date],
      queryFn: () => assessmentInstancesApi.getMyDailyProgress(date),
      enabled,
    });
  };

  const useMyComprehensiveLessons = (
    fromDate?: string,
    toDate?: string,
    statusFilter?: string,
    enabled = true
  ) => {
    return useQuery<ComprehensiveLessonsReport>({
      queryKey: ["comprehensiveLessons", "me", fromDate, toDate, statusFilter],
      queryFn: () =>
        assessmentInstancesApi.getMyComprehensiveLessons(fromDate, toDate, statusFilter),
      enabled,
    });
  };

  const useMyIncompleteLessons = (
    fromDate?: string,
    toDate?: string,
    enabled = true
  ) => {
    return useQuery<IncompleteLessonsReport>({
      queryKey: ["incompleteLessons", "me", fromDate, toDate],
      queryFn: () => assessmentInstancesApi.getMyIncompleteLessons(fromDate, toDate),
      enabled,
    });
  };

  const useMyUrgentLessons = (enabled = true) => {
    return useQuery<AssessmentInstance[]>({
      queryKey: ["urgentLessons", "me"],
      queryFn: () => assessmentInstancesApi.getMyUrgentLessons(),
      enabled,
      refetchInterval: 60000,
    });
  };

  const useMyStats = (fromDate?: string, toDate?: string, enabled = true) => {
    return useQuery<LessonStats>({
      queryKey: ["lessonStats", "me", fromDate, toDate],
      queryFn: () => assessmentInstancesApi.getMyStats(fromDate, toDate),
      enabled,
    });
  };

  const markLessonCompleteMutation = useMutation({
    mutationFn: (request: ProgressUpdateRequest) =>
      assessmentInstancesApi.markLessonComplete(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyProgress"] });
      queryClient.invalidateQueries({ queryKey: ["comprehensiveLessons"] });
      queryClient.invalidateQueries({ queryKey: ["lessonStats"] });
    },
  });

  const syncIncompleteLessonsMutation = useMutation({
    mutationFn: () => assessmentInstancesApi.syncIncompleteLessons(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incompleteLessons"] });
    },
  });

  return {
    useMyDailyProgress,
    useMyComprehensiveLessons,
    useMyIncompleteLessons,
    useMyUrgentLessons,
    useMyStats,
    markLessonComplete: markLessonCompleteMutation.mutateAsync,
    syncIncompleteLessons: syncIncompleteLessonsMutation.mutateAsync,
    isMarkingComplete: markLessonCompleteMutation.isPending,
    isSyncing: syncIncompleteLessonsMutation.isPending,
  };
};