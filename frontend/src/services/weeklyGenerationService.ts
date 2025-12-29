// frontend/src/services/weeklyGenerationService.ts
// ✅ UPDATED: Fixed timezone handling for assessment windows

import { weeklyGenerationApi } from '../features/individual/api/weeklyGenerationApi';
import type { 
  IndividualDailyScheduleDto, 
  WeeklyScheduleResponse,
  DateRangeSchedulesResponse 
} from '../features/individual/api/weeklyGenerationApi';

// ============================================================
// ✅ TIMEZONE UTILITY
// ============================================================
/**
 * Converts UTC timestamp string from database to proper Date object
 * Backend stores times in UTC without 'Z' suffix.
 * JavaScript's Date constructor treats strings without timezone info as LOCAL time.
 * This function ensures they're interpreted as UTC.
 */
const parseUTCTimestamp = (timestamp: string | null | undefined): Date => {
  if (!timestamp) {
    throw new Error('Invalid timestamp: timestamp is null or undefined');
  }
  
  // If already has timezone indicator, use as-is
  if (timestamp.endsWith('Z') || timestamp.includes('+') || timestamp.includes('-', 10)) {
    return new Date(timestamp);
  }
  
  // Replace space with 'T' (ISO format) and add 'Z' to indicate UTC
  return new Date(timestamp.replace(' ', 'T') + 'Z');
};

// ============================================================
// ✅ STATUS CALCULATION (PHASE 6) - WITH TIMEZONE FIX
// ============================================================

export type CalculatedStatus = 'COMPLETED' | 'AVAILABLE' | 'PENDING' | 'MISSED' | 'UPCOMING';

/**
 * ✅ Calculate the actual status of a schedule based on current time and assessment windows
 * NOW WITH PROPER UTC TIMEZONE HANDLING, COMPLETION CHECK, AND MISSED vs COMPLETED DISTINCTION
 */
export function calculateScheduleStatus(
  schedule: IndividualDailyScheduleDto
): CalculatedStatus {
  
  // ✅ PRIORITY 1: Check incompleteReason FIRST (most reliable indicator of MISSED)
  if (schedule.incompleteReason && 
      (schedule.incompleteReason === 'MISSED_GRACE_PERIOD' || 
       schedule.incompleteReason === 'Assessment window expired')) {
    return 'MISSED';
  }

  // ✅ PRIORITY 2: Check if truly COMPLETED (has submission)
  if (schedule.completedAt && schedule.assessmentSubmissionId) {
    return 'COMPLETED';
  }

  // ✅ PRIORITY 3: If completed but NO submission = MISSED
  if (schedule.completedAt && !schedule.assessmentSubmissionId) {
    return 'MISSED';
  }

  // ✅ PRIORITY 4: Check backend status field (after backend calculates it properly)
  if (schedule.status === 'COMPLETED') {
    return 'COMPLETED';
  }

  if (schedule.status === 'MISSED' || schedule.status === 'INCOMPLETE') {
    return 'MISSED';
  }

  const now = new Date();
  const scheduleDate = new Date(schedule.scheduledDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ✅ PRIMARY LOGIC: Use assessment window times if available (with UTC parsing)
  if (schedule.assessmentWindowStart && schedule.assessmentWindowEnd) {
    const windowStart = parseUTCTimestamp(schedule.assessmentWindowStart);
    const windowEnd = parseUTCTimestamp(schedule.gracePeriodEnd || schedule.assessmentWindowEnd);

    // Assessment window has passed - MISSED
    if (now > windowEnd) {
      return 'MISSED';
    }

    // Assessment window is currently open - AVAILABLE
    if (now >= windowStart && now <= windowEnd) {
      return 'AVAILABLE';
    }

    // Assessment window hasn't started yet - PENDING
    if (now < windowStart) {
      return 'PENDING';
    }
  }

  // ✅ FALLBACK LOGIC: If no assessment window times (shouldn't happen after PHASE 6)
  // If schedule date is in the past and not completed
  if (scheduleDate < today) {
    return 'MISSED';
  }

  // If schedule date is today
  if (scheduleDate.getTime() === today.getTime()) {
    // Check if the period time has passed (basic check)
    if (schedule.endTime) {
      const [hours, minutes] = schedule.endTime.split(':').map(Number);
      const endTime = new Date();
      endTime.setHours(hours, minutes, 0, 0);
      
      // Add 2-hour grace period
      const graceEnd = new Date(endTime);
      graceEnd.setHours(graceEnd.getHours() + 2);

      if (now > graceEnd) {
        return 'MISSED';
      }
      
      // Within grace period or period is active
      if (now >= endTime && now <= graceEnd) {
        return 'AVAILABLE';
      }

      // Period hasn't started yet but check pre-window (30 mins before)
      if (schedule.startTime) {
        const [startHours, startMinutes] = schedule.startTime.split(':').map(Number);
        const startTime = new Date();
        startTime.setHours(startHours, startMinutes, 0, 0);
        
        const preWindow = new Date(startTime);
        preWindow.setMinutes(preWindow.getMinutes() - 30);

        if (now >= preWindow) {
          return 'AVAILABLE';
        }
      }

      return 'PENDING';
    }
    return 'AVAILABLE';
  }

  // Future schedule
  return 'UPCOMING';
}

/**
 * ✅ Get status badge display information
 */
export function getStatusBadgeInfo(
  status: CalculatedStatus
): {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
} {
  switch (status) {
    case 'COMPLETED':
      return {
        label: 'Completed',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
        icon: '✓',
      };
    case 'AVAILABLE':
      return {
        label: 'Available Now',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
        icon: '▶',
      };
    case 'MISSED':
      return {
        label: 'Missed',
        color: 'text-red-700',
        bgColor: 'bg-red-100',
        icon: '✗',
      };
    case 'PENDING':
      return {
        label: 'Upcoming',
        color: 'text-amber-700',
        bgColor: 'bg-amber-100',
        icon: '○',
      };
    case 'UPCOMING':
      return {
        label: 'Scheduled',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
        icon: '◐',
      };
    default:
      return {
        label: 'Unknown',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
        icon: '?',
      };
  }
}

/**
 * ✅ Get time remaining until assessment window closes (with UTC parsing)
 */
export function getTimeRemaining(
  schedule: IndividualDailyScheduleDto
): {
  isActive: boolean;
  hoursRemaining: number;
  minutesRemaining: number;
  totalMinutes: number;
  isUrgent: boolean;
} {
  if (!schedule.assessmentWindowEnd) {
    return {
      isActive: false,
      hoursRemaining: 0,
      minutesRemaining: 0,
      totalMinutes: 0,
      isUrgent: false,
    };
  }

  const now = new Date();
  const windowEnd = parseUTCTimestamp(schedule.gracePeriodEnd || schedule.assessmentWindowEnd);
  const diff = windowEnd.getTime() - now.getTime();

  if (diff <= 0) {
    return {
      isActive: false,
      hoursRemaining: 0,
      minutesRemaining: 0,
      totalMinutes: 0,
      isUrgent: false,
    };
  }

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const hoursRemaining = Math.floor(totalMinutes / 60);
  const minutesRemaining = totalMinutes % 60;

  return {
    isActive: true,
    hoursRemaining,
    minutesRemaining,
    totalMinutes,
    isUrgent: totalMinutes <= 60, // Less than 1 hour remaining
  };
}

/**
 * ✅ Format time remaining as human-readable string
 */
export function formatTimeRemaining(
  schedule: IndividualDailyScheduleDto
): string {
  const { isActive, hoursRemaining, minutesRemaining, totalMinutes } = 
    getTimeRemaining(schedule);

  if (!isActive) {
    return 'Window closed';
  }

  if (totalMinutes < 60) {
    return `${totalMinutes} min left`;
  }

  if (minutesRemaining === 0) {
    return `${hoursRemaining} hr${hoursRemaining !== 1 ? 's' : ''} left`;
  }

  return `${hoursRemaining}h ${minutesRemaining}m left`;
}

// ============================================================
// EXISTING: WEEK CALCULATION UTILITIES
// ============================================================

export interface WeekInfo {
  weekNumber: number;
  startDate: string;
  endDate: string;
  isCurrentWeek: boolean;
  isPastWeek: boolean;
  isFutureWeek: boolean;
}

export function calculateWeekNumber(
  date: Date,
  termStartDate: string
): number {
  const termStart = new Date(termStartDate);
  const targetDate = new Date(date);
  
  const daysDiff = Math.floor(
    (targetDate.getTime() - termStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return Math.floor(daysDiff / 7) + 1;
}

export function getWeekDateRange(
  weekNumber: number,
  termStartDate: string
): { startDate: string; endDate: string } {
  const termStart = new Date(termStartDate);
  const weekStart = new Date(termStart);
  weekStart.setDate(termStart.getDate() + (weekNumber - 1) * 7);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  return {
    startDate: weekStart.toISOString().split('T')[0],
    endDate: weekEnd.toISOString().split('T')[0],
  };
}

export function getCurrentWeekInfo(termStartDate: string): WeekInfo {
  const today = new Date();
  const weekNumber = calculateWeekNumber(today, termStartDate);
  const { startDate, endDate } = getWeekDateRange(weekNumber, termStartDate);
  
  return {
    weekNumber,
    startDate,
    endDate,
    isCurrentWeek: true,
    isPastWeek: false,
    isFutureWeek: false,
  };
}

export function getWeekInfo(
  weekNumber: number,
  termStartDate: string
): WeekInfo {
  const currentWeek = getCurrentWeekInfo(termStartDate);
  const { startDate, endDate } = getWeekDateRange(weekNumber, termStartDate);
  
  return {
    weekNumber,
    startDate,
    endDate,
    isCurrentWeek: weekNumber === currentWeek.weekNumber,
    isPastWeek: weekNumber < currentWeek.weekNumber,
    isFutureWeek: weekNumber > currentWeek.weekNumber,
  };
}

// ============================================================
// SCHEDULE MANAGEMENT
// ============================================================

export interface ScheduleStats {
  total: number;
  completed: number;
  incomplete: number;
  missed: number;
  scheduled: number;
  completionRate: number;
}

export async function getTodaySchedule(
  studentProfileId: number
): Promise<IndividualDailyScheduleDto[]> {
  return weeklyGenerationApi.getTodaySchedule(studentProfileId);
}

export async function getCurrentWeekSchedule(
  studentProfileId: number,
  termStartDate: string
): Promise<WeeklyScheduleResponse> {
  return weeklyGenerationApi.getCurrentWeekSchedule(studentProfileId, termStartDate);
}

export async function getWeekSchedule(
  studentProfileId: number,
  weekNumber: number,
  termStartDate: string
): Promise<WeeklyScheduleResponse> {
  return weeklyGenerationApi.getScheduleByWeek(
    studentProfileId,
    weekNumber,
    termStartDate
  );
}

export async function getUpcomingSchedules(
  studentProfileId: number,
  days: number = 7
): Promise<IndividualDailyScheduleDto[]> {
  return weeklyGenerationApi.getUpcomingSchedules(studentProfileId, days);
}

export async function getSchedulesByDateRange(
  studentProfileId: number,
  startDate: string,
  endDate: string
): Promise<DateRangeSchedulesResponse> {
  return weeklyGenerationApi.getScheduleByDateRangeGrouped(
    studentProfileId,
    startDate,
    endDate
  );
}

export async function markScheduleComplete(
  scheduleId: number
): Promise<void> {
  await weeklyGenerationApi.markScheduleComplete(scheduleId);
}

export async function markScheduleIncomplete(
  scheduleId: number
): Promise<void> {
  await weeklyGenerationApi.markScheduleIncomplete(scheduleId);
}

export async function bulkMarkComplete(
  scheduleIds: number[]
): Promise<void> {
  await weeklyGenerationApi.bulkMarkComplete(scheduleIds);
}

export async function bulkMarkIncomplete(
  scheduleIds: number[]
): Promise<void> {
  await weeklyGenerationApi.bulkMarkIncomplete(scheduleIds);
}

// ============================================================
// SCHEDULE FILTERING & STATISTICS
// ============================================================

export async function getPendingSchedules(
  studentProfileId: number,
  startDate: string,
  endDate: string
): Promise<IndividualDailyScheduleDto[]> {
  return weeklyGenerationApi.getPendingSchedules(
    studentProfileId,
    startDate,
    endDate
  );
}

export async function getCompletedSchedules(
  studentProfileId: number,
  startDate: string,
  endDate: string
): Promise<IndividualDailyScheduleDto[]> {
  return weeklyGenerationApi.getCompletedSchedules(
    studentProfileId,
    startDate,
    endDate
  );
}

export async function getScheduleStats(
  studentProfileId: number,
  startDate: string,
  endDate: string
): Promise<ScheduleStats> {
  return weeklyGenerationApi.getScheduleStats(
    studentProfileId,
    startDate,
    endDate
  );
}

export async function getCurrentWeekStats(
  studentProfileId: number,
  termStartDate: string
): Promise<ScheduleStats> {
  const { startDate, endDate } = getCurrentWeekInfo(termStartDate);
  return getScheduleStats(studentProfileId, startDate, endDate);
}

// ============================================================
// SCHEDULE GROUPING & ORGANIZATION
// ============================================================

export function groupSchedulesByDate(
  schedules: IndividualDailyScheduleDto[]
): Record<string, IndividualDailyScheduleDto[]> {
  const grouped: Record<string, IndividualDailyScheduleDto[]> = {};
  
  schedules.forEach((schedule) => {
    const date = schedule.scheduledDate;
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(schedule);
  });
  
  Object.keys(grouped).forEach((date) => {
    grouped[date].sort((a, b) => a.periodNumber - b.periodNumber);
  });
  
  return grouped;
}

export function groupSchedulesBySubject(
  schedules: IndividualDailyScheduleDto[]
): Record<string, IndividualDailyScheduleDto[]> {
  const grouped: Record<string, IndividualDailyScheduleDto[]> = {};
  
  schedules.forEach((schedule) => {
    const subject = schedule.subjectName;
    if (!grouped[subject]) {
      grouped[subject] = [];
    }
    grouped[subject].push(schedule);
  });
  
  return grouped;
}

/**
 * ✅ UPDATED: Group schedules by CALCULATED status (with proper UTC parsing)
 */
export function groupSchedulesByStatus(
  schedules: IndividualDailyScheduleDto[]
): Record<string, IndividualDailyScheduleDto[]> {
  const grouped: Record<string, IndividualDailyScheduleDto[]> = {
    AVAILABLE: [],
    PENDING: [],
    UPCOMING: [],
    COMPLETED: [],
    MISSED: [],
  };
  
  schedules.forEach((schedule) => {
    const calculatedStatus = calculateScheduleStatus(schedule);
    grouped[calculatedStatus].push(schedule);
  });
  
  return grouped;
}

// ============================================================
// SCHEDULE VALIDATION
// ============================================================

export function isScheduleInPast(schedule: IndividualDailyScheduleDto): boolean {
  const scheduleDate = new Date(schedule.scheduledDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return scheduleDate < today;
}

export function isScheduleToday(schedule: IndividualDailyScheduleDto): boolean {
  const scheduleDate = new Date(schedule.scheduledDate);
  const today = new Date();
  return scheduleDate.toDateString() === today.toDateString();
}

export function isScheduleUpcoming(schedule: IndividualDailyScheduleDto): boolean {
  const scheduleDate = new Date(schedule.scheduledDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return scheduleDate > today;
}

export function isScheduleOverdue(schedule: IndividualDailyScheduleDto): boolean {
  return isScheduleInPast(schedule) && 
         schedule.status !== 'COMPLETED' && 
         schedule.status !== 'MISSED';
}

// ============================================================
// DATE FORMATTING UTILITIES
// ============================================================

export function formatScheduleDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatScheduleTime(timeStr: string): string {
  if (!timeStr) return '';
  
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  
  return `${displayHour}:${minutes} ${ampm}`;
}

export function formatScheduleTimeRange(
  startTime: string | undefined,
  endTime: string | undefined
): string {
  if (!startTime || !endTime) return '';
  return `${formatScheduleTime(startTime)} - ${formatScheduleTime(endTime)}`;
}

// ============================================================
// EXPORT ALL
// ============================================================

export const weeklyGenerationService = {
  // ✅ STATUS CALCULATION (PHASE 6) - WITH TIMEZONE FIX
  calculateScheduleStatus,
  getStatusBadgeInfo,
  getTimeRemaining,
  formatTimeRemaining,
  
  // Week calculations
  calculateWeekNumber,
  getWeekDateRange,
  getCurrentWeekInfo,
  getWeekInfo,
  
  // Schedule fetching
  getTodaySchedule,
  getCurrentWeekSchedule,
  getWeekSchedule,
  getUpcomingSchedules,
  getSchedulesByDateRange,
  
  // Schedule management
  markScheduleComplete,
  markScheduleIncomplete,
  bulkMarkComplete,
  bulkMarkIncomplete,
  
  // Filtering
  getPendingSchedules,
  getCompletedSchedules,
  
  // Statistics
  getScheduleStats,
  getCurrentWeekStats,
  
  // Grouping
  groupSchedulesByDate,
  groupSchedulesBySubject,
  groupSchedulesByStatus,
  
  // Validation
  isScheduleInPast,
  isScheduleToday,
  isScheduleUpcoming,
  isScheduleOverdue,
  
  // Formatting
  formatScheduleDate,
  formatScheduleTime,
  formatScheduleTimeRange,
};

export default weeklyGenerationService;