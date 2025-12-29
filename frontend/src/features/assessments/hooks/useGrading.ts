// src/features/assessments/hooks/useGrading.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gradingApi, type GradeAnswerRequest, type GradeSubmissionRequest } from '../api/gradingApi';

export const gradingKeys = {
  all: ['grading'] as const,
  stats: () => [...gradingKeys.all, 'stats'] as const, // ✅ NEW
  pendingAll: () => [...gradingKeys.all, 'pending'] as const,
  pendingByAssessment: (assessmentId: number) => 
    [...gradingKeys.all, 'pending', assessmentId] as const,
  submission: (submissionId: number) => 
    [...gradingKeys.all, 'submission', submissionId] as const
};

// ✅ NEW: Get grading statistics for teacher dashboard
export const useGradingStats = () => {
  return useQuery({
    queryKey: gradingKeys.stats(),
    queryFn: () => gradingApi.getGradingStats(),
    refetchInterval: 30000 // ✅ Refresh every 30 seconds
  });
};

// Get all pending submissions
export const usePendingSubmissions = () => {
  return useQuery({
    queryKey: gradingKeys.pendingAll(),
    queryFn: () => gradingApi.getPendingSubmissions()
  });
};

// Get pending submissions for specific assessment
export const usePendingSubmissionsByAssessment = (assessmentId: number) => {
  return useQuery({
    queryKey: gradingKeys.pendingByAssessment(assessmentId),
    queryFn: () => gradingApi.getPendingSubmissionsByAssessment(assessmentId),
    enabled: !!assessmentId
  });
};

// Get submission for grading
export const useSubmissionForGrading = (submissionId: number) => {
  return useQuery({
    queryKey: gradingKeys.submission(submissionId),
    queryFn: () => gradingApi.getSubmissionForGrading(submissionId),
    enabled: !!submissionId
  });
};

// Grade single answer
export const useGradeAnswer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: GradeAnswerRequest) => gradingApi.gradeAnswer(request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: gradingKeys.all });
      queryClient.invalidateQueries({ queryKey: ['notifications'] }); // ✅ Refresh notifications
    }
  });
};

// Grade entire submission
export const useGradeSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: GradeSubmissionRequest) => 
      gradingApi.gradeSubmission(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gradingKeys.all });
      queryClient.invalidateQueries({ queryKey: ['assessment-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] }); // ✅ Refresh notifications
    }
  });
};