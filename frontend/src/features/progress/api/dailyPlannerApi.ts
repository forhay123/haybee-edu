// ============================================================
// FILE 2: dailyPlannerApi.ts (COMPLETE WITH assessmentId)
// Location: frontend/src/features/progress/api/dailyPlannerApi.ts
// ============================================================

import axiosInstance from '../../../api/axios';

/**
 * ✅ UPDATED: Added assessmentId
 */
export interface LessonProgressDto {
  id: number;
  lessonId: number;
  lessonTitle: string;
  subjectId: number;
  subjectName: string;
  topicName: string;
  scheduledDate: string; // yyyy-MM-dd
  periodNumber: number;
  completed: boolean;
  completedAt?: string; // ISO datetime
  priority?: number; // 1-4
  weight?: number; // Weight multiplier
  assessmentId?: number; // ✅ ADDED: ID of associated assessment
}

export interface DailyProgressDto {
  date: string; // yyyy-MM-dd
  lessons: LessonProgressDto[];
}

export interface ProgressUpdateRequest {
  lessonId: number; // lessonTopic ID
  scheduledDate: string; // yyyy-MM-dd
  periodNumber: number;
}

export const dailyPlannerApi = {
  /**
   * Get authenticated student's daily progress
   */
  getMyDailyProgress: async (date?: string): Promise<DailyProgressDto> => {
    const params: any = {};
    if (date) params.date = date;
    const response = await axiosInstance.get('/progress/daily/me', { params });
    return response.data;
  },

  /**
   * Admin: Get any student's daily progress
   */
  getDailyProgress: async (studentProfileId: number, date?: string): Promise<DailyProgressDto> => {
    const params: any = { studentProfileId };
    if (date) params.date = date;
    const response = await axiosInstance.get('/progress/daily', { params });
    return response.data;
  },

  /**
   * Mark lesson as complete
   */
  markComplete: async (request: ProgressUpdateRequest): Promise<LessonProgressDto> => {
    const response = await axiosInstance.post('/progress/complete', request);
    return response.data;
  },

  /**
   * Get authenticated student's progress history
   */
  getMyHistory: async (from: string, to: string): Promise<LessonProgressDto[]> => {
    const response = await axiosInstance.get('/progress/history/me', { 
      params: { from, to } 
    });
    return response.data;
  },

  /**
   * Admin: Get any student's progress history
   */
  getHistory: async (
    studentProfileId: number, 
    from: string, 
    to: string
  ): Promise<LessonProgressDto[]> => {
    const response = await axiosInstance.get('/progress/history', { 
      params: { studentProfileId, from, to } 
    });
    return response.data;
  },
};

export default dailyPlannerApi;

