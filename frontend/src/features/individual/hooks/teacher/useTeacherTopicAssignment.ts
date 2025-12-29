// ============================================================
// FILE 4: useTeacherTopicAssignment.ts
// Path: frontend/src/features/individual/hooks/teacher/useTeacherTopicAssignment.ts
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "../../../../api/axios";

interface TopicAssignmentDto {
  progressId: number;
  studentId: number;
  studentName: string;
  lessonTopicId?: number;
  lessonTopicTitle: string;
  scheduledDate: string;
  periodNumber: number;
  weekNumber: number;
  isAssigned: boolean;
}

interface AssignTopicRequest {
  progressId: number;
  lessonTopicId: number;
}

export function useTeacherPendingAssignments(
  subjectId: number,
  weekNumber?: number,
  enabled = true
) {
  return useQuery<TopicAssignmentDto[]>({
    queryKey: ["teacher", "subject", subjectId, "pendingAssignments", weekNumber],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (weekNumber) params.weekNumber = weekNumber;

      const res = await axios.get(
        `/individual/teacher/subject/${subjectId}/pending-assignments`,
        { params }
      );
      return res.data;
    },
    enabled: enabled && !!subjectId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAssignTopicMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: AssignTopicRequest) => {
      const res = await axios.post(
        `/individual/teacher/assign-topic`,
        request
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher", "pendingAssignments"] });
      queryClient.invalidateQueries({ queryKey: ["teacher", "student"] });
    },
  });
}

export function useBulkAssignTopicsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requests: AssignTopicRequest[]) => {
      const res = await axios.post(
        `/individual/teacher/bulk-assign-topics`,
        requests
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher"] });
    },
  });
}