// ============================================================
// FILE 5: AssessmentCard.tsx - UPDATED
// Location: frontend/src/features/assessments/components/AssessmentCard.tsx
// ============================================================

import React from 'react';
import { Calendar, Clock, FileText, CheckCircle, XCircle, Eye, EyeOff, BookOpen } from 'lucide-react';
import { Assessment, AssessmentType } from '../types/assessmentTypes';
import { format } from 'date-fns';
import { AssessmentStatusBadge } from '../../../components/ui/assessmentStatusBadge';
import { CountdownBadge } from '../../../components/ui/countdownTimer';
import { useAssessmentAccess } from '../hooks/useAssessmentAccess';
import { CardLockOverlay } from './AssessmentLockPlaceholder';

interface AssessmentCardProps {
  assessment: Assessment;
  onClick: (assessment: Assessment) => void;
  showStatus?: boolean;
  isTeacherView?: boolean;
  studentProfileId?: number; // ✅ NEW: For access checking
  showAccessControl?: boolean; // ✅ NEW: Show access control features
  showCountdown?: boolean; // ✅ NEW: Show countdown timer
}

export const AssessmentCard: React.FC<AssessmentCardProps> = ({
  assessment,
  onClick,
  showStatus = true,
  isTeacherView = false,
  studentProfileId,
  showAccessControl = false,
  showCountdown = false
}) => {
  // ✅ NEW: Get access status if needed
  const { accessData, canAccess, isLocked } = useAssessmentAccess(
    assessment.id,
    studentProfileId || 0,
    showAccessControl && !!studentProfileId ? 30000 : undefined
  );

  const getTypeColor = (type: AssessmentType) => {
    const colors = {
      [AssessmentType.LESSON_TOPIC_ASSESSMENT]: 'bg-blue-100 text-blue-800',
      [AssessmentType.QUIZ]: 'bg-green-100 text-green-800',
      [AssessmentType.CLASSWORK]: 'bg-yellow-100 text-yellow-800',
      [AssessmentType.TEST1]: 'bg-orange-100 text-orange-800',
      [AssessmentType.TEST2]: 'bg-orange-100 text-orange-800',
      [AssessmentType.ASSIGNMENT]: 'bg-purple-100 text-purple-800',
      [AssessmentType.EXAM]: 'bg-red-100 text-red-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getTypeLabel = (type: AssessmentType) => {
    return type.replace(/_/g, ' ');
  };

  return (
    <div
      onClick={() => onClick(assessment)}
      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 relative"
    >
      {/* ✅ NEW: Lock overlay if access control is enabled and locked */}
      {showAccessControl && isLocked && (
        <CardLockOverlay accessData={accessData} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {assessment.title}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(assessment.type)}`}>
              {getTypeLabel(assessment.type)}
            </span>
            
            {/* Lesson Topic Badge */}
            {assessment.lessonTopicTitle && (
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                <BookOpen className="w-3 h-3 inline mr-1" />
                {assessment.lessonTopicTitle}
              </span>
            )}

            {/* ✅ NEW: Access Status Badge */}
            {showAccessControl && accessData && (
              <AssessmentStatusBadge accessData={accessData} size="sm" />
            )}
          </div>
        </div>
        
        {/* Status Icons */}
        {showStatus && !isTeacherView && assessment.hasSubmitted && (
          <div className="ml-3">
            {assessment.studentPassed ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <XCircle className="w-6 h-6 text-red-500" />
            )}
          </div>
        )}
        
        {/* Teacher View - Publish Status */}
        {isTeacherView && (
          <div className="ml-3">
            {assessment.published ? (
              <Eye className="w-6 h-6 text-green-500" />
            ) : (
              <EyeOff className="w-6 h-6 text-gray-400" />
            )}
          </div>
        )}
      </div>

      {/* Description */}
      {assessment.description && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {assessment.description}
        </p>
      )}

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <FileText className="w-4 h-4 mr-2" />
          <span>{assessment.questionCount} Questions</span>
        </div>
        
        {assessment.durationMinutes && (
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="w-4 h-4 mr-2" />
            <span>{assessment.durationMinutes} mins</span>
          </div>
        )}

        <div className="flex items-center text-sm text-gray-600">
          <span className="font-medium mr-2">Total:</span>
          <span>{assessment.totalMarks} marks</span>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <span className="font-medium mr-2">Pass:</span>
          <span>{assessment.passingMarks} marks</span>
        </div>
      </div>

      {/* ✅ NEW: Countdown Timer */}
      {showCountdown && showAccessControl && canAccess && accessData?.windowEnd && (
        <div className="mb-4">
          <CountdownBadge endTime={accessData.windowEnd} />
        </div>
      )}

      {/* Due Date */}
      {assessment.dueDate && (
        <div className="flex items-center text-sm text-gray-500 mb-3">
          <Calendar className="w-4 h-4 mr-2" />
          <span>Due: {format(new Date(assessment.dueDate), 'MMM dd, yyyy')}</span>
        </div>
      )}

      {/* Score Display - Student View */}
      {showStatus && !isTeacherView && assessment.hasSubmitted && assessment.studentScore !== undefined && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Your Score:</span>
            <span className={`text-lg font-bold ${assessment.studentPassed ? 'text-green-600' : 'text-red-600'}`}>
              {assessment.studentScore.toFixed(1)} / {assessment.totalMarks}
            </span>
          </div>
        </div>
      )}

      {/* Status Badge - Student View */}
      {showStatus && !isTeacherView && !showAccessControl && (
        <div className="mt-3">
          {assessment.hasSubmitted ? (
            <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              Submitted
            </span>
          ) : (
            <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
              Pending
            </span>
          )}
        </div>
      )}

      {/* Status Badge - Teacher View */}
      {isTeacherView && (
        <div className="mt-3 flex items-center justify-between">
          {assessment.published ? (
            <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              Published
            </span>
          ) : (
            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
              Draft
            </span>
          )}
          
          {/* Created by info */}
          {assessment.createdByName && (
            <span className="text-xs text-gray-500">
              by {assessment.createdByName}
            </span>
          )}
        </div>
      )}
    </div>
  );
};