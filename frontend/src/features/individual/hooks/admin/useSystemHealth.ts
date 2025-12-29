// frontend/src/features/individual/hooks/admin/useSystemHealth.ts

import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../../api/analyticsApi";
import type { SystemHealthDto } from "../../api/analyticsApi";

// ============================================================
// QUERY KEYS
// ============================================================

export const systemHealthKeys = {
  all: ["system-health"] as const,
  current: () => ["system-health", "current"] as const,
  isHealthy: () => ["system-health", "is-healthy"] as const,
};

// ============================================================
// SYSTEM HEALTH HOOKS
// ============================================================

/**
 * Get system health status
 */
export function useSystemHealth() {
  return useQuery({
    queryKey: systemHealthKeys.current(),
    queryFn: () => analyticsApi.getSystemHealth(),
    staleTime: 1000 * 60 * 1, // 1 minute
    refetchInterval: 1000 * 60 * 2, // Auto-refetch every 2 minutes
  });
}

/**
 * Check if system is healthy (boolean result)
 */
export function useIsSystemHealthy() {
  return useQuery({
    queryKey: systemHealthKeys.isHealthy(),
    queryFn: () => analyticsApi.isSystemHealthy(),
    staleTime: 1000 * 60 * 1,
    refetchInterval: 1000 * 60 * 2,
  });
}

// ============================================================
// HELPER HOOKS WITH COMPUTED VALUES
// ============================================================

/**
 * Get system health with severity indicators
 */
export function useSystemHealthWithIndicators() {
  const { data, ...query } = useSystemHealth();

  const healthData = data ? {
    ...data,
    isCritical: data.overallStatus === "CRITICAL",
    hasWarnings: data.warnings > 0,
    hasCriticalIssues: data.criticalIssues > 0,
    totalIssues: data.criticalIssues + data.warnings,
    severity: data.criticalIssues > 0 
      ? "critical" 
      : data.warnings > 0 
      ? "warning" 
      : "healthy",
    color: data.criticalIssues > 0 
      ? "red" 
      : data.warnings > 0 
      ? "yellow" 
      : "green",
  } : undefined;

  return {
    ...query,
    data: healthData,
  };
}

/**
 * Get health indicators grouped by severity
 */
export function useHealthIndicatorsBySeverity() {
  const { data, ...query } = useSystemHealth();

  const groupedIndicators = data ? {
    critical: data.healthIndicators.filter(
      (indicator) => indicator.toLowerCase().includes("critical") || 
                     indicator.toLowerCase().includes("error")
    ),
    warning: data.healthIndicators.filter(
      (indicator) => indicator.toLowerCase().includes("warning") ||
                     indicator.toLowerCase().includes("issue")
    ),
    info: data.healthIndicators.filter(
      (indicator) => !indicator.toLowerCase().includes("critical") &&
                     !indicator.toLowerCase().includes("error") &&
                     !indicator.toLowerCase().includes("warning") &&
                     !indicator.toLowerCase().includes("issue")
    ),
  } : undefined;

  return {
    ...query,
    data: groupedIndicators,
  };
}

/**
 * Get health status summary for dashboard cards
 */
export function useHealthStatusSummary() {
  const { data, ...query } = useSystemHealth();

  const summary = data ? {
    status: data.overallStatus,
    statusLabel: data.overallStatus === "HEALTHY" 
      ? "System Healthy" 
      : data.overallStatus === "WARNING" 
      ? "System Issues Detected" 
      : "Critical System Issues",
    totalIssues: data.criticalIssues + data.warnings,
    criticalIssues: data.criticalIssues,
    warnings: data.warnings,
    missingTopics: data.totalMissingTopics,
    unresolvedConflicts: data.unresolvedConflicts,
    completionRate: data.completionRate,
    generationSuccessful: data.lastGenerationSuccessful,
    needsAttention: data.criticalIssues > 0 || !data.lastGenerationSuccessful,
    statusIcon: data.overallStatus === "HEALTHY" 
      ? "✅" 
      : data.overallStatus === "WARNING" 
      ? "⚠️" 
      : "❌",
    statusColor: data.overallStatus === "HEALTHY" 
      ? "green" 
      : data.overallStatus === "WARNING" 
      ? "yellow" 
      : "red",
  } : undefined;

  return {
    ...query,
    data: summary,
  };
}