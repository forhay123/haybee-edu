// frontend/src/features/individual/hooks/teacher/usePendingAssignments.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { multiAssessmentApi } from '../../../assessments/api/multiAssessmentApi';
import { weeklyGenerationService } from '@/services/weeklyGenerationService';
import { useGetActiveTerm } from '../../../terms/api/termsApi';
import type { 
  PendingAssignmentDto, 
  ManualAssignmentRequest,
  ManualAssignmentResponse 
} from '../../types/assignmentTypes';

// ============================================================
// QUERY KEYS
// ============================================================

export const pendingAssignmentKeys = {
  all: ['pending-assignments'] as const,
  mySubjects: () => [...pendingAssignmentKeys.all, 'my-subjects'] as const,
  byWeek: (weekNumber: number) => [...pendingAssignmentKeys.all, 'week', weekNumber] as const,
  bySubject: (subjectId: number) => [...pendingAssignmentKeys.all, 'subject', subjectId] as const,
  byStudent: (studentId: number) => [...pendingAssignmentKeys.all, 'student', studentId] as const,
  suggestions: (scheduleId: number) => [...pendingAssignmentKeys.all, 'suggestions', scheduleId] as const,
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * ✅ FIXED: Calculate week number from term start date (not year start)
 */
function calculateWeekNumber(dateString: string, termStartDate: string): number {
  return weeklyGenerationService.calculateWeekNumber(
    new Date(dateString),
    termStartDate
  );
}

/**
 * Calculate days until scheduled date
 */
function calculateDaysUntil(dateString: string): number {
  const scheduled = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  scheduled.setHours(0, 0, 0, 0);
  return Math.ceil((scheduled.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * ✅ FIXED: Enhance assignments with calculated fields using term start date
 */
function enhanceAssignments(
  assignments: PendingAssignmentDto[], 
  termStartDate: string
): PendingAssignmentDto[] {
  return assignments.map(assignment => ({
    ...assignment,
    weekNumber: assignment.weekNumber || calculateWeekNumber(assignment.scheduledDate, termStartDate),
    daysPending: calculateDaysUntil(assignment.scheduledDate),
  }));
}

// ============================================================
// TEACHER HOOKS
// ============================================================

/**
 * ✅ FIXED: Get pending assignments for current teacher's subjects with correct week numbers
 */
export function useMyPendingAssignments() {
  const { data: activeTerm } = useGetActiveTerm();
  const termStartDate = activeTerm?.startDate || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: pendingAssignmentKeys.mySubjects(),
    queryFn: async () => {
      const data = await multiAssessmentApi.getPendingAssignmentsForMySubjects();
      return enhanceAssignments(data, termStartDate);
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
    enabled: !!activeTerm, // Only fetch when we have the term
  });
}

/**
 * Get pending assignments with enhanced summary and grouping
 */
export function useMyPendingAssignmentsWithSummary() {
  const { data: pending = [], isLoading, error, refetch } = useMyPendingAssignments();

  const safeData = Array.isArray(pending) ? pending : [];

  // Group by subject with proper structure
  const bySubject = safeData.reduce((acc, assignment) => {
    const subjectId = assignment.subjectId;
    const subjectName = assignment.subjectName || 'Unknown Subject';
    
    if (!subjectId) return acc;

    if (!acc[subjectId]) {
      acc[subjectId] = {
        subjectId,
        subjectName,
        subjectCode: assignment.subjectCode || '',
        count: 0,
        assignments: [],
      };
    }
    
    acc[subjectId].count++;
    acc[subjectId].assignments.push(assignment);
    
    return acc;
  }, {} as Record<number, {
    subjectId: number;
    subjectName: string;
    subjectCode: string;
    count: number;
    assignments: PendingAssignmentDto[];
  }>);

  // Group by week
  const byWeek = safeData.reduce((acc, assignment) => {
    const week = assignment.weekNumber || 0;
    if (!acc[week]) {
      acc[week] = {
        weekNumber: week,
        count: 0,
        assignments: [],
      };
    }
    acc[week].count++;
    acc[week].assignments.push(assignment);
    return acc;
  }, {} as Record<number, {
    weekNumber: number;
    count: number;
    assignments: PendingAssignmentDto[];
  }>);

  // Group by student
  const byStudent = safeData.reduce((acc, assignment) => {
    const studentId = assignment.studentProfileId;
    const studentName = assignment.studentName || 'Unknown Student';
    
    if (!studentId) return acc;

    if (!acc[studentId]) {
      acc[studentId] = {
        studentId,
        studentName,
        className: assignment.className || 'N/A',
        count: 0,
        assignments: [],
      };
    }
    
    acc[studentId].count++;
    acc[studentId].assignments.push(assignment);
    
    return acc;
  }, {} as Record<number, {
    studentId: number;
    studentName: string;
    className: string;
    count: number;
    assignments: PendingAssignmentDto[];
  }>);

  // Calculate urgent assignments (within 2 days or overdue)
  const urgent = safeData.filter(a => {
    const daysUntil = a.daysPending ?? 0;
    return daysUntil <= 2; // Today, tomorrow, or overdue
  });

  // Calculate assignments with suggestions
  const withSuggestions = safeData.filter(a => 
    a.suggestedTopics && a.suggestedTopics.length > 0
  );

  // Summary statistics
  const summary = {
    total: safeData.length,
    totalPending: safeData.length,
    bySubject: Object.values(bySubject),
    byWeek: Object.values(byWeek),
    byStudent: Object.values(byStudent),
    urgent: urgent,
    urgentCount: urgent.length,
    withSuggestions: withSuggestions,
    withSuggestionsCount: withSuggestions.length,
    hasSuggestions: withSuggestions.length,
    todayCount: safeData.filter(a => {
      const scheduledDate = a.scheduledDate;
      if (!scheduledDate) return false;
      const today = new Date().toISOString().split('T')[0];
      return scheduledDate.split('T')[0] === today;
    }).length,
  };

  return {
    pending: safeData,
    assignments: safeData, // Alias for compatibility
    groupedBySubject: bySubject,
    groupedByWeek: byWeek,
    groupedByStudent: byStudent,
    summary,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Get pending assignments filtered by subject
 */
export function useMyPendingAssignmentsBySubject(subjectId: number | null) {
  const { pending: allPending = [] } = useMyPendingAssignmentsWithSummary();
  
  const safeData = Array.isArray(allPending) ? allPending : [];

  if (!subjectId) {
    return {
      data: safeData,
      count: safeData.length,
    };
  }

  const filtered = safeData.filter(a => a.subjectId === subjectId);
  
  return {
    data: filtered,
    count: filtered.length,
  };
}

/**
 * Get pending assignments filtered by week
 */
export function useMyPendingAssignmentsByWeek(weekNumber: number | null) {
  const { pending: allPending = [] } = useMyPendingAssignmentsWithSummary();
  
  const safeData = Array.isArray(allPending) ? allPending : [];

  if (!weekNumber) {
    return {
      data: safeData,
      count: safeData.length,
    };
  }

  const filtered = safeData.filter(a => a.weekNumber === weekNumber);
  
  return {
    data: filtered,
    count: filtered.length,
  };
}

// ============================================================
// QUERY HOOKS (ADMIN)
// ============================================================

export function useAllPendingAssignments() {
  const { data: activeTerm } = useGetActiveTerm();
  const termStartDate = activeTerm?.startDate || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: pendingAssignmentKeys.all,
    queryFn: async () => {
      const data = await multiAssessmentApi.getAllPendingAssignments();
      return enhanceAssignments(data, termStartDate);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!activeTerm,
  });
}

export function usePendingByWeek(weekNumber: number) {
  return useQuery({
    queryKey: pendingAssignmentKeys.byWeek(weekNumber),
    queryFn: () => multiAssessmentApi.getPendingAssignmentsByWeek(weekNumber),
    enabled: weekNumber > 0,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePendingBySubject(subjectId: number) {
  return useQuery({
    queryKey: pendingAssignmentKeys.bySubject(subjectId),
    queryFn: () => multiAssessmentApi.getPendingAssignmentsBySubject(subjectId),
    enabled: subjectId > 0,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePendingByStudent(studentId: number) {
  return useQuery({
    queryKey: pendingAssignmentKeys.byStudent(studentId),
    queryFn: () => multiAssessmentApi.getPendingAssignmentsForStudent(studentId),
    enabled: studentId > 0,
    staleTime: 1000 * 60 * 2,
  });
}

export function useSuggestedTopics(scheduleId: number | null) {
  return useQuery({
    queryKey: scheduleId ? pendingAssignmentKeys.suggestions(scheduleId) : ['suggestions', 'null'],
    queryFn: () => scheduleId ? multiAssessmentApi.getSuggestedTopics(scheduleId) : Promise.resolve([]),
    enabled: !!scheduleId && scheduleId > 0,
    staleTime: 1000 * 60 * 10,
  });
}

// ============================================================
// MUTATION HOOKS
// ============================================================

export function useAssignTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ManualAssignmentRequest) => 
      multiAssessmentApi.assignTopicToSchedule(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pendingAssignmentKeys.all });
      queryClient.invalidateQueries({ queryKey: ['daily-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['individualSchedule'] });
    },
  });
}

export function useBulkAssignTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ManualAssignmentRequest) => 
      multiAssessmentApi.bulkAssignTopic(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pendingAssignmentKeys.all });
      queryClient.invalidateQueries({ queryKey: ['daily-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['individualSchedule'] });
    },
  });
}

// ============================================================
// UTILITY HOOKS
// ============================================================

export function useMyPendingCountsBySubject() {
  const { summary } = useMyPendingAssignmentsWithSummary();

  return summary.bySubject.reduce((acc, item) => {
    acc[item.subjectId] = item.count;
    return acc;
  }, {} as Record<number, number>);
}

export function useCanAssignSchedule(scheduleId: number | null) {
  const { data: suggestions = [], isLoading } = useSuggestedTopics(scheduleId);

  return {
    canAssign: suggestions.length > 0,
    suggestionsCount: suggestions.length,
    isLoading,
  };
}

export function useUrgentPendingAssignments() {
  const { pending = [] } = useMyPendingAssignmentsWithSummary();
  
  const safeData = Array.isArray(pending) ? pending : [];

  const urgent = safeData.filter(a => {
    const daysUntil = a.daysPending ?? 0;
    return daysUntil <= 2;
  });

  return {
    urgent,
    count: urgent.length,
    hasUrgent: urgent.length > 0,
  };
}

export function useAssignSameTopicToMultiple() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      scheduleIds, 
      lessonTopicId, 
      assignedByUserId,
      notes 
    }: { 
      scheduleIds: number[]; 
      lessonTopicId: number;
      assignedByUserId: number;
      notes?: string;
    }) => 
      multiAssessmentApi.bulkAssignTopic({
        scheduleIds,
        lessonTopicId,
        assignedByUserId,
        assignmentMethod: 'TEACHER_MANUAL',
        notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pendingAssignmentKeys.all });
      queryClient.invalidateQueries({ queryKey: ['daily-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['individualSchedule'] });
    },
  });
}