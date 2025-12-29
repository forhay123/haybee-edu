// ============================================================
// FILE 1: useSubjectMissingTopics.ts
// Path: frontend/src/features/individual/hooks/teacher/useSubjectMissingTopics.ts
// ============================================================

import { useQuery } from "@tanstack/react-query";
import axios from "../../../../api/axios";

interface MissingTopicDto {
  studentId: number;
  studentName: string;
  subjectId: number;
  subjectName: string;
  weekNumber: number;
  scheduledDate: string;
  periodNumber: number;
  reason: string;
}

interface SubjectMissingTopicsSummary {
  subjectId: number;
  subjectName: string;
  totalMissing: number;
  studentsAffected: number;
  missingTopics: MissingTopicDto[];
  byWeek: Record<number, MissingTopicDto[]>;
  byReason: Record<string, number>;
}

export function useSubjectMissingTopics(
  subjectId: number,
  startDate?: string,
  endDate?: string,
  enabled = true
) {
  return useQuery<MissingTopicDto[]>({
    queryKey: ["teacher", "subject", subjectId, "missingTopics", startDate, endDate],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await axios.get(
        `/individual/teacher/subject/${subjectId}/missing-topics`,
        { params }
      );
      return res.data;
    },
    enabled: enabled && !!subjectId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSubjectMissingTopicsSummary(
  subjectId: number,
  startDate?: string,
  endDate?: string,
  enabled = true
) {
  const { data: missingTopics, ...queryState } = useSubjectMissingTopics(
    subjectId,
    startDate,
    endDate,
    enabled
  );

  const summary: SubjectMissingTopicsSummary | null = missingTopics
    ? {
        subjectId,
        subjectName: missingTopics[0]?.subjectName || "",
        totalMissing: missingTopics.length,
        studentsAffected: new Set(missingTopics.map((t) => t.studentId)).size,
        missingTopics,
        byWeek: missingTopics.reduce((acc, topic) => {
          if (!acc[topic.weekNumber]) {
            acc[topic.weekNumber] = [];
          }
          acc[topic.weekNumber].push(topic);
          return acc;
        }, {} as Record<number, MissingTopicDto[]>),
        byReason: missingTopics.reduce((acc, topic) => {
          acc[topic.reason] = (acc[topic.reason] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      }
    : null;

  return {
    ...queryState,
    data: summary,
    missingTopics: missingTopics || [],
  };
}

export function useSubjectMissingTopicsCurrentWeek(
  subjectId: number,
  enabled = true
) {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const startDate = weekStart.toISOString().split("T")[0];
  const endDate = weekEnd.toISOString().split("T")[0];

  return useSubjectMissingTopics(subjectId, startDate, endDate, enabled);
}

export function useStudentSubjectMissingTopics(
  studentId: number,
  subjectId: number,
  enabled = true
) {
  const { data: allMissingTopics, ...queryState } = useSubjectMissingTopics(
    subjectId,
    undefined,
    undefined,
    enabled
  );

  const studentMissingTopics = allMissingTopics
    ? allMissingTopics.filter((t) => t.studentId === studentId)
    : [];

  return {
    ...queryState,
    data: studentMissingTopics,
  };
}