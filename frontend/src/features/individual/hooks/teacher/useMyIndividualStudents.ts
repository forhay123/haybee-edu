// frontend/src/features/individual/hooks/teacher/useMyIndividualStudents.ts

import { useQuery } from "@tanstack/react-query";
import { teacherTimetableApi } from "../../api/individualApi";
import type { IndividualTimetableDto } from "../../types/individualTypes";

/**
 * Hook for teacher to get all their assigned individual students' timetables
 */
export function useMyIndividualStudents() {
  const {
    data: timetables,
    isLoading,
    error,
    refetch,
  } = useQuery<IndividualTimetableDto[]>({
    queryKey: ["teacher", "myStudents", "timetables"],
    queryFn: () => teacherTimetableApi.getMyStudentsTimetables(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Extract unique students from timetables
  const students = timetables
    ? Array.from(
        new Map(
          timetables.map((t) => [
            t.studentProfileId,
            {
              studentProfileId: t.studentProfileId,
              studentName: t.studentName,
              latestTimetableId: t.id,
              academicYear: t.academicYear,
              termName: t.termName,
              processingStatus: t.processingStatus,
              uploadedAt: t.uploadedAt,
            },
          ])
        ).values()
      )
    : [];

  return {
    students,
    timetables: timetables || [],
    isLoading,
    error,
    refetch,
    totalStudents: students.length,
  };
}

/**
 * Hook to get a specific student's timetable (teacher view)
 */
export function useStudentTimetable(studentProfileId: number, enabled = true) {
  return useQuery<IndividualTimetableDto | null>({
    queryKey: ["teacher", "student", studentProfileId, "timetable"],
    queryFn: () => teacherTimetableApi.getStudentTimetable(studentProfileId),
    enabled: enabled && !!studentProfileId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook to get statistics about teacher's students
 */
export function useMyStudentsStats() {
  const { students, timetables, isLoading } = useMyIndividualStudents();

  const stats = {
    totalStudents: students.length,
    totalTimetables: timetables.length,
    byStatus: timetables.reduce((acc, t) => {
      acc[t.processingStatus] = (acc[t.processingStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byTerm: timetables.reduce((acc, t) => {
      const term = t.termName || "Unassigned";
      acc[term] = (acc[term] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    recentlyUploaded: timetables
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .slice(0, 5),
  };

  return {
    stats,
    isLoading,
  };
}