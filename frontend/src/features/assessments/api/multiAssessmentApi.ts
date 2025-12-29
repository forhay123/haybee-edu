// frontend/src/features/assessments/api/multiAssessmentApi.ts

import axios from "../../../api/axios";
// ✅ Import types from the centralized assignmentTypes.ts
import type {
  PendingAssignmentDto,
  SuggestedTopicDto,
  ManualAssignmentRequest,
  ManualAssignmentResponse,
  PendingAssignmentsSummary,
} from "../../individual/types/assignmentTypes";

// ============================================================
// RE-EXPORT TYPES (for backward compatibility)
// ============================================================

export type {
  PendingAssignmentDto,
  SuggestedTopicDto,
  ManualAssignmentRequest,
  ManualAssignmentResponse,
  PendingAssignmentsSummary,
};

// ============================================================
// MULTI-ASSESSMENT API
// ============================================================

export const multiAssessmentApi = {
  // ============================================================
  // MANUAL ASSIGNMENT (ADMIN + TEACHER)
  // ============================================================

  /**
   * Assign lesson topic to a single schedule
   * POST /api/v1/individual/lesson-assignment/assign
   */
  assignTopicToSchedule: async (
    request: ManualAssignmentRequest
  ): Promise<ManualAssignmentResponse> => {
    const res = await axios.post('/individual/lesson-assignment/assign', request);
    return res.data;
  },

  /**
   * Bulk assign lesson topic to multiple schedules
   * POST /api/v1/individual/lesson-assignment/bulk-assign
   */
  bulkAssignTopic: async (
    request: ManualAssignmentRequest
  ): Promise<ManualAssignmentResponse> => {
    const res = await axios.post(
      '/individual/lesson-assignment/bulk-assign',
      request
    );
    return res.data;
  },

  // ============================================================
  // QUERY PENDING ASSIGNMENTS
  // ============================================================

  /**
   * Get all pending assignments (ADMIN only)
   * GET /api/v1/individual/lesson-assignment/pending
   */
  getAllPendingAssignments: async (): Promise<PendingAssignmentDto[]> => {
    const res = await axios.get('/individual/lesson-assignment/pending');
    return res.data;
  },

  /**
   * Get pending assignments for a specific week
   * GET /api/v1/individual/lesson-assignment/pending/week/{weekNumber}
   */
  getPendingAssignmentsByWeek: async (
    weekNumber: number
  ): Promise<PendingAssignmentDto[]> => {
    const res = await axios.get(
      `/individual/lesson-assignment/pending/week/${weekNumber}`
    );
    return res.data;
  },

  /**
   * Get pending assignments for a specific subject
   * GET /api/v1/individual/lesson-assignment/pending/subject/{subjectId}
   */
  getPendingAssignmentsBySubject: async (
    subjectId: number
  ): Promise<PendingAssignmentDto[]> => {
    const res = await axios.get(
      `/individual/lesson-assignment/pending/subject/${subjectId}`
    );
    return res.data;
  },

  /**
   * Get pending assignments for a specific student
   * GET /api/v1/individual/lesson-assignment/pending/student/{studentProfileId}
   */
  getPendingAssignmentsForStudent: async (
    studentProfileId: number
  ): Promise<PendingAssignmentDto[]> => {
    const res = await axios.get(
      `/individual/lesson-assignment/pending/student/${studentProfileId}`
    );
    return res.data;
  },

  /**
   * ✅ FIXED: Renamed to match hook usage
   * Get pending assignments for current teacher (filtered by their subjects)
   * GET /api/v1/individual/lesson-assignment/pending/my-subjects
   */
  getPendingAssignmentsForMySubjects: async (): Promise<PendingAssignmentDto[]> => {
    const res = await axios.get(
      '/individual/lesson-assignment/pending/my-subjects'
    );
    return res.data;
  },

  // ============================================================
  // GET SUGGESTED TOPICS
  // ============================================================

  /**
   * Get suggested lesson topics for a schedule
   * GET /api/v1/individual/lesson-assignment/suggestions/{scheduleId}
   */
  getSuggestedTopics: async (
    scheduleId: number
  ): Promise<SuggestedTopicDto[]> => {
    const res = await axios.get(
      `/individual/lesson-assignment/suggestions/${scheduleId}`
    );
    return res.data;
  },

  // ============================================================
  // CONVENIENCE METHODS
  // ============================================================

  /**
   * Quick assign using top suggested topic
   */
  quickAssignTopSuggestion: async (
    scheduleId: number,
    assignedByUserId: number
  ): Promise<ManualAssignmentResponse> => {
    const suggestions = await multiAssessmentApi.getSuggestedTopics(scheduleId);
    
    if (suggestions.length === 0) {
      throw new Error('No suggested topics available');
    }

    const topSuggestion = suggestions[0];
    
    return multiAssessmentApi.assignTopicToSchedule({
      scheduleId,
      lessonTopicId: topSuggestion.topicId,
      assignedByUserId,
      assignmentMethod: 'QUICK_ASSIGN',
      notes: `Auto-assigned: ${topSuggestion.topicTitle}`,
    });
  },

  /**
   * Bulk assign using top suggestions for multiple schedules
   */
  bulkQuickAssign: async (
    scheduleIds: number[],
    assignedByUserId: number
  ): Promise<ManualAssignmentResponse[]> => {
    const results = await Promise.all(
      scheduleIds.map((scheduleId) =>
        multiAssessmentApi.quickAssignTopSuggestion(scheduleId, assignedByUserId)
      )
    );
    
    return results;
  },

  /**
   * Get pending assignments summary
   */
  getPendingAssignmentsSummary: async (): Promise<PendingAssignmentsSummary> => {
    const pending = await multiAssessmentApi.getAllPendingAssignments();

    const bySubject: Record<string, number> = {};
    const byWeek: Record<number, number> = {};
    const byStudent: Record<string, number> = {};

    let urgentCount = 0;
    let withSuggestionsCount = 0;

    pending.forEach((assignment) => {
      // By subject
      bySubject[assignment.subjectName] =
        (bySubject[assignment.subjectName] || 0) + 1;

      // By week (calculate from date if weekNumber not available)
      const date = new Date(assignment.scheduledDate);
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const weekNumber = Math.ceil(
        ((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
      );
      byWeek[weekNumber] = (byWeek[weekNumber] || 0) + 1;

      // By student
      byStudent[assignment.studentName] =
        (byStudent[assignment.studentName] || 0) + 1;

      // Count urgent (daysPending <= 2)
      if (assignment.daysPending <= 2) {
        urgentCount++;
      }

      // Count with suggestions (if property exists)
      if (assignment.suggestedTopics && assignment.suggestedTopics.length > 0) {
        withSuggestionsCount++;
      }
    });

    return {
      totalPending: pending.length,
      bySubject,
      byWeek,
      byStudent,
      urgentCount,
      withSuggestionsCount,
    };
  },

  /**
   * Assign same topic to multiple schedules (for batch teaching same topic)
   */
  assignSameTopicToMultipleSchedules: async (
    scheduleIds: number[],
    lessonTopicId: number,
    assignedByUserId: number,
    notes?: string
  ): Promise<ManualAssignmentResponse> => {
    return multiAssessmentApi.bulkAssignTopic({
      scheduleIds,
      lessonTopicId,
      assignedByUserId,
      assignmentMethod: 'TEACHER_MANUAL',
      notes,
    });
  },

  /**
   * Get pending assignments for a date range
   */
  getPendingAssignmentsByDateRange: async (
    startDate: string,
    endDate: string
  ): Promise<PendingAssignmentDto[]> => {
    const allPending = await multiAssessmentApi.getAllPendingAssignments();
    
    return allPending.filter((assignment) => {
      const scheduleDate = new Date(assignment.scheduledDate);
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      return scheduleDate >= start && scheduleDate <= end;
    });
  },

  /**
   * Get pending assignments for today
   */
  getPendingAssignmentsForToday: async (): Promise<PendingAssignmentDto[]> => {
    const today = new Date().toISOString().split('T')[0];
    return multiAssessmentApi.getPendingAssignmentsByDateRange(today, today);
  },

  /**
   * Get pending assignments for current week
   */
  getPendingAssignmentsForCurrentWeek: async (
    termStartDate: string
  ): Promise<PendingAssignmentDto[]> => {
    const today = new Date();
    const termStart = new Date(termStartDate);
    const daysDiff = Math.floor(
      (today.getTime() - termStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    const currentWeek = Math.floor(daysDiff / 7) + 1;

    return multiAssessmentApi.getPendingAssignmentsByWeek(currentWeek);
  },
};