// frontend/src/features/individual/pages/teacher/TeacherIndividualStudentsPage.tsx

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  useTeacherStudentsGrouped,
  useTeacherDashboardStats,
  useTeacherStudentFilters,
} from "../../hooks/teacher/useTeacherStudents";
import { useAuth } from "../../../auth/useAuth";
import { isTeacher as checkIsTeacher } from "../../../auth/authHelpers";
import StudentTimetableCard from "../../components/teacher/StudentTimetableCard";
import { ProcessingStatus } from "../../types/individualTypes";

const TeacherIndividualStudentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isTeacherUser = checkIsTeacher(user);

  if (!isTeacherUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-4">
            You do not have permission to view this page.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProcessingStatus | "ALL">("ALL");
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);

  const { students, isLoading, error, totalStudents } = useTeacherStudentsGrouped();
  const { stats, isLoading: statsLoading } = useTeacherDashboardStats();
  const { applyFilters } = useTeacherStudentFilters();

  const filteredStudents = useMemo(() => {
    let filtered = students.filter((student) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (!student.studentName.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "ALL") {
        const hasMatchingStatus = student.timetables.some(
          (t) => t.processingStatus === statusFilter
        );
        if (!hasMatchingStatus) return false;
      }

      // Issues filter
      if (showOnlyIssues) {
        if (!student.hasFailedUploads && student.latestTimetable) {
          return false;
        }
      }

      return true;
    });

    return filtered;
  }, [students, searchQuery, statusFilter, showOnlyIssues]);

  const handleViewStudent = (studentId: number) => {
    navigate(`/teacher/individual/students/${studentId}`);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setShowOnlyIssues(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading students...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Error Loading Data
          </h1>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : "An error occurred"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            My Students' Timetables
          </h1>
          <p className="text-gray-600">
            Monitor and view timetable uploads for your assigned students
          </p>
        </div>

        {/* Dashboard Stats */}
        {!statsLoading && stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Students
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.totalStudents}
                  </p>
                </div>
                <div className="text-4xl">👥</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    With Timetables
                  </p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {stats.studentsWithTimetables}
                  </p>
                </div>
                <div className="text-4xl">✅</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Processing
                  </p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {stats.processingTimetables}
                  </p>
                </div>
                <div className="text-4xl">🔄</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Need Attention
                  </p>
                  <p className="text-3xl font-bold text-red-600 mt-2">
                    {stats.studentsNeedingAttention}
                  </p>
                </div>
                <div className="text-4xl">⚠️</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Students
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Student name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as ProcessingStatus | "ALL")
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showOnlyIssues"
                checked={showOnlyIssues}
                onChange={(e) => setShowOnlyIssues(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor="showOnlyIssues"
                className="text-sm font-medium text-gray-700"
              >
                Show only issues
              </label>
            </div>

            <button
              onClick={handleResetFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Reset
            </button>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredStudents.length} of {totalStudents} students
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
        </div>

        {/* Students Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => (
            <StudentTimetableCard
              key={student.studentId}
              student={student}
              onViewDetails={() => handleViewStudent(student.studentId)}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredStudents.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">👨‍🎓</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No students found
            </h3>
            <p className="text-gray-600">
              {searchQuery || statusFilter !== "ALL" || showOnlyIssues
                ? "Try adjusting your filters"
                : "You don't have any assigned students yet"}
            </p>
          </div>
        )}

        {/* Auto-refresh indicator */}
        {stats && stats.processingTimetables > 0 && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span className="text-sm">
              Auto-refreshing ({stats.processingTimetables} processing)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherIndividualStudentsPage;