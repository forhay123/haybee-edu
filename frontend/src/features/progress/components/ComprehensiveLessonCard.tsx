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

  const handleViewAssessment = () => {
    if (lesson.assessmentId) {
      navigate(`/assessments/${lesson.assessmentId}`);
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

      {/* Assessment Info */}
      {lesson.hasActiveAssessment && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-blue-900 mb-1">
                📝 {lesson.assessmentTitle || 'Assessment Available'}
              </div>
              {lesson.assessmentWindowStart && lesson.assessmentWindowEnd && (
                <div className="text-xs text-blue-700">
                  Available: {format(new Date(lesson.assessmentWindowStart), 'MMM dd')} - {format(new Date(lesson.assessmentWindowEnd), 'MMM dd')}
                </div>
              )}
            </div>
            {lesson.assessmentId && (
              <button
                onClick={handleViewAssessment}
                className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors"
              >
                View Assessment
              </button>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-200">
        {lesson.canStillComplete && (
          <button
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
            onClick={() => {/* Handle complete action */}}
          >
            Mark Complete
          </button>
        )}
        {lesson.assessmentId && (
          <button
            onClick={handleViewAssessment}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
          >
            Take Assessment
          </button>
        )}
        {lesson.status === 'MISSED' && !lesson.canStillComplete && (
          <button
            className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded cursor-not-allowed"
            disabled
          >
            Cannot Complete
          </button>
        )}
      </div>
    </div>
  );
};