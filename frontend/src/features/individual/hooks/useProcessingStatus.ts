// frontend/src/features/individual/hooks/useProcessingStatus.ts - FIXED

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { timetableApi, schemeApi, studentApi } from "../api/individualApi";
import { IndividualTimetableDto, IndividualSchemeDto, ProcessingStatus } from "../types/individualTypes";

/**
 * Hook to poll timetable processing status
 * Automatically refetches every 3 seconds while processing
 */
export function useTimetableStatus(timetableId: number | null, enabled: boolean = true) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["timetable-status", timetableId],
    queryFn: () => timetableApi.getById(timetableId!),
    enabled: enabled && !!timetableId,
    refetchInterval: (data) => {
      // Stop polling if completed or failed
      if (data?.processingStatus === "COMPLETED" || data?.processingStatus === "FAILED") {
        return false;
      }
      // Poll every 3 seconds while pending/processing
      return 3000;
    },
    refetchIntervalInBackground: true,
  });

  // Invalidate overview when processing completes
  useEffect(() => {
    if (data?.processingStatus === "COMPLETED") {
      queryClient.invalidateQueries({ queryKey: ["individual-overview"] });
      queryClient.invalidateQueries({ queryKey: ["individual-timetables"] });
    }
  }, [data?.processingStatus, queryClient]);

  return {
    timetable: data,
    isLoading,
    error,
    refetch,
    isProcessing: data?.processingStatus === "PROCESSING" || data?.processingStatus === "PENDING",
    isCompleted: data?.processingStatus === "COMPLETED",
    isFailed: data?.processingStatus === "FAILED",
  };
}

/**
 * Hook to poll scheme processing status
 * Automatically refetches every 3 seconds while processing
 */
export function useSchemeStatus(schemeId: number | null, enabled: boolean = true) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["scheme-status", schemeId],
    queryFn: () => schemeApi.getById(schemeId!),
    enabled: enabled && !!schemeId,
    refetchInterval: (data) => {
      // Stop polling if completed or failed
      if (data?.processingStatus === "COMPLETED" || data?.processingStatus === "FAILED") {
        return false;
      }
      // Poll every 3 seconds while pending/processing
      return 3000;
    },
    refetchIntervalInBackground: true,
  });

  // Invalidate related queries when processing completes
  useEffect(() => {
    if (data?.processingStatus === "COMPLETED") {
      queryClient.invalidateQueries({ queryKey: ["individual-overview"] });
      queryClient.invalidateQueries({ queryKey: ["individual-schemes"] });
      queryClient.invalidateQueries({ queryKey: ["individual-lessons"] });
    }
  }, [data?.processingStatus, queryClient]);

  return {
    scheme: data,
    isLoading,
    error,
    refetch,
    isProcessing: data?.processingStatus === "PROCESSING" || data?.processingStatus === "PENDING",
    isCompleted: data?.processingStatus === "COMPLETED",
    isFailed: data?.processingStatus === "FAILED",
  };
}

/**
 * Hook to monitor all uploads for a student
 * Returns list of uploads that are currently processing
 * ✅ FIXED: Safely handles undefined overview during loading
 */
export function useStudentProcessingStatus(studentProfileId: number | null) {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["individual-overview", studentProfileId],
    queryFn: () => studentApi.getOverview(studentProfileId!),
    enabled: !!studentProfileId,
    refetchInterval: 5000, // Check every 5 seconds
    refetchIntervalInBackground: true,
  });

  // ✅ FIX: Safely access timetables and schemes - handle undefined overview
  const processingTimetables = (overview?.timetables || []).filter(
    (t) => t.processingStatus === "PROCESSING" || t.processingStatus === "PENDING"
  );

  const processingSchemes = (overview?.schemes || []).filter(
    (s) => s.processingStatus === "PROCESSING" || s.processingStatus === "PENDING"
  );

  const hasProcessingItems = processingTimetables.length > 0 || processingSchemes.length > 0;

  return {
    overview, // Will be undefined while loading, then populated when data arrives
    isLoading,
    processingTimetables,
    processingSchemes,
    hasProcessingItems,
    totalProcessing: processingTimetables.length + processingSchemes.length,
  };
}

/**
 * Status badge component helper
 */
export function getStatusBadgeProps(status: ProcessingStatus) {
  switch (status) {
    case "PENDING":
      return {
        color: "yellow",
        text: "Pending",
        icon: "⏳",
      };
    case "PROCESSING":
      return {
        color: "blue",
        text: "Processing",
        icon: "🔄",
        animate: true,
      };
    case "COMPLETED":
      return {
        color: "green",
        text: "Completed",
        icon: "✅",
      };
    case "FAILED":
      return {
        color: "red",
        text: "Failed",
        icon: "❌",
      };
    default:
      return {
        color: "gray",
        text: "Unknown",
        icon: "❓",
      };
  }
}

/**
 * Format processing time
 */
export function formatProcessingTime(uploadedAt: string, processedAt?: string): string {
  if (!processedAt) return "Processing...";

  const uploaded = new Date(uploadedAt);
  const processed = new Date(processedAt);
  const diffMs = processed.getTime() - uploaded.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return `${diffSecs}s`;
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ${diffSecs % 60}s`;
  return `${Math.floor(diffSecs / 3600)}h ${Math.floor((diffSecs % 3600) / 60)}m`;
}