import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useAdminOverviewStats, 
  useAdminAllSubmissions,
  useAdminPendingGrading 
} from '../hooks/useAdminAssessments';
import {
  BookOpen,
  FileText,
  Clock,
  TrendingUp,
  Award,
  AlertCircle,
  CheckCircle,
  Users,
  Download,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import type { AdminSubmissionFilter } from '../api/adminAssessmentsApi';

interface RecentActivity {
  type: 'submission' | 'graded' | 'created';
  studentName?: string;
  teacherName?: string;
  assessmentTitle: string;
  timestamp: string;
  score?: number;
}

const AdminAssessmentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [filter] = useState<AdminSubmissionFilter>({});

  const { data: stats, isLoading: statsLoading } = useAdminOverviewStats();
  const { data: submissions = [] } = useAdminAllSubmissions(filter);
  const { data: pendingGrading = [] } = useAdminPendingGrading();

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Exporting data...', submissions);
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Assessment Oversight Dashboard
        </h1>
        <p className="text-gray-600">
          Monitor all assessments, grades, and student performance across subjects
        </p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-blue-50 rounded-lg shadow-md p-6 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <BookOpen className="w-8 h-8 text-blue-600" />
              <span className="text-3xl font-bold text-blue-900">
                {stats.totalAssessments}
              </span>
            </div>
            <p className="text-sm text-blue-800 font-medium">Total Assessments</p>
          </div>

          <div className="bg-green-50 rounded-lg shadow-md p-6 border-2 border-green-200">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-green-600" />
              <span className="text-3xl font-bold text-green-900">
                {stats.totalSubmissions}
              </span>
            </div>
            <p className="text-sm text-green-800 font-medium">Total Submissions</p>
          </div>

          <div className="bg-yellow-50 rounded-lg shadow-md p-6 border-2 border-yellow-200">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-yellow-600" />
              <span className="text-3xl font-bold text-yellow-900">
                {stats.pendingGrading}
              </span>
            </div>
            <p className="text-sm text-yellow-800 font-medium">Pending Grading</p>
          </div>

          <div className="bg-purple-50 rounded-lg shadow-md p-6 border-2 border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <span className="text-3xl font-bold text-purple-900">
                {stats.averageScore.toFixed(1)}%
              </span>
            </div>
            <p className="text-sm text-purple-800 font-medium">Average Score</p>
          </div>

          <div className="bg-indigo-50 rounded-lg shadow-md p-6 border-2 border-indigo-200">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-8 h-8 text-indigo-600" />
              <span className="text-3xl font-bold text-indigo-900">
                {stats.passRate.toFixed(1)}%
              </span>
            </div>
            <p className="text-sm text-indigo-800 font-medium">Pass Rate</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <button
          onClick={() => navigate('/admin/pending-grading')}
          className="bg-white rounded-lg shadow-md p-6 border-2 border-yellow-200 hover:border-yellow-400 transition text-left"
        >
          <div className="flex items-center justify-between mb-4">
            <Clock className="w-10 h-10 text-yellow-600" />
            <span className="text-2xl font-bold text-yellow-900">
              {pendingGrading.length}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Pending Grading
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Submissions awaiting teacher review
          </p>
          <div className="flex items-center text-yellow-600 font-medium">
            View All <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </button>

        <button
          onClick={() => navigate('/admin/assessments/subjects-overview')}
          className="bg-white rounded-lg shadow-md p-6 border-2 border-blue-200 hover:border-blue-400 transition text-left"
        >
          <div className="flex items-center justify-between mb-4">
            <BookOpen className="w-10 h-10 text-blue-600" />
            <span className="text-2xl font-bold text-blue-900">
              {stats?.subjectBreakdown.length || 0}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Subject Analysis
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Performance breakdown by subject
          </p>
          <div className="flex items-center text-blue-600 font-medium">
            View Subjects <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </button>

        <button
          onClick={() => navigate('/admin/assessments/students-overview')}
          className="bg-white rounded-lg shadow-md p-6 border-2 border-green-200 hover:border-green-400 transition text-left"
        >
          <div className="flex items-center justify-between mb-4">
            <Users className="w-10 h-10 text-green-600" />
            <AlertCircle className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Student Performance
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Individual student analytics
          </p>
          <div className="flex items-center text-green-600 font-medium">
            View Students <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </button>
      </div>

      {/* Subject Breakdown */}
      {stats && stats.subjectBreakdown.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Subject Performance Overview
            </h2>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assessments
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submissions
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Score
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pass Rate
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.subjectBreakdown.map((subject) => (
                  <tr key={subject.subjectId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {subject.subjectName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-gray-900 font-medium">
                        {subject.assessmentCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-gray-900 font-medium">
                        {subject.submissionCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`text-sm font-bold ${
                        subject.averageScore >= 70 
                          ? 'text-green-600' 
                          : subject.averageScore >= 50 
                          ? 'text-yellow-600' 
                          : 'text-red-600'
                      }`}>
                        {subject.averageScore.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        subject.passRate >= 70 
                          ? 'bg-green-100 text-green-800' 
                          : subject.passRate >= 50 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {subject.passRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => navigate(`/admin/assessments/subject/${subject.subjectId}`)}
                        className="text-blue-600 hover:text-blue-900 font-medium text-sm"
                      >
                        View Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {stats && stats.recentActivity.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Recent Activity
          </h2>
          
          <div className="space-y-4">
            {stats.recentActivity.slice(0, 10).map((activity: RecentActivity, index: number) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className={`mt-1 ${
                  activity.type === 'submission' 
                    ? 'text-blue-600' 
                    : activity.type === 'graded' 
                    ? 'text-green-600' 
                    : 'text-purple-600'
                }`}>
                  {activity.type === 'submission' && <FileText className="w-5 h-5" />}
                  {activity.type === 'graded' && <CheckCircle className="w-5 h-5" />}
                  {activity.type === 'created' && <BookOpen className="w-5 h-5" />}
                </div>
                
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    {activity.type === 'submission' && (
                      <>
                        <span className="font-semibold">{activity.studentName}</span>
                        {' '}submitted{' '}
                        <span className="font-semibold">{activity.assessmentTitle}</span>
                        {activity.score !== undefined && (
                          <span className="ml-2 text-gray-600">
                            (Score: {activity.score.toFixed(1)}%)
                          </span>
                        )}
                      </>
                    )}
                    {activity.type === 'graded' && (
                      <>
                        <span className="font-semibold">{activity.teacherName}</span>
                        {' '}graded{' '}
                        <span className="font-semibold">{activity.assessmentTitle}</span>
                      </>
                    )}
                    {activity.type === 'created' && (
                      <>
                        <span className="font-semibold">{activity.teacherName}</span>
                        {' '}created{' '}
                        <span className="font-semibold">{activity.assessmentTitle}</span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(activity.timestamp), 'MMM dd, yyyy hh:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAssessmentDashboard;