// frontend/src/features/individual/hooks/usePublicHolidays.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { publicHolidaysApi } from "../api/publicHolidaysApi";
import type {
  PublicHolidayDto,
  ReschedulingInfoDto,
  HolidayStatisticsDto,
  BulkOperationResultDto,
} from "../types/holidayTypes";

/**
 * Hook for public holiday management and rescheduling
 */
export const usePublicHolidays = () => {
  const queryClient = useQueryClient();

  // ============================================================
  // QUERIES
  // ============================================================

  const useAllHolidays = (enabled = true) => {
    return useQuery<PublicHolidayDto[]>({
      queryKey: ["publicHolidays", "all"],
      queryFn: () => publicHolidaysApi.getAllHolidays(),
      enabled,
    });
  };

  const useHolidayById = (holidayId: number, enabled = true) => {
    return useQuery<PublicHolidayDto>({
      queryKey: ["publicHolidays", holidayId],
      queryFn: () => publicHolidaysApi.getHolidayById(holidayId),
      enabled: enabled && !!holidayId,
    });
  };

  const useUpcomingHolidays = (enabled = true) => {
    return useQuery<PublicHolidayDto[]>({
      queryKey: ["publicHolidays", "upcoming"],
      queryFn: () => publicHolidaysApi.getUpcomingHolidays(),
      enabled,
    });
  };

  const useHolidaysForYear = (year: number, enabled = true) => {
    return useQuery<PublicHolidayDto[]>({
      queryKey: ["publicHolidays", "year", year],
      queryFn: () => publicHolidaysApi.getHolidaysForYear(year),
      enabled: enabled && !!year,
    });
  };

  const useHolidaysInRange = (
    startDate: string,
    endDate: string,
    enabled = true
  ) => {
    return useQuery<PublicHolidayDto[]>({
      queryKey: ["publicHolidays", "range", startDate, endDate],
      queryFn: () => publicHolidaysApi.getHolidaysInRange(startDate, endDate),
      enabled: enabled && !!startDate && !!endDate,
    });
  };

  const useCheckDate = (date: string, enabled = true) => {
    return useQuery({
      queryKey: ["publicHolidays", "checkDate", date],
      queryFn: () => publicHolidaysApi.checkDate(date),
      enabled: enabled && !!date,
    });
  };

  const useReschedulingForWeek = (weekNumber: number, enabled = true) => {
    return useQuery<ReschedulingInfoDto>({
      queryKey: ["publicHolidays", "rescheduling", "week", weekNumber],
      queryFn: () => publicHolidaysApi.checkReschedulingForWeek(weekNumber),
      enabled: enabled && !!weekNumber,
    });
  };

  const useReschedulingStatistics = (
    startDate: string,
    endDate: string,
    enabled = true
  ) => {
    return useQuery<HolidayStatisticsDto>({
      queryKey: ["publicHolidays", "rescheduling", "stats", startDate, endDate],
      queryFn: () =>
        publicHolidaysApi.getReschedulingStatistics(startDate, endDate),
      enabled: enabled && !!startDate && !!endDate,
    });
  };

  const useTermReschedulingOverview = (enabled = true) => {
    return useQuery<HolidayStatisticsDto>({
      queryKey: ["publicHolidays", "rescheduling", "termOverview"],
      queryFn: () => publicHolidaysApi.getTermReschedulingOverview(),
      enabled,
    });
  };

  // ============================================================
  // MUTATIONS
  // ============================================================

  const createHolidayMutation = useMutation({
    mutationFn: (holiday: Omit<PublicHolidayDto, "id" | "createdByUserId" | "createdAt" | "updatedAt">) =>
      publicHolidaysApi.createHoliday(holiday),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publicHolidays"] });
    },
  });

  const updateHolidayMutation = useMutation({
    mutationFn: ({ holidayId, holiday }: { holidayId: number; holiday: Omit<PublicHolidayDto, "id" | "createdByUserId" | "createdAt" | "updatedAt"> }) =>
      publicHolidaysApi.updateHoliday(holidayId, holiday),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publicHolidays"] });
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: (holidayId: number) => publicHolidaysApi.deleteHoliday(holidayId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publicHolidays"] });
    },
  });

  const bulkCreateHolidaysMutation = useMutation({
    mutationFn: (holidays: Omit<PublicHolidayDto, "id" | "createdByUserId" | "createdAt" | "updatedAt">[]) =>
      publicHolidaysApi.bulkCreateHolidays(holidays),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publicHolidays"] });
    },
  });

  return {
    // Queries
    useAllHolidays,
    useHolidayById,
    useUpcomingHolidays,
    useHolidaysForYear,
    useHolidaysInRange,
    useCheckDate,
    useReschedulingForWeek,
    useReschedulingStatistics,
    useTermReschedulingOverview,

    // Mutations
    createHoliday: createHolidayMutation.mutateAsync,
    updateHoliday: updateHolidayMutation.mutateAsync,
    deleteHoliday: deleteHolidayMutation.mutateAsync,
    bulkCreateHolidays: bulkCreateHolidaysMutation.mutateAsync,

    // Mutation states
    isCreating: createHolidayMutation.isPending,
    isUpdating: updateHolidayMutation.isPending,
    isDeleting: deleteHolidayMutation.isPending,
    isBulkCreating: bulkCreateHolidaysMutation.isPending,
  };
};