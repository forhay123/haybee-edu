// ============================================================
// FILE 9: useSubjectIncompleteTracking.ts
// Path: frontend/src/features/individual/hooks/teacher/useSubjectIncompleteTracking.ts
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { incompleteTrackingApi } from "../../api/incompleteTrackingApi";
import type {
  IncompleteProgressDto,
  IncompleteStatisticsDto,
  IncompleteReportDto,
} from "../../api/incompleteTrackingApi";

export function useSubjectIncompleteTracking(
  subjectId: number,
  startDate: string,
  endDate: string,
  enabled = true
) {
  return useQuery<IncompleteProgressDto[]>({
    queryKey: ["teacher", "subject", subjectId, "incomplete", startDate, endDate],
    queryFn: () =>
      incompleteTrackingApi.getIncompleteBySubject(subjectId, startDate, endDate),
    enabled: enabled && !!subjectId && !!startDate && !!endDate,
    staleTime: 3 * 60 * 1000,
  });
}

export function useSubjectIncompleteStatistics(
  subjectId: number,
  startDate: string,
  endDate: string,
  enabled = true
) {
  return useQuery<IncompleteStatisticsDto>({
    queryKey: ["teacher", "subject", subjectId, "incompleteStats", startDate, endDate],
    queryFn: () =>
      incompleteTrackingApi.getSubjectStatistics(subjectId, startDate, endDate),
    enabled: enabled && !!subjectId && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubjectIncompleteReport(
  subjectId: number,
  startDate: string,
  endDate: string,
  enabled = true
) {
  return useQuery<IncompleteReportDto>({
    queryKey: ["teacher", "subject", subjectId, "incompleteReport", startDate, endDate],
    queryFn: () =>
      incompleteTrackingApi.generateSubjectReport(subjectId, startDate, endDate),
    enabled: enabled && !!subjectId && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCurrentTermSubjectIncomplete(
  subjectId: number,
  enabled = true
) {
  const now = new Date();
  const termStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const startDate = termStart.toISOString().split("T")[0];
  const endDate = now.toISOString().split("T")[0];

  return useSubjectIncompleteTracking(subjectId, startDate, endDate, enabled);
}

export function useCurrentMonthSubjectIncomplete(
  subjectId: number,
  enabled = true
) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const startDate = monthStart.toISOString().split("T")[0];
  const endDate = monthEnd.toISOString().split("T")[0];

  return useSubjectIncompleteTracking(subjectId, startDate, endDate, enabled);
}
