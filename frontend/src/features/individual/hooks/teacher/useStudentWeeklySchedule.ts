// frontend/src/features/individual/hooks/teacher/useStudentWeeklySchedule.ts

import { useQuery } from "@tanstack/react-query";
import { weeklyGenerationApi } from "../../api/weeklyGenerationApi";
import type {
  IndividualDailyScheduleDto,
  WeeklyScheduleResponse,
} from "../../api/weeklyGenerationApi";

/**
 * Hook for teacher to view a student's weekly schedule
 */
export function useStudentWeeklySchedule(
  studentProfileId: number,
  weekNumber: number,
  termStartDate: string,
  enabled = true
) {
  return useQuery<WeeklyScheduleResponse>({
    queryKey: ["teacher", "student", studentProfileId, "week", weekNumber, termStartDate],
    queryFn: () =>
      weeklyGenerationApi.getScheduleByWeek(studentProfileId, weekNumber, termStartDate),
    enabled: enabled && !!studentProfileId && !!weekNumber && !!termStartDate,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

/**
 * Hook to view student's schedule for a date range
 */
export function useStudentScheduleRange(
  studentProfileId: number,
  startDate: string,
  endDate: string,
  enabled = true
) {
  return useQuery<IndividualDailyScheduleDto[]>({
    queryKey: ["teacher", "student", studentProfileId, "scheduleRange", startDate, endDate],
    queryFn: () =>
      weeklyGenerationApi.getScheduleByDateRange(studentProfileId, startDate, endDate),
    enabled: enabled && !!studentProfileId && !!startDate && !!endDate,
    staleTime: 3 * 60 * 1000,
  });
}

/**
 * Hook to view student's today schedule
 */
export function useStudentTodaySchedule(studentProfileId: number, enabled = true) {
  const today = new Date().toISOString().split("T")[0];
  
  return useQuery<IndividualDailyScheduleDto[]>({
    queryKey: ["teacher", "student", studentProfileId, "today", today],
    queryFn: () => weeklyGenerationApi.getTodaySchedule(studentProfileId),
    enabled: enabled && !!studentProfileId,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });
}

/**
 * Hook to view student's current week schedule
 */
export function useStudentCurrentWeekSchedule(
  studentProfileId: number,
  termStartDate: string,
  enabled = true
) {
  return useQuery<WeeklyScheduleResponse>({
    queryKey: ["teacher", "student", studentProfileId, "currentWeek", termStartDate],
    queryFn: () =>
      weeklyGenerationApi.getCurrentWeekSchedule(studentProfileId, termStartDate),
    enabled: enabled && !!studentProfileId && !!termStartDate,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to get student's schedule statistics
 */
export function useStudentScheduleStats(
  studentProfileId: number,
  startDate: string,
  endDate: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["teacher", "student", studentProfileId, "scheduleStats", startDate, endDate],
    queryFn: () =>
      weeklyGenerationApi.getScheduleStats(studentProfileId, startDate, endDate),
    enabled: enabled && !!studentProfileId && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get student's pending schedules
 */
export function useStudentPendingSchedules(
  studentProfileId: number,
  startDate: string,
  endDate: string,
  enabled = true
) {
  return useQuery<IndividualDailyScheduleDto[]>({
    queryKey: ["teacher", "student", studentProfileId, "pendingSchedules", startDate, endDate],
    queryFn: () =>
      weeklyGenerationApi.getPendingSchedules(studentProfileId, startDate, endDate),
    enabled: enabled && !!studentProfileId && !!startDate && !!endDate,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to compare multiple students' schedules
 */
export function useMultipleStudentsSchedules(
  studentIds: number[],
  startDate: string,
  endDate: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["teacher", "multipleStudents", "schedules", studentIds, startDate, endDate],
    queryFn: async () => {
      const schedules = await Promise.all(
        studentIds.map((id) =>
          weeklyGenerationApi.getScheduleByDateRange(id, startDate, endDate)
        )
      );
      
      return studentIds.map((id, index) => ({
        studentProfileId: id,
        schedules: schedules[index],
      }));
    },
    enabled: enabled && studentIds.length > 0 && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });
}