// frontend/src/features/individual/hooks/admin/useWeeklyGenerationControl.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "../../../api/axios";

interface WeeklyGenerationRequest {
  termId: number;
  weekNumber: number;
  forceRegenerate?: boolean;
  studentIds?: number[];
}

interface WeeklyGenerationResponse {
  success: boolean;
  message: string;
  weekNumber: number;
  schedulesGenerated: number;
  studentsProcessed: number;
  errors: string[];
  warnings: string[];
  generatedAt: string;
}

export const useWeeklyGenerationControl = () => {
  const queryClient = useQueryClient();

  const generateWeeklySchedulesMutation = useMutation({
    mutationFn: (request: WeeklyGenerationRequest) =>
      axios.post<WeeklyGenerationResponse>("/individual/admin/generate-weekly", request)
        .then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["individualSchedule"] });
      queryClient.invalidateQueries({ queryKey: ["systemDashboard"] });
    },
  });

  const regenerateWeekMutation = useMutation({
    mutationFn: ({ termId, weekNumber }: { termId: number; weekNumber: number }) =>
      axios.post<WeeklyGenerationResponse>(
        `/individual/admin/regenerate-week/${weekNumber}`,
        { termId }
      ).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["individualSchedule"] });
    },
  });

  return {
    generateWeeklySchedules: generateWeeklySchedulesMutation.mutateAsync,
    regenerateWeek: regenerateWeekMutation.mutateAsync,
    isGenerating: generateWeeklySchedulesMutation.isPending,
    isRegenerating: regenerateWeekMutation.isPending,
  };
};