// frontend/src/features/individual/hooks/student/useProgressHistory.ts

import { useQuery } from "@tanstack/react-query";
import { assessmentInstancesApi } from "../../api/assessmentInstancesApi";

export const useProgressHistory = () => {
  const useMyHistory = (from: string, to: string, enabled = true) => {
    return useQuery({
      queryKey: ["progressHistory", "me", from, to],
      queryFn: () => assessmentInstancesApi.getMyProgressHistory(from, to),
      enabled: enabled && !!from && !!to,
    });
  };

  const useMyStats = (fromDate?: string, toDate?: string, enabled = true) => {
    return useQuery({
      queryKey: ["myStats", fromDate, toDate],
      queryFn: () => assessmentInstancesApi.getMyStats(fromDate, toDate),
      enabled,
    });
  };

  return {
    useMyHistory,
    useMyStats,
  };
};