// frontend/src/features/individual/hooks/admin/useConflictManagement.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { conflictResolutionApi } from "../../api/conflictResolutionApi";
import type {
  ConflictDto,
  ConflictResolutionRequest,
} from "../../types/conflictTypes";

// ============================================================
// QUERY KEYS
// ============================================================

export const conflictManagementKeys = {
  all: ["conflict-management"] as const,
  conflicts: () => ["conflict-management", "all"] as const,
  timetable: (timetableId: number) =>
    ["conflict-management", "timetable", timetableId] as const,
  student: (studentId: number) =>
    ["conflict-management", "student", studentId] as const,
  summary: () => ["conflict-management", "summary"] as const,
  unresolved: () => ["conflict-management", "unresolved"] as const,
  bySeverity: (severity: "HIGH" | "MEDIUM" | "LOW") =>
    ["conflict-management", "severity", severity] as const,
  highPriority: () => ["conflict-management", "high-priority"] as const,
  byType: (type: string) => ["conflict-management", "type", type] as const,
  stats: (timetableId: number) =>
    ["conflict-management", "stats", timetableId] as const,
};

// ============================================================
// QUERY HOOKS
// ============================================================

/**
 * Get all schedule conflicts
 */
export function useAllConflicts() {
  return useQuery({
    queryKey: conflictManagementKeys.conflicts(),
    queryFn: () => conflictResolutionApi.getAllConflicts(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Get conflicts for a specific timetable
 */
export function useConflictsForTimetable(timetableId: number) {
  return useQuery({
    queryKey: conflictManagementKeys.timetable(timetableId),
    queryFn: () => conflictResolutionApi.getConflictsForTimetable(timetableId),
    enabled: !!timetableId,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Get conflicts for a specific student
 */
export function useConflictsForStudent(studentProfileId: number) {
  return useQuery({
    queryKey: conflictManagementKeys.student(studentProfileId),
    queryFn: () =>
      conflictResolutionApi.getConflictsForStudent(studentProfileId),
    enabled: !!studentProfileId,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Get conflict summary for dashboard
 */
export function useConflictSummary() {
  return useQuery({
    queryKey: conflictManagementKeys.summary(),
    queryFn: () => conflictResolutionApi.getConflictSummary(),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
  });
}

/**
 * Get unresolved conflicts only
 */
export function useUnresolvedConflicts() {
  return useQuery({
    queryKey: conflictManagementKeys.unresolved(),
    queryFn: () => conflictResolutionApi.getUnresolvedConflicts(),
    staleTime: 1000 * 60 * 1, // More frequent for unresolved
    refetchInterval: 1000 * 60 * 3,
  });
}

/**
 * Get conflicts by severity
 */
export function useConflictsBySeverity(severity: "HIGH" | "MEDIUM" | "LOW") {
  return useQuery({
    queryKey: conflictManagementKeys.bySeverity(severity),
    queryFn: () => conflictResolutionApi.getConflictsBySeverity(severity),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Get high priority conflicts (unresolved + high severity)
 */
export function useHighPriorityConflicts() {
  return useQuery({
    queryKey: conflictManagementKeys.highPriority(),
    queryFn: () => conflictResolutionApi.getHighPriorityConflicts(),
    staleTime: 1000 * 60 * 1,
    refetchInterval: 1000 * 60 * 2,
  });
}

/**
 * Get conflicts by type
 */
export function useConflictsByType(conflictType: string) {
  return useQuery({
    queryKey: conflictManagementKeys.byType(conflictType),
    queryFn: () => conflictResolutionApi.getConflictsByType(conflictType),
    enabled: !!conflictType,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Get conflict statistics for a timetable
 */
export function useTimetableConflictStats(timetableId: number) {
  return useQuery({
    queryKey: conflictManagementKeys.stats(timetableId),
    queryFn: () =>
      conflictResolutionApi.getTimetableConflictStats(timetableId),
    enabled: !!timetableId,
    staleTime: 1000 * 60 * 3,
  });
}

/**
 * Get conflicts for multiple students (batch)
 */
export function useConflictsForMultipleStudents(studentProfileIds: number[]) {
  return useQuery({
    queryKey: ["conflict-management", "multiple-students", studentProfileIds],
    queryFn: () =>
      conflictResolutionApi.getConflictsForMultipleStudents(studentProfileIds),
    enabled: studentProfileIds.length > 0,
    staleTime: 1000 * 60 * 3,
  });
}

// ============================================================
// MUTATION HOOKS
// ============================================================

/**
 * Resolve a single conflict
 */
export function useResolveConflict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ConflictResolutionRequest) =>
      conflictResolutionApi.resolveConflict(request),
    onSuccess: (data, variables) => {
      // Invalidate all conflict queries
      queryClient.invalidateQueries({
        queryKey: conflictManagementKeys.all,
      });
      
      // Invalidate specific timetable conflicts
      if (variables.timetableId) {
        queryClient.invalidateQueries({
          queryKey: conflictManagementKeys.timetable(variables.timetableId),
        });
      }
    },
  });
}

/**
 * Bulk resolve multiple conflicts
 */
export function useBulkResolveConflicts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requests: ConflictResolutionRequest[]) =>
      conflictResolutionApi.bulkResolveConflicts(requests),
    onSuccess: () => {
      // Invalidate all conflict queries
      queryClient.invalidateQueries({
        queryKey: conflictManagementKeys.all,
      });
    },
  });
}

// ============================================================
// QUICK ACTION HOOKS
// ============================================================

/**
 * Quick resolve: Keep first period
 */
export function useQuickResolveKeepFirst() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      timetableId: number;
      dayOfWeek: string;
      entryIndex: number;
      resolvedByUserId: number;
    }) =>
      conflictResolutionApi.quickResolveKeepFirst(
        params.timetableId,
        params.dayOfWeek,
        params.entryIndex,
        params.resolvedByUserId
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: conflictManagementKeys.all,
      });
    },
  });
}

/**
 * Quick resolve: Keep second period
 */
export function useQuickResolveKeepSecond() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      timetableId: number;
      dayOfWeek: string;
      entryIndex: number;
      resolvedByUserId: number;
    }) =>
      conflictResolutionApi.quickResolveKeepSecond(
        params.timetableId,
        params.dayOfWeek,
        params.entryIndex,
        params.resolvedByUserId
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: conflictManagementKeys.all,
      });
    },
  });
}

/**
 * Edit period time
 */
export function useEditPeriodTime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      timetableId: number;
      dayOfWeek: string;
      entryIndex: number;
      newStartTime: string;
      newEndTime: string;
      resolvedByUserId: number;
    }) =>
      conflictResolutionApi.editPeriodTime(
        params.timetableId,
        params.dayOfWeek,
        params.entryIndex,
        params.newStartTime,
        params.newEndTime,
        params.resolvedByUserId
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: conflictManagementKeys.all,
      });
    },
  });
}

/**
 * Merge two periods
 */
export function useMergePeriods() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      timetableId: number;
      dayOfWeek: string;
      entryIndex: number;
      secondEntryIndex: number;
      resolvedByUserId: number;
    }) =>
      conflictResolutionApi.mergePeriods(
        params.timetableId,
        params.dayOfWeek,
        params.entryIndex,
        params.secondEntryIndex,
        params.resolvedByUserId
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: conflictManagementKeys.all,
      });
    },
  });
}

/**
 * Split a period
 */
export function useSplitPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      timetableId: number;
      dayOfWeek: string;
      entryIndex: number;
      splitTime: string;
      resolvedByUserId: number;
    }) =>
      conflictResolutionApi.splitPeriod(
        params.timetableId,
        params.dayOfWeek,
        params.entryIndex,
        params.splitTime,
        params.resolvedByUserId
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: conflictManagementKeys.all,
      });
    },
  });
}