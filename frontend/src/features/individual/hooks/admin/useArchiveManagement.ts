// frontend/src/features/individual/hooks/admin/useArchiveManagement.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { archiveApi } from "../../api/archiveApi";
import type { ArchivedItem, ArchiveResponse } from "../../api/archiveApi";

// ============================================================
// QUERY KEYS
// ============================================================

export const archiveManagementKeys = {
  all: ["archive-management"] as const,
  timetables: (studentId: number) =>
    ["archive-management", "timetables", studentId] as const,
  schemes: (studentId: number) =>
    ["archive-management", "schemes", studentId] as const,
  allItems: (studentId: number) =>
    ["archive-management", "all-items", studentId] as const,
  stats: () => ["archive-management", "stats"] as const,
};

// ============================================================
// QUERY HOOKS
// ============================================================

/**
 * Get all archived timetables for a student
 */
export function useArchivedTimetables(studentProfileId: number) {
  return useQuery({
    queryKey: archiveManagementKeys.timetables(studentProfileId),
    queryFn: () => archiveApi.getArchivedTimetables(studentProfileId),
    enabled: !!studentProfileId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get all archived schemes for a student
 */
export function useArchivedSchemes(studentProfileId: number) {
  return useQuery({
    queryKey: archiveManagementKeys.schemes(studentProfileId),
    queryFn: () => archiveApi.getArchivedSchemes(studentProfileId),
    enabled: !!studentProfileId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get all archived items (timetables + schemes) for a student
 */
export function useAllArchivedItems(studentProfileId: number) {
  return useQuery({
    queryKey: archiveManagementKeys.allItems(studentProfileId),
    queryFn: () => archiveApi.getAllArchivedItems(studentProfileId),
    enabled: !!studentProfileId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get archive statistics (Admin only)
 */
export function useArchiveStats() {
  return useQuery({
    queryKey: archiveManagementKeys.stats(),
    queryFn: () => archiveApi.getArchiveStats(),
    staleTime: 1000 * 60 * 10,
  });
}

// ============================================================
// MUTATION HOOKS - INDIVIDUAL OPERATIONS
// ============================================================

/**
 * Archive a timetable
 */
export function useArchiveTimetable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ timetableId, reason }: { timetableId: number; reason?: string }) =>
      archiveApi.archiveTimetable(timetableId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: archiveManagementKeys.all,
      });
    },
  });
}

/**
 * Unarchive a timetable
 */
export function useUnarchiveTimetable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (timetableId: number) =>
      archiveApi.unarchiveTimetable(timetableId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: archiveManagementKeys.all,
      });
    },
  });
}

/**
 * Archive a scheme
 */
export function useArchiveScheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ schemeId, reason }: { schemeId: number; reason?: string }) =>
      archiveApi.archiveScheme(schemeId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: archiveManagementKeys.all,
      });
    },
  });
}

/**
 * Unarchive a scheme
 */
export function useUnarchiveScheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (schemeId: number) => archiveApi.unarchiveScheme(schemeId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: archiveManagementKeys.all,
      });
    },
  });
}

// ============================================================
// MUTATION HOOKS - BULK OPERATIONS
// ============================================================

/**
 * Bulk archive timetables (Admin only)
 */
export function useBulkArchiveTimetables() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ timetableIds, reason }: { timetableIds: number[]; reason?: string }) =>
      archiveApi.bulkArchiveTimetables(timetableIds, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: archiveManagementKeys.all,
      });
    },
  });
}

/**
 * Bulk archive schemes (Admin only)
 */
export function useBulkArchiveSchemes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ schemeIds, reason }: { schemeIds: number[]; reason?: string }) =>
      archiveApi.bulkArchiveSchemes(schemeIds, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: archiveManagementKeys.all,
      });
    },
  });
}