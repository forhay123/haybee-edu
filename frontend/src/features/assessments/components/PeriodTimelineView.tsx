// =================================================================
// PeriodTimelineView.tsx - FIXED (no infinite loop)
// Location: src/features/assessments/components/PeriodTimelineView.tsx
// =================================================================

import React, { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStudentSubjectPeriods } from '../api/multiPeriodApi';
import {
  Loader2,
  CheckCircle2,
  Clock,
  Hourglass,
  Lock,
  ChevronRight
} from 'lucide-react';

// Types
interface PeriodData {
  progressId: number;
  periodNumber: number;
  status: 'COMPLETED' | 'AVAILABLE' | 'WAITING_ASSESSMENT' | 'LOCKED';
  scheduledDate: string;
  canAccess: boolean;
  percentage?: number;
  requiresCustomAssessment: boolean;
  assessmentCreated: boolean;
}

interface PeriodTimelineViewProps {
  studentId: number;
  subjectId: number;
  onPeriodClick?: (period: PeriodData) => void;
}

export const PeriodTimelineView: React.FC<PeriodTimelineViewProps> = ({
  studentId,
  subjectId,
  onPeriodClick
}) => {
  // ✅ Fetch periods using React Query
  const { data: periods = [], isLoading } = useQuery({
    queryKey: ['studentSubjectPeriods', studentId, subjectId],
    queryFn: () => getStudentSubjectPeriods(studentId, subjectId),
    enabled: !!studentId && !!subjectId,
  });

  // ✅ Memoize click handler to prevent re-renders
  const handlePeriodClick = useCallback((period: PeriodData) => {
    if (onPeriodClick) {
      onPeriodClick(period);
    }
  }, [onPeriodClick]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="ml-2 text-gray-600">Loading timeline...</p>
      </div>
    );
  }

  if (!periods || periods.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        No periods found for this student and subject.
      </div>
    );
  }

  return (
    <div className="relative py-8">
      {/* Timeline Line */}
      <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2" />

      {/* Period Nodes */}
      <div className="relative flex justify-between">
        {periods.map((period, index) => {
          const isCompleted = period.status === 'COMPLETED';
          const isAvailable = period.status === 'AVAILABLE' && period.canAccess;
          const needsAssessment = period.status === 'WAITING_ASSESSMENT' && 
                                 period.requiresCustomAssessment && 
                                 !period.assessmentCreated;
          
          return (
            <div key={period.progressId} className="flex flex-col items-center">
              {/* Node */}
              <button
                onClick={() => handlePeriodClick(period)}
                className={`
                  relative z-10 w-16 h-16 rounded-full border-4 flex items-center justify-center
                  transition-all hover:scale-110 cursor-pointer
                  ${isCompleted
                    ? 'bg-green-500 border-green-600' 
                    : isAvailable
                    ? 'bg-blue-500 border-blue-600'
                    : needsAssessment
                    ? 'bg-yellow-400 border-yellow-500 animate-pulse'
                    : 'bg-gray-300 border-gray-400'}
                `}
                title={`Period ${period.periodNumber} - ${period.status}`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-8 h-8 text-white" />
                ) : isAvailable ? (
                  <Clock className="w-8 h-8 text-white" />
                ) : needsAssessment ? (
                  <Hourglass className="w-8 h-8 text-white" />
                ) : (
                  <Lock className="w-8 h-8 text-white" />
                )}
              </button>

              {/* Label */}
              <div className="mt-4 text-center">
                <div className="font-semibold">Period {period.periodNumber}</div>
                <div className="text-sm text-gray-600">
                  {new Date(period.scheduledDate).toLocaleDateString()}
                </div>
                {period.percentage !== undefined && period.percentage !== null && (
                  <div className="text-sm font-medium text-green-600 mt-1">
                    {period.percentage.toFixed(0)}%
                  </div>
                )}
                <div className="mt-2">
                  <span className={`
                    inline-block px-2 py-1 text-xs rounded-full
                    ${isCompleted
                      ? 'bg-green-100 text-green-800'
                      : isAvailable
                      ? 'bg-blue-100 text-blue-800'
                      : needsAssessment
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'}
                  `}>
                    {period.status}
                  </span>
                </div>
              </div>

              {/* Connection Arrow */}
              {index < periods.length - 1 && (
                <div className="absolute top-8 left-full w-full h-0.5 bg-gray-200">
                  <ChevronRight className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PeriodTimelineView;