// ============================================================
// FILE: scheduleValidationApi.ts (MERGED + COMPLETE)
// Location: frontend/src/features/assessments/api/scheduleValidationApi.ts
// ============================================================

import axiosInstance from '../../../api/axios';
import type { 
  ValidationResult, 
  AccessCheckResult, 
  IncompleteLessonsReport,
  GradingStats
} from '../types/assessmentTypes';

const API_BASE = '/weekly-schedules';
const ASSESSMENTS_BASE = '/assessments';
const STUDENTS_BASE = '/students';

export const scheduleValidationApi = {
  // ============================================================
  //  WEEKLY SCHEDULE VALIDATION
  // ============================================================

  validateScheduleCreation: async (scheduleData: {
    classId: number;
    subjectId: number;
    lessonTopicId?: number;
    weekNumber: number;
    dayOfWeek: string;
    periodNumber: number;
  }): Promise<ValidationResult> => {
    const response = await axiosInstance.post<ValidationResult>(
      `${API_BASE}/validate`,
      scheduleData
    );
    return response.data;
  },

  // ============================================================
  //  ASSESSMENT ACCESS CHECKS
  // ============================================================

  /** Single check */
  checkAssessmentAccess: async (
    assessmentId: number,
    studentProfileId: number
  ): Promise<AccessCheckResult> => {
    const response = await axiosInstance.get<AccessCheckResult>(
      `${ASSESSMENTS_BASE}/${assessmentId}/access-check`,
      { params: { studentProfileId } }
    );
    return response.data;
  },

  /** Batch check */
  checkMultipleAccess: async (
    assessmentIds: number[],
    studentProfileId: number
  ): Promise<Record<number, AccessCheckResult>> => {
    try {
      const response = await axiosInstance.post<Record<number, AccessCheckResult>>(
        `${ASSESSMENTS_BASE}/batch-access-check`,
        assessmentIds,
        { params: { studentProfileId } }
      );
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        console.log('Batch endpoint not available — falling back to single requests.');
        
        const results = await Promise.all(
          assessmentIds.map(id =>
            scheduleValidationApi.checkAssessmentAccess(id, studentProfileId)
              .then(res => ({ id, res }))
              .catch(() => ({
                id,
                res: {
                  canAccess: false,
                  statusCode: 'BLOCKED',
                  reason: 'Error checking access'
                } as AccessCheckResult
              }))
          )
        );

        return results.reduce((map, { id, res }) => {
          map[id] = res;
          return map;
        }, {} as Record<number, AccessCheckResult>);
      }
      throw error;
    }
  },

  /** Retry wrapper */
  checkAccessWithRetry: async (
    assessmentId: number,
    studentProfileId: number,
    maxRetries = 3
  ): Promise<AccessCheckResult> => {
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await scheduleValidationApi.checkAssessmentAccess(
          assessmentId,
          studentProfileId
        );
      } catch (err) {
        lastError = err;
        console.warn(`Access check attempt ${attempt + 1} failed:`, err);

        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, Math.min(1000 * 2 ** attempt, 5000)));
        }
      }
    }

    console.error('All access check attempts failed:', lastError);
    throw lastError;
  },

  // ============================================================
  //  STUDENT DATA
  // ============================================================

  getIncompleteLessons: async (
    studentId: number,
    fromDate?: string,
    toDate?: string
  ): Promise<IncompleteLessonsReport> => {
    const response = await axiosInstance.get<IncompleteLessonsReport>(
      `${STUDENTS_BASE}/${studentId}/incomplete-lessons`,
      { 
        params: {
          ...(fromDate && { fromDate }),
          ...(toDate && { toDate })
        }
      }
    );
    return response.data;
  },

  // ============================================================
  //  TEACHER STATISTICS
  // ============================================================

  getGradingStats: async (): Promise<GradingStats> => {
    const response = await axiosInstance.get<GradingStats>(
      `${ASSESSMENTS_BASE}/grading-stats`
    );
    return response.data;
  }
};

// Export all shared types
export type { ValidationResult, AccessCheckResult, IncompleteLessonsReport, GradingStats };
