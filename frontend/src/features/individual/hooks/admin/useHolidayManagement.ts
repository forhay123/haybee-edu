// frontend/src/features/individual/hooks/admin/useHolidayManagement.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { publicHolidaysApi } from "../../api/publicHolidaysApi";
import type {
  PublicHolidayDto,
  ReschedulingInfoDto,
  HolidayStatisticsDto,
} from "../../types/holidayTypes";

// ============================================================
// QUERY KEYS
// ============================================================

export const holidayManagementKeys = {
  all: ["holiday-management"] as const,
  holidays: () => ["holiday-management", "holidays"] as const,
  holiday: (id: number) => ["holiday-management", "holiday", id] as const,
  upcoming: () => ["holiday-management", "upcoming"] as const,
  year: (year: number) => ["holiday-management", "year", year] as const,
  range: (startDate: string, endDate: string) =>
    ["holiday-management", "range", startDate, endDate] as const,
  checkDate: (date: string) => ["holiday-management", "check", date] as const,
  reschedulingWeek: (weekNumber: number) =>
    ["holiday-management", "rescheduling", "week", weekNumber] as const,
  reschedulingStats: (startDate: string, endDate: string) =>
    ["holiday-management", "rescheduling", "stats", startDate, endDate] as const,
  termOverview: () => ["holiday-management", "term-overview"] as const,
  saturdayHolidays: (startDate: string, endDate: string) =>
    ["holiday-management", "saturday", startDate, endDate] as const,
  weekdayHolidays: (startDate: string, endDate: string) =>
    ["holiday-management", "weekday", startDate, endDate] as const,
  schoolClosures: (startDate: string, endDate: string) =>
    ["holiday-management", "closures", startDate, endDate] as const,
};

// ============================================================
// QUERY HOOKS - HOLIDAY CRUD
// ============================================================

/**
 * Get all public holidays
 */
export function useAllHolidays() {
  return useQuery({
    queryKey: holidayManagementKeys.holidays(),
    queryFn: () => publicHolidaysApi.getAllHolidays(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Get holiday by ID
 */
export function useHolidayById(holidayId: number) {
  return useQuery({
    queryKey: holidayManagementKeys.holiday(holidayId),
    queryFn: () => publicHolidaysApi.getHolidayById(holidayId),
    enabled: !!holidayId,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Get upcoming holidays
 */
export function useUpcomingHolidays() {
  return useQuery({
    queryKey: holidayManagementKeys.upcoming(),
    queryFn: () => publicHolidaysApi.getUpcomingHolidays(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get holidays for a specific year
 */
export function useHolidaysForYear(year: number) {
  return useQuery({
    queryKey: holidayManagementKeys.year(year),
    queryFn: () => publicHolidaysApi.getHolidaysForYear(year),
    enabled: !!year,
    staleTime: 1000 * 60 * 15,
  });
}

/**
 * Get holidays in a date range
 */
export function useHolidaysInRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: holidayManagementKeys.range(startDate, endDate),
    queryFn: () => publicHolidaysApi.getHolidaysInRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Check if a specific date is a holiday
 */
export function useCheckDate(date: string) {
  return useQuery({
    queryKey: holidayManagementKeys.checkDate(date),
    queryFn: () => publicHolidaysApi.checkDate(date),
    enabled: !!date,
    staleTime: 1000 * 60 * 10,
  });
}

// ============================================================
// QUERY HOOKS - RESCHEDULING
// ============================================================

/**
 * Check if rescheduling is needed for a specific week
 */
export function useReschedulingForWeek(weekNumber: number) {
  return useQuery({
    queryKey: holidayManagementKeys.reschedulingWeek(weekNumber),
    queryFn: () => publicHolidaysApi.checkReschedulingForWeek(weekNumber),
    enabled: !!weekNumber,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get rescheduling statistics for a date range
 */
export function useReschedulingStatistics(startDate: string, endDate: string) {
  return useQuery({
    queryKey: holidayManagementKeys.reschedulingStats(startDate, endDate),
    queryFn: () =>
      publicHolidaysApi.getReschedulingStatistics(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Get term rescheduling overview
 */
export function useTermReschedulingOverview() {
  return useQuery({
    queryKey: holidayManagementKeys.termOverview(),
    queryFn: () => publicHolidaysApi.getTermReschedulingOverview(),
    staleTime: 1000 * 60 * 10,
  });
}

// ============================================================
// QUERY HOOKS - CONVENIENCE
// ============================================================

/**
 * Get holidays for current year
 */
export function useHolidaysForCurrentYear() {
  const currentYear = new Date().getFullYear();
  return useHolidaysForYear(currentYear);
}

/**
 * Get holidays for next year
 */
export function useHolidaysForNextYear() {
  const nextYear = new Date().getFullYear() + 1;
  return useHolidaysForYear(nextYear);
}

/**
 * Check if today is a holiday
 */
export function useCheckToday() {
  const today = new Date().toISOString().split("T")[0];
  return useCheckDate(today);
}

/**
 * Get holidays for current month
 */
export function useHolidaysForCurrentMonth() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const startDate = firstDay.toISOString().split("T")[0];
  const endDate = lastDay.toISOString().split("T")[0];

  return useHolidaysInRange(startDate, endDate);
}

/**
 * Get holidays for next N days
 */
export function useUpcomingHolidaysForDays(days: number = 30) {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + days);

  const startDateStr = today.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];

  return useHolidaysInRange(startDateStr, endDateStr);
}

/**
 * Get Saturday holidays only
 */
export function useSaturdayHolidays(startDate: string, endDate: string) {
  return useQuery({
    queryKey: holidayManagementKeys.saturdayHolidays(startDate, endDate),
    queryFn: () => publicHolidaysApi.getSaturdayHolidays(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Get weekday holidays only
 */
export function useWeekdayHolidays(startDate: string, endDate: string) {
  return useQuery({
    queryKey: holidayManagementKeys.weekdayHolidays(startDate, endDate),
    queryFn: () => publicHolidaysApi.getWeekdayHolidays(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Get school closure holidays only
 */
export function useSchoolClosureHolidays(startDate: string, endDate: string) {
  return useQuery({
    queryKey: holidayManagementKeys.schoolClosures(startDate, endDate),
    queryFn: () =>
      publicHolidaysApi.getSchoolClosureHolidays(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 1000 * 60 * 10,
  });
}

// ============================================================
// MUTATION HOOKS
// ============================================================

/**
 * Create a new public holiday
 */
export function useCreateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      holiday: Omit<
        PublicHolidayDto,
        "id" | "createdByUserId" | "createdAt" | "updatedAt"
      >
    ) => publicHolidaysApi.createHoliday(holiday),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: holidayManagementKeys.all,
      });
    },
  });
}

/**
 * Update an existing holiday
 */
export function useUpdateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      holidayId,
      holiday,
    }: {
      holidayId: number;
      holiday: Omit<
        PublicHolidayDto,
        "id" | "createdByUserId" | "createdAt" | "updatedAt"
      >;
    }) => publicHolidaysApi.updateHoliday(holidayId, holiday),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: holidayManagementKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: holidayManagementKeys.holiday(variables.holidayId),
      });
    },
  });
}

/**
 * Delete a holiday
 */
export function useDeleteHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (holidayId: number) =>
      publicHolidaysApi.deleteHoliday(holidayId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: holidayManagementKeys.all,
      });
    },
  });
}

/**
 * Create multiple holidays at once
 */
export function useBulkCreateHolidays() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      holidays: Omit<
        PublicHolidayDto,
        "id" | "createdByUserId" | "createdAt" | "updatedAt"
      >[]
    ) => publicHolidaysApi.bulkCreateHolidays(holidays),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: holidayManagementKeys.all,
      });
    },
  });
}

/**
 * Create a simple holiday
 */
export function useCreateSimpleHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      holidayDate,
      holidayName,
      isSchoolClosed = true,
    }: {
      holidayDate: string;
      holidayName: string;
      isSchoolClosed?: boolean;
    }) =>
      publicHolidaysApi.createSimpleHoliday(
        holidayDate,
        holidayName,
        isSchoolClosed
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: holidayManagementKeys.all,
      });
    },
  });
}