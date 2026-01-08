// src/features/progress/components/DailyLessonCard.tsx

import React from 'react';
import { LessonProgressDto } from '../api/dailyPlannerApi';
import { useAssessmentAccess } from '@/features/assessments/hooks/useAssessmentAccess';
import { CheckCircle, Clock, BookOpen, Lock, AlertCircle, Calendar, XCircle } from 'lucide-react';
import { CustomBadge as Badge } from '@/components/ui/custom-badge';
import { useNavigate } from 'react-router-dom';

interface DailyLessonCardProps {
  lesson: LessonProgressDto;
  isLoading?: boolean;
}

export const DailyLessonCard: React.FC<DailyLessonCardProps> = ({ 
  lesson, 
  isLoading 
}) => {
  const navigate = useNavigate();
  
  const studentProfileId = 1; // TODO: Get from auth context
  const { 
    accessData,
    canAccess,
    minutesRemaining,
    minutesUntilOpen,
    isLocked,
    isAlreadySubmitted,
    isLoading: isChecking
  } = useAssessmentAccess(
    lesson.assessmentId || 0,
    studentProfileId,
    30000 // Poll every 30 seconds
  );

  // ✅ Detect missed status
  const now = new Date();
  const isIncomplete = lesson.incomplete;
  const isMissed = lesson.incompleteReason === 'MISSED_GRACE_PERIOD';
  const windowEnd = lesson.assessmentWindowEnd ? new Date(lesson.assessmentWindowEnd) : null;
  const gracePeriodEnd = lesson.gracePeriodEnd ? new Date(lesson.gracePeriodEnd) : windowEnd;
  
  // Check if lesson is truly missed (grace period ended and not completed)
  const isMissedByTime = !lesson.completed && windowEnd && now > (gracePeriodEnd || windowEnd);
  const showMissedStatus = isMissed || isIncomplete || isMissedByTime;

  const handleAccessAssessment = () => {
    if (lesson.assessmentId && canAccess) {
      navigate(`/assessments/lesson/${lesson.assessmentId}`);
    }
  };

  const getPriorityColor = (priority?: number) => {
    if (!priority) return 'bg-gray-100 text-gray-600';
    if (priority >= 80) return 'bg-red-100 text-red-600';
    if (priority >= 60) return 'bg-orange-100 text-orange-600';
    if (priority >= 40) return 'bg-yellow-100 text-yellow-600';
    return 'bg-green-100 text-green-600';
  };

  const getPriorityLabel = (priority?: number) => {
    if (!priority) return 'Normal';
    if (priority >= 80) return 'Critical';
    if (priority >= 60) return 'High';
    if (priority >= 40) return 'Medium';
    return 'Low';
  };

  const hasAssessment = !!lesson.assessmentId;

  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        lesson.completed
          ? 'bg-green-50 border-green-200'
          : showMissedStatus
          ? 'bg-red-50 border-red-200'
          : isLocked
          ? 'bg-gray-50 border-gray-300'
          : canAccess
          ? 'bg-blue-50 border-blue-300'
          : 'bg-white border-gray-200 hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
              Period {lesson.periodNumber}
            </span>
            {lesson.priority !== undefined && (
              <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(lesson.priority)}`}>
                {getPriorityLabel(lesson.priority)}
              </span>
            )}
            {lesson.weight !== undefined && (
              <span className="text-xs text-gray-500">
                Weight: {lesson.weight}%
              </span>
            )}
            
            {/* ✅ Assessment Status Badge - Updated with Missed */}
            {hasAssessment && (
              <Badge variant={
                lesson.completed ? 'success' : 
                showMissedStatus ? 'destructive' :
                canAccess ? 'default' : 
                'secondary'
              }>
                {lesson.completed ? '✓ Completed' : 
                 showMissedStatus ? '❌ Missed' :
                 canAccess ? '🔵 Available Now' : 
                 minutesUntilOpen && minutesUntilOpen > 0 ? '⏰ Upcoming' :
                 'Scheduled'}
              </Badge>
            )}
          </div>

          {/* Lesson Title */}
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            {lesson.lessonTitle}
          </h3>

          {/* Subject & Topic */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
            <div className="flex items-center gap-1">
              <BookOpen size={14} />
              <span>{lesson.subjectName}</span>
            </div>
            {lesson.topicName && (
              <span className="text-gray-400">• {lesson.topicName}</span>
            )}
          </div>

          {/* Assessment Access Info */}
          {hasAssessment && (
            <div className="mt-3 space-y-2">
              {/* Completed State */}
              {lesson.completed && lesson.completedAt && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded">
                  <CheckCircle size={16} />
                  <span>Assessment submitted on {new Date(lesson.completedAt).toLocaleString()}</span>
                </div>
              )}

              {/* ✅ NEW: Missed State */}
              {showMissedStatus && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded border border-red-200">
                  <XCircle size={16} />
                  <span className="font-medium">
                    {lesson.incompleteReason === 'MISSED_GRACE_PERIOD' 
                      ? 'Assessment window and grace period have ended'
                      : 'Assessment window has closed'}
                  </span>
                </div>
              )}

              {/* Assessment Window Info */}
              {(lesson.assessmentWindowStart || lesson.assessmentWindowEnd) && !lesson.completed && !showMissedStatus && (
                <div className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded">
                  <div className="flex items-center gap-2">
                    <Clock size={14} />
                    <span>
                      Window: {lesson.assessmentWindowStart && new Date(lesson.assessmentWindowStart).toLocaleTimeString()} - {lesson.assessmentWindowEnd && new Date(lesson.assessmentWindowEnd).toLocaleTimeString()}
                    </span>
                  </div>
                  {lesson.gracePeriodEnd && (
                    <div className="mt-1 text-gray-500">
                      Grace period ends: {new Date(lesson.gracePeriodEnd).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              )}

              {/* Locked State - Not Yet Available */}
              {!lesson.completed && !showMissedStatus && isLocked && (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded">
                  <Lock size={16} />
                  <span>
                    {accessData?.reason || 'Assessment will be available at the scheduled date and time'}
                  </span>
                  {minutesUntilOpen !== null && minutesUntilOpen > 0 && (
                    <span className="ml-2 font-medium">
                      (Opens in {minutesUntilOpen} minutes)
                    </span>
                  )}
                </div>
              )}

              {/* Available Now */}
              {!lesson.completed && !showMissedStatus && canAccess && (
                <>
                  <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded border border-blue-200">
                    <Calendar size={16} />
                    <span className="font-medium">Assessment is available now!</span>
                  </div>
                  
                  {minutesRemaining !== null && minutesRemaining > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock size={16} />
                      <span>Time remaining: {minutesRemaining} minutes</span>
                    </div>
                  )}

                  {accessData?.gracePeriodActive && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded">
                      <AlertCircle size={16} />
                      <span>Grace period active - submit soon!</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* No Assessment - Cannot Complete */}
          {!hasAssessment && !lesson.completed && (
            <div className="mt-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">
                <AlertCircle size={16} />
                <span>Assessment not yet assigned to this lesson. Contact your instructor.</span>
              </div>
            </div>
          )}

          {/* Completed without assessment (shouldn't happen in production) */}
          {!hasAssessment && lesson.completed && lesson.completedAt && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded mt-3">
              <CheckCircle size={16} />
              <span>Completed on {new Date(lesson.completedAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="ml-4 flex flex-col gap-2">
          {/* Start Assessment Button */}
          {hasAssessment && canAccess && !lesson.completed && !showMissedStatus && (
            <button
              onClick={handleAccessAssessment}
              disabled={isChecking}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isChecking ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Checking...
                </>
              ) : (
                'Start Assessment'
              )}
            </button>
          )}

          {/* Completed Indicator */}
          {lesson.completed && (
            <div className="flex items-center justify-center p-2 rounded-full bg-green-100">
              <CheckCircle size={28} className="text-green-600" fill="currentColor" />
            </div>
          )}

          {/* ✅ NEW: Missed Indicator */}
          {showMissedStatus && (
            <div className="flex items-center justify-center p-2 rounded-full bg-red-100">
              <XCircle size={28} className="text-red-600" />
            </div>
          )}

          {/* Locked Indicator */}
          {!lesson.completed && !showMissedStatus && !canAccess && hasAssessment && (
            <div className="flex items-center justify-center p-2 rounded-full bg-gray-100">
              <Lock size={28} className="text-gray-400" />
            </div>
          )}

          {/* No Assessment - Show Warning Icon */}
          {!hasAssessment && !lesson.completed && (
            <div className="flex items-center justify-center p-2 rounded-full bg-gray-100" title="Assessment not assigned">
              <AlertCircle size={28} className="text-gray-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};