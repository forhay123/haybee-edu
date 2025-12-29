// src/features/progress/components/StatusFilter.tsx

import React from 'react';

interface StatusFilterProps {
  selectedStatus: string | null;
  onStatusChange: (status: string | null) => void;
  counts?: {
    all: number;
    completed: number;
    missed: number;
    inProgress: number;
    scheduled: number;
  };
}

export const StatusFilter: React.FC<StatusFilterProps> = ({
  selectedStatus,
  onStatusChange,
  counts,
}) => {
  const statuses = [
    { value: null, label: 'All Lessons', icon: '📚', color: 'bg-gray-100 text-gray-800' },
    { value: 'COMPLETED', label: 'Completed', icon: '✅', color: 'bg-green-100 text-green-800' },
    { value: 'MISSED', label: 'Missed', icon: '❌', color: 'bg-red-100 text-red-800' },
    { value: 'IN_PROGRESS', label: 'In Progress', icon: '⏳', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'SCHEDULED', label: 'Scheduled', icon: '📅', color: 'bg-blue-100 text-blue-800' },
  ];

  const getCount = (status: string | null) => {
    if (!counts) return 0;
    switch (status) {
      case null:
        return counts.all;
      case 'COMPLETED':
        return counts.completed;
      case 'MISSED':
        return counts.missed;
      case 'IN_PROGRESS':
        return counts.inProgress;
      case 'SCHEDULED':
        return counts.scheduled;
      default:
        return 0;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-medium text-gray-700">🎯 Filter by Status:</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {statuses.map((status) => {
          const count = getCount(status.value);
          const isSelected = selectedStatus === status.value;

          return (
            <button
              key={status.value || 'all'}
              onClick={() => onStatusChange(status.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isSelected
                  ? 'ring-2 ring-blue-500 shadow-md scale-105'
                  : 'hover:shadow'
              } ${status.color}`}
            >
              <span>{status.icon}</span>
              <span>{status.label}</span>
              {counts && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  isSelected ? 'bg-white/50' : 'bg-white/80'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};