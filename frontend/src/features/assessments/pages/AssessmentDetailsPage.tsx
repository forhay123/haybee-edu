// ============================================================
// FILE: AssessmentDetailsPage.tsx (CORRECTED)
// Location: frontend/src/features/assessments/pages/AssessmentDetailsPage.tsx
// ============================================================

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api/axios';
import { ArrowLeft, Clock, BookOpen, AlertCircle, Lock, CheckCircle, XCircle } from 'lucide-react';
import { useAssessmentAccess } from '../hooks/useAssessmentAccess';
import { useCurrentStudentProfileId } from '../../studentProfiles/hooks/useStudentProfiles';

interface Assessment {
  id: number;
  title: string;
  description?: string;
  subjectId: number;
  subjectName: string;
  lessonTopicId: number | null;
  lessonTopicTitle: string | null;
  totalMarks: number;
  passingMarks: number;
  durationMinutes: number;
  questionCount: number;
  hasSubmitted?: boolean;
  studentScore?: number;
  studentPassed?: boolean;
}

const formatTime = (isoString?: string) => {
  if (!isoString) return 'N/A';
  return new Date(isoString).toLocaleString();
};

export const AssessmentDetailsPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();

  const { studentProfileId, isLoading: loadingProfile } = useCurrentStudentProfileId();

  // Fetch assessment
  const { data: assessment, isLoading: assessmentLoading } = useQuery<Assessment>({
    queryKey: ['assessment', assessmentId, studentProfileId],
    queryFn: async () => {
      const res = await api.get(`/assessments/${assessmentId}`, {
        params: { studentProfileId }
      });
      return res.data;
    },
    enabled: !!assessmentId && !!studentProfileId,
  });

  // Check access
  const {
    canAccess,
    minutesUntilOpen,
    minutesRemaining,
    isAlreadySubmitted,
    isLocked,
    isOpen,
    isExpired,
    isNotYetOpen,
    accessData,
    isLoading: accessLoading
  } = useAssessmentAccess(Number(assessmentId) || 0, studentProfileId || 0);

  if (assessmentLoading || accessLoading || loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment details...</p>
        </div>
      </div>
    );
  }

  if (!studentProfileId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-800 font-medium">
            Unable to load student profile. Please log in again.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-800 font-medium">Assessment not found</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-blue-600 hover:underline"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ✅ Determine status badge
  const getStatusBadge = () => {
    if (isAlreadySubmitted || assessment.hasSubmitted) {
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        badgeBg: 'bg-green-100',
        label: 'Completed'
      };
    }
    if (isExpired) {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        badgeBg: 'bg-red-100',
        label: 'Expired'
      };
    }
    if (isNotYetOpen) {
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800',
        badgeBg: 'bg-yellow-100',
        label: 'Locked - Opens Soon'
      };
    }
    if (isOpen) {
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        badgeBg: 'bg-blue-100',
        label: 'Available Now'
      };
    }
    return {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-800',
      badgeBg: 'bg-gray-100',
      label: 'Not Available'
    };
  };

  const statusStyle = getStatusBadge();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className={`${statusStyle.bg} border ${statusStyle.border} rounded-lg p-6`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{assessment.title}</h1>
              {assessment.description && (
                <p className="text-gray-700">{assessment.description}</p>
              )}
            </div>
            {isAlreadySubmitted || assessment.hasSubmitted ? (
              <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 ml-4" />
            ) : isExpired ? (
              <XCircle className="w-8 h-8 text-red-600 flex-shrink-0 ml-4" />
            ) : isNotYetOpen ? (
              <Lock className="w-8 h-8 text-yellow-600 flex-shrink-0 ml-4" />
            ) : (
              <BookOpen className="w-8 h-8 text-blue-600 flex-shrink-0 ml-4" />
            )}
          </div>

          {/* Status Badge */}
          <div className={`inline-block ${statusStyle.badgeBg} ${statusStyle.text} px-4 py-2 rounded-full font-medium`}>
            {statusStyle.label}
          </div>
        </div>
      </div>

      {/* Assessment Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Assessment Details</h3>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Subject</p>
              <p className="text-lg font-medium text-gray-900">{assessment.subjectName}</p>
            </div>

            {assessment.lessonTopicTitle && (
              <div>
                <p className="text-sm text-gray-600">Lesson Topic</p>
                <p className="text-lg font-medium text-gray-900">{assessment.lessonTopicTitle}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Questions</p>
                <p className="text-lg font-medium text-gray-900">{assessment.questionCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Marks</p>
                <p className="text-lg font-medium text-gray-900">{assessment.totalMarks}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Passing Marks</p>
                <p className="text-lg font-medium text-gray-900">{assessment.passingMarks}</p>
              </div>
              {assessment.durationMinutes && (
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="text-lg font-medium text-gray-900">{assessment.durationMinutes} min</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Access Status Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Access Status</h3>

          <div className="space-y-4">
            {/* Completed State */}
            {(isAlreadySubmitted || assessment.hasSubmitted) && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">Completed</span>
                </div>
                <p className="text-sm text-green-700 mb-3">
                  You have already submitted this assessment.
                </p>
                {assessment.studentScore !== undefined && (
                  <div className="pt-3 border-t border-green-200">
                    <p className="text-sm text-gray-600">Your Score</p>
                    <p className="text-2xl font-bold text-green-600">
                      {assessment.studentScore}/{assessment.totalMarks}
                      <span className="text-sm font-normal ml-2">
                        ({((assessment.studentScore / assessment.totalMarks) * 100).toFixed(1)}%)
                      </span>
                    </p>
                    {assessment.studentPassed !== undefined && (
                      <p className={`text-sm mt-1 ${assessment.studentPassed ? 'text-green-600' : 'text-red-600'}`}>
                        {assessment.studentPassed ? '✅ Passed' : '❌ Failed'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Available State */}
            {isOpen && !isAlreadySubmitted && !assessment.hasSubmitted && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-800">Available Now</span>
                </div>
                <p className="text-sm text-blue-700 mb-4">
                  Assessment is available. {minutesRemaining !== null && `You have ${minutesRemaining} minutes remaining.`}
                </p>
                <button
                  onClick={() => navigate(`/assessments/student/${assessmentId}`)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Start Assessment
                </button>
              </div>
            )}

            {/* Expired State */}
            {isExpired && !isAlreadySubmitted && !assessment.hasSubmitted && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-red-800">Assessment Expired</span>
                </div>
                <p className="text-sm text-red-700">
                  Assessment window has closed. Submission is no longer accepted.
                </p>
                <div className="mt-3 p-2 bg-red-100 rounded text-sm text-red-800">
                  Window ended: {formatTime(accessData?.windowEnd)}
                </div>
              </div>
            )}

            {/* Not Yet Open State */}
            {isNotYetOpen && !isAlreadySubmitted && !assessment.hasSubmitted && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-5 h-5 text-yellow-600" />
                  <span className="font-semibold text-yellow-800">Not Yet Available</span>
                </div>
                {minutesUntilOpen !== null && minutesUntilOpen > 0 ? (
                  <p className="text-sm text-yellow-700">
                    Assessment will open in {minutesUntilOpen} minutes
                  </p>
                ) : (
                  <p className="text-sm text-yellow-700">
                    Assessment will open soon
                  </p>
                )}
                <div className="mt-3 p-2 bg-yellow-100 rounded text-sm text-yellow-800">
                  Opens at: {formatTime(accessData?.windowStart)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Time Window Information */}
      {accessData && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Time Window</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Window Opens</p>
              <p className="text-lg font-medium text-gray-900">
                {formatTime(accessData.windowStart)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Window Closes</p>
              <p className="text-lg font-medium text-gray-900">
                {formatTime(accessData.windowEnd)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Current Time</p>
              <p className="text-lg font-medium text-gray-900">
                {formatTime(accessData.currentTime)}
              </p>
            </div>
          </div>

          {accessData.gracePeriodActive && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>
                  <strong>Grace Period Active:</strong> You are still able to submit within the grace period.
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};