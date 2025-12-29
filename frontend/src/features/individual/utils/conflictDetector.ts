// frontend/src/features/individual/utils/conflictDetector.ts

/**
 * Conflict Detector Utility
 * Sprint 2-3: Detects scheduling conflicts and overlaps
 */

import { parseISO, isWithinInterval, areIntervalsOverlapping } from "date-fns";

export interface TimeSlot {
  startTime: string; // HH:mm format
  endTime: string;
}

export interface ScheduleEntry {
  id: number;
  dayOfWeek: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subjectId: number;
  subjectName: string;
}

export interface ConflictDetection {
  hasConflict: boolean;
  conflictType: "TIME_OVERLAP" | "DUPLICATE_SUBJECT" | "DUPLICATE_PERIOD" | "NONE";
  conflictingEntries: ScheduleEntry[];
  severity: "HIGH" | "MEDIUM" | "LOW";
  message: string;
}

/**
 * Convert time string to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if two time slots overlap
 */
export function doTimeSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  const start1 = timeToMinutes(slot1.startTime);
  const end1 = timeToMinutes(slot1.endTime);
  const start2 = timeToMinutes(slot2.startTime);
  const end2 = timeToMinutes(slot2.endTime);

  // Check for any overlap
  return start1 < end2 && start2 < end1;
}

/**
 * Detect conflicts between schedule entries for the same day
 */
export function detectDayConflicts(entries: ScheduleEntry[]): ConflictDetection[] {
  const conflicts: ConflictDetection[] = [];

  // Group entries by day
  const entriesByDay = groupEntriesByDay(entries);

  // Check each day for conflicts
  entriesByDay.forEach((dayEntries, day) => {
    // Check for time overlaps
    for (let i = 0; i < dayEntries.length; i++) {
      for (let j = i + 1; j < dayEntries.length; j++) {
        const entry1 = dayEntries[i];
        const entry2 = dayEntries[j];

        // Check time overlap
        if (
          doTimeSlotsOverlap(
            { startTime: entry1.startTime, endTime: entry1.endTime },
            { startTime: entry2.startTime, endTime: entry2.endTime }
          )
        ) {
          conflicts.push({
            hasConflict: true,
            conflictType: "TIME_OVERLAP",
            conflictingEntries: [entry1, entry2],
            severity: "HIGH",
            message: `Time overlap detected on ${day}: ${entry1.subjectName} and ${entry2.subjectName}`,
          });
        }

        // Check duplicate subject
        if (entry1.subjectId === entry2.subjectId) {
          conflicts.push({
            hasConflict: true,
            conflictType: "DUPLICATE_SUBJECT",
            conflictingEntries: [entry1, entry2],
            severity: "MEDIUM",
            message: `Duplicate subject on ${day}: ${entry1.subjectName} appears multiple times`,
          });
        }

        // Check duplicate period
        if (entry1.periodNumber === entry2.periodNumber) {
          conflicts.push({
            hasConflict: true,
            conflictType: "DUPLICATE_PERIOD",
            conflictingEntries: [entry1, entry2],
            severity: "HIGH",
            message: `Duplicate period ${entry1.periodNumber} on ${day}`,
          });
        }
      }
    }
  });

  return conflicts;
}

/**
 * Group schedule entries by day of week
 */
export function groupEntriesByDay(entries: ScheduleEntry[]): Map<string, ScheduleEntry[]> {
  const grouped = new Map<string, ScheduleEntry[]>();

  entries.forEach((entry) => {
    if (!grouped.has(entry.dayOfWeek)) {
      grouped.set(entry.dayOfWeek, []);
    }
    grouped.get(entry.dayOfWeek)!.push(entry);
  });

  return grouped;
}

/**
 * Check if a new entry conflicts with existing entries
 */
export function checkNewEntryConflict(
  newEntry: ScheduleEntry,
  existingEntries: ScheduleEntry[]
): ConflictDetection {
  const sameDay = existingEntries.filter((e) => e.dayOfWeek === newEntry.dayOfWeek);

  for (const existing of sameDay) {
    // Time overlap check
    if (
      doTimeSlotsOverlap(
        { startTime: newEntry.startTime, endTime: newEntry.endTime },
        { startTime: existing.startTime, endTime: existing.endTime }
      )
    ) {
      return {
        hasConflict: true,
        conflictType: "TIME_OVERLAP",
        conflictingEntries: [existing],
        severity: "HIGH",
        message: `Time overlap with ${existing.subjectName}`,
      };
    }

    // Duplicate subject check
    if (newEntry.subjectId === existing.subjectId) {
      return {
        hasConflict: true,
        conflictType: "DUPLICATE_SUBJECT",
        conflictingEntries: [existing],
        severity: "MEDIUM",
        message: `Subject ${newEntry.subjectName} already scheduled on this day`,
      };
    }

    // Duplicate period check
    if (newEntry.periodNumber === existing.periodNumber) {
      return {
        hasConflict: true,
        conflictType: "DUPLICATE_PERIOD",
        conflictingEntries: [existing],
        severity: "HIGH",
        message: `Period ${newEntry.periodNumber} already occupied by ${existing.subjectName}`,
      };
    }
  }

  return {
    hasConflict: false,
    conflictType: "NONE",
    conflictingEntries: [],
    severity: "LOW",
    message: "No conflicts detected",
  };
}

/**
 * Validate time format (HH:mm)
 */
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
  return timeRegex.test(time);
}

/**
 * Check if end time is after start time
 */
export function isValidTimeRange(startTime: string, endTime: string): boolean {
  if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
    return false;
  }

  return timeToMinutes(endTime) > timeToMinutes(startTime);
}

/**
 * Get all conflicts summary
 */
export function getConflictsSummary(conflicts: ConflictDetection[]): {
  totalConflicts: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  byType: Record<string, number>;
} {
  const byType: Record<string, number> = {
    TIME_OVERLAP: 0,
    DUPLICATE_SUBJECT: 0,
    DUPLICATE_PERIOD: 0,
  };

  let highSeverity = 0;
  let mediumSeverity = 0;
  let lowSeverity = 0;

  conflicts.forEach((conflict) => {
    if (conflict.hasConflict) {
      byType[conflict.conflictType]++;

      switch (conflict.severity) {
        case "HIGH":
          highSeverity++;
          break;
        case "MEDIUM":
          mediumSeverity++;
          break;
        case "LOW":
          lowSeverity++;
          break;
      }
    }
  });

  return {
    totalConflicts: conflicts.length,
    highSeverity,
    mediumSeverity,
    lowSeverity,
    byType,
  };
}

/**
 * Sort conflicts by severity
 */
export function sortConflictsBySeverity(conflicts: ConflictDetection[]): ConflictDetection[] {
  const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return [...conflicts].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

/**
 * Filter conflicts by type
 */
export function filterConflictsByType(
  conflicts: ConflictDetection[],
  type: "TIME_OVERLAP" | "DUPLICATE_SUBJECT" | "DUPLICATE_PERIOD"
): ConflictDetection[] {
  return conflicts.filter((c) => c.conflictType === type);
}

/**
 * Check for gaps in schedule (missing periods)
 */
export function findScheduleGaps(entries: ScheduleEntry[], expectedPeriods: number[]): number[] {
  const entriesByDay = groupEntriesByDay(entries);
  const gaps: number[] = [];

  entriesByDay.forEach((dayEntries) => {
    const existingPeriods = new Set(dayEntries.map((e) => e.periodNumber));
    expectedPeriods.forEach((period) => {
      if (!existingPeriods.has(period)) {
        gaps.push(period);
      }
    });
  });

  return gaps;
}