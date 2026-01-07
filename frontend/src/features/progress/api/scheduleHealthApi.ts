// frontend/src/features/progress/api/scheduleHealthApi.ts

import axios from '../../../api/axios';

export interface ScheduleHealthDto {
  studentId: number;
  studentName: string;
  email: string;
  classId?: number;
  className?: string;
  studentType: 'SCHOOL' | 'HOME' | 'ASPIRANT' | 'INDIVIDUAL';
  studentTypeDisplay: string;
  weeklySchedulesCount: number;
  dailySchedulesCount: number;
  expectedDailySchedules: number;
  healthStatus: 'HEALTHY' | 'MISSING_DAILY' | 'NO_SCHEDULES' | 'PARTIAL' | 'INDIVIDUAL_STUDENT';
  statusMessage: string;
  missingDays?: string[];
  missingPeriods?: number[];
  canGenerate: boolean;
  canRegenerate: boolean;
  actionRequired?: string;
  lastGeneratedDate?: string;
  currentWeekNumber?: number;
}

export interface HealthSummary {
  total: number;
  healthy: number;
  missingDaily: number;
  noSchedules: number;
  partial: number;
  needsAttention: number;
}

export interface FixResponse {
  status: string;
  message: string;
  schedulesCreated?: number;
  healthStatus?: string;
  studentId?: number;
}

export const scheduleHealthApi = {
  /**
   * Get health status for all CLASS students
   */
  getAllStudentsHealth: async (): Promise<ScheduleHealthDto[]> => {
    const response = await axios.get('/schedule-health/students');
    return response.data;
  },

  /**
   * Get health status for one student
   */
  getStudentHealth: async (studentId: number): Promise<ScheduleHealthDto> => {
    const response = await axios.get(`/schedule-health/students/${studentId}`);
    return response.data;
  },

  /**
   * Fix schedule issues for a student
   */
  fixStudentSchedules: async (studentId: number): Promise<FixResponse> => {
    const response = await axios.post(`/schedule-health/students/${studentId}/fix`);
    return response.data;
  },

  /**
   * Get overall health summary
   */
  getHealthSummary: async (): Promise<HealthSummary> => {
    const response = await axios.get('/schedule-health/summary');
    return response.data;
  },

  /**
   * Fix all students with issues (admin only)
   */
  fixAllStudents: async (): Promise<any> => {
    const response = await axios.post('/schedule-health/fix-all');
    return response.data;
  }
};