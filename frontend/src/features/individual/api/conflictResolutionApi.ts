// frontend/src/features/individual/api/conflictResolutionApi.ts

import axios from "../../../api/axios";
import {
  ConflictDto,
  ConflictResolutionRequest,
  ConflictResolutionResponse,
} from "../types/conflictTypes";

// ============================================================
// CONFLICT RESOLUTION API
// ============================================================

export const conflictResolutionApi = {
  // ============================================================
  // ADMIN: Query Conflicts
  // ============================================================

  /**
   * Get all schedule conflicts across all timetables
   * GET /api/individual/conflicts
   */
  getAllConflicts: async (): Promise<ConflictDto[]> => {
    const res = await axios.get("/individual/conflicts");
    return res.data;
  },

  /**
   * Get conflicts for a specific timetable
   * GET /api/individual/conflicts/timetable/{timetableId}
   */
  getConflictsForTimetable: async (
    timetableId: number
  ): Promise<ConflictDto[]> => {
    const res = await axios.get(`/individual/conflicts/timetable/${timetableId}`);
    return res.data;
  },

  /**
   * Get conflicts for a specific student
   * GET /api/individual/conflicts/student/{studentProfileId}
   */
  getConflictsForStudent: async (
    studentProfileId: number
  ): Promise<ConflictDto[]> => {
    const res = await axios.get(
      `/individual/conflicts/student/${studentProfileId}`
    );
    return res.data;
  },

  /**
   * Get conflict summary for dashboard
   * GET /api/individual/conflicts/summary
   */
  getConflictSummary: async (): Promise<{
    totalConflicts: number;
    unresolvedConflicts: number;
    resolvedConflicts: number;
    conflictsByType: Record<string, number>;
    conflictsBySeverity: Record<string, number>;
    affectedStudentsCount: number;
    affectedTimetablesCount: number;
  }> => {
    const res = await axios.get("/individual/conflicts/summary");
    return res.data;
  },

  // ============================================================
  // ADMIN: Resolve Conflicts
  // ============================================================

  /**
   * Resolve a single conflict
   * POST /api/individual/conflicts/resolve
   */
  resolveConflict: async (
    request: ConflictResolutionRequest
  ): Promise<ConflictResolutionResponse> => {
    const res = await axios.post("/individual/conflicts/resolve", request);
    return res.data;
  },

  /**
   * Bulk resolve multiple conflicts
   * POST /api/individual/conflicts/bulk-resolve
   */
  bulkResolveConflicts: async (
    requests: ConflictResolutionRequest[]
  ): Promise<Record<number, ConflictResolutionResponse>> => {
    const res = await axios.post("/individual/conflicts/bulk-resolve", requests);
    return res.data;
  },

  // ============================================================
  // CONVENIENCE METHODS
  // ============================================================

  /**
   * Get unresolved conflicts only
   */
  getUnresolvedConflicts: async (): Promise<ConflictDto[]> => {
    const allConflicts = await conflictResolutionApi.getAllConflicts();
    return allConflicts.filter((conflict) => !conflict.isResolved);
  },

  /**
   * Get conflicts by severity
   */
  getConflictsBySeverity: async (
    severity: "HIGH" | "MEDIUM" | "LOW"
  ): Promise<ConflictDto[]> => {
    const allConflicts = await conflictResolutionApi.getAllConflicts();
    return allConflicts.filter((conflict) => conflict.severity === severity);
  },

  /**
   * Get high priority conflicts (unresolved + high severity)
   */
  getHighPriorityConflicts: async (): Promise<ConflictDto[]> => {
    const allConflicts = await conflictResolutionApi.getAllConflicts();
    return allConflicts.filter(
      (conflict) => !conflict.isResolved && conflict.severity === "HIGH"
    );
  },

  /**
   * Get conflicts by type
   */
  getConflictsByType: async (
    conflictType: string
  ): Promise<ConflictDto[]> => {
    const allConflicts = await conflictResolutionApi.getAllConflicts();
    return allConflicts.filter((conflict) => conflict.conflictType === conflictType);
  },

  /**
   * Quick resolve: Keep period 1, delete period 2
   */
  quickResolveKeepFirst: async (
    timetableId: number,
    dayOfWeek: string,
    entryIndex: number,
    resolvedByUserId: number
  ): Promise<ConflictResolutionResponse> => {
    return conflictResolutionApi.resolveConflict({
      timetableId,
      dayOfWeek,
      resolutionAction: "DELETE_PERIOD_2",
      entryIndex,
      resolvedByUserId,
      regenerateSchedules: true,
      notifyStudent: true,
    });
  },

  /**
   * Quick resolve: Keep period 2, delete period 1
   */
  quickResolveKeepSecond: async (
    timetableId: number,
    dayOfWeek: string,
    entryIndex: number,
    resolvedByUserId: number
  ): Promise<ConflictResolutionResponse> => {
    return conflictResolutionApi.resolveConflict({
      timetableId,
      dayOfWeek,
      resolutionAction: "DELETE_PERIOD_1",
      entryIndex,
      resolvedByUserId,
      regenerateSchedules: true,
      notifyStudent: true,
    });
  },

  /**
   * Edit time for a period
   */
  editPeriodTime: async (
    timetableId: number,
    dayOfWeek: string,
    entryIndex: number,
    newStartTime: string,
    newEndTime: string,
    resolvedByUserId: number
  ): Promise<ConflictResolutionResponse> => {
    return conflictResolutionApi.resolveConflict({
      timetableId,
      dayOfWeek,
      resolutionAction: "EDIT_TIME_PERIOD_1",
      entryIndex,
      newStartTime,
      newEndTime,
      resolvedByUserId,
      regenerateSchedules: true,
      notifyStudent: true,
    });
  },

  /**
   * Merge two periods
   */
  mergePeriods: async (
    timetableId: number,
    dayOfWeek: string,
    entryIndex: number,
    secondEntryIndex: number,
    resolvedByUserId: number
  ): Promise<ConflictResolutionResponse> => {
    return conflictResolutionApi.resolveConflict({
      timetableId,
      dayOfWeek,
      resolutionAction: "MERGE_PERIODS",
      entryIndex,
      secondEntryIndex,
      resolvedByUserId,
      regenerateSchedules: true,
      notifyStudent: true,
    });
  },

  /**
   * Split a period
   */
  splitPeriod: async (
    timetableId: number,
    dayOfWeek: string,
    entryIndex: number,
    splitTime: string,
    resolvedByUserId: number
  ): Promise<ConflictResolutionResponse> => {
    return conflictResolutionApi.resolveConflict({
      timetableId,
      dayOfWeek,
      resolutionAction: "SPLIT_PERIOD",
      entryIndex,
      splitTime,
      resolvedByUserId,
      regenerateSchedules: true,
      notifyStudent: true,
    });
  },

  /**
   * Get conflicts for multiple students (batch query)
   */
  getConflictsForMultipleStudents: async (
    studentProfileIds: number[]
  ): Promise<Record<number, ConflictDto[]>> => {
    const results: Record<number, ConflictDto[]> = {};

    await Promise.all(
      studentProfileIds.map(async (studentId) => {
        try {
          const conflicts = await conflictResolutionApi.getConflictsForStudent(
            studentId
          );
          results[studentId] = conflicts;
        } catch (error) {
          console.error(
            `Failed to fetch conflicts for student ${studentId}:`,
            error
          );
          results[studentId] = [];
        }
      })
    );

    return results;
  },

  /**
   * Get conflict statistics for a specific timetable
   */
  getTimetableConflictStats: async (
    timetableId: number
  ): Promise<{
    totalConflicts: number;
    unresolvedConflicts: number;
    conflictsByType: Record<string, number>;
    conflictsBySeverity: Record<string, number>;
  }> => {
    const conflicts = await conflictResolutionApi.getConflictsForTimetable(
      timetableId
    );

    const unresolved = conflicts.filter((c) => !c.isResolved);
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    conflicts.forEach((conflict) => {
      byType[conflict.conflictType] = (byType[conflict.conflictType] || 0) + 1;
      bySeverity[conflict.severity] = (bySeverity[conflict.severity] || 0) + 1;
    });

    return {
      totalConflicts: conflicts.length,
      unresolvedConflicts: unresolved.length,
      conflictsByType: byType,
      conflictsBySeverity: bySeverity,
    };
  },
};