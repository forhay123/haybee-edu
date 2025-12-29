// frontend/src/features/individual/hooks/useIndividualSchedule.ts

import { useQuery } from "@tanstack/react-query";
import { scheduleApi, timetableApi } from "../api/individualApi";
import { 
  IndividualDailyScheduleDto,
  INDIVIDUAL_TIME_WINDOWS,
  TimeWindow 
} from "../types/individualTypes";
import { startOfWeek, addDays, format } from "date-fns";

/**
 * Hook for fetching individual student schedule data
 */
export function useIndividualSchedule(studentProfileId: number, date?: string) {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const {
    data: schedules,
    isLoading,
    error,
    refetch,
  } = useQuery<IndividualDailyScheduleDto[]>({
    queryKey: ["individual-schedule", studentProfileId, targetDate],
    queryFn: () => scheduleApi.getByDate(studentProfileId, targetDate),
    enabled: !!studentProfileId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  return {
    schedules: schedules || [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for fetching schedule data for a date range
 */
export function useIndividualScheduleRange(
  studentProfileId: number,
  startDate: string,
  endDate: string
) {
  const {
    data: schedules,
    isLoading,
    error,
    refetch,
  } = useQuery<IndividualDailyScheduleDto[]>({
    queryKey: ["individual-schedule-range", studentProfileId, startDate, endDate],
    queryFn: () => scheduleApi.getByDateRange(studentProfileId, startDate, endDate),
    enabled: !!studentProfileId && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  return {
    schedules: schedules || [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get the current week's schedule with mapped learning hours
 */
export function useWeeklySchedule(studentProfileId: number) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const startDate = format(weekStart, 'yyyy-MM-dd');
  const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');

  // Fetch latest timetable to get extracted entries
  const { data: latestTimetable } = useQuery({
    queryKey: ["timetable-latest", studentProfileId],
    queryFn: () => timetableApi.getLatest(studentProfileId),
    enabled: !!studentProfileId,
  });

  // Fetch timetable entries
  const { data: entries = [] } = useQuery({
    queryKey: ["timetable-entries", latestTimetable?.id],
    queryFn: () => timetableApi.getEntries(latestTimetable!.id),
    enabled: !!latestTimetable?.id && latestTimetable.processingStatus === "COMPLETED",
  });

  // Fetch actual schedules for the week
  const { schedules = [], isLoading, error, refetch } = useIndividualScheduleRange(
    studentProfileId,
    startDate,
    endDate
  );

  // Generate weekly schedule based on time windows and extracted entries
  const weeklySchedule = generateWeeklySchedule(entries, schedules);

  return {
    weeklySchedule,
    rawSchedules: schedules,
    extractedEntries: entries,
    timetable: latestTimetable,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Generate weekly schedule mapping extracted entries to learning hours
 */
function generateWeeklySchedule(
  extractedEntries: any[],
  existingSchedules: IndividualDailyScheduleDto[]
) {
  const schedule: WeeklyScheduleDay[] = [];

  // Filter: keep only entries with valid subjectId
  const mappedSubjects = extractedEntries
    .filter(entry => Number.isFinite(entry.subjectId))
    .map(entry => ({
      id: entry.subjectId,
      name: entry.subjectName,
    }));

  // Deduplicate
  const uniqueSubjects = Array.from(
    new Map(mappedSubjects.map(s => [s.id, s])).values()
  );

  // 🔒 FAIL-SAFE: No subjects = no schedule
  if (uniqueSubjects.length === 0) {
    console.warn("No valid subject mappings found — weekly schedule is empty.");
    return [];
  }

  // Period distribution
  const totalPeriods = 13;
  const subjectCount = uniqueSubjects.length;
  let periodIndex = 0;

  const weekDays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

  weekDays.forEach(day => {
    const timeWindow = INDIVIDUAL_TIME_WINDOWS.find(w => w.dayOfWeek === day);
    if (!timeWindow) return;

    const daySchedule: WeeklyScheduleDay = {
      day,
      periods: [],
      timeWindow,
    };

    const startHour = parseInt(timeWindow.startTime.split(":")[0]);
    const endHour = parseInt(timeWindow.endTime.split(":")[0]);
    const maxPeriods = endHour - startHour;

    let currentHour = startHour;
    let periodsAddedToday = 0;

    while (currentHour < endHour && periodsAddedToday < maxPeriods) {
      // Safeguard wraparound
      if (periodIndex >= uniqueSubjects.length) {
        periodIndex = 0;
      }

      const subject = uniqueSubjects[periodIndex];

      // 🔒 SAFETY: Should never be undefined now, but just in case
      if (!subject) break;

      const startTime = `${String(currentHour).padStart(2, "0")}:00`;
      const endTime = `${String(currentHour + 1).padStart(2, "0")}:00`;

      const existingSchedule = existingSchedules.find(
        s =>
          s.scheduledDate.includes(day.toLowerCase()) &&
          s.startTime === startTime &&
          s.subjectId === subject.id
      );

      daySchedule.periods.push({
        periodNumber: periodsAddedToday + 1,
        subjectId: subject.id,
        subjectName: subject.name,
        startTime,
        endTime,
        completed: existingSchedule?.completed || false,
        scheduleId: existingSchedule?.id,
        lessonTopicId: existingSchedule?.lessonTopicId,
        lessonTopicTitle: existingSchedule?.lessonTopicTitle,
        // ✅ NEW: Map assessment window timing fields
        assessmentWindowStart: existingSchedule?.assessmentWindowStart,
        assessmentWindowEnd: existingSchedule?.assessmentWindowEnd,
        gracePeriodEnd: existingSchedule?.gracePeriodEnd,
      });

      currentHour++;
      periodsAddedToday++;
      periodIndex++;
    }

    if (daySchedule.periods.length > 0) {
      schedule.push(daySchedule);
    }
  });

  return schedule;
}


/**
 * Hook to get schedule statistics
 */
export function useScheduleStats(schedules: IndividualDailyScheduleDto[]) {
  const totalScheduled = schedules.length;
  const completed = schedules.filter((s) => s.completed).length;
  const pending = totalScheduled - completed;
  const completionRate = totalScheduled > 0 ? (completed / totalScheduled) * 100 : 0;

  const bySubject = schedules.reduce((acc, schedule) => {
    const subjectName = schedule.subjectName;
    if (!acc[subjectName]) {
      acc[subjectName] = { total: 0, completed: 0 };
    }
    acc[subjectName].total++;
    if (schedule.completed) {
      acc[subjectName].completed++;
    }
    return acc;
  }, {} as Record<string, { total: number; completed: number }>);

  return {
    totalScheduled,
    completed,
    pending,
    completionRate,
    bySubject,
  };
}

/**
 * Hook to get weekly schedule statistics
 */
export function useWeeklyScheduleStats(weeklySchedule: WeeklyScheduleDay[]) {
  let totalPeriods = 0;
  let completedPeriods = 0;
  const subjectDistribution: Record<string, number> = {};

  weeklySchedule.forEach(day => {
    day.periods.forEach(period => {
      totalPeriods++;
      if (period.completed) completedPeriods++;
      
      subjectDistribution[period.subjectName] = 
        (subjectDistribution[period.subjectName] || 0) + 1;
    });
  });

  return {
    totalPeriods,
    completedPeriods,
    pendingPeriods: totalPeriods - completedPeriods,
    completionRate: totalPeriods > 0 ? (completedPeriods / totalPeriods) * 100 : 0,
    subjectDistribution,
    daysWithClasses: weeklySchedule.length,
  };
}

/**
 * Types for weekly schedule
 */
export interface WeeklySchedulePeriod {
  periodNumber: number;
  subjectId: number;
  subjectName: string;
  startTime: string;
  endTime: string;
  completed: boolean;
  scheduleId?: number;
  lessonTopicTitle?: string;
  lessonTopicId?: number;
  // ✅ NEW: Assessment window timing properties
  assessmentWindowStart?: string;  // ISO datetime string
  assessmentWindowEnd?: string;    // ISO datetime string
  gracePeriodEnd?: string;         // ISO datetime string
}

export interface WeeklyScheduleDay {
  day: string;
  periods: WeeklySchedulePeriod[];
  timeWindow: TimeWindow;
}

/**
 * Format time for display (12-hour format)
 */
export function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minutes} ${period}`;
}

/**
 * Get day display name
 */
export function getDayDisplayName(day: string): string {
  return day.charAt(0) + day.slice(1).toLowerCase();
}

/**
 * Check if a schedule day is today
 */
export function isToday(day: string): boolean {
  const today = format(new Date(), 'EEEE').toUpperCase();
  return day === today;
}

/**
 * Get next upcoming class
 */
export function getNextClass(weeklySchedule: WeeklyScheduleDay[]) {
  const now = new Date();
  const currentDay = format(now, 'EEEE').toUpperCase();
  const currentTime = format(now, 'HH:mm');

  // Find today's schedule
  const todaySchedule = weeklySchedule.find(d => d.day === currentDay);
  
  if (todaySchedule) {
    // Find next period today
    const nextPeriod = todaySchedule.periods.find(
      p => p.startTime > currentTime && !p.completed
    );
    
    if (nextPeriod) {
      return {
        day: currentDay,
        ...nextPeriod,
      };
    }
  }

  // If no more classes today, find first class of next day
  const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const currentDayIndex = dayOrder.indexOf(currentDay);
  
  for (let i = 1; i < dayOrder.length; i++) {
    const nextDayIndex = (currentDayIndex + i) % dayOrder.length;
    const nextDay = dayOrder[nextDayIndex];
    const daySchedule = weeklySchedule.find(d => d.day === nextDay);
    
    if (daySchedule && daySchedule.periods.length > 0) {
      const firstPeriod = daySchedule.periods.find(p => !p.completed);
      if (firstPeriod) {
        return {
          day: nextDay,
          ...firstPeriod,
        };
      }
    }
  }

  return null;
}