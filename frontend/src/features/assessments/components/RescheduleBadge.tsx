// src/features/assessments/components/RescheduleBadge.tsx

import React from 'react';
import { format } from 'date-fns';
import type { RescheduleBadgeProps } from '../types/rescheduleTypes';
import { getRescheduleStatusConfig, formatTimeDifference } from '../types/rescheduleTypes';

export const RescheduleBadge: React.FC<RescheduleBadgeProps> = ({ 
  reschedule, 
  variant = 'detailed' 
}) => {
  const statusConfig = getRescheduleStatusConfig(reschedule);

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.color}`}>
        <span>{statusConfig.icon}</span>
        <span>{statusConfig.label}</span>
      </div>
    );
  }

  // Detailed view
  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 rounded p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔄</span>
          <span className="text-sm font-semibold text-blue-900">
            Rescheduled Assessment
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>
        <span className="text-xs text-blue-700">
          {formatTimeDifference(reschedule.originalWindowStart, reschedule.newWindowStart)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        {/* Original Window - Struck through */}
        <div className="bg-red-50 border border-red-200 rounded p-2">
          <div className="text-xs font-semibold text-red-900 mb-1 flex items-center gap-1">
            <span>❌</span>
            <span>Original (Cancelled)</span>
          </div>
          <div className="text-red-700 line-through">
            {format(new Date(reschedule.originalWindowStart), 'MMM dd, h:mm a')} - 
            {format(new Date(reschedule.originalWindowEnd), 'h:mm a')}
          </div>
        </div>

        {/* New Window - Highlighted */}
        <div className="bg-green-50 border border-green-200 rounded p-2">
          <div className="text-xs font-semibold text-green-900 mb-1 flex items-center gap-1">
            <span>✅</span>
            <span>New Window</span>
          </div>
          <div className="text-green-700 font-semibold">
            {format(new Date(reschedule.newWindowStart), 'MMM dd, h:mm a')} - 
            {format(new Date(reschedule.newWindowEnd), 'h:mm a')}
          </div>
          {reschedule.newGraceEnd && (
            <div className="text-xs text-green-600 mt-1">
              Grace until {format(new Date(reschedule.newGraceEnd), 'h:mm a')}
            </div>
          )}
        </div>
      </div>

      {/* Reason */}
      {reschedule.reason && (
        <div className="bg-blue-100 rounded p-2">
          <div className="text-xs font-semibold text-blue-900 mb-1">Reason:</div>
          <div className="text-sm text-blue-800">{reschedule.reason}</div>
        </div>
      )}

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-blue-700">
        <span>
          Rescheduled by {reschedule.teacherName || 'Teacher'} on{' '}
          {format(new Date(reschedule.rescheduledAt), 'MMM dd, yyyy')}
        </span>
        {reschedule.cancelledAt && (
          <span className="text-red-600 font-semibold">
            Cancelled on {format(new Date(reschedule.cancelledAt), 'MMM dd, yyyy')}
          </span>
        )}
      </div>
    </div>
  );
};