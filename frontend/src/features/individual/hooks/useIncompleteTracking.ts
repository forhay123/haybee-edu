// frontend/src/features/individual/hooks/useIncompleteTracking.ts

import { useQuery } from "@tanstack/react-query";
import { incompleteTrackingApi } from "../api/incompleteTrackingApi";
import type {
  IncompleteProgressDto,
  IncompleteStatisticsDto,
  IncompleteReportDto,
} from "../api/incompleteTrackingApi";

// ============================================================
// QUERY KEYS
// ============================================================

export const incompleteKeys = {
  all: ["incomplete-tracking"] as const,
  student: (studentId: number) =>
    ["incomplete-tracking", "student", studentId] as const,
  studentRange: (studentId: number, startDate: string, endDate: string) =>
    ["incomplete-tracking", "student", studentId, startDate, endDate] as const,
  studentCount: (studentId: number) =>
    ["incomplete-tracking", "student", studentId, "count"] as const,
  studentStats: (studentId: number, startDate: string, endDate: string) =>
    [
      "incomplete-tracking",
      "student",
      studentId,
      "stats",
      startDate,
      endDate,
    ] as const,
  studentReport: (studentId: number, startDate: string, endDate: string) =>
    [
      "incomplete-tracking",
      "student",
      studentId,
      "report",
      startDate,
      endDate,
    ] as const,
  studentByReason: (studentId: number, reason: string) =>
    ["incomplete-tracking", "student", studentId, "reason", reason] as const,
  subject: (subjectId: number, startDate: string, endDate: string) =>
    ["incomplete-tracking", "subject", subjectId, startDate, endDate] as const,
  subjectStats: (subjectId: number, startDate: string, endDate: string) =>
    [
      "incomplete-tracking",
      "subject",
      subjectId,
      "stats",
      startDate,
      endDate,
    ] as const,
  subjectReport: (subjectId: number, startDate: string, endDate: string) =>
    [
      "incomplete-tracking",
      "subject",
      subjectId,
      "report",
      startDate,
      endDate,
    ] as const,
  systemStats: (startDate: string, endDate: string) =>
    ["incomplete-tracking", "system", "stats", startDate, endDate] as const,
  systemReport: (startDate: string, endDate: string) =>
    ["incomplete-tracking", "system", "report", startDate, endDate] as const,
  currentTerm: (studentId: number) =>
    ["incomplete-tracking", "student", studentId, "current-term"] as const,
  currentWeek: (studentId: number) =>
    ["incomplete-tracking", "student", studentId, "current-week"] as const,
  lastMonth: (studentId: number) =>
    ["incomplete-tracking", "student", studentId, "last-month"] as const,
};

// ============================================================
// STUDENT HOOKS
// ============================================================

/**
 * Get all incomplete lessons for a student
 */
export function useIncompleteForStudent(studentId: number) {
  return useQuery({
    queryKey: incompleteKeys.student(studentId),
    queryFn: () => incompleteTrackingApi.getIncompleteForStudent(studentId),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get incomplete lessons for a student in date range
 */
export function useIncompleteForStudentInRange(
  studentId: number,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: incompleteKeys.studentRange(studentId, startDate, endDate),
    queryFn: () =>
      incompleteTrackingApi.getIncompleteForStudentInRange(
        studentId,
        startDate,
        endDate
      ),
    enabled: !!studentId && !!startDate && !!endDate,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get incomplete count for a student
 */
export function useIncompleteCount(studentId: number) {
  return useQuery({
    queryKey: incompleteKeys.studentCount(studentId),
    queryFn: () => incompleteTrackingApi.getIncompleteCount(studentId),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Get incomplete statistics for a student
 */
export function useStudentStatistics(
  studentId: number,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: incompleteKeys.studentStats(studentId, startDate, endDate),
    queryFn: () =>
      incompleteTrackingApi.getStudentStatistics(studentId, startDate, endDate),
    enabled: !!studentId && !!startDate && !!endDate,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Generate incomplete report for a student
 */
export function useStudentReport(
  studentId: number,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: incompleteKeys.studentReport(studentId, startDate, endDate),
    queryFn: () =>
      incompleteTrackingApi.generateStudentReport(studentId, startDate, endDate),
    enabled: !!studentId && !!startDate && !!endDate,
    staleTime: 1000 * 60 * 10, // 10 minutes (reports are expensive)
  });
}

/**
 * Get incomplete lessons by reason for a student
 */
export function useIncompleteByReason(studentId: number, reason: string) {
  return useQuery({
    queryKey: incompleteKeys.studentByReason(studentId, reason),
    queryFn: () => incompleteTrackingApi.getIncompleteByReason(studentId, reason),
    enabled: !!studentId && !!reason,
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================================
// SUBJECT/TEACHER HOOKS
// ============================================================

/**
 * Get incomplete lessons for a subject
 */
export function useIncompleteBySubject(
  subjectId: number,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: incompleteKeys.subject(subjectId, startDate, endDate),
    queryFn: () =>
      incompleteTrackingApi.getIncompleteBySubject(
        subjectId,
        startDate,
        endDate
      ),
    enabled: !!subjectId && !!startDate && !!endDate,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get incomplete statistics for a subject
 */
export function useSubjectStatistics(
  subjectId: number,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: incompleteKeys.subjectStats(subjectId, startDate, endDate),
    queryFn: () =>
      incompleteTrackingApi.getSubjectStatistics(
        subjectId,
        startDate,
        endDate
      ),
    enabled: !!subjectId && !!startDate && !!endDate,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Generate incomplete report for a subject
 */
export function useSubjectReport(
  subjectId: number,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: incompleteKeys.subjectReport(subjectId, startDate, endDate),
    queryFn: () =>
      incompleteTrackingApi.generateSubjectReport(
        subjectId,
        startDate,
        endDate
      ),
    enabled: !!subjectId && !!startDate && !!endDate,
    staleTime: 1000 * 60 * 10,
  });
}

// ============================================================
// SYSTEM/ADMIN HOOKS
// ============================================================

/**
 * Get system-wide incomplete statistics
 */
export function useSystemStatistics(startDate: string, endDate: string) {
  return useQuery({
    queryKey: incompleteKeys.systemStats(startDate, endDate),
    queryFn: () =>
      incompleteTrackingApi.getSystemStatistics(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Generate system-wide incomplete report
 */
export function useSystemReport(startDate: string, endDate: string) {
  return useQuery({
    queryKey: incompleteKeys.systemReport(startDate, endDate),
    queryFn: () => incompleteTrackingApi.generateSystemReport(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 1000 * 60 * 10,
  });
}

// ============================================================
// CONVENIENCE HOOKS
// ============================================================

/**
 * Get incomplete for student in current term
 */
export function useIncompleteForCurrentTerm(studentId: number) {
  return useQuery({
    queryKey: incompleteKeys.currentTerm(studentId),
    queryFn: () => incompleteTrackingApi.getIncompleteForCurrentTerm(studentId),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get incomplete for student in current week
 */
export function useIncompleteForCurrentWeek(studentId: number) {
  return useQuery({
    queryKey: incompleteKeys.currentWeek(studentId),
    queryFn: () => incompleteTrackingApi.getIncompleteForCurrentWeek(studentId),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 2, // More frequent updates for current week
  });
}

/**
 * Get incomplete for student in last 30 days
 */
export function useIncompleteLastMonth(studentId: number) {
  return useQuery({
    queryKey: incompleteKeys.lastMonth(studentId),
    queryFn: () => incompleteTrackingApi.getIncompleteLastMonth(studentId),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get incomplete for current month
 */
export function useIncompleteForCurrentMonth(studentId: number) {
  return useQuery({
    queryKey: [...incompleteKeys.student(studentId), "current-month"],
    queryFn: () => incompleteTrackingApi.getIncompleteForCurrentMonth(studentId),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get high priority incomplete (critical)
 */
export function useHighPriorityIncomplete(studentId: number) {
  return useQuery({
    queryKey: [...incompleteKeys.student(studentId), "high-priority"],
    queryFn: () => incompleteTrackingApi.getHighPriorityIncomplete(studentId),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 2, // More frequent for urgent items
  });
}

/**
 * Get incomplete grouped by reason
 */
export function useIncompleteGroupedByReason(studentId: number) {
  return useQuery({
    queryKey: [...incompleteKeys.student(studentId), "grouped-by-reason"],
    queryFn: () =>
      incompleteTrackingApi.getIncompleteGroupedByReason(studentId),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get incomplete grouped by subject
 */
export function useIncompleteGroupedBySubject(studentId: number) {
  return useQuery({
    queryKey: [...incompleteKeys.student(studentId), "grouped-by-subject"],
    queryFn: () =>
      incompleteTrackingApi.getIncompleteGroupedBySubject(studentId),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get incomplete percentage for student
 */
export function useIncompletePercentage(
  studentId: number,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: [
      ...incompleteKeys.studentStats(studentId, startDate, endDate),
      "percentage",
    ],
    queryFn: () =>
      incompleteTrackingApi.getIncompletePercentage(
        studentId,
        startDate,
        endDate
      ),
    enabled: !!studentId && !!startDate && !!endDate,
    staleTime: 1000 * 60 * 5,
  });
}