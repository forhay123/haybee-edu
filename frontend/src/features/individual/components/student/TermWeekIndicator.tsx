// frontend/src/features/individual/components/student/TermWeekIndicator.tsx

import React from "react";
import { Calendar, TrendingUp } from "lucide-react";
import { useMyStatsThisWeek } from "../../hooks/student/useMyStats";

interface TermWeekIndicatorProps {
  studentProfileId: number;
}

export const TermWeekIndicator: React.FC<TermWeekIndicatorProps> = ({
  studentProfileId,
}) => {
  const { data: stats, isLoading } = useMyStatsThisWeek();

  if (isLoading || !stats) {
    return (
      <div className="bg-indigo-50 rounded-lg p-4 animate-pulse">
        <div className="h-6 bg-indigo-200 rounded w-1/2"></div>
      </div>
    );
  }

  // Calculate week number from stats
  const currentWeek = 5; // TODO: Get from API
  const totalWeeks = 13; // TODO: Get from API
  const progressPercentage = (currentWeek / totalWeeks) * 100;

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <div>
            <h4 className="font-semibold text-indigo-900">
              Term 1 - Week {currentWeek} of {totalWeeks}
            </h4>
            <p className="text-sm text-indigo-700">
              Jan 20 - 26, 2025
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center gap-1 text-indigo-600">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">
              {progressPercentage.toFixed(0)}% complete
            </span>
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-indigo-200 rounded-full h-2">
        <div
          className="bg-indigo-600 h-2 rounded-full transition-all"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
};

export default TermWeekIndicator;