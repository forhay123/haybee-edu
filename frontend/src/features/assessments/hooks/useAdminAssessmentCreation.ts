// frontend/src/features/assessments/hooks/useAdminAssessmentCreation.ts

import { useState, useCallback } from "react";
import { adminAssessmentCreationApi } from "../api/adminAssessmentCreationApi";
import type {
  MissingAssessmentsStats,
  CreateAssessmentResponse,
  CreateAllMissingResponse,
} from "../api/adminAssessmentCreationApi";

export const useAdminAssessmentCreation = () => {
  const [stats, setStats] = useState<MissingAssessmentsStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get missing assessments statistics
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminAssessmentCreationApi.getMissingAssessmentsStats();
      setStats(data);
      return data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || "Failed to fetch stats";
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create assessment for specific topic
  const createForLesson = useCallback(
    async (lessonTopicId: number): Promise<CreateAssessmentResponse> => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminAssessmentCreationApi.createAssessmentForLesson(
          lessonTopicId
        );
        
        // Refresh stats after creation
        await fetchStats();
        
        return result;
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || err.message || "Failed to create assessment";
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchStats]
  );

  // Create all missing assessments
  const createAllMissing = useCallback(async (): Promise<CreateAllMissingResponse> => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminAssessmentCreationApi.createAllMissingAssessments();
      
      // Refresh stats after creation
      await fetchStats();
      
      return result;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || "Failed to create assessments";
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchStats]);

  // Create multiple assessments with progress
  const createMultiple = useCallback(
    async (
      lessonTopicIds: number[],
      onProgress?: (completed: number, total: number) => void
    ) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminAssessmentCreationApi.createMultipleAssessments(
          lessonTopicIds,
          onProgress
        );
        
        // Refresh stats after creation
        await fetchStats();
        
        return result;
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || err.message || "Failed to create multiple assessments";
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchStats]
  );

  return {
    stats,
    loading,
    error,
    fetchStats,
    createForLesson,
    createAllMissing,
    createMultiple,
  };
};