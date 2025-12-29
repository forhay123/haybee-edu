// frontend/src/features/individual/hooks/student/useAssessmentTimeline.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assessmentInstancesApi } from "../../api/assessmentInstancesApi";
import type { ProgressUpdateRequest } from "../../api/assessmentInstancesApi";

export const useAssessmentTimeline = () => {
  const queryClient = useQueryClient();

  const useMyDailyProgress = (date?: string, enabled = true) => {
    return useQuery({
      queryKey: ["dailyProgress", "me", date],
      queryFn: () => assessmentInstancesApi.getMyDailyProgress(date),
      enabled,
    });
  };

  const useMyUrgentLessons = (enabled = true) => {
    return useQuery({
      queryKey: ["urgentLessons", "me"],
      queryFn: () => assessmentInstancesApi.getMyUrgentLessons(),
      enabled,
      refetchInterval: 60000,
    });
  };

  const useMyIncompleteLessons = (
    fromDate?: string,
    toDate?: string,
    enabled = true
  ) => {
    return useQuery({
      queryKey: ["incompleteLessons", "me", fromDate, toDate],
      queryFn: () => assessmentInstancesApi.getMyIncompleteLessons(fromDate, toDate),
      enabled,
    });
  };

  const markCompleteMutation = useMutation({
    mutationFn: (request: ProgressUpdateRequest) =>
      assessmentInstancesApi.markLessonComplete(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyProgress"] });
      queryClient.invalidateQueries({ queryKey: ["urgentLessons"] });
      queryClient.invalidateQueries({ queryKey: ["incompleteLessons"] });
    },
  });

  return {
    useMyDailyProgress,
    useMyUrgentLessons,
    useMyIncompleteLessons,
    markComplete: markCompleteMutation.mutateAsync,
    isMarking: markCompleteMutation.isPending,
  };
};