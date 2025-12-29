// frontend/src/features/individual/api/archiveApi.ts

import axios from "../../../api/axios";

// ============================================================
// TYPES
// ============================================================

export interface ArchiveResponse {
  success: boolean;
  message: string;
  archivedAt?: string;
  archivedBy?: string;
}

export interface UnarchiveResponse {
  success: boolean;
  message: string;
  unarchivedAt?: string;
}

export interface ArchivedItem {
  id: number;
  type: 'TIMETABLE' | 'SCHEME';
  studentProfileId: number;
  studentName: string;
  uploadedAt: string;
  archivedAt: string;
  archivedBy: string;
  reason?: string;
  academicYear?: string;
  termName?: string;
}

export interface ArchiveListResponse {
  items: ArchivedItem[];
  totalCount: number;
}

// ============================================================
// ARCHIVE API
// ============================================================

export const archiveApi = {
  /**
   * Archive a timetable
   * POST /api/individual/timetable/{id}/archive
   */
  archiveTimetable: async (
    timetableId: number,
    reason?: string
  ): Promise<ArchiveResponse> => {
    const res = await axios.post(
      `/individual/timetable/${timetableId}/archive`,
      { reason }
    );
    return res.data;
  },

  /**
   * Unarchive a timetable
   * POST /api/individual/timetable/{id}/unarchive
   */
  unarchiveTimetable: async (timetableId: number): Promise<UnarchiveResponse> => {
    const res = await axios.post(
      `/individual/timetable/${timetableId}/unarchive`
    );
    return res.data;
  },

  /**
   * Archive a scheme
   * POST /api/individual/scheme/{id}/archive
   */
  archiveScheme: async (
    schemeId: number,
    reason?: string
  ): Promise<ArchiveResponse> => {
    const res = await axios.post(
      `/individual/scheme/${schemeId}/archive`,
      { reason }
    );
    return res.data;
  },

  /**
   * Unarchive a scheme
   * POST /api/individual/scheme/{id}/unarchive
   */
  unarchiveScheme: async (schemeId: number): Promise<UnarchiveResponse> => {
    const res = await axios.post(
      `/individual/scheme/${schemeId}/unarchive`
    );
    return res.data;
  },

  /**
   * Get all archived timetables for a student
   * GET /api/individual/timetable/student/{studentProfileId}/archived
   */
  getArchivedTimetables: async (
    studentProfileId: number
  ): Promise<ArchivedItem[]> => {
    const res = await axios.get(
      `/individual/timetable/student/${studentProfileId}/archived`
    );
    return res.data;
  },

  /**
   * Get all archived schemes for a student
   * GET /api/individual/scheme/student/{studentProfileId}/archived
   */
  getArchivedSchemes: async (
    studentProfileId: number
  ): Promise<ArchivedItem[]> => {
    const res = await axios.get(
      `/individual/scheme/student/${studentProfileId}/archived`
    );
    return res.data;
  },

  /**
   * Get all archived items (timetables + schemes) for a student
   */
  getAllArchivedItems: async (
    studentProfileId: number
  ): Promise<ArchiveListResponse> => {
    const [timetables, schemes] = await Promise.all([
      archiveApi.getArchivedTimetables(studentProfileId),
      archiveApi.getArchivedSchemes(studentProfileId),
    ]);

    const items = [...timetables, ...schemes].sort(
      (a, b) =>
        new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime()
    );

    return {
      items,
      totalCount: items.length,
    };
  },

  /**
   * Bulk archive timetables (Admin only)
   * POST /api/individual/timetable/admin/bulk-archive
   */
  bulkArchiveTimetables: async (
    timetableIds: number[],
    reason?: string
  ): Promise<ArchiveResponse> => {
    const res = await axios.post(
      '/individual/timetable/admin/bulk-archive',
      { timetableIds, reason }
    );
    return res.data;
  },

  /**
   * Bulk archive schemes (Admin only)
   * POST /api/individual/scheme/admin/bulk-archive
   */
  bulkArchiveSchemes: async (
    schemeIds: number[],
    reason?: string
  ): Promise<ArchiveResponse> => {
    const res = await axios.post(
      '/individual/scheme/admin/bulk-archive',
      { schemeIds, reason }
    );
    return res.data;
  },

  /**
   * Get archive statistics (Admin only)
   * GET /api/individual/timetable/admin/archive-stats
   */
  getArchiveStats: async (): Promise<{
    totalArchivedTimetables: number;
    totalArchivedSchemes: number;
    archivedThisWeek: number;
    archivedThisMonth: number;
  }> => {
    const res = await axios.get('/individual/timetable/admin/archive-stats');
    return res.data;
  },
};