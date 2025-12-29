import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../../components/ui/tooltip';
import type { PeriodProgressDto, TeacherSubjectOverviewDto } from '../types/customAssessmentTypes';
import { getTeacherSubjectOverview } from '../api/assessmentsApi';

interface MultiPeriodCompletionGridProps {
  subjectId: number;
  onCellClick?: (studentId: number, periodNumber: number) => void;
}

export const MultiPeriodCompletionGrid: React.FC<MultiPeriodCompletionGridProps> = ({
  subjectId,
  onCellClick
}) => {
  const { data: overview } = useQuery({
    queryKey: ['teacherSubjectOverview', subjectId],
    queryFn: () => getTeacherSubjectOverview(subjectId)
  });

  const getCellColor = (period: PeriodProgressDto) => {
    if (period.isCompleted) return 'bg-green-500';
    if (period.canAccess) return 'bg-blue-500';
    if (period.requiresCustomAssessment && !period.customAssessmentCreated) return 'bg-yellow-400';
    return 'bg-gray-300';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-3 border bg-gray-50 text-left sticky left-0 z-10">
              Student
            </th>
            {[1, 2, 3].map((num) => (
              <th key={num} className="p-3 border bg-gray-50 text-center">
                Period {num}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {overview?.students.map((student) => (
            <tr key={student.studentId} className="hover:bg-gray-50">
              <td className="p-3 border font-medium sticky left-0 bg-white z-10">
                {student.studentName}
              </td>
              {student.periods.map((period) => (
                <td
                  key={period.progressId}
                  className="p-2 border text-center"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onCellClick?.(student.studentId, period.periodNumber)}
                        className={`
                          w-12 h-12 rounded-lg ${getCellColor(period)}
                          hover:opacity-80 transition cursor-pointer
                          flex items-center justify-center text-white font-semibold
                        `}
                      >
                        {period.score !== undefined ? `${period.score}%` : '—'}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-sm">
                        <div className="font-semibold">{period.status}</div>
                        {period.completedAt && (
                          <div>Completed: {new Date(period.completedAt).toLocaleDateString()}</div>
                        )}
                        {period.score !== undefined && (
                          <div>Score: {period.score}%</div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};