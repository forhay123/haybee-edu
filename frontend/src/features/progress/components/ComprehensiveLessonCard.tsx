// src/features/progress/components/ComprehensiveLessonCard.tsx

import React from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import type { ComprehensiveLessonDto } from '../api/comprehensiveLessonsApi';

interface ComprehensiveLessonCardProps {
  lesson: ComprehensiveLessonDto;
}

export const ComprehensiveLessonCard: React.FC<ComprehensiveLessonCardProps> = ({ lesson }) => {
  const navigate = useNavigate();

  const getStatusBadge = () => {
    const badges = {
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', icon: '✅', label: 'Completed' },
      MISSED: { bg: 'bg-red-100', text: 'text-red-800', icon: '❌', label: 'Missed' },
      IN_PROGRESS: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⏳', label: 'In Progress' },
      SCHEDULED: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '📅', label: 'Scheduled' },
    };

    const badge = badges[lesson.status];
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        <span>{badge.icon}</span>
        <span>{badge.label}</span>
      </span>
    );
  };

  const handleViewResults = () => {
    // ✅ Navigate to submission results page
    if (lesson.submissionId) {
      navigate(`/submissions/${lesson.submissionId}/results`);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-5 border-l-4 transition-all hover:shadow-lg ${
      lesson.requiresImmediateAction
        ? 'border-red-500 bg-red-50'
        : lesson.status === 'COMPLETED'
        ? 'border-green-500'
        : lesson.status === 'MISSED'
        ? 'border-red-500'
        : lesson.status === 'IN_PROGRESS'
        ? 'border-yellow-500'
        : 'border-blue-500'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {getStatusBadge()}
            {lesson.requiresImmediateAction && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-600 text-white animate-pulse">
                🚨 Urgent
              </span>
            )}
            {lesson.assessmentOverdue && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                ⏰ Overdue
              </span>
            )}
          </div>

          <h3 className="text-lg font-bold text-gray-900 mb-1">
            {lesson.lessonTopicTitle}
          </h3>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <span>📖</span>
              <span>{lesson.subjectName}</span>
            </span>
            <span className="flex items-center gap-1">
              <span>📅</span>
              <span>{format(new Date(lesson.scheduledDate), 'MMM dd, yyyy')}</span>
            </span>
            <span className="flex items-center gap-1">
              <span>🕐</span>
              <span>Period {lesson.periodNumber}</span>
            </span>
          </div>
        </div>

        {lesson.priority && (
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
            lesson.priority === 1
              ? 'bg-red-100 text-red-800'
              : lesson.priority === 2
              ? 'bg-orange-100 text-orange-800'
              : lesson.priority === 3
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-green-100 text-green-800'
          }`}>
            {lesson.priority === 1 ? '🔴 Critical' : 
             lesson.priority === 2 ? '🟠 High' :
             lesson.priority === 3 ? '🟡 Medium' : '🟢 Low'}
          </div>
        )}
      </div>

      {/* Additional Info */}
      <div className="flex flex-wrap gap-2 mb-3 text-xs text-gray-600">
        {lesson.daysSinceScheduled > 0 && (
          <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
            <span>⏱️</span>
            <span>{lesson.daysSinceScheduled} day{lesson.daysSinceScheduled > 1 ? 's' : ''} ago</span>
          </span>
        )}
        {lesson.completedAt && (
          <span className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded">
            <span>✓</span>
            <span>Completed {format(new Date(lesson.completedAt), 'MMM dd')}</span>
          </span>
        )}
        {lesson.incompleteReason && (
          <span className="flex items-center gap-1 bg-red-100 text-red-800 px-2 py-1 rounded">
            <span>⚠️</span>
            <span>{lesson.incompleteReason}</span>
          </span>
        )}
      </div>

      {/* Assessment Info - Only show if completed with submission */}
      {lesson.status === 'COMPLETED' && lesson.submissionId && (
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-green-900 mb-1">
                ✅ Assessment Completed
              </div>
              {lesson.completedAt && (
                <div className="text-xs text-green-700">
                  Submitted on {format(new Date(lesson.completedAt), 'MMM dd, yyyy \'at\' h:mm a')}
                </div>
              )}
            </div>
            <button
              onClick={handleViewResults}
              className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 transition-colors"
            >
              View Results
            </button>
          </div>
        </div>
      )}

      {/* Assessment Available - Show if not completed */}
      {lesson.hasActiveAssessment && lesson.status !== 'COMPLETED' && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-blue-900 mb-1">
                📝 {lesson.assessmentTitle || 'Assessment Available'}
              </div>
              {lesson.assessmentWindowStart && lesson.assessmentWindowEnd && (
                <div className="text-xs text-blue-700">
                  Window: {format(new Date(lesson.assessmentWindowStart), 'MMM dd')} - {format(new Date(lesson.assessmentWindowEnd), 'MMM dd')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Missed Assessment - No action available */}
      {lesson.status === 'MISSED' && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <div className="flex items-center gap-2">
            <span className="text-red-600">❌</span>
            <div>
              <div className="text-sm font-semibold text-red-900">
                Assessment Window Closed
              </div>
              {lesson.incompleteReason && (
                <div className="text-xs text-red-700 mt-1">
                  {lesson.incompleteReason}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};