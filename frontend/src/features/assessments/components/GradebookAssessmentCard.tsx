// src/features/assessments/components/GradebookAssessmentCard.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, AlertTriangle, XCircle, FileText } from 'lucide-react';
import type { GradebookAssessmentDto } from '../types/gradebookTypes';
import {
  GradebookAccessStatus,
  getGradebookStatusColor,
  getGradebookStatusIcon,
  getGradebookWeightDisplay,
  formatDueDate
} from '../types/gradebookTypes';

interface GradebookAssessmentCardProps {
  assessment: GradebookAssessmentDto;
  onClick?: () => void;
  className?: string;
}

export const GradebookAssessmentCard: React.FC<GradebookAssessmentCardProps> = ({
  assessment,
  onClick,
  className = ''
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Navigate to assessment page
      if (assessment.hasSubmitted && assessment.submissionId) {
        navigate(`/submissions/${assessment.submissionId}/results`);
      } else if (assessment.isAccessible) {
        navigate(`/assessments/${assessment.id}`);
      }
    }
  };

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (assessment.isAccessible && !assessment.hasSubmitted) {
      navigate(`/assessments/take/${assessment.id}`)
    }
  };

  const handleViewResults = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (assessment.submissionId) {
      navigate(`/submissions/${assessment.submissionId}/results`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`bg-white rounded-lg shadow-md p-5 border-l-4 transition-all hover:shadow-lg cursor-pointer ${
        assessment.accessStatus === GradebookAccessStatus.COMPLETED
          ? 'border-green-500'
          : assessment.accessStatus === GradebookAccessStatus.OVERDUE
          ? 'border-red-500'
          : assessment.accessStatus === GradebookAccessStatus.DUE_SOON
          ? 'border-yellow-500'
          : 'border-blue-500'
      } ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {/* Status Badge */}
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${
              getGradebookStatusColor(assessment.accessStatus)
            }`}>
              <span>{getGradebookStatusIcon(assessment.accessStatus)}</span>
              <span>{assessment.accessStatus.replace('_', ' ')}</span>
            </span>

            {/* Type Badge */}
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
              {assessment.type}
            </span>

            {/* Weight Badge */}
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">
              {getGradebookWeightDisplay(assessment.type)} Weight
            </span>
          </div>

          <h3 className="text-lg font-bold text-gray-900 mb-1">
            {assessment.title}
          </h3>

          <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
            <span className="flex items-center gap-1">
              <span>📖</span>
              <span>{assessment.subjectName}</span>
            </span>
            {assessment.termName && (
              <span className="flex items-center gap-1">
                <span>📅</span>
                <span>{assessment.termName}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Due Date Info */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-600" />
            <div>
              <div className="text-xs text-gray-600">Due Date</div>
              <div className="text-sm font-semibold text-gray-900">
                {formatDueDate(assessment.dueDate)}
              </div>
            </div>
          </div>

          <div className={`text-right ${
            assessment.accessStatus === GradebookAccessStatus.OVERDUE 
              ? 'text-red-600' 
              : assessment.accessStatus === GradebookAccessStatus.DUE_SOON
              ? 'text-yellow-600'
              : 'text-gray-600'
          }`}>
            <div className="text-sm font-bold">{assessment.timeMessage}</div>
          </div>
        </div>
      </div>

      {/* Assessment Details */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">Questions:</span>
          <span className="font-semibold text-gray-900">{assessment.questionCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Total Marks:</span>
          <span className="font-semibold text-gray-900">{assessment.totalMarks}</span>
        </div>
        {assessment.durationMinutes && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">Duration:</span>
            <span className="font-semibold text-gray-900">{assessment.durationMinutes} mins</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Passing:</span>
          <span className="font-semibold text-gray-900">{assessment.passingMarks} marks</span>
        </div>
      </div>

      {/* Submission Status */}
      {assessment.hasSubmitted && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <div>
                <div className="text-sm font-semibold text-green-900">Submitted</div>
                {assessment.graded && assessment.score !== undefined && (
                  <div className="text-xs text-green-700">
                    Score: {assessment.score}/{assessment.totalMarks} ({assessment.percentage?.toFixed(1)}%)
                  </div>
                )}
              </div>
            </div>
            {assessment.passed !== undefined && (
              <span className={`text-xs font-semibold ${
                assessment.passed ? 'text-green-700' : 'text-red-700'
              }`}>
                {assessment.passed ? '✓ Passed' : '✗ Failed'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Warning for Overdue */}
      {assessment.accessStatus === GradebookAccessStatus.OVERDUE && !assessment.hasSubmitted && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">
            <strong>Overdue!</strong> This assessment is past the due date.
          </div>
        </div>
      )}

      {/* Warning for Due Soon */}
      {assessment.accessStatus === GradebookAccessStatus.DUE_SOON && !assessment.hasSubmitted && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <strong>Due Soon!</strong> Complete this assessment before the deadline.
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {!assessment.hasSubmitted && (
          <button
            onClick={handleStart}
            disabled={!assessment.isAccessible}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold text-white transition-colors flex items-center justify-center gap-2 ${
              assessment.isAccessible
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {assessment.isAccessible ? (
              <>
                <FileText className="w-4 h-4" />
                Start Assessment
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Not Available
              </>
            )}
          </button>
        )}

        {assessment.hasSubmitted && assessment.submissionId && (
          <button
            onClick={handleViewResults}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            View Results
          </button>
        )}
      </div>
    </div>
  );
};