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
  // ✅ NEW: Assessment sync tracking
  schedulesWithoutAssessment?: number;
  schedulesWithoutTimeWindow?: number;
  schedulesWithoutProgress?: number
  healthStatus: 'HEALTHY' | 'MISSING_DAILY' | 'NO_SCHEDULES' | 'PARTIAL' | 'NEEDS_SYNC' | 'INDIVIDUAL_STUDENT';
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
  needsSync: number;
  needsAttention: number;
}

export interface FixResponse {
  status: string;
  message: string;
  schedulesProcessed?: number;
  healthStatus?: string;
  studentId?: number;
}

export const scheduleHealthApi = {
  getAllStudentsHealth: async (): Promise<ScheduleHealthDto[]> => {
    const response = await axios.get('/schedule-health/students');
    return response.data;
  },

  getStudentHealth: async (studentId: number): Promise<ScheduleHealthDto> => {
    const response = await axios.get(`/schedule-health/students/${studentId}`);
    return response.data;
  },

  fixStudentSchedules: async (studentId: number, forceRegenerate: boolean = false): Promise<FixResponse> => {
    const response = await axios.post(
      `/schedule-health/students/${studentId}/fix`,
      null,
      { params: { forceRegenerate } }
    );
    return response.data;
  },

  getHealthSummary: async (): Promise<HealthSummary> => {
    const response = await axios.get('/schedule-health/summary');
    return response.data;
  },

  fixAllStudents: async (forceRegenerate: boolean = false): Promise<any> => {
    const response = await axios.post(
      '/schedule-health/fix-all',
      null,
      { params: { forceRegenerate } }
    );
    return response.data;
  }
};