// frontend/src/features/individual/hooks/useFileUpload.ts

import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"; // ✅ Added useQuery
import { toast } from "react-hot-toast";
import {
  TimetableUploadRequest,
  TimetableUploadResponse,
  SchemeUploadRequest,
  SchemeUploadResponse,
  UploadProgress,
  UploadError,
} from "../types/individualTypes";
import { timetableApi, schemeApi, studentApi } from "../api/individualApi"; // ✅ Added studentApi

/**
 * Custom hook for file uploads with progress tracking
 */
export function useFileUpload() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<UploadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0,
  });

  /**
   * Timetable upload mutation
   */
  const uploadTimetable = useMutation<
    TimetableUploadResponse,
    UploadError,
    { file: File; request: TimetableUploadRequest }
  >({
    mutationFn: async ({ file, request }) => {
      // Validate file
      validateFile(file, ["application/pdf", "application/vnd.ms-excel", 
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "image/jpeg", "image/png"]);

      return await timetableApi.upload(file, request, (percentage) => {
        setProgress({
          loaded: (file.size * percentage) / 100,
          total: file.size,
          percentage,
        });
      });
    },
    onSuccess: (data) => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ 
        queryKey: ["individual-timetables"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["individual-overview"] 
      });
      
      toast.success("Timetable uploaded successfully! Processing...");
      
      // Reset progress
      setProgress({ loaded: 0, total: 0, percentage: 0 });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload timetable");
      setProgress({ loaded: 0, total: 0, percentage: 0 });
    },
  });

  /**
   * Scheme upload mutation
   */
  const uploadScheme = useMutation<
    SchemeUploadResponse,
    UploadError,
    { file: File; request: SchemeUploadRequest }
  >({
    mutationFn: async ({ file, request }) => {
      // Validate file
      validateFile(file, [
        "application/pdf",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png"
      ]);

      return await schemeApi.upload(file, request, (percentage) => {
        setProgress({
          loaded: (file.size * percentage) / 100,
          total: file.size,
          percentage,
        });
      });
    },
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ 
        queryKey: ["individual-schemes"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["individual-overview"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["individual-lessons"] 
      });
      
      toast.success(`Scheme uploaded for ${data.subjectName}! Processing...`);
      
      // Reset progress
      setProgress({ loaded: 0, total: 0, percentage: 0 });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload scheme");
      setProgress({ loaded: 0, total: 0, percentage: 0 });
    },
  });

  return {
    uploadTimetable,
    uploadScheme,
    progress,
    isUploading: uploadTimetable.isPending || uploadScheme.isPending,
  };
}

/**
 * Validate file before upload
 */
function validateFile(file: File, allowedTypes: string[]): void {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  if (!file) {
    throw new Error("No file selected");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size must be less than 10MB");
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error(
      `Invalid file type. Allowed: ${allowedTypes.map(t => t.split('/').pop()).join(', ')}`
    );
  }
}

/**
 * Hook for fetching student data
 */
export function useIndividualStudent(studentProfileId: number) {
  const queryClient = useQueryClient();

  const { data: overview, isLoading, error } = useQuery({
    queryKey: ["individual-overview", studentProfileId],
    queryFn: () => studentApi.getOverview(studentProfileId),
    enabled: !!studentProfileId,
  });

  return {
    overview,
    isLoading,
    error,
  };
}

/**
 * Hook for deleting files
 */
export function useFileDelete() {
  const queryClient = useQueryClient();

  const deleteTimetable = useMutation({
    mutationFn: (id: number) => timetableApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["individual-timetables"] });
      queryClient.invalidateQueries({ queryKey: ["individual-overview"] });
      toast.success("Timetable deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete timetable");
    },
  });

  const deleteScheme = useMutation({
    mutationFn: (id: number) => schemeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["individual-schemes"] });
      queryClient.invalidateQueries({ queryKey: ["individual-overview"] });
      queryClient.invalidateQueries({ queryKey: ["individual-lessons"] });
      toast.success("Scheme deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete scheme");
    },
  });

  return {
    deleteTimetable,
    deleteScheme,
  };
}