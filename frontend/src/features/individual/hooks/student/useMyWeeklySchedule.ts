// ============================================================
// FILE 1: frontend/src/features/individual/hooks/student/useMyWeeklySchedule.ts
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { weeklyGenerationApi } from "../../api/weeklyGenerationApi";

export const useMyWeeklySchedule = (studentProfileId: number) => {
  const queryClient = useQueryClient();

  const useTodaySchedule = (enabled = true) => {
    const today = new Date().toISOString().split("T")[0];
    return useQuery({
      queryKey: ["mySchedule", "today", today, studentProfileId],
      queryFn: () => weeklyGenerationApi.getTodaySchedule(studentProfileId),
      enabled: enabled && !!studentProfileId,
      refetchInterval: 60000,
    });
  };

  const useWeekSchedule = (termStartDate: string, enabled = true) => {
    return useQuery({
      queryKey: ["mySchedule", "currentWeek", termStartDate, studentProfileId],
      queryFn: () =>
        weeklyGenerationApi.getCurrentWeekSchedule(studentProfileId, termStartDate),
      enabled: enabled && !!termStartDate && !!studentProfileId,
    });
  };

  const useUpcoming = (days: number = 7, enabled = true) => {
    return useQuery({
      queryKey: ["mySchedule", "upcoming", days, studentProfileId],
      queryFn: () => weeklyGenerationApi.getUpcomingSchedules(studentProfileId, days),
      enabled: enabled && !!studentProfileId,
    });
  };

  const markCompleteMutation = useMutation({
    mutationFn: (scheduleId: number) =>
      weeklyGenerationApi.markScheduleComplete(scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mySchedule"] });
    },
  });

  return {
    useTodaySchedule,
    useWeekSchedule,
    useUpcoming,
    markComplete: markCompleteMutation.mutateAsync,
    isMarking: markCompleteMutation.isPending,
  };
};