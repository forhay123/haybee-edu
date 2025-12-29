// frontend/src/features/individual/hooks/admin/useSystemDashboard.ts

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { analyticsApi } from "../../api/analyticsApi";
import type { SystemDashboardDto } from "../../api/analyticsApi";

export const useSystemDashboard = () => {
  const queryClient = useQueryClient();

  const useDashboard = (enabled = true) => {
    return useQuery<SystemDashboardDto>({
      queryKey: ["systemDashboard"],
      queryFn: () => analyticsApi.getSystemDashboard(),
      enabled,
      refetchInterval: 300000, // Refetch every 5 minutes
    });
  };

  const useSystemHealth = (enabled = true) => {
    return useQuery({
      queryKey: ["systemHealth"],
      queryFn: () => analyticsApi.getSystemHealth(),
      enabled,
      refetchInterval: 60000, // Refetch every minute
    });
  };

  const useHighPriorityAlerts = (enabled = true) => {
    return useQuery({
      queryKey: ["highPriorityAlerts"],
      queryFn: () => analyticsApi.getHighPriorityAlerts(),
      enabled,
      refetchInterval: 120000, // Refetch every 2 minutes
    });
  };

  const useWeeklyTrends = (enabled = true) => {
    return useQuery({
      queryKey: ["weeklyTrends"],
      queryFn: () => analyticsApi.getWeeklyTrends(),
      enabled,
    });
  };

  const refreshDashboard = () => {
    queryClient.invalidateQueries({ queryKey: ["systemDashboard"] });
    queryClient.invalidateQueries({ queryKey: ["systemHealth"] });
    queryClient.invalidateQueries({ queryKey: ["highPriorityAlerts"] });
  };

  return {
    useDashboard,
    useSystemHealth,
    useHighPriorityAlerts,
    useWeeklyTrends,
    refreshDashboard,
  };
};