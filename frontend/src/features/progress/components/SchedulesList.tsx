// src/features/progress/components/SchedulesList.tsx

import React, { useState } from 'react';
import { useSchedules, useDeleteSchedule } from '../hooks/useSchedules';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { Calendar, Trash2, Filter } from 'lucide-react';

export const SchedulesList: React.FC = () => {
  const [fromDate, setFromDate] = useState<string>(
    format(startOfWeek(new Date()), 'yyyy-MM-dd')
  );
  const [toDate, setToDate] = useState<string>(
    format(endOfWeek(new Date()), 'yyyy-MM-dd')
  );

  const { data: schedules, isLoading, error } = useSchedules(fromDate, toDate);
  const deleteSchedule = useDeleteSchedule();

  const handleDelete = (scheduleId: number) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      deleteSchedule.mutate(scheduleId);
    }
  };

  const groupedByDate = schedules?.reduce((acc, schedule) => {
    const date = schedule.scheduledDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(schedule);
    return acc;
  }, {} as Record<string, typeof schedules>);

  const sortedDates = Object.keys(groupedByDate || {}).sort();

  const getPriorityBadge = (priority?: number) => {
    const config: Record<number, { label: string; color: string; icon: string }> = {
      1: { label: 'Critical', color: 'bg-red-100 text-red-700', icon: '🔴' },
      2: { label: 'High', color: 'bg-orange-100 text-orange-700', icon: '🟠' },
      3: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700', icon: '🟡' },
      4: { label: 'Low', color: 'bg-green-100 text-green-700', icon: '🟢' },
    };
    
    const p = priority || 4;
    const badge = config[p] || config[4];
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon} {badge.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-gray-600" />
          <h3 className="font-semibold text-gray-800">Filter Schedules</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-700 font-medium">Total Schedules</p>
            <p className="text-2xl font-bold text-blue-900">
              {schedules?.length || 0}
            </p>
          </div>
          <Calendar size={48} className="text-blue-400" />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          Failed to load schedules: {error.message}
        </div>
      )}

      {/* Schedules List */}
      {!isLoading && !error && schedules && (
        <div className="space-y-6">
          {sortedDates.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Calendar size={48} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600">No schedules found for the selected period</p>
            </div>
          ) : (
            sortedDates.map((date) => {
              const daySchedules = groupedByDate![date];
              
              return (
                <div key={date} className="bg-white border rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b">
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </h3>
                  
                  <div className="space-y-3">
                    {daySchedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-gray-800">
                              {schedule.lessonTitle}
                            </h4>
                            {getPriorityBadge(schedule.priority)}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>{schedule.subjectName}</span>
                            <span>•</span>
                            <span>Period {schedule.periodNumber}</span>
                            {schedule.weight && schedule.weight > 1 && (
                              <>
                                <span>•</span>
                                <span className="text-blue-600 font-medium">
                                  Weight: {schedule.weight}x
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleDelete(schedule.id)}
                          disabled={deleteSchedule.isPending}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete schedule"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};