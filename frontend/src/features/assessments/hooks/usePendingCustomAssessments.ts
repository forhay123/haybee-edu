/**
 * Hook for managing pending custom assessments
 * Used by teachers to see which students need custom assessments created
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPendingCustomAssessments,
  countPendingCustomAssessments,
  getPendingAssessmentsBySubject,
  getUrgentPendingAssessments,
} from '../api/customAssessmentsApi';
import type {
  PendingAssessment,
  PendingAssessmentFilters,
  PendingAssessmentSortOptions,
} from '../types/customAssessmentTypes';

interface UsePendingCustomAssessmentsOptions {
  teacherId?: number;
  subjectId?: number;
  enabled?: boolean;
  refetchInterval?: number;
}

export const usePendingCustomAssessments = (
  options: UsePendingCustomAssessmentsOptions = {}
) => {
  const { teacherId, subjectId, enabled = true, refetchInterval } = options;
  const queryClient = useQueryClient();

  // Local state for filters and sorting
  const [filters, setFilters] = useState<PendingAssessmentFilters>({
    subjectId,
  });
  const [sortOptions, setSortOptions] = useState<PendingAssessmentSortOptions>({
    field: 'scheduledDate',
    direction: 'asc',
  });

  // ============================================================
  // QUERIES
  // ============================================================

  // Fetch all pending assessments
  const {
    data: pendingAssessments = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['pendingCustomAssessments', teacherId, filters],
    queryFn: async () => {
      if (filters.subjectId) {
        return getPendingAssessmentsBySubject(teacherId!, filters.subjectId);
      }
      return getPendingCustomAssessments(teacherId);
    },
    enabled: enabled && !!teacherId,
    refetchInterval,
  });

  // Count pending assessments
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['pendingCustomAssessmentsCount', teacherId],
    queryFn: () => countPendingCustomAssessments(teacherId),
    enabled: enabled && !!teacherId,
    refetchInterval,
  });

  // Fetch urgent pending assessments (due within 3 days)
  const { data: urgentAssessments = [] } = useQuery({
    queryKey: ['urgentPendingAssessments', teacherId],
    queryFn: () => getUrgentPendingAssessments(teacherId!, 3),
    enabled: enabled && !!teacherId,
    refetchInterval: refetchInterval || 60000, // Default 1 minute for urgent items
  });

  // ============================================================
  // FILTERING AND SORTING
  // ============================================================

  // Apply filters
  const filteredAssessments = useCallback(() => {
    let filtered = [...pendingAssessments];

    // Filter by urgency level
    if (filters.urgencyLevel) {
      filtered = filtered.filter((a) => a.urgencyLevel === filters.urgencyLevel);
    }

    // Filter by period number
    if (filters.periodNumber) {
      filtered = filtered.filter((a) => a.periodNumber === filters.periodNumber);
    }

    // Filter by days ahead
    if (filters.daysAhead) {
      filtered = filtered.filter((a) => a.daysUntilScheduled <= filters.daysAhead!);
    }

    return filtered;
  }, [pendingAssessments, filters]);

  // Apply sorting
  const sortedAssessments = useCallback(() => {
    const sorted = [...filteredAssessments()];

    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortOptions.field) {
        case 'scheduledDate':
          aValue = new Date(a.scheduledDate).getTime();
          bValue = new Date(b.scheduledDate).getTime();
          break;
        case 'studentName':
          aValue = a.studentName.toLowerCase();
          bValue = b.studentName.toLowerCase();
          break;
        case 'urgencyLevel':
          const urgencyOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
          aValue = urgencyOrder[a.urgencyLevel];
          bValue = urgencyOrder[b.urgencyLevel];
          break;
        case 'periodNumber':
          aValue = a.periodNumber;
          bValue = b.periodNumber;
          break;
        default:
          return 0;
      }

      if (sortOptions.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return sorted;
  }, [filteredAssessments, sortOptions]);

  // ============================================================
  // DERIVED DATA
  // ============================================================

  // Group assessments by urgency
  const assessmentsByUrgency = useCallback(() => {
    const assessments = sortedAssessments();
    return {
      critical: assessments.filter((a) => a.urgencyLevel === 'CRITICAL'),
      high: assessments.filter((a) => a.urgencyLevel === 'HIGH'),
      medium: assessments.filter((a) => a.urgencyLevel === 'MEDIUM'),
      low: assessments.filter((a) => a.urgencyLevel === 'LOW'),
    };
  }, [sortedAssessments]);

  // Group assessments by subject
  const assessmentsBySubject = useCallback(() => {
    const assessments = sortedAssessments();
    return assessments.reduce((acc, assessment) => {
      const subjectName = assessment.subjectName;
      if (!acc[subjectName]) {
        acc[subjectName] = [];
      }
      acc[subjectName].push(assessment);
      return acc;
    }, {} as Record<string, PendingAssessment[]>);
  }, [sortedAssessments]);

  // Group assessments by student
  const assessmentsByStudent = useCallback(() => {
    const assessments = sortedAssessments();
    return assessments.reduce((acc, assessment) => {
      const studentName = assessment.studentName;
      if (!acc[studentName]) {
        acc[studentName] = [];
      }
      acc[studentName].push(assessment);
      return acc;
    }, {} as Record<string, PendingAssessment[]>);
  }, [sortedAssessments]);

  // Statistics
  const statistics = useCallback(() => {
    const assessments = sortedAssessments();
    return {
      total: assessments.length,
      critical: assessments.filter((a) => a.urgencyLevel === 'CRITICAL').length,
      high: assessments.filter((a) => a.urgencyLevel === 'HIGH').length,
      medium: assessments.filter((a) => a.urgencyLevel === 'MEDIUM').length,
      low: assessments.filter((a) => a.urgencyLevel === 'LOW').length,
      period2: assessments.filter((a) => a.periodNumber === 2).length,
      period3: assessments.filter((a) => a.periodNumber === 3).length,
      ready: assessments.filter((a) => a.canCreateNow).length,
      blocked: assessments.filter((a) => !a.canCreateNow).length,
    };
  }, [sortedAssessments]);

  // ============================================================
  // ACTIONS
  // ============================================================

  const updateFilters = useCallback((newFilters: Partial<PendingAssessmentFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const updateSortOptions = useCallback((newOptions: Partial<PendingAssessmentSortOptions>) => {
    setSortOptions((prev) => ({ ...prev, ...newOptions }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ subjectId });
  }, [subjectId]);

  const refreshPendingAssessments = useCallback(async () => {
    await refetch();
    await queryClient.invalidateQueries({ queryKey: ['pendingCustomAssessmentsCount'] });
  }, [refetch, queryClient]);

  // ============================================================
  // RETURN
  // ============================================================

  return {
    // Data
    pendingAssessments: sortedAssessments(),
    pendingCount,
    urgentAssessments,
    
    // Grouped data
    assessmentsByUrgency: assessmentsByUrgency(),
    assessmentsBySubject: assessmentsBySubject(),
    assessmentsByStudent: assessmentsByStudent(),
    
    // Statistics
    statistics: statistics(),
    
    // Filters and sorting
    filters,
    sortOptions,
    updateFilters,
    updateSortOptions,
    clearFilters,
    
    // Actions
    refetch: refreshPendingAssessments,
    
    // Status
    isLoading,
    error,
  };
};

export default usePendingCustomAssessments;