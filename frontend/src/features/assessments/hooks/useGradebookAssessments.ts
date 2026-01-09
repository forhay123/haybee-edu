// src/features/assessments/hooks/useGradebookAssessments.ts

import { useQuery } from '@tanstack/react-query';
import { assessmentsApi } from '../api/assessmentsApi';
import type { GradebookAssessmentDto } from '../types/gradebookTypes';
import { GradebookAccessStatus } from '../types/gradebookTypes';

// Query keys
export const gradebookKeys = {
  all: ['gradebook-assessments'] as const,
  list: () => [...gradebookKeys.all, 'list'] as const,
  byStatus: (status: GradebookAccessStatus) => 
    [...gradebookKeys.all, 'by-status', status] as const,
  byType: (type: string) => 
    [...gradebookKeys.all, 'by-type', type] as const,
};

/**
 * Hook to fetch gradebook assessments for current student
 * Returns QUIZ, CLASSWORK, TEST1, TEST2, ASSIGNMENT, EXAM
 */
export const useGradebookAssessments = () => {
  return useQuery({
    queryKey: gradebookKeys.list(),
    queryFn: () => assessmentsApi.getGradebookAssessments(),
    staleTime: 60000, // 1 minute
    gcTime: 300000,   // 5 minutes
  });
};

/**
 * Hook to filter gradebook assessments by status
 */
export const useGradebookByStatus = (status?: GradebookAccessStatus) => {
  const { data: all = [], ...rest } = useGradebookAssessments();
  
  const filtered = status 
    ? all.filter(a => a.accessStatus === status)
    : all;
  
  return {
    data: filtered,
    ...rest
  };
};

/**
 * Hook to get gradebook stats
 */
export const useGradebookStats = () => {
  const { data: assessments = [], isLoading } = useGradebookAssessments();
  
  const stats = {
    total: assessments.length,
    open: assessments.filter(a => a.accessStatus === GradebookAccessStatus.OPEN).length,
    dueSoon: assessments.filter(a => a.accessStatus === GradebookAccessStatus.DUE_SOON).length,
    overdue: assessments.filter(a => a.accessStatus === GradebookAccessStatus.OVERDUE).length,
    completed: assessments.filter(a => a.accessStatus === GradebookAccessStatus.COMPLETED).length,
    pending: 0,
  };
  
  stats.pending = stats.total - stats.completed;
  
  return {
    stats,
    isLoading
  };
};

/**
 * Hook to get urgent assessments (due soon or overdue)
 */
export const useUrgentGradebookAssessments = () => {
  const { data: all = [], ...rest } = useGradebookAssessments();
  
  const urgent = all.filter(a => 
    a.accessStatus === GradebookAccessStatus.DUE_SOON ||
    a.accessStatus === GradebookAccessStatus.OVERDUE
  );
  
  // Sort by due date (soonest first)
  urgent.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
  
  return {
    data: urgent,
    count: urgent.length,
    ...rest
  };
};