// frontend/src/features/individual/api/publicHolidaysApi.ts

import axios from "../../../api/axios";
import {
  PublicHolidayDto,
  ReschedulingInfoDto,
  HolidayStatisticsDto,
  BulkOperationResultDto,
} from "../types/holidayTypes";

// ============================================================
// PUBLIC HOLIDAYS API
// ============================================================

export const publicHolidaysApi = {
  // ============================================================
  // HOLIDAY CRUD OPERATIONS (ADMIN ONLY)
  // ============================================================

  /**
   * Get all public holidays
   * GET /api/individual/public-holidays
   */
  getAllHolidays: async (): Promise<PublicHolidayDto[]> => {
    const res = await axios.get("/individual/public-holidays");
    return res.data;
  },

  /**
   * Get holiday by ID
   * GET /api/individual/public-holidays/{holidayId}
   */
  getHolidayById: async (holidayId: number): Promise<PublicHolidayDto> => {
    const res = await axios.get(`/individual/public-holidays/${holidayId}`);
    return res.data;
  },

  /**
   * Create a new public holiday
   * POST /api/individual/public-holidays
   */
  createHoliday: async (
    holiday: Omit<PublicHolidayDto, "id" | "createdByUserId" | "createdAt" | "updatedAt">
  ): Promise<PublicHolidayDto> => {
    const res = await axios.post("/individual/public-holidays", holiday);
    return res.data;
  },

  /**
   * Update an existing holiday
   * PUT /api/individual/public-holidays/{holidayId}
   */
  updateHoliday: async (
    holidayId: number,
    holiday: Omit<PublicHolidayDto, "id" | "createdByUserId" | "createdAt" | "updatedAt">
  ): Promise<PublicHolidayDto> => {
    const res = await axios.put(
      `/individual/public-holidays/${holidayId}`,
      holiday
    );
    return res.data;
  },

  /**
   * Delete a holiday
   * DELETE /api/individual/public-holidays/{holidayId}
   */
  deleteHoliday: async (holidayId: number): Promise<void> => {
    await axios.delete(`/individual/public-holidays/${holidayId}`);
  },

  // ============================================================
  // HOLIDAY QUERIES
  // ============================================================

  /**
   * Get upcoming holidays
   * GET /api/individual/public-holidays/upcoming
   */
  getUpcomingHolidays: async (): Promise<PublicHolidayDto[]> => {
    const res = await axios.get("/individual/public-holidays/upcoming");
    return res.data;
  },

  /**
   * Get holidays for a specific year
   * GET /api/individual/public-holidays/year/{year}
   */
  getHolidaysForYear: async (year: number): Promise<PublicHolidayDto[]> => {
    const res = await axios.get(`/individual/public-holidays/year/${year}`);
    return res.data;
  },

  /**
   * Get holidays in a date range
   * GET /api/individual/public-holidays/range
   */
  getHolidaysInRange: async (
    startDate: string,
    endDate: string
  ): Promise<PublicHolidayDto[]> => {
    const res = await axios.get("/individual/public-holidays/range", {
      params: { startDate, endDate },
    });
    return res.data;
  },

  /**
   * Check if a specific date is a holiday
   * GET /api/individual/public-holidays/check-date
   */
  checkDate: async (
    date: string
  ): Promise<{
    date: string;
    isHoliday: boolean;
    holiday: PublicHolidayDto | null;
  }> => {
    const res = await axios.get("/individual/public-holidays/check-date", {
      params: { date },
    });
    return res.data;
  },

  // ============================================================
  // RESCHEDULING OPERATIONS
  // ============================================================

  /**
   * Check if rescheduling is needed for a specific week
   * GET /api/individual/public-holidays/rescheduling/check-week/{weekNumber}
   */
  checkReschedulingForWeek: async (
    weekNumber: number
  ): Promise<ReschedulingInfoDto> => {
    const res = await axios.get(
      `/individual/public-holidays/rescheduling/check-week/${weekNumber}`
    );
    return res.data;
  },

  /**
   * Get rescheduling statistics for a date range
   * GET /api/individual/public-holidays/rescheduling/statistics
   */
  getReschedulingStatistics: async (
    startDate: string,
    endDate: string
  ): Promise<HolidayStatisticsDto> => {
    const res = await axios.get(
      "/individual/public-holidays/rescheduling/statistics",
      {
        params: { startDate, endDate },
      }
    );
    return res.data;
  },

  /**
   * Get overview of all Saturday holidays in current term
   * GET /api/individual/public-holidays/rescheduling/term-overview
   */
  getTermReschedulingOverview: async (): Promise<HolidayStatisticsDto> => {
    const res = await axios.get(
      "/individual/public-holidays/rescheduling/term-overview"
    );
    return res.data;
  },

  // ============================================================
  // BULK OPERATIONS
  // ============================================================

  /**
   * Create multiple holidays at once
   * POST /api/individual/public-holidays/bulk-create
   */
  bulkCreateHolidays: async (
    holidays: Omit<PublicHolidayDto, "id" | "createdByUserId" | "createdAt" | "updatedAt">[]
  ): Promise<BulkOperationResultDto> => {
    const res = await axios.post(
      "/individual/public-holidays/bulk-create",
      holidays
    );
    return res.data;
  },

  // ============================================================
  // CONVENIENCE METHODS
  // ============================================================

  /**
   * Get holidays for current year
   */
  getHolidaysForCurrentYear: async (): Promise<PublicHolidayDto[]> => {
    const currentYear = new Date().getFullYear();
    return publicHolidaysApi.getHolidaysForYear(currentYear);
  },

  /**
   * Get holidays for next year
   */
  getHolidaysForNextYear: async (): Promise<PublicHolidayDto[]> => {
    const nextYear = new Date().getFullYear() + 1;
    return publicHolidaysApi.getHolidaysForYear(nextYear);
  },

  /**
   * Check if today is a holiday
   */
  checkToday: async (): Promise<{
    date: string;
    isHoliday: boolean;
    holiday: PublicHolidayDto | null;
  }> => {
    const today = new Date().toISOString().split("T")[0];
    return publicHolidaysApi.checkDate(today);
  },

  /**
   * Get holidays for current month
   */
  getHolidaysForCurrentMonth: async (): Promise<PublicHolidayDto[]> => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const startDate = firstDay.toISOString().split("T")[0];
    const endDate = lastDay.toISOString().split("T")[0];

    return publicHolidaysApi.getHolidaysInRange(startDate, endDate);
  },

  /**
   * Get holidays for next N days
   */
  getUpcomingHolidaysForDays: async (
    days: number
  ): Promise<PublicHolidayDto[]> => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + days);

    const startDateStr = today.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    return publicHolidaysApi.getHolidaysInRange(startDateStr, endDateStr);
  },

  /**
   * Get Saturday holidays only
   */
  getSaturdayHolidays: async (
    startDate: string,
    endDate: string
  ): Promise<PublicHolidayDto[]> => {
    const holidays = await publicHolidaysApi.getHolidaysInRange(
      startDate,
      endDate
    );

    return holidays.filter((holiday) => {
      const date = new Date(holiday.holidayDate);
      return date.getDay() === 6; // Saturday
    });
  },

  /**
   * Get weekday holidays only
   */
  getWeekdayHolidays: async (
    startDate: string,
    endDate: string
  ): Promise<PublicHolidayDto[]> => {
    const holidays = await publicHolidaysApi.getHolidaysInRange(
      startDate,
      endDate
    );

    return holidays.filter((holiday) => {
      const date = new Date(holiday.holidayDate);
      const day = date.getDay();
      return day >= 1 && day <= 5; // Monday to Friday
    });
  },

  /**
   * Get school closure holidays only
   */
  getSchoolClosureHolidays: async (
    startDate: string,
    endDate: string
  ): Promise<PublicHolidayDto[]> => {
    const holidays = await publicHolidaysApi.getHolidaysInRange(
      startDate,
      endDate
    );

    return holidays.filter((holiday) => holiday.isSchoolClosed);
  },

  /**
   * Create a holiday with default values
   */
  createSimpleHoliday: async (
    holidayDate: string,
    holidayName: string,
    isSchoolClosed: boolean = true
  ): Promise<PublicHolidayDto> => {
    return publicHolidaysApi.createHoliday({
      holidayDate,
      holidayName,
      isSchoolClosed,
    });
  },

  /**
   * Batch check multiple dates
   */
  checkMultipleDates: async (
    dates: string[]
  ): Promise<
    Record<
      string,
      { date: string; isHoliday: boolean; holiday: PublicHolidayDto | null }
    >
  > => {
    const results: Record<
      string,
      { date: string; isHoliday: boolean; holiday: PublicHolidayDto | null }
    > = {};

    await Promise.all(
      dates.map(async (date) => {
        try {
          const result = await publicHolidaysApi.checkDate(date);
          results[date] = result;
        } catch (error) {
          console.error(`Failed to check date ${date}:`, error);
          results[date] = { date, isHoliday: false, holiday: null };
        }
      })
    );

    return results;
  },

  /**
   * Get rescheduling info for multiple weeks
   */
  checkReschedulingForMultipleWeeks: async (
    weekNumbers: number[]
  ): Promise<Record<number, ReschedulingInfoDto>> => {
    const results: Record<number, ReschedulingInfoDto> = {};

    await Promise.all(
      weekNumbers.map(async (weekNumber) => {
        try {
          const info = await publicHolidaysApi.checkReschedulingForWeek(
            weekNumber
          );
          results[weekNumber] = info;
        } catch (error) {
          console.error(
            `Failed to check rescheduling for week ${weekNumber}:`,
            error
          );
        }
      })
    );

    return results;
  },
};