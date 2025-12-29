// frontend/src/features/assessments/hooks/useAssessmentAutomation.ts

import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminAssessmentAutomationApi } from '../api/adminAssessmentAutomationApi';
import type {
  MissingAssessmentsStats,
  CreateAssessmentResponse,
  CreateAllMissingResponse,
} from '../api/adminAssessmentAutomationApi';

// ============================================================
// QUERY KEYS
// ============================================================

export const assessmentAutomationKeys = {
  all: ['assessment-automation'] as const,
  stats: () => [...assessmentAutomationKeys.all, 'stats'] as const,
};

// ============================================================
// HOOK
// ============================================================

export const useAssessmentAutomation = () => {
  const queryClient = useQueryClient();
  
  // Local state for topic selection
  const [selectedTopics, setSelectedTopics] = useState<Set<number>>(new Set());

  // ============================================================
  // QUERIES
  // ============================================================

  /**
   * Get missing assessments statistics
   */
  const statsQuery = useQuery<MissingAssessmentsStats>({
    queryKey: assessmentAutomationKeys.stats(),
    queryFn: adminAssessmentAutomationApi.getMissingAssessmentsStats,
    staleTime: 60000, // 1 minute
  });

  // ============================================================
  // MUTATIONS
  // ============================================================

  /**
   * Create assessment for a single lesson topic
   */
  const createForLessonMutation = useMutation<
    CreateAssessmentResponse,
    Error,
    number
  >({
    mutationFn: adminAssessmentAutomationApi.createAssessmentForLesson,
    onSuccess: (data) => {
      if (data.success && data.created) {
        toast.success('Assessment created successfully', {
          description: `Created assessment for "${data.assessment?.topicTitle}"`,
        });
      } else {
        toast.info(data.message);
      }
      
      // Invalidate stats to refresh the list
      queryClient.invalidateQueries({
        queryKey: assessmentAutomationKeys.stats(),
      });
    },
    onError: (error) => {
      toast.error('Failed to create assessment', {
        description: error.message,
      });
    },
  });

  /**
   * Create all missing assessments
   */
  const createAllMissingMutation = useMutation<
    CreateAllMissingResponse,
    Error,
    void
  >({
    mutationFn: adminAssessmentAutomationApi.createAllMissingAssessments,
    onSuccess: (data) => {
      if (data.success && data.assessmentsCreated > 0) {
        toast.success('Assessments created successfully', {
          description: `Created ${data.assessmentsCreated} assessment${
            data.assessmentsCreated !== 1 ? 's' : ''
          }`,
        });
      } else if (data.assessmentsCreated === 0) {
        toast.info('No assessments needed', {
          description: 'All topics already have assessments',
        });
      }
      
      // Clear selection after bulk operation
      setSelectedTopics(new Set());
      
      // Invalidate stats to refresh the list
      queryClient.invalidateQueries({
        queryKey: assessmentAutomationKeys.stats(),
      });
    },
    onError: (error) => {
      toast.error('Failed to create assessments', {
        description: error.message,
      });
    },
  });

  /**
   * Bulk create assessments for selected topics
   */
  const bulkCreateMutation = useMutation<
    CreateAllMissingResponse,
    Error,
    number[]
  >({
    mutationFn: adminAssessmentAutomationApi.bulkCreateAssessments,
    onSuccess: (data) => {
      if (data.assessmentsCreated > 0) {
        toast.success('Bulk creation completed', {
          description: `Created ${data.assessmentsCreated} of ${data.totalTopics} assessments`,
        });
      } else {
        toast.warning('No assessments created', {
          description: 'Selected topics may already have assessments',
        });
      }
      
      // Clear selection after bulk operation
      setSelectedTopics(new Set());
      
      // Invalidate stats to refresh the list
      queryClient.invalidateQueries({
        queryKey: assessmentAutomationKeys.stats(),
      });
    },
    onError: (error) => {
      toast.error('Bulk creation failed', {
        description: error.message,
      });
    },
  });

  // ============================================================
  // SELECTION MANAGEMENT
  // ============================================================

  const toggleTopicSelection = useCallback((topicId: number) => {
    setSelectedTopics((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(topicId)) {
        newSet.delete(topicId);
      } else {
        newSet.add(topicId);
      }
      return newSet;
    });
  }, []);

  const selectAllTopics = useCallback(() => {
    if (statsQuery.data?.topics) {
      const allIds = statsQuery.data.topics.map((t) => t.lessonTopicId);
      setSelectedTopics(new Set(allIds));
    }
  }, [statsQuery.data?.topics]);

  const clearSelection = useCallback(() => {
    setSelectedTopics(new Set());
  }, []);

  const isTopicSelected = useCallback(
    (topicId: number) => {
      return selectedTopics.has(topicId);
    },
    [selectedTopics]
  );

  // ============================================================
  // COMPUTED VALUES
  // ============================================================

  const selectedCount = selectedTopics.size;
  const hasSelection = selectedCount > 0;
  const allSelected = 
    statsQuery.data?.topics && 
    selectedTopics.size === statsQuery.data.topics.length &&
    selectedTopics.size > 0;

  // ============================================================
  // ACTION WRAPPERS
  // ============================================================

  const createForTopic = useCallback(
    async (topicId: number): Promise<CreateAssessmentResponse> => {
      return createForLessonMutation.mutateAsync(topicId);
    },
    [createForLessonMutation]
  );

  const createAllMissing = useCallback(
    async (): Promise<CreateAllMissingResponse> => {
      return createAllMissingMutation.mutateAsync();
    },
    [createAllMissingMutation]
  );

  const createForSelected = useCallback(
    async (): Promise<CreateAllMissingResponse> => {
      const topicIds = Array.from(selectedTopics);
      return bulkCreateMutation.mutateAsync(topicIds);
    },
    [bulkCreateMutation, selectedTopics]
  );

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  /**
   * Refresh statistics
   */
  const refetchStats = useCallback(() => {
    return statsQuery.refetch();
  }, [statsQuery]);

  /**
   * Check if any operations are in progress
   */
  const isCreating =
    createForLessonMutation.isPending ||
    createAllMissingMutation.isPending ||
    bulkCreateMutation.isPending;

  // ============================================================
  // RETURN
  // ============================================================

  return {
    // Query data
    missingStats: statsQuery.data,
    isLoadingStats: statsQuery.isLoading,
    isErrorStats: statsQuery.isError,
    statsError: statsQuery.error,

    // Selection state
    selectedTopics,
    selectedCount,
    hasSelection,
    allSelected,

    // Selection actions
    toggleTopicSelection,
    selectAllTopics,
    clearSelection,
    isTopicSelected,

    // Creation actions
    createForTopic,
    createAllMissing,
    createForSelected,

    // Loading states
    isCreating,
    isCreatingSingle: createForLessonMutation.isPending,
    isCreatingAll: createAllMissingMutation.isPending,
    isCreatingBulk: bulkCreateMutation.isPending,

    // Error state
    createError: 
      createForLessonMutation.error || 
      createAllMissingMutation.error || 
      bulkCreateMutation.error,

    // Utilities
    refetchStats,
  };
};