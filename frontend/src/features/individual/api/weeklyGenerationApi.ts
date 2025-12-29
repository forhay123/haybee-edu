// frontend/src/features/individual/api/weeklyGenerationApi.ts

import axios from "../../../api/axios";

// ============================================================
// TYPES
// ============================================================

export interface IndividualDailyScheduleDto {
  id: number;
  progressId?: number;
  studentProfileId: number;
  studentName: string;
  timetableId: number;
  subjectId: number;
  subjectName: string;
  subjectCode?: string;
  lessonTopicId?: number;
  lessonTopicTitle?: string;
  scheduledDate: string;
  dayOfWeek: string;
  periodNumber: number;
  startTime?: string;
  endTime?: string;
  weekNumber: number;
  academicYear: string;
  termName?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'INCOMPLETE' | 'MISSED' | 'AVAILABLE' | 'PENDING';
  completed: boolean;
  completedAt?: string;
  
  markedIncompleteAt?: string;
  notes?: string;
  createdAt: string;
  scheduleSource?: string;
  individualTimetableId?: number;
  
  // ✅ Assessment window timing fields
  assessmentWindowStart?: string;  // ISO datetime string
  assessmentWindowEnd?: string;    // ISO datetime string
  gracePeriodEnd?: string;         // ISO datetime string
  
  // ✅ NEW FIELDS - To distinguish COMPLETED from MISSED
  assessmentSubmissionId?: number;  // If null, no submission exists
  incompleteReason?: string;        // 'MISSED_GRACE_PERIOD' or 'Assessment window expired'
  assessmentScore?: number;         // Score as number (from BigDecimal in backend)
  
  // ✅ Separate access controls
  lessonContentAccessible?: boolean;
  assessmentAccessible?: boolean;
}

export interface WeeklyScheduleResponse {
  weekNumber: number;
  startDate: string;
  endDate: string;
  schedules: IndividualDailyScheduleDto[];
  totalScheduled: number;
  message: string;
}

export interface DateRangeSchedulesResponse {
  startDate: string;
  endDate: string;
  schedules: IndividualDailyScheduleDto[];
  groupedByDate: Record<string, IndividualDailyScheduleDto[]>;
  totalSchedules: number;
}

// ============================================================
// WEEKLY GENERATION API
// ============================================================

export const weeklyGenerationApi = {
  /**
   * Get daily schedule for a specific date
   * GET /api/daily-schedules/individual/student/{studentProfileId}?date={date}
   */
  getScheduleByDate: async (
    studentProfileId: number,
    date: string
  ): Promise<IndividualDailyScheduleDto[]> => {
    const res = await axios.get(
      `/daily-schedules/individual/student/${studentProfileId}`,
      {
        params: { date },
      }
    );
    return res.data;
  },

  /**
   * Get schedules for a date range
   * GET /api/daily-schedules/individual/student/{studentProfileId}/range
   */
  getScheduleByDateRange: async (
    studentProfileId: number,
    startDate: string,
    endDate: string
  ): Promise<IndividualDailyScheduleDto[]> => {
    const res = await axios.get(
      `/daily-schedules/individual/student/${studentProfileId}/range`,
      {
        params: { startDate, endDate },
      }
    );
    return res.data;
  },

  /**
   * Get schedules for a date range with grouping
   * Convenience method that groups schedules by date
   */
  getScheduleByDateRangeGrouped: async (
    studentProfileId: number,
    startDate: string,
    endDate: string
  ): Promise<DateRangeSchedulesResponse> => {
    const schedules = await weeklyGenerationApi.getScheduleByDateRange(
      studentProfileId,
      startDate,
      endDate
    );

    // Group by date
    const groupedByDate: Record<string, IndividualDailyScheduleDto[]> = {};
    schedules.forEach((schedule) => {
      const date = schedule.scheduledDate;
      if (!groupedByDate[date]) {
        groupedByDate[date] = [];
      }
      groupedByDate[date].push(schedule);
    });

    // Sort each day's schedules by period number
    Object.keys(groupedByDate).forEach((date) => {
      groupedByDate[date].sort((a, b) => a.periodNumber - b.periodNumber);
    });

    return {
      startDate,
      endDate,
      schedules,
      groupedByDate,
      totalSchedules: schedules.length,
    };
  },

  /**
   * Get schedules for a specific week
   * Convenience method that calculates week dates
   */
  getScheduleByWeek: async (
    studentProfileId: number,
    weekNumber: number,
    termStartDate: string
  ): Promise<WeeklyScheduleResponse> => {
    // Calculate week start and end dates
    const termStart = new Date(termStartDate);
    const weekStart = new Date(termStart);
    weekStart.setDate(termStart.getDate() + (weekNumber - 1) * 7);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startDate = weekStart.toISOString().split('T')[0];
    const endDate = weekEnd.toISOString().split('T')[0];

    const schedules = await weeklyGenerationApi.getScheduleByDateRange(
      studentProfileId,
      startDate,
      endDate
    );

    return {
      weekNumber,
      startDate,
      endDate,
      schedules,
      totalScheduled: schedules.length,
      message: `Week ${weekNumber} schedule retrieved successfully`,
    };
  },

  /**
   * Mark a schedule as completed
   * PUT /api/daily-schedules/individual/{scheduleId}/complete
   */
  markScheduleComplete: async (scheduleId: number): Promise<void> => {
    await axios.put(`/daily-schedules/individual/${scheduleId}/complete`);
  },

  /**
   * Mark a schedule as incomplete
   * PUT /api/daily-schedules/individual/{scheduleId}/incomplete
   */
  markScheduleIncomplete: async (scheduleId: number): Promise<void> => {
    await axios.put(`/daily-schedules/individual/${scheduleId}/incomplete`);
  },

  /**
   * Bulk mark schedules as completed
   */
  bulkMarkComplete: async (scheduleIds: number[]): Promise<void> => {
    await Promise.all(
      scheduleIds.map((id) => weeklyGenerationApi.markScheduleComplete(id))
    );
  },

  /**
   * Bulk mark schedules as incomplete
   */
  bulkMarkIncomplete: async (scheduleIds: number[]): Promise<void> => {
    await Promise.all(
      scheduleIds.map((id) => weeklyGenerationApi.markScheduleIncomplete(id))
    );
  },

  /**
   * Get today's schedule
   * Convenience method for current date
   */
  getTodaySchedule: async (
    studentProfileId: number
  ): Promise<IndividualDailyScheduleDto[]> => {
    const today = new Date().toISOString().split('T')[0];
    return weeklyGenerationApi.getScheduleByDate(studentProfileId, today);
  },

  /**
   * Get current week schedule
   * Convenience method for current week
   */
  getCurrentWeekSchedule: async (
    studentProfileId: number,
    termStartDate: string
  ): Promise<WeeklyScheduleResponse> => {
    // Calculate current week number
    const today = new Date();
    const termStart = new Date(termStartDate);
    const daysDiff = Math.floor(
      (today.getTime() - termStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    const currentWeek = Math.floor(daysDiff / 7) + 1;

    return weeklyGenerationApi.getScheduleByWeek(
      studentProfileId,
      currentWeek,
      termStartDate
    );
  },

  /**
   * Get schedules for the next N days
   */
  getUpcomingSchedules: async (
    studentProfileId: number,
    days: number = 7
  ): Promise<IndividualDailyScheduleDto[]> => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + days);

    const startDateStr = today.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    return weeklyGenerationApi.getScheduleByDateRange(
      studentProfileId,
      startDateStr,
      endDateStr
    );
  },

  /**
   * Get pending schedules (not completed yet)
   */
  getPendingSchedules: async (
    studentProfileId: number,
    startDate: string,
    endDate: string
  ): Promise<IndividualDailyScheduleDto[]> => {
    const schedules = await weeklyGenerationApi.getScheduleByDateRange(
      studentProfileId,
      startDate,
      endDate
    );

    return schedules.filter(
      (schedule) =>
        schedule.status === 'SCHEDULED' || 
        schedule.status === 'INCOMPLETE' ||
        schedule.status === 'PENDING' ||
        schedule.status === 'AVAILABLE'
    );
  },

  /**
   * Get completed schedules
   */
  getCompletedSchedules: async (
    studentProfileId: number,
    startDate: string,
    endDate: string
  ): Promise<IndividualDailyScheduleDto[]> => {
    const schedules = await weeklyGenerationApi.getScheduleByDateRange(
      studentProfileId,
      startDate,
      endDate
    );

    return schedules.filter((schedule) => schedule.status === 'COMPLETED');
  },

  /**
   * Get schedule statistics for a date range
   */
  getScheduleStats: async (
    studentProfileId: number,
    startDate: string,
    endDate: string
  ): Promise<{
    total: number;
    completed: number;
    incomplete: number;
    missed: number;
    scheduled: number;
    completionRate: number;
  }> => {
    const schedules = await weeklyGenerationApi.getScheduleByDateRange(
      studentProfileId,
      startDate,
      endDate
    );

    const total = schedules.length;
    const completed = schedules.filter((s) => s.status === 'COMPLETED').length;
    const incomplete = schedules.filter((s) => s.status === 'INCOMPLETE').length;
    const missed = schedules.filter((s) => s.status === 'MISSED').length;
    const scheduled = schedules.filter((s) => s.status === 'SCHEDULED').length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      total,
      completed,
      incomplete,
      missed,
      scheduled,
      completionRate,
    };
  },
};