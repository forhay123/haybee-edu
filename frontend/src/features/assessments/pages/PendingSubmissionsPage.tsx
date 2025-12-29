// src/features/assessments/pages/PendingSubmissionsPage.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePendingSubmissions } from '../hooks/useGrading';
import { Clock, CheckCircle, AlertCircle, FileText, User } from 'lucide-react';
import { format } from 'date-fns';

const PendingSubmissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: submissions = [], isLoading } = usePendingSubmissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pending submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Pending Grading</h1>
        <p className="text-gray-600">
          Review and grade essay/theory question submissions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-yellow-50 rounded-lg shadow-md p-6 border-2 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-800 text-sm font-medium">Pending Submissions</p>
              <p className="text-3xl font-bold text-yellow-900">{submissions.length}</p>
            </div>
            <Clock className="w-12 h-12 text-yellow-600 opacity-50" />
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg shadow-md p-6 border-2 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-800 text-sm font-medium">Total Pending Answers</p>
              <p className="text-3xl font-bold text-blue-900">
                {submissions.reduce((sum, s) => sum + (s.pendingAnswersCount || 0), 0)}
              </p>
            </div>
            <FileText className="w-12 h-12 text-blue-600 opacity-50" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg shadow-md p-6 border-2 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-800 text-sm font-medium">Unique Students</p>
              <p className="text-3xl font-bold text-green-900">
                {new Set(submissions.map(s => s.studentId)).size}
              </p>
            </div>
            <User className="w-12 h-12 text-green-600 opacity-50" />
          </div>
        </div>
      </div>

      {/* Submissions List */}
      {submissions.length === 0 ? (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-900 mb-2">All Caught Up!</h2>
          <p className="text-green-700">No pending submissions to grade at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <div
              key={submission.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition p-6 border-l-4 border-yellow-400"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {submission.assessmentTitle}
                  </h3>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span className="font-medium">{submission.studentName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>
                        Submitted {format(new Date(submission.submittedAt), 'MMM dd, yyyy • hh:mm a')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 bg-yellow-100 px-3 py-1 rounded-full">
                      <AlertCircle className="w-4 h-4 text-yellow-700" />
                      <span className="text-sm font-semibold text-yellow-900">
                        {submission.pendingAnswersCount || 0} answers pending review
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Current Score: <span className="font-semibold">{submission.score?.toFixed(1) || 0}</span> / {submission.totalMarks}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/teacher/grade-submission/${submission.id}`)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition flex items-center gap-2 whitespace-nowrap"
                >
                  <FileText className="w-5 h-5" />
                  Grade Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingSubmissionsPage;