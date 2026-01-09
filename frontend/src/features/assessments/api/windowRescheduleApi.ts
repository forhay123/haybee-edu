// src/features/assessments/api/windowRescheduleApi.ts

import axiosInstance from '../../../api/axios';
import type {
  WindowRescheduleDto,
  WindowRescheduleRequest,
  CancelRescheduleRequest,
  RescheduleFilters
} from '../types/rescheduleTypes';

/**
 * API client for assessment window rescheduling
 * Base URL: /api/v1/assessments/window-reschedules
 */
export const windowRescheduleApi = {
  // ========================================================
  // TEACHER ENDPOINTS
  // ========================================================
  
  /**
   * Reschedule an assessment window (Teacher or Admin)
   * POST /api/v1/assessments/window-reschedules
   * 
   * Requirements:
   * - Must be BEFORE original window starts (anti-cheating)
   * - Teacher must teach the subject
   * - Student must be enrolled
   * - No existing active reschedule
   * - Reason required (min 10 chars)
   * 
   * @param request Reschedule request payload
   * @returns Created reschedule
   */
  rescheduleAssessment: async (
    request: WindowRescheduleRequest
  ): Promise<WindowRescheduleDto> => {
    const response = await axiosInstance.post(
      '/assessments/window-reschedules',
      request
    );
    return response.data;
  },

  /**
   * Get all reschedules created by authenticated teacher
   * GET /api/v1/assessments/window-reschedules/teacher?studentId=X
   * 
   * Optional filters:
   * - studentId: Filter by specific student
   * 
   * @param studentId Optional student ID filter
   * @returns List of reschedules
   */
  getTeacherReschedules: async (
    studentId?: number
  ): Promise<WindowRescheduleDto[]> => {
    const params: any = {};
    if (studentId) params.studentId = studentId;
    
    const response = await axiosInstance.get(
      '/assessments/window-reschedules/teacher',
      { params }
    );
    return response.data;
  },

  /**
   * Cancel a reschedule (Teacher or Admin)
   * DELETE /api/v1/assessments/window-reschedules/{rescheduleId}
   * 
   * Requirements:
   * - Must be BEFORE new window starts
   * - Only teacher who created can cancel
   * 
   * @param rescheduleId ID of reschedule to cancel
   * @param reason Reason for cancellation
   */
  cancelReschedule: async (
    rescheduleId: number,
    reason: string
  ): Promise<void> => {
    await axiosInstance.delete(
      `/assessments/window-reschedules/${rescheduleId}`,
      {
        data: { reason } as CancelRescheduleRequest
      }
    );
  },

  // ========================================================
  // STUDENT ENDPOINTS
  // ========================================================

  /**
   * Get reschedules for authenticated student
   * GET /api/v1/assessments/window-reschedules/my
   * 
   * @returns List of reschedules for current student
   */
  getMyReschedules: async (): Promise<WindowRescheduleDto[]> => {
    const response = await axiosInstance.get(
      '/assessments/window-reschedules/my'
    );
    return response.data;
  },

  // ========================================================
  // ADMIN ENDPOINTS
  // ========================================================

  /**
   * Get all reschedules with filters (Admin only)
   * GET /api/v1/assessments/window-reschedules/admin
   * 
   * @param filters Filter options
   * @returns List of reschedules
   */
  getAdminReschedules: async (
    filters?: RescheduleFilters
  ): Promise<WindowRescheduleDto[]> => {
    const params: any = {};
    if (filters?.studentId) params.studentId = filters.studentId;
    if (filters?.fromDate) params.fromDate = filters.fromDate;
    if (filters?.toDate) params.toDate = filters.toDate;
    if (filters?.status) params.status = filters.status;
    
    const response = await axiosInstance.get(
      '/assessments/window-reschedules/admin',
      { params }
    );
    return response.data;
  },

  // ========================================================
  // UTILITY METHODS
  // ========================================================

  /**
   * Get reschedule by ID (for detail view)
   * Note: Backend doesn't have this endpoint yet
   * Use getTeacherReschedules() and filter client-side
   */
  getRescheduleById: async (
    rescheduleId: number
  ): Promise<WindowRescheduleDto | null> => {
    try {
      // Get all teacher reschedules and find the one we need
      const reschedules = await windowRescheduleApi.getTeacherReschedules();
      return reschedules.find(r => r.id === rescheduleId) || null;
    } catch (error) {
      console.error('Failed to fetch reschedule:', error);
      return null;
    }
  },

  /**
   * Check if lesson has active reschedule
   * @param dailyScheduleId Progress ID / daily schedule ID
   * @returns Reschedule if exists, null otherwise
   */
  getActiveRescheduleForLesson: async (
    dailyScheduleId: number
  ): Promise<WindowRescheduleDto | null> => {
    try {
      const reschedules = await windowRescheduleApi.getTeacherReschedules();
      return reschedules.find(
        r => r.dailyScheduleId === dailyScheduleId && r.isActive && !r.cancelledAt
      ) || null;
    } catch (error) {
      console.error('Failed to check reschedule:', error);
      return null;
    }
  },

  /**
   * Get active reschedules for multiple lessons (batch check)
   * @param dailyScheduleIds Array of progress IDs
   * @returns Map of scheduleId -> reschedule
   */
  getActiveReschedulesForLessons: async (
    dailyScheduleIds: number[]
  ): Promise<Map<number, WindowRescheduleDto>> => {
    try {
      const reschedules = await windowRescheduleApi.getTeacherReschedules();
      const map = new Map<number, WindowRescheduleDto>();
      
      reschedules
        .filter(r => r.isActive && !r.cancelledAt)
        .filter(r => dailyScheduleIds.includes(r.dailyScheduleId))
        .forEach(r => map.set(r.dailyScheduleId, r));
      
      return map;
    } catch (error) {
      console.error('Failed to batch check reschedules:', error);
      return new Map();
    }
  }
};

export default windowRescheduleApi;