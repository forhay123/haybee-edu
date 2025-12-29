// frontend/src/features/individual/hooks/useWeeklyGeneration.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { weeklyGenerationApi } from "../api/weeklyGenerationApi";
import type {
  IndividualDailyScheduleDto,
  WeeklyScheduleResponse,
  DateRangeSchedulesResponse,
} from "../api/weeklyGenerationApi";

/**
 * Hook for weekly schedule generation and management
 */
export const useWeeklyGeneration = (studentProfileId: number) => {
  const queryClient = useQueryClient();

  // ============================================================
  // QUERIES
  // ============================================================

  /**
   * Get schedule for a specific date
   */
  const useScheduleByDate = (date: string, enabled = true) => {
    return useQuery({
      queryKey: ["individualSchedule", studentProfileId, "date", date],
      queryFn: () => weeklyGenerationApi.getScheduleByDate(studentProfileId, date),
      enabled: enabled && !!date && !!studentProfileId,
    });
  };

  /**
   * Get schedule for a date range
   */
  const useScheduleByDateRange = (
    startDate: string,
    endDate: string,
    enabled = true
  ) => {
    return useQuery({
      queryKey: [
        "individualSchedule",
        studentProfileId,
        "range",
        startDate,
        endDate,
      ],
      queryFn: () =>
        weeklyGenerationApi.getScheduleByDateRange(
          studentProfileId,
          startDate,
          endDate
        ),
      enabled: enabled && !!startDate && !!endDate && !!studentProfileId,
    });
  };

  /**
   * Get schedule for a date range with grouping
   */
  const useScheduleByDateRangeGrouped = (
    startDate: string,
    endDate: string,
    enabled = true
  ) => {
    return useQuery<DateRangeSchedulesResponse>({
      queryKey: [
        "individualSchedule",
        studentProfileId,
        "rangeGrouped",
        startDate,
        endDate,
      ],
      queryFn: () =>
        weeklyGenerationApi.getScheduleByDateRangeGrouped(
          studentProfileId,
          startDate,
          endDate
        ),
      enabled: enabled && !!startDate && !!endDate && !!studentProfileId,
    });
  };

  /**
   * Get schedule for a specific week
   */
  const useScheduleByWeek = (
    weekNumber: number,
    termStartDate: string,
    enabled = true
  ) => {
    return useQuery<WeeklyScheduleResponse>({
      queryKey: [
        "individualSchedule",
        studentProfileId,
        "week",
        weekNumber,
        termStartDate,
      ],
      queryFn: () =>
        weeklyGenerationApi.getScheduleByWeek(
          studentProfileId,
          weekNumber,
          termStartDate
        ),
      enabled: enabled && !!weekNumber && !!termStartDate && !!studentProfileId,
    });
  };

  /**
   * Get today's schedule
   */
  const useTodaySchedule = (enabled = true) => {
    const today = new Date().toISOString().split("T")[0];
    return useQuery({
      queryKey: ["individualSchedule", studentProfileId, "today", today],
      queryFn: () => weeklyGenerationApi.getTodaySchedule(studentProfileId),
      enabled: enabled && !!studentProfileId,
      refetchInterval: 60000, // Refetch every minute
    });
  };

  /**
   * Get current week schedule
   */
  const useCurrentWeekSchedule = (termStartDate: string, enabled = true) => {
    return useQuery<WeeklyScheduleResponse>({
      queryKey: [
        "individualSchedule",
        studentProfileId,
        "currentWeek",
        termStartDate,
      ],
      queryFn: () =>
        weeklyGenerationApi.getCurrentWeekSchedule(studentProfileId, termStartDate),
      enabled: enabled && !!termStartDate && !!studentProfileId,
    });
  };

  /**
   * Get upcoming schedules (next N days)
   */
  const useUpcomingSchedules = (days: number = 7, enabled = true) => {
    return useQuery({
      queryKey: ["individualSchedule", studentProfileId, "upcoming", days],
      queryFn: () => weeklyGenerationApi.getUpcomingSchedules(studentProfileId, days),
      enabled: enabled && !!studentProfileId,
    });
  };

  /**
   * Get pending schedules
   */
  const usePendingSchedules = (
    startDate: string,
    endDate: string,
    enabled = true
  ) => {
    return useQuery({
      queryKey: [
        "individualSchedule",
        studentProfileId,
        "pending",
        startDate,
        endDate,
      ],
      queryFn: () =>
        weeklyGenerationApi.getPendingSchedules(studentProfileId, startDate, endDate),
      enabled: enabled && !!startDate && !!endDate && !!studentProfileId,
    });
  };

  /**
   * Get completed schedules
   */
  const useCompletedSchedules = (
    startDate: string,
    endDate: string,
    enabled = true
  ) => {
    return useQuery({
      queryKey: [
        "individualSchedule",
        studentProfileId,
        "completed",
        startDate,
        endDate,
      ],
      queryFn: () =>
        weeklyGenerationApi.getCompletedSchedules(studentProfileId, startDate, endDate),
      enabled: enabled && !!startDate && !!endDate && !!studentProfileId,
    });
  };

  /**
   * Get schedule statistics
   */
  const useScheduleStats = (
    startDate: string,
    endDate: string,
    enabled = true
  ) => {
    return useQuery({
      queryKey: ["individualSchedule", studentProfileId, "stats", startDate, endDate],
      queryFn: () =>
        weeklyGenerationApi.getScheduleStats(studentProfileId, startDate, endDate),
      enabled: enabled && !!startDate && !!endDate && !!studentProfileId,
    });
  };

  // ============================================================
  // MUTATIONS
  // ============================================================

  /**
   * Mark schedule as completed
   */
  const markScheduleCompleteMutation = useMutation({
    mutationFn: (scheduleId: number) =>
      weeklyGenerationApi.markScheduleComplete(scheduleId),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ["individualSchedule", studentProfileId],
      });
    },
  });

  /**
   * Mark schedule as incomplete
   */
  const markScheduleIncompleteMutation = useMutation({
    mutationFn: (scheduleId: number) =>
      weeklyGenerationApi.markScheduleIncomplete(scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["individualSchedule", studentProfileId],
      });
    },
  });

  /**
   * Bulk mark schedules as completed
   */
  const bulkMarkCompleteMutation = useMutation({
    mutationFn: (scheduleIds: number[]) =>
      weeklyGenerationApi.bulkMarkComplete(scheduleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["individualSchedule", studentProfileId],
      });
    },
  });

  /**
   * Bulk mark schedules as incomplete
   */
  const bulkMarkIncompleteMutation = useMutation({
    mutationFn: (scheduleIds: number[]) =>
      weeklyGenerationApi.bulkMarkIncomplete(scheduleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["individualSchedule", studentProfileId],
      });
    },
  });

  // ============================================================
  // CONVENIENCE METHODS
  // ============================================================

  const invalidateSchedules = () => {
    queryClient.invalidateQueries({
      queryKey: ["individualSchedule", studentProfileId],
    });
  };

  return {
    // Queries
    useScheduleByDate,
    useScheduleByDateRange,
    useScheduleByDateRangeGrouped,
    useScheduleByWeek,
    useTodaySchedule,
    useCurrentWeekSchedule,
    useUpcomingSchedules,
    usePendingSchedules,
    useCompletedSchedules,
    useScheduleStats,

    // Mutations
    markScheduleComplete: markScheduleCompleteMutation.mutateAsync,
    markScheduleIncomplete: markScheduleIncompleteMutation.mutateAsync,
    bulkMarkComplete: bulkMarkCompleteMutation.mutateAsync,
    bulkMarkIncomplete: bulkMarkIncompleteMutation.mutateAsync,

    // Mutation states
    isMarkingComplete: markScheduleCompleteMutation.isPending,
    isMarkingIncomplete: markScheduleIncompleteMutation.isPending,
    isBulkMarking:
      bulkMarkCompleteMutation.isPending || bulkMarkIncompleteMutation.isPending,

    // Utilities
    invalidateSchedules,
  };
};

/**
 * Hook for getting schedule for a specific date (standalone)
 */
export const useScheduleByDate = (
  studentProfileId: number,
  date: string,
  enabled = true
) => {
  return useQuery({
    queryKey: ["individualSchedule", studentProfileId, "date", date],
    queryFn: () => weeklyGenerationApi.getScheduleByDate(studentProfileId, date),
    enabled: enabled && !!date && !!studentProfileId,
  });
};

/**
 * Hook for today's schedule (standalone)
 */
export const useTodaySchedule = (studentProfileId: number, enabled = true) => {
  const today = new Date().toISOString().split("T")[0];
  return useQuery({
    queryKey: ["individualSchedule", studentProfileId, "today", today],
    queryFn: () => weeklyGenerationApi.getTodaySchedule(studentProfileId),
    enabled: enabled && !!studentProfileId,
    refetchInterval: 60000,
  });
};