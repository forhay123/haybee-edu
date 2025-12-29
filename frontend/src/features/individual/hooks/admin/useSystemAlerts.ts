// frontend/src/features/individual/hooks/admin/useSystemAlerts.ts

import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../../api/analyticsApi";
import type { AlertsDto, SystemAlert } from "../../api/analyticsApi";

// ============================================================
// QUERY KEYS
// ============================================================

export const systemAlertsKeys = {
  all: ["system-alerts"] as const,
  alerts: () => ["system-alerts", "all"] as const,
  critical: () => ["system-alerts", "critical"] as const,
  unacknowledged: () => ["system-alerts", "unacknowledged"] as const,
};

// ============================================================
// SYSTEM ALERTS HOOKS
// ============================================================

/**
 * Get high-priority alerts
 */
export function useSystemAlerts() {
  return useQuery({
    queryKey: systemAlertsKeys.alerts(),
    queryFn: () => analyticsApi.getHighPriorityAlerts(),
    staleTime: 1000 * 60 * 1, // 1 minute
    refetchInterval: 1000 * 60 * 2, // Auto-refetch every 2 minutes
  });
}

/**
 * Get critical alerts only
 */
export function useCriticalAlerts() {
  return useQuery({
    queryKey: systemAlertsKeys.critical(),
    queryFn: () => analyticsApi.getCriticalAlerts(),
    staleTime: 1000 * 60 * 1,
    refetchInterval: 1000 * 60 * 1, // More frequent for critical
  });
}

/**
 * Get unacknowledged alerts
 */
export function useUnacknowledgedAlerts() {
  return useQuery({
    queryKey: systemAlertsKeys.unacknowledged(),
    queryFn: () => analyticsApi.getUnacknowledgedAlerts(),
    staleTime: 1000 * 60 * 1,
    refetchInterval: 1000 * 60 * 2,
  });
}

// ============================================================
// HELPER HOOKS WITH COMPUTED VALUES
// ============================================================

/**
 * Get alerts grouped by severity
 */
export function useAlertsGroupedBySeverity() {
  const { data, ...query } = useSystemAlerts();

  const grouped = data ? {
    high: data.highPriorityAlerts.filter((alert) => alert.severity === "HIGH"),
    medium: data.highPriorityAlerts.filter((alert) => alert.severity === "MEDIUM"),
    low: data.highPriorityAlerts.filter((alert) => alert.severity === "LOW"),
    total: data.totalAlerts,
  } : undefined;

  return {
    ...query,
    data: grouped,
  };
}

/**
 * Get missing topic alerts with summary
 */
export function useMissingTopicAlerts() {
  const { data, ...query } = useSystemAlerts();

  const missingTopics = data ? {
    alerts: data.missingTopicAlerts,
    totalAffectedStudents: new Set(
      data.missingTopicAlerts.map((alert) => alert.studentId)
    ).size,
    totalMissingTopics: data.missingTopicAlerts.length,
    subjectsAffected: new Set(
      data.missingTopicAlerts.map((alert) => alert.subjectId)
    ).size,
    weeksAffected: new Set(
      data.missingTopicAlerts.map((alert) => alert.weekNumber)
    ).size,
  } : undefined;

  return {
    ...query,
    data: missingTopics,
  };
}

/**
 * Get conflict alerts with summary
 */
export function useConflictAlerts() {
  const { data, ...query } = useSystemAlerts();

  const conflicts = data ? {
    alerts: data.conflictAlerts,
    totalConflicts: data.conflictAlerts.length,
    studentsAffected: new Set(
      data.conflictAlerts.map((alert) => alert.studentId)
    ).size,
    conflictTypes: data.conflictAlerts.reduce((acc, alert) => {
      acc[alert.conflictType] = (acc[alert.conflictType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    severityBreakdown: data.conflictAlerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  } : undefined;

  return {
    ...query,
    data: conflicts,
  };
}

/**
 * Get alert summary for dashboard
 */
export function useAlertSummary() {
  const { data, ...query } = useSystemAlerts();

  const summary = data ? {
    totalAlerts: data.totalAlerts,
    criticalCount: data.highPriorityAlerts.filter(
      (alert) => alert.severity === "HIGH"
    ).length,
    unacknowledgedCount: data.highPriorityAlerts.filter(
      (alert) => !alert.acknowledged
    ).length,
    missingTopicCount: data.missingTopicAlerts.length,
    conflictCount: data.conflictAlerts.length,
    hasCriticalAlerts: data.highPriorityAlerts.some(
      (alert) => alert.severity === "HIGH"
    ),
    needsAttention: data.totalAlerts > 0,
    mostRecentAlert: data.highPriorityAlerts.length > 0
      ? data.highPriorityAlerts.sort(
          (a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0]
      : undefined,
  } : undefined;

  return {
    ...query,
    data: summary,
  };
}

/**
 * Get alerts requiring immediate action
 */
export function useUrgentAlerts() {
  const { data, ...query } = useSystemAlerts();

  const urgent = data ? {
    alerts: data.highPriorityAlerts.filter(
      (alert) => alert.severity === "HIGH" && !alert.acknowledged
    ),
    count: data.highPriorityAlerts.filter(
      (alert) => alert.severity === "HIGH" && !alert.acknowledged
    ).length,
    hasUrgent: data.highPriorityAlerts.some(
      (alert) => alert.severity === "HIGH" && !alert.acknowledged
    ),
  } : undefined;

  return {
    ...query,
    data: urgent,
  };
}