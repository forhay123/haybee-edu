// frontend/src/features/individual/types/holidayTypes.ts

/**
 * Types for public holiday management and rescheduling
 * Maps to backend DTOs: PublicHolidayDto, ReschedulingInfoDto, HolidayStatisticsDto
 */

// ============================================================
// PUBLIC HOLIDAY DTO
// ============================================================

export interface PublicHolidayDto {
  id?: number;

  // Holiday details
  holidayDate: string;
  holidayName: string;
  isSchoolClosed: boolean;

  // Audit fields
  createdByUserId?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================
// RESCHEDULING INFO DTO
// ============================================================

export interface ReschedulingInfoDto {
  // Saturday date
  saturdayDate?: string;

  // Holiday details
  holiday?: PublicHolidayDto;

  // Rescheduling status
  reschedulingRequired: boolean;

  // Suggested alternate day
  suggestedAlternateDay?: string;

  // Rescheduling strategy
  reschedulingStrategy?: string;

  // Week number
  weekNumber: number;
}

// ============================================================
// HOLIDAY STATISTICS DTO
// ============================================================

export interface SaturdayHolidayInfo {
  holidayId: number;
  date: string;
  name: string;
  weekNumber?: number;
  rescheduled?: boolean;
}

export interface HolidayStatisticsDto {
  // Date range for statistics
  startDate: string;
  endDate: string;

  // Total number of holidays in range
  totalHolidays: number;

  // Number of Saturday holidays
  saturdayHolidays: number;

  // Number of weekday holidays
  weekdayHolidays: number;

  // Is rescheduling required?
  reschedulingRequired: boolean;

  // Number of weeks affected
  affectedWeeks: number;

  // List of Saturday holidays with details
  saturdayHolidaysList?: SaturdayHolidayInfo[];
}

// ============================================================
// BULK OPERATION RESULT DTO
// ============================================================

export interface BulkOperationResultDto {
  successCount: number;
  failedCount: number;
  failedIds?: number[];
  message: string;
}

// ============================================================
// UI HELPER TYPES
// ============================================================

export interface HolidayFormData {
  holidayDate: string;
  holidayName: string;
  isSchoolClosed: boolean;
}

export interface HolidayCalendarEvent {
  id: number;
  title: string;
  date: string;
  isSchoolClosed: boolean;
  isSaturday: boolean;
  needsRescheduling: boolean;
}

export interface MonthlyHolidayGroup {
  month: string;
  year: number;
  holidays: PublicHolidayDto[];
  saturdayCount: number;
  weekdayCount: number;
}

export interface YearlyHolidayGroup {
  year: number;
  holidays: PublicHolidayDto[];
  totalCount: number;
  saturdayCount: number;
  weekdayCount: number;
  monthlyBreakdown: MonthlyHolidayGroup[];
}

export interface ReschedulingImpact {
  affectedWeeks: number[];
  totalSchedulesAffected: number;
  studentsAffected: number;
  alternativeDates: string[];
  reschedulingStrategy: string;
}

export interface HolidayCheckResult {
  date: string;
  isHoliday: boolean;
  holiday: PublicHolidayDto | null;
}

// ============================================================
// CONSTANTS
// ============================================================

export const RESCHEDULING_STRATEGIES = {
  USE_FRIDAY: "USE_FRIDAY",
  USE_MONDAY: "USE_MONDAY",
  SKIP_WEEK: "SKIP_WEEK",
  DOUBLE_LESSON: "DOUBLE_LESSON",
} as const;

export type ReschedulingStrategy =
  (typeof RESCHEDULING_STRATEGIES)[keyof typeof RESCHEDULING_STRATEGIES];

export const RESCHEDULING_STRATEGY_LABELS: Record<
  ReschedulingStrategy,
  string
> = {
  USE_FRIDAY: "Reschedule to Friday",
  USE_MONDAY: "Reschedule to Monday",
  SKIP_WEEK: "Skip Week",
  DOUBLE_LESSON: "Double Lesson on Another Day",
};

// ============================================================
// COMMON NIGERIAN HOLIDAYS (for quick reference)
// ============================================================

export const COMMON_NIGERIAN_HOLIDAYS = [
  { name: "New Year's Day", month: 1, day: 1 },
  { name: "Good Friday", month: null, day: null, movable: true },
  { name: "Easter Monday", month: null, day: null, movable: true },
  { name: "Workers' Day", month: 5, day: 1 },
  { name: "Democracy Day", month: 6, day: 12 },
  { name: "Eid al-Fitr", month: null, day: null, movable: true },
  { name: "Eid al-Adha", month: null, day: null, movable: true },
  { name: "Independence Day", month: 10, day: 1 },
  { name: "Christmas Day", month: 12, day: 25 },
  { name: "Boxing Day", month: 12, day: 26 },
];

// ============================================================
// VALIDATION HELPERS
// ============================================================

export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};

export const isSaturday = (date: Date): boolean => {
  return date.getDay() === 6;
};

export const isWeekday = (date: Date): boolean => {
  const day = date.getDay();
  return day >= 1 && day <= 5; // Monday to Friday
};

export const formatHolidayDate = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const getDayOfWeek = (date: string): string => {
  const d = new Date(date);
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[d.getDay()];
};