// ============================================
// FILE 1: AdminStudentPerformancePage.tsx
// ============================================
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminStudentPerformance } from '../hooks/useAdminAssessments';
import {
  Award,
  TrendingUp,
  BookOpen,
  CheckCircle,
  XCircle,
  ArrowLeft,
  FileText,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

const AdminStudentPerformancePage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useAdminStudentPerformance(Number(studentId));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading student performance...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">Student not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/admin/assessments/students-overview')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Students
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {data.student.name} - Performance Analysis
        </h1>
        <p className="text-gray-600">
          Comprehensive assessment performance across all subjects
        </p>
      </div>

      {/* Overall Stats */}
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
            <CheckCircle className="w-8 h-8 text-green-600" />
            <span className="text-3xl font-bold text-green-900">
              {data.stats.passed}
            </span>
          </div>
          <p className="text-sm text-green-800 font-medium">Passed</p>
        </div>

        <div className="bg-red-50 rounded-lg shadow-md p-6 border-2 border-red-200">
          <div className="flex items-center justify-between mb-2">
            <XCircle className="w-8 h-8 text-red-600" />
            <span className="text-3xl font-bold text-red-900">
              {data.stats.failed}
            </span>
          </div>
          <p className="text-sm text-red-800 font-medium">Failed</p>
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
      </div>

      {/* Subject Performance */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Performance by Subject
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.stats.subjectPerformance.map((subject) => (
            <div
              key={subject.subjectId}
              className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition cursor-pointer"
              onClick={() => navigate(`/admin/assessments/subject/${subject.subjectId}/breakdown`)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{subject.subjectName}</h3>
                <Award className={`w-5 h-5 ${
                  subject.averageScore >= 70 
                    ? 'text-green-600' 
                    : subject.averageScore >= 50 
                    ? 'text-yellow-600' 
                    : 'text-red-600'
                }`} />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Average Score:</span>
                  <span className={`text-lg font-bold ${
                    subject.averageScore >= 70 
                      ? 'text-green-600' 
                      : subject.averageScore >= 50 
                      ? 'text-yellow-600' 
                      : 'text-red-600'
                  }`}>
                    {subject.averageScore.toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pass Rate:</span>
                  <span className={`text-sm font-semibold ${
                    subject.passRate >= 70 
                      ? 'text-green-600' 
                      : subject.passRate >= 50 
                      ? 'text-yellow-600' 
                      : 'text-red-600'
                  }`}>
                    {subject.passRate.toFixed(1)}%
                  </span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div
                    className={`h-2 rounded-full ${
                      subject.averageScore >= 70 
                        ? 'bg-green-600' 
                        : subject.averageScore >= 50 
                        ? 'bg-yellow-600' 
                        : 'bg-red-600'
                    }`}
                    style={{ width: `${subject.averageScore}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {data.stats.subjectPerformance.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No subject performance data available</p>
          </div>
        )}
      </div>

      {/* All Submissions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          All Assessment Submissions
        </h2>
        
        <div className="space-y-4">
          {data.submissions.map((submission) => (
            <div
              key={submission.id}
              className={`border-2 rounded-lg p-6 transition cursor-pointer ${
                submission.passed 
                  ? 'border-green-200 hover:border-green-400 bg-green-50' 
                  : 'border-red-200 hover:border-red-400 bg-red-50'
              }`}
              onClick={() => navigate(`/teacher/assessments/submissions/${submission.id}/grade`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {submission.assessmentTitle}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>
                        Submitted {format(new Date(submission.submittedAt), 'MMM dd, yyyy hh:mm a')}
                      </span>
                    </div>
                    {submission.gradedAt && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>
                          Graded {format(new Date(submission.gradedAt), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Score:</span>
                      <span className={`text-2xl font-bold ${
                        submission.passed ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {submission.score?.toFixed(1)} / {submission.totalMarks}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Percentage:</span>
                      <span className={`text-2xl font-bold ${
                        submission.passed ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {submission.percentage?.toFixed(1)}%
                      </span>
                    </div>
                    
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
                      submission.passed
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {submission.passed ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Passed
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          Failed
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <button
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition flex items-center gap-2 whitespace-nowrap"
                >
                  View Details
                  <FileText className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}

          {data.submissions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No submissions found for this student</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminStudentPerformancePage;