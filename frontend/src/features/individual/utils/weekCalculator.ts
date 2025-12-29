// frontend/src/features/individual/utils/weekCalculator.ts

/**
 * Week Calculator Utility
 * Sprint 2-3: Calculates week numbers, term dates, and week ranges
 */

import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  differenceInWeeks,
  isWithinInterval,
  format,
  parseISO,
  addDays,
  isSameDay,
} from "date-fns";

export interface WeekInfo {
  weekNumber: number;
  weekStartDate: Date;
  weekEndDate: Date;
  isCurrentWeek: boolean;
  isPastWeek: boolean;
  isFutureWeek: boolean;
}

export interface TermInfo {
  termId: number;
  termName: string;
  termStartDate: Date;
  termEndDate: Date;
  totalWeeks: number;
  currentWeekNumber?: number;
}

/**
 * Calculate week number from a date within a term
 * Week 1 starts on the Monday of the week containing the term start date
 */
export function calculateWeekNumber(date: Date | string, termStartDate: Date | string): number {
  const targetDate = typeof date === "string" ? parseISO(date) : date;
  const termStart = typeof termStartDate === "string" ? parseISO(termStartDate) : termStartDate;

  // Get the Monday of the week containing the term start
  const termWeekStart = startOfWeek(termStart, { weekStartsOn: 1 });

  // Get the Monday of the week containing the target date
  const targetWeekStart = startOfWeek(targetDate, { weekStartsOn: 1 });

  // Calculate difference in weeks
  const weeksDiff = differenceInWeeks(targetWeekStart, termWeekStart);

  // Week number is 1-based
  return weeksDiff + 1;
}

/**
 * Get week start and end dates for a specific week number in a term
 */
export function getWeekDates(weekNumber: number, termStartDate: Date | string): WeekInfo {
  const termStart = typeof termStartDate === "string" ? parseISO(termStartDate) : termStartDate;

  // Get the Monday of the first week
  const firstWeekStart = startOfWeek(termStart, { weekStartsOn: 1 });

  // Calculate the start of the target week (0-indexed, so subtract 1)
  const weekStartDate = addWeeks(firstWeekStart, weekNumber - 1);
  const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 });

  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });

  return {
    weekNumber,
    weekStartDate,
    weekEndDate,
    isCurrentWeek: isSameDay(weekStartDate, currentWeekStart),
    isPastWeek: weekStartDate < currentWeekStart,
    isFutureWeek: weekStartDate > currentWeekStart,
  };
}

/**
 * Get all weeks in a term
 */
export function getAllWeeksInTerm(
  termStartDate: Date | string,
  termEndDate: Date | string
): WeekInfo[] {
  const termStart = typeof termStartDate === "string" ? parseISO(termStartDate) : termStartDate;
  const termEnd = typeof termEndDate === "string" ? parseISO(termEndDate) : termEndDate;

  const totalWeeks = calculateTotalWeeks(termStart, termEnd);
  const weeks: WeekInfo[] = [];

  for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
    weeks.push(getWeekDates(weekNum, termStart));
  }

  return weeks;
}

/**
 * Calculate total number of weeks in a term
 */
export function calculateTotalWeeks(
  termStartDate: Date | string,
  termEndDate: Date | string
): number {
  const termStart = typeof termStartDate === "string" ? parseISO(termStartDate) : termStartDate;
  const termEnd = typeof termEndDate === "string" ? parseISO(termEndDate) : termEndDate;

  const firstWeekStart = startOfWeek(termStart, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(termEnd, { weekStartsOn: 1 });

  return differenceInWeeks(lastWeekStart, firstWeekStart) + 1;
}

/**
 * Get current week number in a term
 */
export function getCurrentWeekNumber(termStartDate: Date | string): number {
  return calculateWeekNumber(new Date(), termStartDate);
}

/**
 * Check if a date falls within a specific week
 */
export function isDateInWeek(
  date: Date | string,
  weekNumber: number,
  termStartDate: Date | string
): boolean {
  const targetDate = typeof date === "string" ? parseISO(date) : date;
  const weekInfo = getWeekDates(weekNumber, termStartDate);

  return isWithinInterval(targetDate, {
    start: weekInfo.weekStartDate,
    end: weekInfo.weekEndDate,
  });
}

/**
 * Get week range as formatted string
 */
export function formatWeekRange(weekNumber: number, termStartDate: Date | string): string {
  const weekInfo = getWeekDates(weekNumber, termStartDate);
  const start = format(weekInfo.weekStartDate, "MMM d");
  const end = format(weekInfo.weekEndDate, "MMM d, yyyy");
  return `${start} - ${end}`;
}

/**
 * Get all weekdays (Mon-Fri) in a specific week
 */
export function getWeekdays(weekNumber: number, termStartDate: Date | string): Date[] {
  const weekInfo = getWeekDates(weekNumber, termStartDate);
  const weekdays: Date[] = [];

  // Monday to Friday (days 0-4)
  for (let i = 0; i < 5; i++) {
    weekdays.push(addDays(weekInfo.weekStartDate, i));
  }

  return weekdays;
}

/**
 * Get Saturday of a specific week
 */
export function getSaturday(weekNumber: number, termStartDate: Date | string): Date {
  const weekInfo = getWeekDates(weekNumber, termStartDate);
  return addDays(weekInfo.weekStartDate, 5); // Saturday is day 5 (Mon=0)
}

/**
 * Check if current date is within term dates
 */
export function isWithinTerm(
  termStartDate: Date | string,
  termEndDate: Date | string,
  date: Date = new Date()
): boolean {
  const termStart = typeof termStartDate === "string" ? parseISO(termStartDate) : termStartDate;
  const termEnd = typeof termEndDate === "string" ? parseISO(termEndDate) : termEndDate;

  return isWithinInterval(date, { start: termStart, end: termEnd });
}

/**
 * Get weeks remaining in term from current date
 */
export function getWeeksRemaining(
  termStartDate: Date | string,
  termEndDate: Date | string
): number {
  const termStart = typeof termStartDate === "string" ? parseISO(termStartDate) : termStartDate;
  const termEnd = typeof termEndDate === "string" ? parseISO(termEndDate) : termEndDate;

  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(termEnd, { weekStartsOn: 1 });

  const weeksRemaining = differenceInWeeks(lastWeekStart, currentWeekStart) + 1;
  return Math.max(0, weeksRemaining);
}

/**
 * Get term progress percentage
 */
export function getTermProgress(
  termStartDate: Date | string,
  termEndDate: Date | string
): number {
  const totalWeeks = calculateTotalWeeks(termStartDate, termEndDate);
  const currentWeek = getCurrentWeekNumber(termStartDate);
  return Math.round((currentWeek / totalWeeks) * 100);
}

/**
 * Format week display text
 */
export function formatWeekDisplay(weekNumber: number, includeLabel: boolean = true): string {
  if (includeLabel) {
    return `Week ${weekNumber}`;
  }
  return `${weekNumber}`;
}

/**
 * Validate week number is within term bounds
 */
export function isValidWeekNumber(
  weekNumber: number,
  termStartDate: Date | string,
  termEndDate: Date | string
): boolean {
  const totalWeeks = calculateTotalWeeks(termStartDate, termEndDate);
  return weekNumber >= 1 && weekNumber <= totalWeeks;
}