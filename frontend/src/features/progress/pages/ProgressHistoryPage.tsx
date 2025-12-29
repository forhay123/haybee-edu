import React, { useState } from 'react';
import { useMyHistory } from '../hooks/useDailyPlanner';
import { LessonProgressDto } from '../api/dailyPlannerApi';
import { Calendar, CheckCircle2, XCircle, TrendingUp, Award } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

type DateRange = 'week' | 'month' | 'custom';

export const ProgressHistoryPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [fromDate, setFromDate] = useState<string>(
    format(startOfWeek(new Date()), 'yyyy-MM-dd')
  );
  const [toDate, setToDate] = useState<string>(
    format(endOfWeek(new Date()), 'yyyy-MM-dd')
  );
  const [filterCompleted, setFilterCompleted] = useState<'all' | 'completed' | 'incomplete'>('all');

  const { data: history, isLoading, error } = useMyHistory(fromDate, toDate);

  const handleRangeChange = (range: DateRange) => {
    setDateRange(range);
    const today = new Date();

    switch (range) {
      case 'week':
        setFromDate(format(startOfWeek(today), 'yyyy-MM-dd'));
        setToDate(format(endOfWeek(today), 'yyyy-MM-dd'));
        break;
      case 'month':
        setFromDate(format(startOfMonth(today), 'yyyy-MM-dd'));
        setToDate(format(endOfMonth(today), 'yyyy-MM-dd'));
        break;
    }
  };

  const filteredHistory = history?.filter((lesson) => {
    if (filterCompleted === 'completed') return lesson.completed;
    if (filterCompleted === 'incomplete') return !lesson.completed;
    return true;
  }) || [];

  const groupedByDate = filteredHistory.reduce((acc, lesson) => {
    const date = lesson.scheduledDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(lesson);
    return acc;
  }, {} as Record<string, LessonProgressDto[]>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  // Summary Statistics
  const totalLessons = filteredHistory.length;
  const completedLessons = filteredHistory.filter(l => l.completed).length;
  const completionRate = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  // Weighted statistics
  const totalWeight = filteredHistory.reduce((sum, l) => sum + (l.weight || 1), 0);
  const completedWeight = filteredHistory
    .filter(l => l.completed)
    .reduce((sum, l) => sum + (l.weight || 1), 0);
  const weightedRate = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;

  // Priority breakdown
  const criticalLessons = filteredHistory.filter(l => l.priority === 1);
  const completedCritical = criticalLessons.filter(l => l.completed).length;
  const criticalRate = criticalLessons.length > 0 
    ? (completedCritical / criticalLessons.length) * 100 
    : 0;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Progress History</h1>
        <p className="text-gray-600">Review your past lesson completion and track your progress over time</p>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Range Quick Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleRangeChange('week')}
                className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                  dateRange === 'week'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => handleRangeChange('month')}
                className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                  dateRange === 'month'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                This Month
              </button>
            </div>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setDateRange('custom');
              }}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setDateRange('custom');
              }}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterCompleted}
              onChange={(e) => setFilterCompleted(e.target.value as any)}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Lessons</option>
              <option value="completed">Completed</option>
              <option value="incomplete">Incomplete</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={18} className="text-gray-600" />
            <div className="text-sm text-gray-600">Total Lessons</div>
          </div>
          <div className="text-3xl font-bold text-gray-800">{totalLessons}</div>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={18} className="text-green-600" />
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="text-3xl font-bold text-green-600">{completedLessons}</div>
          <div className="text-xs text-gray-500 mt-1">{completionRate.toFixed(1)}%</div>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award size={18} className="text-blue-600" />
            <div className="text-sm text-gray-600">Weighted Rate</div>
          </div>
          <div className="text-3xl font-bold text-blue-600">{weightedRate.toFixed(1)}%</div>
          <div className="text-xs text-gray-500 mt-1">
            {completedWeight.toFixed(1)} / {totalWeight.toFixed(1)} pts
          </div>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-red-600" />
            <div className="text-sm text-gray-600">Critical Priority</div>
          </div>
          <div className="text-3xl font-bold text-red-600">{criticalRate.toFixed(0)}%</div>
          <div className="text-xs text-gray-500 mt-1">
            {completedCritical} / {criticalLessons.length} lessons
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading history...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Failed to load history: {error.message}</p>
        </div>
      )}

      {/* History List */}
      {!isLoading && !error && (
        <div className="space-y-6">
          {sortedDates.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Calendar size={48} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 font-medium mb-1">No lessons found</p>
              <p className="text-gray-500 text-sm">Try adjusting your filters or date range</p>
            </div>
          ) : (
            sortedDates.map((date) => {
              const lessons = groupedByDate[date];
              const dayCompleted = lessons.filter(l => l.completed).length;
              const dayTotal = lessons.length;
              const dayRate = (dayCompleted / dayTotal) * 100;

              return (
                <div key={date} className="bg-white border rounded-lg p-5">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">
                        {dayCompleted} / {dayTotal} completed
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        dayRate === 100 
                          ? 'bg-green-100 text-green-700'
                          : dayRate >= 75
                          ? 'bg-blue-100 text-blue-700'
                          : dayRate >= 50
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {dayRate.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className={`flex items-center justify-between p-3 rounded transition-colors ${
                          lesson.completed 
                            ? 'bg-green-50 hover:bg-green-100' 
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {lesson.completed ? (
                            <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
                          ) : (
                            <XCircle size={20} className="text-gray-400 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800 truncate">
                              {lesson.lessonTitle}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                              <span>{lesson.subjectName}</span>
                              <span>•</span>
                              <span>Period {lesson.periodNumber}</span>
                              {lesson.weight && lesson.weight > 1 && (
                                <>
                                  <span>•</span>
                                  <span className="text-blue-600 font-medium">
                                    Weight: {lesson.weight}x
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {lesson.completed && lesson.completedAt && (
                          <div className="text-xs text-gray-500 ml-3">
                            {format(new Date(lesson.completedAt), 'h:mm a')}
                          </div>
                        )}
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