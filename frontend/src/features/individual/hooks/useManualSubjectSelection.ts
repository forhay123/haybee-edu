// frontend/src/features/individual/hooks/useManualSubjectSelection.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { manualSubjectApi } from '../api/individualApi';
import { toast } from 'react-hot-toast';

/**
 * Hook to fetch available subjects for a student's class
 * Filters subjects based on class, department, and student type
 */
export function useAvailableSubjects(studentProfileId: number | null) {
  return useQuery({
    queryKey: ['available-subjects', studentProfileId],
    queryFn: () => {
      if (!studentProfileId) {
        throw new Error('Student profile ID is required');
      }
      return manualSubjectApi.getAvailableSubjects(studentProfileId);
    },
    enabled: !!studentProfileId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

/**
 * Hook to create a manual timetable from selected subjects
 * Generates virtual timetable and daily schedules
 */
export function useCreateManualTimetable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: manualSubjectApi.createManualTimetable,
    onSuccess: (data, variables) => {
      toast.success(
        `✅ Schedule created! ${data.schedulesCreated} periods generated for Week 1-12`
      );

      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['student-overview', variables.studentProfileId],
      });
      queryClient.invalidateQueries({
        queryKey: ['individual-timetable', variables.studentProfileId],
      });
      queryClient.invalidateQueries({
        queryKey: ['today-generated-schedule', variables.studentProfileId],
      });
      queryClient.invalidateQueries({
        queryKey: ['week-generated-schedule', variables.studentProfileId],
      });
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to create schedule';
      toast.error(`❌ ${message}`);
    },
  });
}

/**
 * Hook to validate selected subjects
 * Checks min/max constraints and duplicates
 */
export function useSubjectValidation() {
  const MIN_SUBJECTS = 4;
  const MAX_SUBJECTS = 10;

  const validateSelection = (selectedIds: number[]): {
    isValid: boolean;
    error?: string;
  } => {
    if (selectedIds.length < MIN_SUBJECTS) {
      return {
        isValid: false,
        error: `Please select at least ${MIN_SUBJECTS} subjects`,
      };
    }

    if (selectedIds.length > MAX_SUBJECTS) {
      return {
        isValid: false,
        error: `You can select up to ${MAX_SUBJECTS} subjects maximum`,
      };
    }

    // Check for duplicates
    const uniqueIds = new Set(selectedIds);
    if (uniqueIds.size !== selectedIds.length) {
      return {
        isValid: false,
        error: 'Duplicate subjects detected',
      };
    }

    return { isValid: true };
  };

  return {
    MIN_SUBJECTS,
    MAX_SUBJECTS,
    validateSelection,
  };
}