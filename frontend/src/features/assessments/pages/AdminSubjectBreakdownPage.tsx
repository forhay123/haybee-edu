// ============================================
// FILE 2: AdminSubjectBreakdownPage.tsx
// ============================================
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminSubjectBreakdown } from '../hooks/useAdminAssessments';
import {
  BookOpen,
  FileText,
  TrendingUp,
  Award,
  Users,
  ArrowLeft,
  ChevronRight,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';

const AdminSubjectBreakdownPage: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useAdminSubjectBreakdown(Number(subjectId));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subject breakdown...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">Subject not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/admin/assessments/subjects-overview')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Subjects
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {data.subject.name} - Assessment Analysis
        </h1>
        <p className="text-gray-600">
          Comprehensive breakdown of all assessments and student performance
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-blue-50 rounded-lg shadow-md p-6 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <span className="text-3xl font-bold text-blue-900">
              {data.stats.totalAssessments}
            </span>
          </div>
          <p className="text-sm text-blue-800 font-medium">Total Assessments</p>
        </div>

        <div className="bg-green-50 rounded-lg shadow-md p-6 border-2 border-green-200">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-8 h-8 text-green-600" />
            <span className="text-3xl font-bold text-green-900">
              {data.stats.totalSubmissions}
            </span>
          </div>
          <p className="text-sm text-green-800 font-medium">Total Submissions</p>
        </div>

        <div className="bg-purple-50 rounded-lg shadow-md p-6 border-2 border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <span className="text-3xl font-bold text-purple-900">
              {data.stats.averageScore.toFixed(1)}%
            </span>
          </div>
          <p className="text-sm text-purple-800 font-medium">Average Score</p>
        </div>

        <div className="bg-indigo-50 rounded-lg shadow-md p-6 border-2 border-indigo-200">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-8 h-8 text-indigo-600" />
            <span className="text-3xl font-bold text-indigo-900">
              {data.stats.passRate.toFixed(1)}%
            </span>
          </div>
          <p className="text-sm text-indigo-800 font-medium">Pass Rate</p>
        </div>
      </div>

      {/* Top Performers + Struggling Students */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

        {/* Top Performers */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <Award className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Top Performers</h2>
          </div>

          <div className="space-y-3">
            {data.stats.topPerformers.map((student, index) => (
              <div
                key={student.studentId}
                className="flex items-center justify-between p-4 bg-green-50 rounded-lg hover:bg-green-100 transition cursor-pointer"
                onClick={() => navigate(`/admin/assessments/student/${student.studentId}/performance`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900">
                    {student.studentName}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-green-600">
                    {student.averageScore.toFixed(1)}%
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}

            {data.stats.topPerformers.length === 0 && (
              <p className="text-gray-500 text-center py-4">No data available</p>
            )}
          </div>
        </div>

        {/* Struggling Students */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-900">Needs Support</h2>
          </div>

          <div className="space-y-3">
            {data.stats.strugglingStudents.map((student, index) => (
              <div
                key={student.studentId}
                className="flex items-center justify-between p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition cursor-pointer"
                onClick={() => navigate(`/admin/assessments/student/${student.studentId}/performance`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900">
                    {student.studentName}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-orange-600">
                    {student.averageScore.toFixed(1)}%
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}

            {data.stats.strugglingStudents.length === 0 && (
              <p className="text-gray-500 text-center py-4">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Assessments List */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">All Assessments</h2>

        <div className="space-y-4">
          {data.assessments.map((assessment) => (
            <div
              key={assessment.id}
              className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-400 transition cursor-pointer"
              onClick={() => navigate(`/teacher/assessments/${assessment.id}`)}
            >
              <div className="flex items-start justify-between">

                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {assessment.title}
                  </h3>

                  {assessment.description && (
                    <p className="text-gray-600 mb-3">{assessment.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      <span>{assessment.type.replace(/_/g, ' ')}</span>
                    </div>

                    {assessment.lessonTopicTitle && (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>{assessment.lessonTopicTitle}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      <span>{assessment.totalMarks} marks</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>{assessment.questionCount} questions</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        assessment.published
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {assessment.published ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Published
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          Draft
                        </>
                      )}
                    </span>

                    {assessment.createdByName && (
                      <span className="text-xs text-gray-500">
                        Created by {assessment.createdByName}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-6 h-6 text-gray-400 mt-2" />
              </div>
            </div>
          ))}

          {data.assessments.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No assessments found for this subject</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Submissions</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assessment
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {data.submissions.slice(0, 10).map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {submission.studentName}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {submission.assessmentTitle}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={`text-sm font-bold ${
                        submission.passed ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {submission.score?.toFixed(1)} / {submission.totalMarks}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        submission.passed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {submission.passed ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Passed
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          Failed
                        </>
                      )}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                    {format(new Date(submission.submittedAt), 'MMM dd, yyyy')}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/teacher/assessments/submissions/${submission.id}/grade`);
                      }}
                      className="text-blue-600 hover:text-blue-900 font-medium text-sm"
                    >
                      View Details →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.submissions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No submissions found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSubjectBreakdownPage;