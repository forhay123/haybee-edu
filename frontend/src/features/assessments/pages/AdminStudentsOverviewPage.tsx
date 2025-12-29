// src/features/assessments/pages/AdminStudentsOverviewPage.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAllSubmissions } from '../hooks/useAdminAssessments';
import {
  Users,
  ArrowLeft,
  Search,
  TrendingUp,
  TrendingDown,
  Award,
  ChevronRight
} from 'lucide-react';

const AdminStudentsOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: submissions = [], isLoading } = useAdminAllSubmissions();

  // Calculate student performance
  const studentPerformance = React.useMemo(() => {
    const studentMap = new Map();

    submissions.forEach((submission) => {
      const studentId = submission.studentId;
      const studentName = submission.studentName;

      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          studentId,
          studentName,
          totalAssessments: 0,
          passed: 0,
          failed: 0,
          totalScore: 0,
          averageScore: 0,
        });
      }

      const student = studentMap.get(studentId);
      student.totalAssessments += 1;
      
      if (submission.passed) {
        student.passed += 1;
      } else {
        student.failed += 1;
      }

      if (submission.percentage) {
        student.totalScore += submission.percentage;
      }
    });

    // Calculate averages
    studentMap.forEach((student) => {
      student.averageScore = student.totalAssessments > 0 
        ? student.totalScore / student.totalAssessments 
        : 0;
    });

    return Array.from(studentMap.values()).sort((a, b) => b.averageScore - a.averageScore);
  }, [submissions]);

  const filteredStudents = studentPerformance.filter(student =>
    student.studentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading student data...</p>
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
          Student Performance Overview
        </h1>
        <p className="text-gray-600">
          Individual student assessment analytics
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 rounded-lg shadow-md p-6 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-blue-600" />
            <span className="text-3xl font-bold text-blue-900">
              {studentPerformance.length}
            </span>
          </div>
          <p className="text-sm text-blue-800 font-medium">Total Students</p>
        </div>

        <div className="bg-green-50 rounded-lg shadow-md p-6 border-2 border-green-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <span className="text-3xl font-bold text-green-900">
              {studentPerformance.filter(s => s.averageScore >= 70).length}
            </span>
          </div>
          <p className="text-sm text-green-800 font-medium">High Performers</p>
        </div>

        <div className="bg-orange-50 rounded-lg shadow-md p-6 border-2 border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="w-8 h-8 text-orange-600" />
            <span className="text-3xl font-bold text-orange-900">
              {studentPerformance.filter(s => s.averageScore < 50).length}
            </span>
          </div>
          <p className="text-sm text-orange-800 font-medium">Need Support</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Students List */}
      <div className="space-y-4">
        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Students Found</h3>
            <p className="text-gray-600">
              {searchTerm 
                ? `No students match "${searchTerm}"` 
                : 'No student data available yet'}
            </p>
          </div>
        ) : (
          filteredStudents.map((student, index) => (
            <div
              key={student.studentId}
              onClick={() => navigate(`/admin/assessments/student/${student.studentId}/performance`)}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition p-6 border-l-4 border-blue-400 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  {/* Rank Badge */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                    index < 3 
                      ? 'bg-yellow-100 text-yellow-900' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    #{index + 1}
                  </div>

                  {/* Student Info */}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {student.studentName}
                    </h3>

                    <div className="grid grid-cols-4 gap-6">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Assessments</p>
                        <p className="text-lg font-bold text-gray-900">
                          {student.totalAssessments}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-600 mb-1">Passed</p>
                        <p className="text-lg font-bold text-green-600">
                          {student.passed}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-600 mb-1">Failed</p>
                        <p className="text-lg font-bold text-red-600">
                          {student.failed}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-600 mb-1">Average</p>
                        <p className={`text-lg font-bold ${
                          student.averageScore >= 70 
                            ? 'text-green-600' 
                            : student.averageScore >= 50 
                            ? 'text-yellow-600' 
                            : 'text-red-600'
                        }`}>
                          {student.averageScore.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Performance Badge */}
                  <div>
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                      student.averageScore >= 70 
                        ? 'bg-green-100 text-green-800' 
                        : student.averageScore >= 50 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      <Award className="w-4 h-4" />
                      {student.averageScore >= 70 
                        ? 'Excellent' 
                        : student.averageScore >= 50 
                        ? 'Good' 
                        : 'Needs Support'}
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-6 h-6 text-gray-400 ml-4" />
              </div>

              {/* Progress Bar */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600 font-medium">Overall Performance</span>
                  <span className="text-xs text-gray-600">
                    {student.averageScore.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      student.averageScore >= 70 
                        ? 'bg-green-600' 
                        : student.averageScore >= 50 
                        ? 'bg-yellow-600' 
                        : 'bg-red-600'
                    }`}
                    style={{ width: `${student.averageScore}%` }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminStudentsOverviewPage;