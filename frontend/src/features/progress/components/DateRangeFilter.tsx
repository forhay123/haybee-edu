// src/features/progress/components/DateRangeFilter.tsx

import React, { useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

interface DateRangeFilterProps {
  fromDate: string;
  toDate: string;
  onDateChange: (fromDate: string, toDate: string) => void;
}

type DateRangePreset = 'today' | 'week' | 'month' | 'custom';

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  fromDate,
  toDate,
  onDateChange,
}) => {
  const [preset, setPreset] = useState<DateRangePreset>('month');
  const [showCustom, setShowCustom] = useState(false);

  const handlePresetChange = (newPreset: DateRangePreset) => {
    setPreset(newPreset);
    setShowCustom(newPreset === 'custom');

    const today = new Date();
    let from: Date;
    let to: Date = today;

    switch (newPreset) {
      case 'today':
        from = today;
        break;
      case 'week':
        from = startOfWeek(today);
        to = endOfWeek(today);
        break;
      case 'month':
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case 'custom':
        return; // Don't auto-set dates for custom
      default:
        from = startOfMonth(today);
    }

    onDateChange(format(from, 'yyyy-MM-dd'), format(to, 'yyyy-MM-dd'));
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">📅 Date Range:</span>
        <div className="flex gap-2">
          <button
            onClick={() => handlePresetChange('today')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              preset === 'today'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => handlePresetChange('week')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              preset === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => handlePresetChange('month')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              preset === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => handlePresetChange('custom')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              preset === 'custom'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {showCustom && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">From:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => onDateChange(e.target.value, toDate)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">To:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => onDateChange(fromDate, e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500">
        Showing data from <strong>{format(new Date(fromDate), 'MMM dd, yyyy')}</strong> to{' '}
        <strong>{format(new Date(toDate), 'MMM dd, yyyy')}</strong>
      </div>
    </div>
  );
};