// src/features/progress/pages/DailyPlannerPage.tsx

import React, { useState } from 'react';
import { useMyDailyProgress } from '../hooks/useDailyPlanner';
import { DailyPlannerList } from '../components/DailyPlannerList';
import { AspirantProgressOverview } from '../components/AspirantProgressOverview';
import { ChevronLeft, ChevronRight, Calendar, RefreshCw } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';

export const DailyPlannerPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const dateString = format(selectedDate, 'yyyy-MM-dd');

  const { data: dailyProgress, isLoading, error, refetch } = useMyDailyProgress(dateString);

  const handlePreviousDay = () => {
    setSelectedDate((prev) => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setSelectedDate((prev) => addDays(prev, 1));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleRefresh = () => {
    refetch();
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const lessons = dailyProgress?.lessons || [];

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Daily Planner</h1>
        <p className="text-gray-600">Complete assessments to mark lessons as done</p>
      </div>

      {/* Date Navigation */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePreviousDay}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft size={24} className="text-gray-600" />
          </button>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-gray-600" />
              <span className="text-xl font-semibold text-gray-800">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </span>
            </div>

            {!isToday && (
              <button
                onClick={handleToday}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                Today
              </button>
            )}

            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw size={20} className={`text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <button
            onClick={handleNextDay}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Next day"
          >
            <ChevronRight size={24} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your daily plan...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load daily plan</h3>
          <p className="text-red-600 mb-4">{error.message}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && dailyProgress && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Lessons List */}
          <div className="lg:col-span-2">
            <DailyPlannerList lessons={lessons} />
          </div>

          {/* Sidebar - Progress Overview */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <AspirantProgressOverview lessons={lessons} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};