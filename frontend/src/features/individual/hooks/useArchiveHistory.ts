// frontend/src/features/individual/hooks/useArchiveHistory.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { archiveApi } from "../api/archiveApi";
import type {
  ArchiveResponse,
  UnarchiveResponse,
  ArchivedItem,
  ArchiveListResponse,
} from "../api/archiveApi";

/**
 * Hook for archive history management
 */
export const useArchiveHistory = (studentProfileId?: number) => {
  const queryClient = useQueryClient();

  // ============================================================
  // QUERIES
  // ============================================================

  /**
   * Get all archived timetables for a student
   */
  const useArchivedTimetables = (enabled = true) => {
    return useQuery<ArchivedItem[]>({
      queryKey: ["archivedTimetables", studentProfileId],
      queryFn: () => archiveApi.getArchivedTimetables(studentProfileId!),
      enabled: enabled && !!studentProfileId,
    });
  };

  /**
   * Get all archived schemes for a student
   */
  const useArchivedSchemes = (enabled = true) => {
    return useQuery<ArchivedItem[]>({
      queryKey: ["archivedSchemes", studentProfileId],
      queryFn: () => archiveApi.getArchivedSchemes(studentProfileId!),
      enabled: enabled && !!studentProfileId,
    });
  };

  /**
   * Get all archived items (timetables + schemes)
   */
  const useAllArchivedItems = (enabled = true) => {
    return useQuery<ArchiveListResponse>({
      queryKey: ["archivedItems", studentProfileId],
      queryFn: () => archiveApi.getAllArchivedItems(studentProfileId!),
      enabled: enabled && !!studentProfileId,
    });
  };

  /**
   * Get archive statistics (Admin only)
   */
  const useArchiveStats = (enabled = true) => {
    return useQuery({
      queryKey: ["archiveStats"],
      queryFn: () => archiveApi.getArchiveStats(),
      enabled,
    });
  };

  // ============================================================
  // MUTATIONS
  // ============================================================

  /**
   * Archive a timetable
   */
  const archiveTimetableMutation = useMutation({
    mutationFn: ({ timetableId, reason }: { timetableId: number; reason?: string }) =>
      archiveApi.archiveTimetable(timetableId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archivedTimetables"] });
      queryClient.invalidateQueries({ queryKey: ["archivedItems"] });
      queryClient.invalidateQueries({ queryKey: ["individualTimetables"] });
    },
  });

  /**
   * Unarchive a timetable
   */
  const unarchiveTimetableMutation = useMutation({
    mutationFn: (timetableId: number) => archiveApi.unarchiveTimetable(timetableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archivedTimetables"] });
      queryClient.invalidateQueries({ queryKey: ["archivedItems"] });
      queryClient.invalidateQueries({ queryKey: ["individualTimetables"] });
    },
  });

  /**
   * Archive a scheme
   */
  const archiveSchemeMutation = useMutation({
    mutationFn: ({ schemeId, reason }: { schemeId: number; reason?: string }) =>
      archiveApi.archiveScheme(schemeId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archivedSchemes"] });
      queryClient.invalidateQueries({ queryKey: ["archivedItems"] });
      queryClient.invalidateQueries({ queryKey: ["individualSchemes"] });
    },
  });

  /**
   * Unarchive a scheme
   */
  const unarchiveSchemeMutation = useMutation({
    mutationFn: (schemeId: number) => archiveApi.unarchiveScheme(schemeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archivedSchemes"] });
      queryClient.invalidateQueries({ queryKey: ["archivedItems"] });
      queryClient.invalidateQueries({ queryKey: ["individualSchemes"] });
    },
  });

  /**
   * Bulk archive timetables (Admin only)
   */
  const bulkArchiveTimetablesMutation = useMutation({
    mutationFn: ({ timetableIds, reason }: { timetableIds: number[]; reason?: string }) =>
      archiveApi.bulkArchiveTimetables(timetableIds, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archivedTimetables"] });
      queryClient.invalidateQueries({ queryKey: ["archivedItems"] });
      queryClient.invalidateQueries({ queryKey: ["archiveStats"] });
    },
  });

  /**
   * Bulk archive schemes (Admin only)
   */
  const bulkArchiveSchemesMutation = useMutation({
    mutationFn: ({ schemeIds, reason }: { schemeIds: number[]; reason?: string }) =>
      archiveApi.bulkArchiveSchemes(schemeIds, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archivedSchemes"] });
      queryClient.invalidateQueries({ queryKey: ["archivedItems"] });
      queryClient.invalidateQueries({ queryKey: ["archiveStats"] });
    },
  });

  // ============================================================
  // CONVENIENCE METHODS
  // ============================================================

  const invalidateArchives = () => {
    queryClient.invalidateQueries({ queryKey: ["archivedTimetables"] });
    queryClient.invalidateQueries({ queryKey: ["archivedSchemes"] });
    queryClient.invalidateQueries({ queryKey: ["archivedItems"] });
    queryClient.invalidateQueries({ queryKey: ["archiveStats"] });
  };

  return {
    // Queries
    useArchivedTimetables,
    useArchivedSchemes,
    useAllArchivedItems,
    useArchiveStats,

    // Mutations
    archiveTimetable: archiveTimetableMutation.mutateAsync,
    unarchiveTimetable: unarchiveTimetableMutation.mutateAsync,
    archiveScheme: archiveSchemeMutation.mutateAsync,
    unarchiveScheme: unarchiveSchemeMutation.mutateAsync,
    bulkArchiveTimetables: bulkArchiveTimetablesMutation.mutateAsync,
    bulkArchiveSchemes: bulkArchiveSchemesMutation.mutateAsync,

    // Mutation states
    isArchivingTimetable: archiveTimetableMutation.isPending,
    isUnarchivingTimetable: unarchiveTimetableMutation.isPending,
    isArchivingScheme: archiveSchemeMutation.isPending,
    isUnarchivingScheme: unarchiveSchemeMutation.isPending,
    isBulkArchiving:
      bulkArchiveTimetablesMutation.isPending || bulkArchiveSchemesMutation.isPending,

    // Utilities
    invalidateArchives,
  };
};

/**
 * Standalone hook for archived timetables
 */
export const useArchivedTimetables = (studentProfileId: number, enabled = true) => {
  return useQuery<ArchivedItem[]>({
    queryKey: ["archivedTimetables", studentProfileId],
    queryFn: () => archiveApi.getArchivedTimetables(studentProfileId),
    enabled: enabled && !!studentProfileId,
  });
};

/**
 * Standalone hook for archived schemes
 */
export const useArchivedSchemes = (studentProfileId: number, enabled = true) => {
  return useQuery<ArchivedItem[]>({
    queryKey: ["archivedSchemes", studentProfileId],
    queryFn: () => archiveApi.getArchivedSchemes(studentProfileId),
    enabled: enabled && !!studentProfileId,
  });
};

/**
 * Standalone hook for all archived items
 */
export const useAllArchivedItems = (studentProfileId: number, enabled = true) => {
  return useQuery<ArchiveListResponse>({
    queryKey: ["archivedItems", studentProfileId],
    queryFn: () => archiveApi.getAllArchivedItems(studentProfileId),
    enabled: enabled && !!studentProfileId,
  });
};