import { Assessment } from '../types/assessmentTypes';
import { AssessmentCard } from './AssessmentCard';
import { Loader2, Bell } from 'lucide-react';

interface AssessmentListProps {
  assessments: Assessment[];
  onAssessmentClick: (assessment: Assessment) => void;
  isLoading?: boolean;
  showStatus?: boolean;
  isTeacherView?: boolean;
  submissionCounts?: Record<number, number>; // ✅ NEW: Track pending submissions per assessment
}

export const AssessmentList: React.FC<AssessmentListProps> = ({
  assessments,
  onAssessmentClick,
  isLoading = false,
  showStatus = true,
  isTeacherView = false,
  submissionCounts = {}
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-md">
        <p className="text-gray-500 text-lg mb-2">No assessments available</p>
        {isTeacherView && (
          <p className="text-gray-400 text-sm">
            Click "Create Assessment" to add your first assessment
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {assessments.map((assessment) => {
        const pendingCount = submissionCounts[assessment.id] || 0;
        
        return (
          <div key={assessment.id} className="relative">
            {/* ✅ NEW: Show pending submissions badge for teachers */}
            {isTeacherView && pendingCount > 0 && (
              <div className="absolute -top-2 -right-2 z-10">
                <div className="bg-red-500 text-white rounded-full px-3 py-1 text-xs font-bold shadow-lg flex items-center gap-1 animate-pulse">
                  <Bell className="w-3 h-3" />
                  {pendingCount} new
                </div>
              </div>
            )}
            
            <AssessmentCard
              assessment={assessment}
              onClick={onAssessmentClick}
              showStatus={showStatus}
              isTeacherView={isTeacherView}
            />
          </div>
        );
      })}
    </div>
  );
};