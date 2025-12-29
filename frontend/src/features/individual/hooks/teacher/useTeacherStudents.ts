// frontend/src/features/individual/hooks/teacher/useTeacherStudents.ts - COMPLETE FIX

import { useQuery } from "@tanstack/react-query";
import { teacherTimetableApi } from "../../api/individualApi";
import { IndividualTimetableDto } from "../../types/individualTypes";

/**
 * Hook to fetch all timetables for teacher's assigned students
 */
export function useTeacherStudentsTimetables() {
  return useQuery<IndividualTimetableDto[]>({
    queryKey: ["teacher-students-timetables"],
    queryFn: () => teacherTimetableApi.getMyStudentsTimetables(),
    staleTime: 30000,
  });
}

/**
 * Hook to fetch timetable for a specific student (with permission check)
 */
export function useTeacherStudentTimetable(studentProfileId: number | null) {
  return useQuery<IndividualTimetableDto | null>({
    queryKey: ["teacher-student-timetable", studentProfileId],
    queryFn: () => teacherTimetableApi.getStudentTimetable(studentProfileId!),
    enabled: !!studentProfileId,
    staleTime: 30000,
  });
}

/**
 * Hook to fetch timetables with real-time updates for teacher
 * Polls every 5 seconds if there are processing timetables
 */
export function useTeacherTimetablesWithPolling() {
  const { data: timetables = [], isLoading, error } = useQuery<IndividualTimetableDto[]>({
    queryKey: ["teacher-students-timetables"],
    queryFn: () => teacherTimetableApi.getMyStudentsTimetables(),
    staleTime: 30000,
    refetchInterval: (query) => {
      const data = query.state.data;
      
      if (!Array.isArray(data)) {
        return false;
      }
      
      const hasProcessing = data.some(
        (t) => t.processingStatus === "PROCESSING" || t.processingStatus === "PENDING"
      );
      
      return hasProcessing ? 5000 : false;
    },
    refetchIntervalInBackground: true,
  });

  const processingCount = timetables.filter(
    (t) => t.processingStatus === "PROCESSING" || t.processingStatus === "PENDING"
  ).length;

  const failedCount = timetables.filter((t) => t.processingStatus === "FAILED").length;

  const completedCount = timetables.filter((t) => t.processingStatus === "COMPLETED").length;

  const uniqueStudentIds = new Set(timetables.map((t) => t.studentProfileId));
  const studentsWithTimetables = uniqueStudentIds.size;

  return {
    timetables,
    isLoading,
    error,
    processingCount,
    failedCount,
    completedCount,
    totalCount: timetables.length,
    studentsWithTimetables,
  };
}

/**
 * Hook to group timetables by student
 * ✅ FIXED: Properly handle null/undefined studentName just like admin does
 */
export function useTeacherStudentsGrouped() {
  const { data: timetables = [], isLoading, error } = useQuery<IndividualTimetableDto[]>({
    queryKey: ["teacher-students-timetables"],
    queryFn: () => teacherTimetableApi.getMyStudentsTimetables(),
    staleTime: 30000,
  });

  // Group timetables by student
  const groupedByStudent = timetables.reduce((acc, timetable) => {
    const studentId = timetable.studentProfileId;
    
    // ✅ FIX: Safe default for student name (just like admin)
    const studentName = timetable.studentName || `Student ${studentId}`;
    
    if (!acc[studentId]) {
      acc[studentId] = {
        studentId,
        studentName, // ✅ This will always have a value now
        timetables: [],
        latestTimetable: null,
        totalUploads: 0,
        hasFailedUploads: false,
        hasProcessingUploads: false,
      };
    }

    acc[studentId].timetables.push(timetable);
    acc[studentId].totalUploads += 1;

    // Track latest timetable
    if (
      !acc[studentId].latestTimetable ||
      new Date(timetable.uploadedAt) >
        new Date(acc[studentId].latestTimetable!.uploadedAt)
    ) {
      acc[studentId].latestTimetable = timetable;
    }

    // Track failed/processing uploads
    if (timetable.processingStatus === "FAILED") {
      acc[studentId].hasFailedUploads = true;
    }
    if (
      timetable.processingStatus === "PROCESSING" ||
      timetable.processingStatus === "PENDING"
    ) {
      acc[studentId].hasProcessingUploads = true;
    }

    return acc;
  }, {} as Record<number, {
    studentId: number;
    studentName: string;
    timetables: IndividualTimetableDto[];
    latestTimetable: IndividualTimetableDto | null;
    totalUploads: number;
    hasFailedUploads: boolean;
    hasProcessingUploads: boolean;
  }>);

  const students = Object.values(groupedByStudent);

  return {
    students,
    isLoading,
    error,
    totalStudents: students.length,
  };
}

/**
 * Hook to filter and search teacher's students
 * ✅ FIXED: Safe studentName handling in search
 */
export function useTeacherStudentFilters() {
  const applyFilters = (
    timetables: IndividualTimetableDto[],
    filters: {
      searchQuery?: string;
      status?: "ALL" | "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
      hasIssues?: boolean;
    }
  ) => {
    let filtered = [...timetables];

    // Filter by search query (student name or filename)
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          // ✅ FIX: Safe check for studentName
          (t.studentName && t.studentName.toLowerCase().includes(query)) ||
          t.originalFilename.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (filters.status && filters.status !== "ALL") {
      filtered = filtered.filter((t) => t.processingStatus === filters.status);
    }

    // Filter by issues (failed or low confidence)
    if (filters.hasIssues) {
      filtered = filtered.filter(
        (t) =>
          t.processingStatus === "FAILED" ||
          (t.confidenceScore && t.confidenceScore < 0.7)
      );
    }

    return filtered;
  };

  return { applyFilters };
}

/**
 * Hook to calculate teacher dashboard stats
 */
export function useTeacherDashboardStats() {
  const { timetables, isLoading } = useTeacherTimetablesWithPolling();
  const { students } = useTeacherStudentsGrouped();

  const stats = {
    totalStudents: students.length,
    studentsWithTimetables: students.filter((s) => s.totalUploads > 0).length,
    studentsWithoutTimetables: students.filter((s) => s.totalUploads === 0).length,
    totalTimetablesUploaded: timetables.length,
    processingTimetables: timetables.filter(
      (t) => t.processingStatus === "PROCESSING" || t.processingStatus === "PENDING"
    ).length,
    failedTimetables: timetables.filter((t) => t.processingStatus === "FAILED").length,
    completedTimetables: timetables.filter((t) => t.processingStatus === "COMPLETED")
      .length,
    studentsNeedingAttention: students.filter(
      (s) => s.hasFailedUploads || !s.latestTimetable
    ).length,
  };

  return {
    stats,
    isLoading,
  };
}