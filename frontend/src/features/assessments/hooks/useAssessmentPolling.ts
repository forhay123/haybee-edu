// ============================================================
// FILE 6: useAssessmentPolling.ts (NEW)
// Location: frontend/src/features/progress/hooks/useAssessmentPolling.ts
// ============================================================

import { useEffect, useState, useCallback, useRef } from 'react';

interface CountdownTime {
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
}

/**
 * Hook for real-time countdown timer for assessment windows
 * Handles minute/second updates and expiration
 * 
 * Usage:
 * const countdown = useAssessmentCountdown(endTimeISO);
 * {countdown.minutes}:{countdown.seconds.toString().padStart(2, '0')}
 */
export const useAssessmentCountdown = (
  endTime: string | null | undefined,
  enabled: boolean = true
) => {
  const [countdown, setCountdown] = useState<CountdownTime>({
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
    isExpired: false
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateCountdown = useCallback(() => {
    if (!endTime) {
      setCountdown({
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        isExpired: false
      });
      return;
    }

    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const totalSeconds = Math.floor((end - now) / 1000);

    if (totalSeconds <= 0) {
      setCountdown({
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        isExpired: true
      });

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    setCountdown({
      minutes,
      seconds,
      totalSeconds,
      isExpired: false
    });
  }, [endTime]);

  useEffect(() => {
    if (!enabled || !endTime) return;

    // Initial update
    updateCountdown();

    // Set interval for updates (every second)
    intervalRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [endTime, enabled, updateCountdown]);

  return countdown;
};

/**
 * Hook to determine if time is running out (last 5 minutes)
 */
export const useIsTimeRunningOut = (
  endTime: string | null | undefined,
  warningThreshold: number = 5 // minutes
) => {
  const countdown = useAssessmentCountdown(endTime);

  return {
    isRunningOut: countdown.minutes < warningThreshold && !countdown.isExpired,
    minutesLeft: countdown.minutes,
    secondsLeft: countdown.seconds,
    isExpired: countdown.isExpired
  };
};

/**
 * Hook for polling multiple assessments at once
 */
export const useMultipleAssessmentPolling = (assessmentIds: number[]) => {
  const [polledAt, setPolledAt] = useState<Record<number, Date>>({});

  const triggerPoll = useCallback((assessmentId: number) => {
    setPolledAt(prev => ({
      ...prev,
      [assessmentId]: new Date()
    }));
  }, []);

  return {
    polledAt,
    triggerPoll,
    lastPollTime: Object.values(polledAt).sort((a, b) => b.getTime() - a.getTime())[0]
  };
};

/**
 * Hook to manage polling intervals efficiently
 * Prevents unnecessary polling and manages cleanup
 */
export const usePollManager = (
  assessmentId: number,
  pollingFn: () => Promise<any>,
  interval: number = 30000,
  enabled: boolean = true
) => {
  const [isPolling, setIsPolling] = useState(false);
  const [lastPolled, setLastPolled] = useState<Date | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const poll = useCallback(async () => {
    if (isPolling) return; // Prevent duplicate polls

    try {
      setIsPolling(true);
      setPollError(null);
      await pollingFn();
      setLastPolled(new Date());
    } catch (error: any) {
      setPollError(error.message || 'Polling failed');
    } finally {
      setIsPolling(false);
    }
  }, [pollingFn, isPolling]);

  useEffect(() => {
    if (!enabled || !assessmentId) return;

    // Initial poll
    poll();

    // Set up interval
    intervalRef.current = setInterval(poll, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [assessmentId, enabled, interval, poll]);

  const manualPoll = useCallback(async () => {
    await poll();
  }, [poll]);

  return {
    isPolling,
    lastPolled,
    pollError,
    manualPoll,
    clearError: () => setPollError(null)
  };
};