import {
  ArchivedScheduleDto,
  ArchiveSearchResponse,
} from "../../schedules/types";
import {
  ArchivedItem,
} from "../api/archiveApi";

/**
 * ============================================================
 * ARCHIVE UTILS
 * Location: frontend/src/features/individual/utils/archiveUtils.ts
 * Purpose: Pure functions for archiving logic & analysis
 * ============================================================
 */

/* ------------------------------------------------------------
 * 1. shouldArchiveSchedule()
 * ------------------------------------------------------------ */
export function shouldArchiveSchedule(schedule: ArchivedScheduleDto): boolean {
  // Archive criteria:
  // - Schedule date is in the past
  // - Schedule has completed OR term has ended
  const today = new Date().toISOString().split("T")[0];
  const isPast = schedule.scheduledDate < today;

  return isPast || schedule.completed === true;
}

/* ------------------------------------------------------------
 * 2. getArchiveReason()
 * ------------------------------------------------------------ */
export function getArchiveReason(schedule: ArchivedScheduleDto): string {
  if (schedule.completed) return "Completed lesson";
  const today = new Date().toISOString().split("T")[0];

  if (schedule.scheduledDate < today) return "Past schedule date";
  return "Manual archive";
}

/* ------------------------------------------------------------
 * 3. filterArchiveCandidates()
 * ------------------------------------------------------------ */
export function filterArchiveCandidates(
  schedules: ArchivedScheduleDto[]
): ArchivedScheduleDto[] {
  return schedules.filter((s) => shouldArchiveSchedule(s));
}

/* ------------------------------------------------------------
 * 4. groupArchivesByStudent()
 * ------------------------------------------------------------ */
export function groupArchivesByStudent(
  items: (ArchivedItem | ArchivedScheduleDto)[]
): Record<number, (ArchivedItem | ArchivedScheduleDto)[]> {
  return items.reduce((acc, item) => {
    const id = item.studentProfileId;
    if (!acc[id]) acc[id] = [];
    acc[id].push(item);
    return acc;
  }, {} as Record<number, (ArchivedItem | ArchivedScheduleDto)[]>);
}

/* ------------------------------------------------------------
 * 5. groupArchivesByWeek()
 * ------------------------------------------------------------ */
export function groupArchivesByWeek(
  schedules: ArchivedScheduleDto[]
): Record<number, ArchivedScheduleDto[]> {
  return schedules.reduce((acc, schedule) => {
    const week = schedule.weekNumber;
    if (!acc[week]) acc[week] = [];
    acc[week].push(schedule);
    return acc;
  }, {} as Record<number, ArchivedScheduleDto[]>);
}

/* ------------------------------------------------------------
 * 6. calculateArchiveSummary()
 * ------------------------------------------------------------ */
export function calculateArchiveSummary(
  schedules: ArchivedScheduleDto[]
): {
  total: number;
  completedCount: number;
  incompleteCount: number;
  subjects: Record<string, number>;
  weeks: Record<number, number>;
} {
  const completedCount = schedules.filter((s) => s.completed).length;

  const subjectStats = schedules.reduce((acc, s) => {
    const subject = s.subjectName;
    acc[subject] = (acc[subject] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const weekStats = schedules.reduce((acc, s) => {
    acc[s.weekNumber] = (acc[s.weekNumber] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  return {
    total: schedules.length,
    completedCount,
    incompleteCount: schedules.length - completedCount,
    subjects: subjectStats,
    weeks: weekStats,
  };
}

/* ------------------------------------------------------------
 * 7. canDeleteSchedule()
 * ------------------------------------------------------------ */
export function canDeleteSchedule(schedule: ArchivedScheduleDto): boolean {
  // Deletion rules:
  // - Completed schedules should not be deleted
  // - Schedules tied to assessments should not be deleted
  if (schedule.completed) return false;
  if (schedule.assessmentScore !== undefined) return false;
  return true;
}

/* ------------------------------------------------------------
 * 8. calculateArchivingImpact()
 * ------------------------------------------------------------ */
export function calculateArchivingImpact(
  schedules: ArchivedScheduleDto[]
): {
  deletableCount: number;
  lockedCount: number;
  completedLessons: number;
  withAssessments: number;
} {
  let deletableCount = 0;
  let lockedCount = 0;
  let completedLessons = 0;
  let withAssessments = 0;

  schedules.forEach((s) => {
    if (s.completed) completedLessons++;
    if (s.assessmentScore !== undefined) withAssessments++;

    if (canDeleteSchedule(s)) deletableCount++;
    else lockedCount++;
  });

  return {
    deletableCount,
    lockedCount,
    completedLessons,
    withAssessments,
  };
}

/* ------------------------------------------------------------
 * 9. getArchivePriority()
 * ------------------------------------------------------------ */
export function getArchivePriority(
  schedule: ArchivedScheduleDto
): number {
  // Priority scale: lower number = higher priority
  // 1 → Completed & in the past
  // 2 → Completed but future date (rare)
  // 3 → Past but not completed
  // 4 → Future schedule (lowest priority)

  const today = new Date().toISOString().split("T")[0];
  const isPast = schedule.scheduledDate < today;
  const isCompleted = schedule.completed;

  if (isCompleted && isPast) return 1;
  if (isCompleted) return 2;
  if (isPast) return 3;
  return 4;
}

export default {
  shouldArchiveSchedule,
  getArchiveReason,
  filterArchiveCandidates,
  groupArchivesByStudent,
  groupArchivesByWeek,
  calculateArchiveSummary,
  canDeleteSchedule,
  calculateArchivingImpact,
  getArchivePriority,
};
