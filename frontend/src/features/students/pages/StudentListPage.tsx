// frontend/src/features/students/pages/StudentListPage.tsx

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import { 
  Search, 
  Filter, 
  Users, 
  BookOpen, 
  AlertCircle, 
  TrendingUp, 
  ChevronRight,
  FileText,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { 
  useTeacherLessons, 
  useTeacherStats,
  useAdminLessons,
  useAdminStats
} from '../../progress/hooks/useComprehensiveLessons';
import type { TeacherLessonFilters } from '../../progress/api/comprehensiveLessonsApi';

interface StudentWithProgress {
  studentId: number;
  studentName: string;
  totalLessons: number;
  completedLessons: number;
  incompleteLessons: number;
  averageScore?: number;
  lastActive?: string;
}

export const StudentListPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'completion' | 'incomplete'>('name');
  const [subjectId, setSubjectId] = useState<number | undefined>();
  const [classId, setClassId] = useState<number | undefined>();

  // Check if user is teacher/admin
  const roles = user?.roles || [];
  const isTeacher = roles.some(r => ['TEACHER', 'ROLE_TEACHER'].includes(r.toUpperCase()));
  const isAdmin = roles.some(r => ['ADMIN', 'ROLE_ADMIN', 'SUPER_ADMIN', 'ROLE_SUPER_ADMIN'].includes(r.toUpperCase()));

  // Build filters for fetching lessons
  const filters: TeacherLessonFilters = useMemo(() => ({
    subjectId,
    classId,
  }), [subjectId, classId]);

  // ✅ FIXED: Fetch data based on role - teachers and admins use different endpoints
  const teacherLessonsQuery = useTeacherLessons(filters, { enabled: isTeacher });
  const teacherStatsQuery = useTeacherStats(filters, { enabled: isTeacher });
  
  const adminLessonsQuery = useAdminLessons(filters, { enabled: isAdmin });
  const adminStatsQuery = useAdminStats(filters, { enabled: isAdmin });

  // ✅ Select the appropriate query based on role
  const { data: allLessons, isLoading, error } = isTeacher 
    ? teacherLessonsQuery 
    : adminLessonsQuery;
    
  const { data: stats } = isTeacher 
    ? teacherStatsQuery 
    : adminStatsQuery;

  // Group lessons by student and calculate progress
  const studentsWithProgress = useMemo((): StudentWithProgress[] => {
    if (!allLessons || allLessons.length === 0) return [];

    const studentMap = new Map<number, StudentWithProgress>();

    allLessons.forEach(lesson => {
      const studentId = lesson.studentId!;
      const studentName = lesson.studentName || 'Unknown Student';

      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          studentId,
          studentName,
          totalLessons: 0,
          completedLessons: 0,
          incompleteLessons: 0,
          lastActive: lesson.scheduledDate,
        });
      }

      const student = studentMap.get(studentId)!;
      student.totalLessons++;

      if (lesson.status === 'COMPLETED') {
        student.completedLessons++;
      } else if (lesson.status === 'MISSED') {
        student.incompleteLessons++;
      }

      // Track most recent activity
      if (new Date(lesson.scheduledDate) > new Date(student.lastActive || '2000-01-01')) {
        student.lastActive = lesson.scheduledDate;
      }
    });

    return Array.from(studentMap.values());
  }, [allLessons]);

  // Filter students by search term
  const filteredStudents = useMemo(() => {
    let students = studentsWithProgress;

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      students = students.filter(s => 
        s.studentName.toLowerCase().includes(term) ||
        s.studentId.toString().includes(term)
      );
    }

    // Sort
    students.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.studentName.localeCompare(b.studentName);
        case 'completion':
          const aRate = a.totalLessons > 0 ? a.completedLessons / a.totalLessons : 0;
          const bRate = b.totalLessons > 0 ? b.completedLessons / b.totalLessons : 0;
          return bRate - aRate;
        case 'incomplete':
          return b.incompleteLessons - a.incompleteLessons;
        default:
          return 0;
      }
    });

    return students;
  }, [studentsWithProgress, searchTerm, sortBy]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    return {
      totalStudents: studentsWithProgress.length,
      avgCompletion: studentsWithProgress.length > 0
        ? Math.round(
            (studentsWithProgress.reduce((sum, s) => 
              sum + (s.totalLessons > 0 ? (s.completedLessons / s.totalLessons) * 100 : 0), 0
            ) / studentsWithProgress.length)
          )
        : 0,
      studentsAtRisk: studentsWithProgress.filter(s => s.incompleteLessons > 5).length,
      totalIncompleteLessons: studentsWithProgress.reduce((sum, s) => sum + s.incompleteLessons, 0),
    };
  }, [studentsWithProgress]);

  if (!isTeacher && !isAdmin) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <p className="text-yellow-800 font-medium text-lg">Access Denied</p>
          <p className="text-yellow-700 text-sm mt-2">
            You need teacher or admin permissions to view the student list.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading students...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-800 font-medium">Failed to load students</p>
          <p className="text-red-700 text-sm mt-2">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Users className="w-8 h-8" />
          Student List
        </h1>
        <p className="text-gray-600">
          {isAdmin ? 'Manage and monitor all students' : 'Monitor your students\' progress'}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Students</p>
              <p className="text-3xl font-bold text-blue-600">{summaryStats.totalStudents}</p>
            </div>
            <Users className="w-12 h-12 text-blue-200" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Avg Completion</p>
              <p className="text-3xl font-bold text-green-600">{summaryStats.avgCompletion}%</p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-200" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">At Risk</p>
              <p className="text-3xl font-bold text-red-600">{summaryStats.studentsAtRisk}</p>
            </div>
            <AlertCircle className="w-12 h-12 text-red-200" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Incomplete</p>
              <p className="text-3xl font-bold text-yellow-600">{summaryStats.totalIncompleteLessons}</p>
            </div>
            <BookOpen className="w-12 h-12 text-yellow-200" />
          </div>
        </div>
      </div>

      {/* Global Stats from API */}
      {stats && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Overview Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Lessons</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalLessons}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-green-600">{stats.completionRate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Students</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalStudents}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Students At Risk</p>
              <p className="text-2xl font-bold text-red-600">{stats.studentsAtRisk}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name or student ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="name">Name</option>
              <option value="completion">Completion Rate</option>
              <option value="incomplete">Incomplete Lessons</option>
            </select>
          </div>
        </div>

        {/* Class & Subject Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Class ID:</label>
            <input
              type="number"
              placeholder="Filter by class"
              value={classId || ''}
              onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : undefined)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-32"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Subject ID:</label>
            <input
              type="number"
              placeholder="Filter by subject"
              value={subjectId || ''}
              onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : undefined)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-32"
            />
          </div>
          {(classId || subjectId) && (
            <button
              onClick={() => {
                setClassId(undefined);
                setSubjectId(undefined);
              }}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing <strong>{filteredStudents.length}</strong> of <strong>{studentsWithProgress.length}</strong> students
        </p>
      </div>

      {/* Student List */}
      {filteredStudents.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-700 text-lg font-medium mb-2">No students found</p>
          <p className="text-gray-500 text-sm">
            {searchTerm ? 'Try adjusting your search' : 'No students have been assigned lessons yet'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Lessons
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Incomplete
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completion Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student) => {
                const completionRate = student.totalLessons > 0 
                  ? Math.round((student.completedLessons / student.totalLessons) * 100) 
                  : 0;
                const isAtRisk = student.incompleteLessons > 5;

                return (
                  <tr 
                    key={student.studentId}
                    className={`hover:bg-gray-50 transition ${isAtRisk ? 'bg-red-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-700 font-semibold">
                            {student.studentName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {student.studentName}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {student.studentId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.totalLessons}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-600">
                          {student.completedLessons}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <AlertCircle className={`w-4 h-4 ${isAtRisk ? 'text-red-500' : 'text-yellow-500'}`} />
                        <span className={`text-sm font-medium ${isAtRisk ? 'text-red-600' : 'text-yellow-600'}`}>
                          {student.incompleteLessons}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                          <div
                            className={`h-2 rounded-full ${
                              completionRate >= 80 
                                ? 'bg-green-500' 
                                : completionRate >= 50 
                                ? 'bg-yellow-500' 
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${completionRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {completionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        {student.lastActive 
                          ? new Date(student.lastActive).toLocaleDateString()
                          : 'N/A'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => navigate(`/progress/comprehensive/${student.studentId}`)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View all lessons"
                      >
                        <BookOpen className="w-5 h-5 inline" />
                      </button>
                      <button
                        onClick={() => navigate(`/progress/incomplete-lessons/${student.studentId}`)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="View incomplete lessons"
                      >
                        <AlertCircle className="w-5 h-5 inline" />
                      </button>
                      <button
                        onClick={() => navigate(`/students/${student.studentId}`)}
                        className="text-gray-600 hover:text-gray-900"
                        title="View student details"
                      >
                        <ChevronRight className="w-5 h-5 inline" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};