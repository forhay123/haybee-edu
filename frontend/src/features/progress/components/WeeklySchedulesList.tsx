import React, { useState } from 'react';
import { 
  useWeeklySchedules, 
  useDeleteWeeklySchedule, 
  useRegenerateSchedules 
} from '../hooks/useWeeklySchedules';
import { Trash2, RefreshCw, Calendar, Clock } from 'lucide-react';

const PRIORITY_COLORS: Record<number, { label: string; color: string; icon: string }> = {
  1: { label: 'Critical', color: 'bg-red-100 text-red-700', icon: '🔴' },
  2: { label: 'High', color: 'bg-orange-100 text-orange-700', icon: '🟠' },
  3: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700', icon: '🟡' },
  4: { label: 'Low', color: 'bg-green-100 text-green-700', icon: '🟢' },
};

export const WeeklySchedulesList: React.FC = () => {
  const { data: schedules, isLoading, error } = useWeeklySchedules();
  const deleteSchedule = useDeleteWeeklySchedule();
  const regenerateSchedules = useRegenerateSchedules();
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);

  const handleDelete = (scheduleId: number) => {
    if (window.confirm('Are you sure you want to delete this weekly schedule?')) {
      deleteSchedule.mutate(scheduleId);
    }
  };

  const handleRegenerate = (scheduleId: number) => {
    if (window.confirm('This will regenerate daily schedules for the next 4 weeks. Continue?')) {
      setRegeneratingId(scheduleId);
      regenerateSchedules.mutate(scheduleId, {
        onSettled: () => setRegeneratingId(null),
      });
    }
  };

  const getPriorityBadge = (priority?: number) => {
    const p = priority || 3;
    const badge = PRIORITY_COLORS[p] || PRIORITY_COLORS[3];
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon} {badge.label}
      </span>
    );
  };

  const formatTime = (time?: string) => {
    if (!time) return '-';
    return time.substring(0, 5);
  };

  const groupedByClass = schedules?.reduce((acc, schedule) => {
    const className = schedule.className || 'Unknown Class';
    if (!acc[className]) acc[className] = [];
    acc[className].push(schedule);
    return acc;
  }, {} as Record<string, typeof schedules>);

  const sortedClasses = Object.keys(groupedByClass || {}).sort();

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-700 font-medium">Total Weekly Schedules</p>
            <p className="text-2xl font-bold text-blue-900">
              {schedules?.length || 0}
            </p>
          </div>
          <Calendar size={48} className="text-blue-400" />
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          Failed to load weekly schedules: {error.message}
        </div>
      )}

      {!isLoading && !error && schedules && (
        <div className="space-y-6">
          {sortedClasses.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Calendar size={48} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600">No weekly schedules found</p>
              <p className="text-sm text-gray-500 mt-1">
                Create a weekly schedule to get started
              </p>
            </div>
          ) : (
            sortedClasses.map((className) => {
              const classSchedules = groupedByClass![className];
              
              return (
                <div key={className} className="bg-white border rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b">
                    {className}
                  </h3>
                  
                  <div className="space-y-3">
                    {classSchedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                              {schedule.dayOfWeek}
                            </span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                              Period {schedule.periodNumber}
                            </span>
                            {getPriorityBadge(schedule.priority)}
                            {schedule.weight && schedule.weight > 1 && (
                              <span className="text-xs text-blue-600 font-medium">
                                Weight: {schedule.weight}x
                              </span>
                            )}
                          </div>

                          <h4 className="font-medium text-gray-800 mb-1">
                            {schedule.subjectName}
                          </h4>
                          
                          {schedule.lessonTopicTitle && (
                            <p className="text-sm text-gray-600 mb-1">
                              📖 {schedule.lessonTopicTitle}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            {(schedule.startTime || schedule.endTime) && (
                              <div className="flex items-center gap-1">
                                <Clock size={14} />
                                <span>
                                  {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                                </span>
                              </div>
                            )}
                            
                            {schedule.teacherName && (
                              <>
                                <span>•</span>
                                <span>👨‍🏫 {schedule.teacherName}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleRegenerate(schedule.id!)}
                            disabled={regeneratingId === schedule.id}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Regenerate daily schedules"
                          >
                            <RefreshCw 
                              size={20} 
                              className={regeneratingId === schedule.id ? 'animate-spin' : ''} 
                            />
                          </button>
                          
                          <button
                            onClick={() => handleDelete(schedule.id!)}
                            disabled={deleteSchedule.isPending}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete schedule"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
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