// src/features/progress/components/LessonStatsCards.tsx

import React from 'react';
import type { ComprehensiveLessonsReport } from '../api/comprehensiveLessonsApi';

interface LessonStatsCardsProps {
  report: ComprehensiveLessonsReport;
}

export const LessonStatsCards: React.FC<LessonStatsCardsProps> = ({ report }) => {
  const stats = [
    {
      label: 'Total Lessons',
      value: report.totalLessons,
      icon: '📚',
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      textColor: 'text-white',
    },
    {
      label: 'Completed',
      value: report.completedCount,
      percentage: report.completionRate,
      icon: '✅',
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      textColor: 'text-white',
    },
    {
      label: 'Missed',
      value: report.missedCount,
      percentage: report.missedRate,
      icon: '❌',
      color: 'bg-gradient-to-br from-red-500 to-red-600',
      textColor: 'text-white',
    },
    {
      label: 'In Progress',
      value: report.inProgressCount,
      icon: '⏳',
      color: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
      textColor: 'text-white',
    },
    {
      label: 'Scheduled',
      value: report.scheduledCount,
      icon: '📅',
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      textColor: 'text-white',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`${stat.color} ${stat.textColor} rounded-lg shadow-lg p-6 transform transition-transform hover:scale-105`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">{stat.icon}</span>
            {stat.percentage !== undefined && (
              <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">
                {stat.percentage.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="text-3xl font-bold mb-1">{stat.value}</div>
          <div className="text-sm opacity-90">{stat.label}</div>
        </div>
      ))}

      {/* Status Indicator Card */}
      <div className="md:col-span-3 lg:col-span-5">
        <div className={`rounded-lg shadow-lg p-6 ${
          report.isOnTrack
            ? 'bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-500'
            : report.isAtRisk
            ? 'bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-500'
            : 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-500'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">
                {report.isOnTrack ? '🎯' : report.isAtRisk ? '⚠️' : '📊'}
              </span>
              <div>
                <div className="text-xl font-bold text-gray-800">
                  {report.isOnTrack
                    ? 'On Track!'
                    : report.isAtRisk
                    ? 'Needs Attention'
                    : 'Making Progress'}
                </div>
                <div className="text-sm text-gray-600">
                  {report.isOnTrack
                    ? 'Great work! Keep up the momentum.'
                    : report.isAtRisk
                    ? 'Multiple missed lessons need review.'
                    : 'Continue working on pending lessons.'}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-bold text-gray-800">
                {/* ✅ FIX: Add null check and default value */}
                {report.onTrackRate !== undefined && report.onTrackRate !== null
                  ? report.onTrackRate.toFixed(1)
                  : '0.0'}%
              </div>
              <div className="text-xs text-gray-600">On Track Rate</div>
            </div>
          </div>

          {report.urgentLessons && report.urgentLessons.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-300">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span>🚨</span>
                <span className="font-medium">
                  {report.urgentLessons.length} lesson{report.urgentLessons.length > 1 ? 's' : ''} require immediate attention
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};