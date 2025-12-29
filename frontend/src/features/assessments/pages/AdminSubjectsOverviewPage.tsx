// src/features/assessments/pages/AdminSubjectsOverviewPage.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminOverviewStats } from '../hooks/useAdminAssessments';
import {
  BookOpen,
  TrendingUp,
  Award,
  ArrowLeft,
  ChevronRight,
  Search
} from 'lucide-react';

const AdminSubjectsOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: stats, isLoading } = useAdminOverviewStats();

  const filteredSubjects = stats?.subjectBreakdown.filter(subject =>
    subject.subjectName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subjects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/admin/assessments/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Subject Performance Overview
        </h1>
        <p className="text-gray-600">
          Assessment analytics across all subjects
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search subjects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSubjects.map((subject) => (
          <div
            key={subject.subjectId}
            onClick={() => navigate(`/admin/assessments/subject/${subject.subjectId}/breakdown`)}
            className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200 hover:border-blue-400 transition cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {subject.subjectName}
                </h3>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </div>

            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-blue-800 font-medium">Assessments</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">
                    {subject.assessmentCount}
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-green-800 font-medium">Submissions</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    {subject.submissionCount}
                  </p>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 font-medium">Average Score</span>
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
                  <div className="w-full bg-gray-200 rounded-full h-2">
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

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 font-medium">Pass Rate</span>
                    <span className={`text-lg font-bold ${
                      subject.passRate >= 70 
                        ? 'text-green-600' 
                        : subject.passRate >= 50 
                        ? 'text-yellow-600' 
                        : 'text-red-600'
                    }`}>
                      {subject.passRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        subject.passRate >= 70 
                          ? 'bg-green-600' 
                          : subject.passRate >= 50 
                          ? 'bg-yellow-600' 
                          : 'bg-red-600'
                      }`}
                      style={{ width: `${subject.passRate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="pt-3 border-t border-gray-200">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                  subject.averageScore >= 70 
                    ? 'bg-green-100 text-green-800' 
                    : subject.averageScore >= 50 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  <Award className="w-3 h-3" />
                  {subject.averageScore >= 70 
                    ? 'Excellent Performance' 
                    : subject.averageScore >= 50 
                    ? 'Moderate Performance' 
                    : 'Needs Improvement'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredSubjects.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Subjects Found</h3>
          <p className="text-gray-600">
            {searchTerm 
              ? `No subjects match "${searchTerm}"` 
              : 'No subjects available yet'}
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminSubjectsOverviewPage;