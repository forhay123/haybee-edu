// frontend/src/features/individual/hooks/admin/useAdminTimetables.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { adminTimetableApi } from "../../api/individualApi";
import {
  IndividualTimetableDto,
  TimetableSystemStatsDto,
  BulkOperationResultDto,
  ProcessingStatus,
} from "../../types/individualTypes";

/**
 * Hook to fetch all timetables (admin only)
 */
export function useAdminAllTimetables() {
  return useQuery<IndividualTimetableDto[]>({
    queryKey: ["admin-timetables", "all"],
    queryFn: () => adminTimetableApi.getAllTimetables(),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to fetch timetables by status (admin only)
 */
export function useAdminTimetablesByStatus(status: ProcessingStatus | null) {
  return useQuery<IndividualTimetableDto[]>({
    queryKey: ["admin-timetables", "status", status],
    queryFn: () => adminTimetableApi.getTimetablesByStatus(status!),
    enabled: !!status,
    staleTime: 30000,
  });
}

/**
 * Hook to fetch system statistics (admin only)
 */
export function useAdminSystemStats() {
  return useQuery<TimetableSystemStatsDto>({
    queryKey: ["admin-timetables", "stats"],
    queryFn: () => adminTimetableApi.getSystemStats(),
    staleTime: 60000, // 1 minute
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
}

/**
 * Hook for bulk delete operation (admin only)
 */
export function useAdminBulkDelete() {
  const queryClient = useQueryClient();

  return useMutation<BulkOperationResultDto, Error, number[]>({
    mutationFn: (timetableIds) => adminTimetableApi.bulkDelete(timetableIds),
    onSuccess: (result) => {
      // Invalidate all admin queries
      queryClient.invalidateQueries({ queryKey: ["admin-timetables"] });

      // Show success message
      if (result.failedCount === 0) {
        toast.success(
          `Successfully deleted ${result.successCount} timetable${
            result.successCount > 1 ? "s" : ""
          }`
        );
      } else {
        toast.warning(
          `Deleted ${result.successCount} timetable${
            result.successCount > 1 ? "s" : ""
          }, ${result.failedCount} failed`
        );
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete timetables");
    },
  });
}

/**
 * Hook for reprocessing a failed timetable (admin only)
 */
export function useAdminReprocess() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: (timetableId) => adminTimetableApi.reprocessTimetable(timetableId),
    onSuccess: (_, timetableId) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["admin-timetables"] });
      queryClient.invalidateQueries({ queryKey: ["timetable-status", timetableId] });

      toast.success("Timetable queued for reprocessing. This may take a few minutes.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reprocess timetable");
    },
  });
}

/**
 * Hook to fetch timetables with real-time updates
 * Polls every 5 seconds if there are processing timetables
 */
export function useAdminTimetablesWithPolling() {
  const { data: timetables = [], isLoading, error } = useQuery<IndividualTimetableDto[]>({
    queryKey: ["admin-timetables", "all"],
    queryFn: () => adminTimetableApi.getAllTimetables(),
    staleTime: 30000,
    refetchInterval: (query) => {
      // ✅ FIX: Access data from query.state.data, ensure it's an array
      const data = query.state.data;
      
      // Check if data is an array and if any timetables are processing
      if (!Array.isArray(data)) {
        return false;
      }
      
      const hasProcessing = data.some(
        (t) => t.processingStatus === "PROCESSING" || t.processingStatus === "PENDING"
      );
      
      // Poll every 5 seconds if there are processing items
      return hasProcessing ? 5000 : false;
    },
    refetchIntervalInBackground: true,
  });

  const processingCount = timetables.filter(
    (t) => t.processingStatus === "PROCESSING" || t.processingStatus === "PENDING"
  ).length;

  const failedCount = timetables.filter((t) => t.processingStatus === "FAILED").length;

  const completedCount = timetables.filter((t) => t.processingStatus === "COMPLETED").length;

  return {
    timetables,
    isLoading,
    error,
    processingCount,
    failedCount,
    completedCount,
    totalCount: timetables.length,
  };
}

/**
 * Hook to filter and search timetables
 */
export function useAdminTimetableFilters() {
  const queryClient = useQueryClient();

  const applyFilters = (
    timetables: IndividualTimetableDto[],
    filters: {
      status?: ProcessingStatus | "ALL";
      searchQuery?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ) => {
    let filtered = [...timetables];

    // Filter by status
    if (filters.status && filters.status !== "ALL") {
      filtered = filtered.filter((t) => t.processingStatus === filters.status);
    }

    // Filter by search query (student name or filename)
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.studentName.toLowerCase().includes(query) ||
          t.originalFilename.toLowerCase().includes(query)
      );
    }

    // Filter by date range
    if (filters.dateFrom) {
      filtered = filtered.filter(
        (t) => new Date(t.uploadedAt) >= new Date(filters.dateFrom!)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(
        (t) => new Date(t.uploadedAt) <= new Date(filters.dateTo!)
      );
    }

    return filtered;
  };

  return { applyFilters };
}