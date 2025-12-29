// frontend/src/features/individual/hooks/useConflictResolution.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { conflictResolutionApi } from "../api/conflictResolutionApi";
import type {
  ConflictDto,
  ConflictResolutionRequest,
  ConflictResolutionResponse,
} from "../types/conflictTypes";

/**
 * Hook for conflict resolution management
 */
export const useConflictResolution = () => {
  const queryClient = useQueryClient();

  // ============================================================
  // QUERIES
  // ============================================================

  /**
   * Get all conflicts
   */
  const useAllConflicts = (enabled = true) => {
    return useQuery<ConflictDto[]>({
      queryKey: ["conflicts", "all"],
      queryFn: () => conflictResolutionApi.getAllConflicts(),
      enabled,
    });
  };

  /**
   * Get conflicts for a specific timetable
   */
  const useConflictsForTimetable = (timetableId: number, enabled = true) => {
    return useQuery<ConflictDto[]>({
      queryKey: ["conflicts", "timetable", timetableId],
      queryFn: () => conflictResolutionApi.getConflictsForTimetable(timetableId),
      enabled: enabled && !!timetableId,
    });
  };

  /**
   * Get conflicts for a specific student
   */
  const useConflictsForStudent = (studentProfileId: number, enabled = true) => {
    return useQuery<ConflictDto[]>({
      queryKey: ["conflicts", "student", studentProfileId],
      queryFn: () => conflictResolutionApi.getConflictsForStudent(studentProfileId),
      enabled: enabled && !!studentProfileId,
    });
  };

  /**
   * Get conflict summary
   */
  const useConflictSummary = (enabled = true) => {
    return useQuery({
      queryKey: ["conflicts", "summary"],
      queryFn: () => conflictResolutionApi.getConflictSummary(),
      enabled,
    });
  };

  /**
   * Get unresolved conflicts
   */
  const useUnresolvedConflicts = (enabled = true) => {
    return useQuery<ConflictDto[]>({
      queryKey: ["conflicts", "unresolved"],
      queryFn: () => conflictResolutionApi.getUnresolvedConflicts(),
      enabled,
    });
  };

  /**
   * Get high priority conflicts
   */
  const useHighPriorityConflicts = (enabled = true) => {
    return useQuery<ConflictDto[]>({
      queryKey: ["conflicts", "highPriority"],
      queryFn: () => conflictResolutionApi.getHighPriorityConflicts(),
      enabled,
    });
  };

  /**
   * Get conflicts by type
   */
  const useConflictsByType = (conflictType: string, enabled = true) => {
    return useQuery<ConflictDto[]>({
      queryKey: ["conflicts", "byType", conflictType],
      queryFn: () => conflictResolutionApi.getConflictsByType(conflictType),
      enabled: enabled && !!conflictType,
    });
  };

  /**
   * Get conflicts by severity
   */
  const useConflictsBySeverity = (
    severity: "HIGH" | "MEDIUM" | "LOW",
    enabled = true
  ) => {
    return useQuery<ConflictDto[]>({
      queryKey: ["conflicts", "bySeverity", severity],
      queryFn: () => conflictResolutionApi.getConflictsBySeverity(severity),
      enabled: enabled && !!severity,
    });
  };

  // ============================================================
  // MUTATIONS
  // ============================================================

  /**
   * Resolve a single conflict
   */
  const resolveConflictMutation = useMutation({
    mutationFn: (request: ConflictResolutionRequest) =>
      conflictResolutionApi.resolveConflict(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conflicts"] });
      queryClient.invalidateQueries({ queryKey: ["individualTimetables"] });
      queryClient.invalidateQueries({ queryKey: ["individualSchedule"] });
    },
  });

  /**
   * Bulk resolve multiple conflicts
   */
  const bulkResolveConflictsMutation = useMutation({
    mutationFn: (requests: ConflictResolutionRequest[]) =>
      conflictResolutionApi.bulkResolveConflicts(requests),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conflicts"] });
      queryClient.invalidateQueries({ queryKey: ["individualTimetables"] });
      queryClient.invalidateQueries({ queryKey: ["individualSchedule"] });
    },
  });

  // ============================================================
  // CONVENIENCE METHODS
  // ============================================================

  const invalidateConflicts = () => {
    queryClient.invalidateQueries({ queryKey: ["conflicts"] });
  };

  return {
    // Queries
    useAllConflicts,
    useConflictsForTimetable,
    useConflictsForStudent,
    useConflictSummary,
    useUnresolvedConflicts,
    useHighPriorityConflicts,
    useConflictsByType,
    useConflictsBySeverity,

    // Mutations
    resolveConflict: resolveConflictMutation.mutateAsync,
    bulkResolveConflicts: bulkResolveConflictsMutation.mutateAsync,

    // Quick resolve methods (from API)
    quickResolveKeepFirst: conflictResolutionApi.quickResolveKeepFirst,
    quickResolveKeepSecond: conflictResolutionApi.quickResolveKeepSecond,
    editPeriodTime: conflictResolutionApi.editPeriodTime,
    mergePeriods: conflictResolutionApi.mergePeriods,
    splitPeriod: conflictResolutionApi.splitPeriod,

    // Mutation states
    isResolving: resolveConflictMutation.isPending,
    isBulkResolving: bulkResolveConflictsMutation.isPending,

    // Utilities
    invalidateConflicts,
  };
};

/**
 * Standalone hook for conflicts by timetable
 */
export const useConflictsForTimetable = (timetableId: number, enabled = true) => {
  return useQuery<ConflictDto[]>({
    queryKey: ["conflicts", "timetable", timetableId],
    queryFn: () => conflictResolutionApi.getConflictsForTimetable(timetableId),
    enabled: enabled && !!timetableId,
  });
};

/**
 * Standalone hook for conflicts by student
 */
export const useConflictsForStudent = (studentProfileId: number, enabled = true) => {
  return useQuery<ConflictDto[]>({
    queryKey: ["conflicts", "student", studentProfileId],
    queryFn: () => conflictResolutionApi.getConflictsForStudent(studentProfileId),
    enabled: enabled && !!studentProfileId,
  });
};

/**
 * Standalone hook for unresolved conflicts
 */
export const useUnresolvedConflicts = (enabled = true) => {
  return useQuery<ConflictDto[]>({
    queryKey: ["conflicts", "unresolved"],
    queryFn: () => conflictResolutionApi.getUnresolvedConflicts(),
    enabled,
  });
};