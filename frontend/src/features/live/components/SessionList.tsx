// src/features/live-sessions/components/SessionList.tsx
import React, { useState, useMemo } from 'react';
import { useLiveSessions, useUpcomingSessions } from '../hooks/useLiveSessions';
import { SessionCard } from './SessionCard';
import { getUserRole } from '@/utils/auth';

interface SessionListProps {
  filters?: {
    status?: string;
    subjectId?: number;
  };
  userRole?: 'TEACHER' | 'STUDENT' | 'ADMIN' | 'PARENT';
}

export const SessionList: React.FC<SessionListProps> = ({
  filters = {},
  userRole,
}) => {
  const effectiveRole =
    userRole || (getUserRole() as any) || 'STUDENT';

  const [currentTab, setCurrentTab] = useState<
    'upcoming' | 'past' | 'cancelled'
  >('upcoming');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // ✅ FIX: Return array for upcoming to include LIVE sessions
  const getStatusForTab = (): string | string[] => {
    switch (currentTab) {
      case 'upcoming':
        return ['SCHEDULED', 'LIVE']; // ✅ Array of statuses
      case 'past':
        return 'ENDED';
      case 'cancelled':
        return 'CANCELLED';
      default:
        return ['SCHEDULED', 'LIVE'];
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const getOneYearAhead = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  };

  const getOneYearBack = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split('T')[0];
  };

  const queryParams = useMemo(() => {
    if (effectiveRole === 'STUDENT' || effectiveRole === 'PARENT') {
      return undefined;
    }

    const params: any = {
      status: getStatusForTab(), // ✅ This will be array or string
    };

    if (filters.subjectId) {
      params.subjectId = filters.subjectId;
    }

    if (currentTab === 'upcoming') {
      params.dateFrom = today;
      params.dateTo = getOneYearAhead();
    }

    if (currentTab === 'past') {
      params.dateFrom = getOneYearBack();
      params.dateTo = today;
    }

    return params;
  }, [currentTab, filters.subjectId, effectiveRole, today]);

  // Run queries with enabled flags to prevent unnecessary requests
  const teacherQuery = useLiveSessions(queryParams);
  const studentQuery = useUpcomingSessions();

  const { data: sessions = [], isLoading, error, refetch } =
    effectiveRole === 'STUDENT' || effectiveRole === 'PARENT'
      ? studentQuery
      : teacherQuery;

  // ✅ Auto-refresh every 10 seconds to catch status changes (SCHEDULED → LIVE → ENDED)
  React.useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [refetch]);

  console.log('🔍 SessionList Debug:', {
    effectiveRole,
    currentTab,
    status: getStatusForTab(),
    queryParams,
    sessionsCount: sessions.length,
    isLoading,
    error,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">
          Loading sessions...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400 font-medium">
          Error loading sessions
        </p>
        <p className="text-red-500 dark:text-red-500 text-sm mt-1">
          {error instanceof Error
            ? error.message
            : 'Unknown error occurred'}
        </p>
      </div>
    );
  }

  const showTabs =
    effectiveRole === 'TEACHER' || effectiveRole === 'ADMIN';

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {showTabs ? (
          <div className="flex gap-2">
            {['upcoming', 'past', 'cancelled'].map((tab) => (
              <button
                key={tab}
                onClick={() => setCurrentTab(tab as any)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  currentTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}{' '}
                {currentTab === tab && `(${sessions.length})`}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            Upcoming Sessions ({sessions.length})
          </div>
        )}

        {/* Toggle */}
        <div className="flex gap-2">
          {['grid', 'list'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode as any)}
              className={`px-3 py-2 rounded-lg font-medium transition ${
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {sessions.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            No sessions found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {effectiveRole === 'STUDENT' &&
              'No upcoming classes scheduled for you'}
            {effectiveRole === 'TEACHER' &&
              currentTab === 'upcoming' &&
              'No upcoming sessions'}
            {effectiveRole === 'TEACHER' &&
              currentTab === 'past' &&
              'No past sessions'}
            {effectiveRole === 'TEACHER' &&
              currentTab === 'cancelled' &&
              'No cancelled sessions'}
          </p>
        </div>
      )}

      {/* Cards */}
      {sessions.length > 0 && (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-3'
          }
        >
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              userRole={effectiveRole}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}

      {sessions.length > 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
          Showing {sessions.length}{' '}
          {sessions.length === 1 ? 'session' : 'sessions'}
        </div>
      )}
    </div>
  );
};