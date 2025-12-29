/**
 * Hook to fetch detailed analysis of a submission
 * Used in custom assessment builder to identify weak areas
 */

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getPreviousSubmissionAnalysis } from '../api/customAssessmentsApi';
import type { SubmissionAnalysis } from '../types/customAssessmentTypes';

interface UseSubmissionAnalysisOptions {
  submissionId?: number;
  enabled?: boolean;
}

export const useSubmissionAnalysis = (options: UseSubmissionAnalysisOptions) => {
  const { submissionId, enabled = true } = options;

  const { data: analysis, isLoading, error, refetch } = useQuery({
    queryKey: ['submissionAnalysis', submissionId],
    queryFn: () => getPreviousSubmissionAnalysis(submissionId!),
    enabled: enabled && !!submissionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get weak topics (topics with <60% success rate)
  const weakTopics = useCallback(() => {
    if (!analysis) return [];
    return analysis.topicPerformance
      .filter((t) => t.isWeakArea)
      .sort((a, b) => a.successRate - b.successRate);
  }, [analysis]);

  // Get strong topics (topics with >80% success rate)
  const strongTopics = useCallback(() => {
    if (!analysis) return [];
    return analysis.topicPerformance
      .filter((t) => t.successRate >= 80)
      .sort((a, b) => b.successRate - a.successRate);
  }, [analysis]);

  // Get incorrect questions
  const incorrectQuestions = useCallback(() => {
    if (!analysis) return [];
    return analysis.questionBreakdown.filter((q) => !q.isCorrect);
  }, [analysis]);

  // Get questions by topic
  const questionsByTopic = useCallback((topicName: string) => {
    if (!analysis) return [];
    return analysis.questionBreakdown.filter((q) => q.topic === topicName);
  }, [analysis]);

  // Get recommended focus areas sorted by priority
  const recommendedFocusAreas = useCallback(() => {
    if (!analysis) return [];
    return [...analysis.recommendedFocusAreas].sort((a, b) => a.priority - b.priority);
  }, [analysis]);

  // Check if needs remedial work
  const needsRemedialWork = analysis?.scorePercentage !== undefined && analysis.scorePercentage < 60;

  // Check if performance is excellent
  const isExcellentPerformance =
    analysis?.scorePercentage !== undefined && analysis.scorePercentage >= 90;

  return {
    // Full analysis
    analysis,
    
    // Breakdown
    weakTopics: weakTopics(),
    strongTopics: strongTopics(),
    incorrectQuestions: incorrectQuestions(),
    recommendedFocusAreas: recommendedFocusAreas(),
    
    // Query helpers
    questionsByTopic,
    
    // Flags
    needsRemedialWork,
    isExcellentPerformance,
    
    // Metrics
    scorePercentage: analysis?.scorePercentage,
    totalQuestions: analysis?.totalQuestions,
    correctCount: analysis?.correctCount,
    incorrectCount: analysis?.incorrectCount,
    
    // Actions
    refetch,
    
    // Status
    isLoading,
    error,
  };
};

export default useSubmissionAnalysis;
