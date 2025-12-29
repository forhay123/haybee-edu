// frontend/src/features/individual/hooks/admin/useWeeklyGenerationControl.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "../../../../api/axios";

// ============================================================
// TYPES
// ============================================================

export interface WeeklyGenerationRequest {
  termId: number;
  weekNumber: number;
  forceRegenerate?: boolean;
  studentIds?: number[]; // Optional: generate for specific students only
  previewOnly?: boolean; // If true, don't save to database
}

export interface WeeklyGenerationResponse {
  success: boolean;
  message: string;
  weekNumber: number;
  termName: string;
  schedulesGenerated: number;
  progressRecordsCreated: number;
  assessmentInstancesCreated: number;
  studentsProcessed: number;
  errors: GenerationError[];
  warnings: GenerationWarning[];
  missingTopics: MissingTopicInfo[];
  conflicts: ConflictInfo[];
  holidayRescheduled: boolean;
  generatedAt: string;
  executionTimeMs: number;
}

export interface GenerationError {
  errorType: string;
  message: string;
  studentId?: number;
  studentName?: string;
  subjectId?: number;
  subjectName?: string;
  details?: string;
}

export interface GenerationWarning {
  warningType: string;
  message: string;
  studentId?: number;
  subjectId?: number;
  details?: string;
}

export interface MissingTopicInfo {
  subjectId: number;
  subjectName: string;
  weekNumber: number;
  affectedStudentIds: number[];
  affectedStudentNames: string[];
  totalAffected: number;
}

export interface ConflictInfo {
  conflictId: number;
  studentId: number;
  studentName: string;
  dayOfWeek: string;
  conflictType: string;
  description: string;
}

export interface GenerationPreviewResponse {
  weekNumber: number;
  termName: string;
  startDate: string;
  endDate: string;
  estimatedSchedules: number;
  estimatedProgressRecords: number;
  estimatedAssessmentInstances: number;
  studentsToProcess: StudentPreview[];
  missingTopics: MissingTopicInfo[];
  conflicts: ConflictInfo[];
  holidaysInWeek: HolidayInfo[];
  canGenerate: boolean;
  blockingIssues: string[];
}

export interface StudentPreview {
  studentProfileId: number;
  studentName: string;
  timetableId: number;
  totalPeriods: number;
  subjectsScheduled: string[];
  hasConflicts: boolean;
  hasMissingTopics: boolean;
}

export interface HolidayInfo {
  holidayId: number;
  holidayDate: string;
  holidayName: string;
  dayOfWeek: string;
  affectedStudents: number;
  willReschedule: boolean;
}

export interface GenerationStatusResponse {
  isGenerating: boolean;
  currentWeek: number;
  lastGenerationTime: string;
  lastGenerationStatus: "SUCCESS" | "FAILED" | "PARTIAL";
  lastGenerationMessage: string;
  nextScheduledGeneration: string;
  autoGenerationEnabled: boolean;
}

export interface RegenerateWeekRequest {
  termId: number;
  weekNumber: number;
  deleteExisting: boolean;
  notifyStudents: boolean;
}

// ============================================================
// HOOK: useWeeklyGenerationControl
// ============================================================

export function useWeeklyGenerationControl() {
  const queryClient = useQueryClient();

  // ============================================================
  // QUERIES
  // ============================================================

  /**
   * Get current generation status
   */
  const useGenerationStatus = (enabled = true) => {
    return useQuery<GenerationStatusResponse>({
      queryKey: ["weeklyGeneration", "status"],
      queryFn: async () => {
        const res = await axios.get("/individual/admin/generation/status");
        return res.data;
      },
      enabled,
      refetchInterval: 30000, // Refresh every 30 seconds
    });
  };

  /**
   * Preview generation for a specific week
   */
  const useGenerationPreview = (
    termId: number,
    weekNumber: number,
    enabled = true
  ) => {
    return useQuery<GenerationPreviewResponse>({
      queryKey: ["weeklyGeneration", "preview", termId, weekNumber],
      queryFn: async () => {
        const res = await axios.get("/individual/admin/generation/preview", {
          params: { termId, weekNumber },
        });
        return res.data;
      },
      enabled: enabled && !!termId && !!weekNumber,
      staleTime: 1 * 60 * 1000, // 1 minute
    });
  };

  /**
   * Get generation history (last N weeks)
   */
  const useGenerationHistory = (limit: number = 10, enabled = true) => {
    return useQuery<WeeklyGenerationResponse[]>({
      queryKey: ["weeklyGeneration", "history", limit],
      queryFn: async () => {
        const res = await axios.get("/individual/admin/generation/history", {
          params: { limit },
        });
        return res.data;
      },
      enabled,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  /**
   * Get details of a specific generation run
   */
  const useGenerationDetails = (generationId: number, enabled = true) => {
    return useQuery<WeeklyGenerationResponse>({
      queryKey: ["weeklyGeneration", "details", generationId],
      queryFn: async () => {
        const res = await axios.get(
          `/individual/admin/generation/${generationId}`
        );
        return res.data;
      },
      enabled: enabled && !!generationId,
    });
  };

  // ============================================================
  // MUTATIONS
  // ============================================================

  /**
   * Generate schedules for a specific week
   */
  const generateWeeklySchedulesMutation = useMutation({
    mutationFn: async (request: WeeklyGenerationRequest) => {
      const res = await axios.post<WeeklyGenerationResponse>(
        "/individual/admin/generation/generate",
        request
      );
      return res.data;
    },
    onSuccess: (data) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["weeklyGeneration"] });
      queryClient.invalidateQueries({ queryKey: ["individualSchedule"] });
      queryClient.invalidateQueries({ queryKey: ["systemDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["assessment-instances"] });

      // Show success notification
      console.log(`✅ Generated ${data.schedulesGenerated} schedules for Week ${data.weekNumber}`);
    },
    onError: (error: any) => {
      console.error("❌ Generation failed:", error);
    },
  });

  /**
   * Regenerate schedules for a specific week (overwrites existing)
   */
  const regenerateWeekMutation = useMutation({
    mutationFn: async (request: RegenerateWeekRequest) => {
      const res = await axios.post<WeeklyGenerationResponse>(
        "/individual/admin/generation/regenerate",
        request
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weeklyGeneration"] });
      queryClient.invalidateQueries({ queryKey: ["individualSchedule"] });
      queryClient.invalidateQueries({ queryKey: ["assessment-instances"] });
    },
  });

  /**
   * Pause automatic generation
   */
  const pauseAutoGenerationMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post("/individual/admin/generation/pause");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weeklyGeneration", "status"] });
    },
  });

  /**
   * Resume automatic generation
   */
  const resumeAutoGenerationMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post("/individual/admin/generation/resume");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weeklyGeneration", "status"] });
    },
  });

  /**
   * Trigger generation immediately (don't wait for Sunday)
   */
  const triggerImmediateGenerationMutation = useMutation({
    mutationFn: async (termId: number) => {
      const res = await axios.post<WeeklyGenerationResponse>(
        "/individual/admin/generation/trigger-immediate",
        { termId }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weeklyGeneration"] });
      queryClient.invalidateQueries({ queryKey: ["individualSchedule"] });
    },
  });

  // ============================================================
  // CONVENIENCE METHODS
  // ============================================================

  /**
   * Generate current week schedules
   */
  const generateCurrentWeek = async (termId: number) => {
    const status = await queryClient.fetchQuery({
      queryKey: ["weeklyGeneration", "status"],
      queryFn: async () => {
        const res = await axios.get("/individual/admin/generation/status");
        return res.data as GenerationStatusResponse;
      },
    });

    return generateWeeklySchedulesMutation.mutateAsync({
      termId,
      weekNumber: status.currentWeek,
      forceRegenerate: false,
    });
  };

  /**
   * Generate next week schedules
   */
  const generateNextWeek = async (termId: number) => {
    const status = await queryClient.fetchQuery({
      queryKey: ["weeklyGeneration", "status"],
      queryFn: async () => {
        const res = await axios.get("/individual/admin/generation/status");
        return res.data as GenerationStatusResponse;
      },
    });

    return generateWeeklySchedulesMutation.mutateAsync({
      termId,
      weekNumber: status.currentWeek + 1,
      forceRegenerate: false,
    });
  };

  /**
   * Preview generation without executing
   */
  const previewGeneration = async (
    termId: number,
    weekNumber: number
  ): Promise<GenerationPreviewResponse> => {
    const res = await axios.get("/individual/admin/generation/preview", {
      params: { termId, weekNumber },
    });
    return res.data;
  };

  /**
   * Check if generation is safe to run
   */
  const canGenerate = async (
    termId: number,
    weekNumber: number
  ): Promise<{ canGenerate: boolean; issues: string[] }> => {
    const preview = await previewGeneration(termId, weekNumber);
    return {
      canGenerate: preview.canGenerate,
      issues: preview.blockingIssues,
    };
  };

  return {
    // Queries
    useGenerationStatus,
    useGenerationPreview,
    useGenerationHistory,
    useGenerationDetails,

    // Mutations
    generateWeeklySchedules: generateWeeklySchedulesMutation.mutateAsync,
    regenerateWeek: regenerateWeekMutation.mutateAsync,
    pauseAutoGeneration: pauseAutoGenerationMutation.mutateAsync,
    resumeAutoGeneration: resumeAutoGenerationMutation.mutateAsync,
    triggerImmediateGeneration: triggerImmediateGenerationMutation.mutateAsync,

    // Convenience methods
    generateCurrentWeek,
    generateNextWeek,
    previewGeneration,
    canGenerate,

    // Mutation states
    isGenerating: generateWeeklySchedulesMutation.isPending,
    isRegenerating: regenerateWeekMutation.isPending,
    isPausing: pauseAutoGenerationMutation.isPending,
    isResuming: resumeAutoGenerationMutation.isPending,
    isTriggeringImmediate: triggerImmediateGenerationMutation.isPending,

    // Error states
    generateError: generateWeeklySchedulesMutation.error,
    regenerateError: regenerateWeekMutation.error,
  };
}

// ============================================================
// STANDALONE HOOKS
// ============================================================

/**
 * Get current generation status (standalone)
 */
export function useGenerationStatus(enabled = true) {
  return useQuery<GenerationStatusResponse>({
    queryKey: ["weeklyGeneration", "status"],
    queryFn: async () => {
      const res = await axios.get("/individual/admin/generation/status");
      return res.data;
    },
    enabled,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Preview generation (standalone)
 */
export function useGenerationPreview(
  termId: number,
  weekNumber: number,
  enabled = true
) {
  return useQuery<GenerationPreviewResponse>({
    queryKey: ["weeklyGeneration", "preview", termId, weekNumber],
    queryFn: async () => {
      const res = await axios.get("/individual/admin/generation/preview", {
        params: { termId, weekNumber },
      });
      return res.data;
    },
    enabled: enabled && !!termId && !!weekNumber,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Get generation history (standalone)
 */
export function useGenerationHistory(limit: number = 10, enabled = true) {
  return useQuery<WeeklyGenerationResponse[]>({
    queryKey: ["weeklyGeneration", "history", limit],
    queryFn: async () => {
      const res = await axios.get("/individual/admin/generation/history", {
        params: { limit },
      });
      return res.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}