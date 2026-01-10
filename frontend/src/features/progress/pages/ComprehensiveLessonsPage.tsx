// src/features/progress/pages/ComprehensiveLessonsPage.tsx

import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { RootState } from '../../../store/store';
import { 
  useMyComprehensiveLessons, 
  useTeacherLessons, 
  useAdminLessons,
  useTeacherStats,
  useAdminStats,
  useComprehensiveLessons,
  useStatusStats,
  useTeacherStudentLessons,
  useTeacherStudentStats
} from '../hooks/useComprehensiveLessons';
import { ComprehensiveLessonCard } from '../components/ComprehensiveLessonCard';
import type { TeacherLessonFilters } from '../api/comprehensiveLessonsApi';

export const ComprehensiveLessonsPage: React.FC = () => {
  const today = new Date();
  const navigate = useNavigate();
  
  // ✅ Get studentId from URL params (for teacher/admin viewing specific student)
  const { studentId: urlStudentId } = useParams<{ studentId: string }>();
  
  // Get user role from Redux store
  const user = useSelector((state: RootState) => state.auth.user);
  const roles = user?.roles || [];
  
  // Role detection
  const isStudent = roles.some(r => ['STUDENT', 'ROLE_STUDENT'].includes(r.toUpperCase()));
  const isTeacher = roles.some(r => ['TEACHER', 'ROLE_TEACHER'].includes(r.toUpperCase()));
  const isAdmin = roles.some(r => ['ADMIN', 'ROLE_ADMIN', 'SUPER_ADMIN', 'ROLE_SUPER_ADMIN'].includes(r.toUpperCase()));

  console.log('🔍 ComprehensiveLessons - User roles:', roles);
  console.log('🔍 ComprehensiveLessons - URL studentId:', urlStudentId);
  console.log('🔍 ComprehensiveLessons - isStudent:', isStudent, 'isTeacher:', isTeacher, 'isAdmin:', isAdmin);

  // Common state
  const [fromDate, setFromDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'subject' | 'status'>('date');
  const [groupBy, setGroupBy] = useState<'none' | 'week' | 'subject' | 'student'>('none');

  // ✅ PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1);
  const [lessonsPerPage, setLessonsPerPage] = useState(10);

  // Teacher/Admin specific filters (only used when NOT viewing specific student)
  const [subjectId, setSubjectId] = useState<number | undefined>();
  const [classId, setClassId] = useState<number | undefined>();
  const [studentId, setStudentId] = useState<number | undefined>();

  // ✅ Determine viewing mode
  const viewingSpecificStudent = urlStudentId && (isTeacher || isAdmin);
  const parsedUrlStudentId = urlStudentId ? parseInt(urlStudentId, 10) : undefined;

  // Build filters for teacher/admin (only when viewing ALL students)
  const teacherFilters: TeacherLessonFilters = useMemo(() => ({
    fromDate,
    toDate,
    statusFilter: statusFilter || undefined,
    subjectId,
    classId,
    studentId,
  }), [fromDate, toDate, statusFilter, subjectId, classId, studentId]);

  // ✅ NEW: Fetch data based on viewing mode AND role
  // 1. If TEACHER viewing specific student - use teacher-specific endpoint
  const teacherStudentQuery = useTeacherStudentLessons(
    parsedUrlStudentId || 0,
    fromDate,
    toDate,
    statusFilter || undefined,
    { enabled: !!(viewingSpecificStudent && isTeacher) }
  );
  const teacherStudentStatsQuery = useTeacherStudentStats(
    parsedUrlStudentId || 0,
    fromDate,
    toDate,
    { enabled: !!(viewingSpecificStudent && isTeacher) }
  );

  // 2. If ADMIN viewing specific student - use admin endpoint (sees all subjects)
  const adminStudentQuery = useComprehensiveLessons(
    parsedUrlStudentId || 0,
    fromDate,
    toDate,
    statusFilter || undefined,
    { enabled: !!(viewingSpecificStudent && isAdmin) }
  );
  const adminStudentStatsQuery = useStatusStats(
    parsedUrlStudentId || 0,
    fromDate,
    toDate,
    { enabled: !!(viewingSpecificStudent && isAdmin) }
  );

  // 3. If student viewing their own
  const studentQuery = useMyComprehensiveLessons(
    fromDate,
    toDate,
    statusFilter || undefined,
    { enabled: !!(isStudent && !viewingSpecificStudent) }
  );
  
  // 4. If teacher viewing ALL students
  const teacherQuery = useTeacherLessons(
    teacherFilters, 
    { enabled: !!(isTeacher && !viewingSpecificStudent) }
  );
  const teacherStatsQuery = useTeacherStats(
    teacherFilters, 
    { enabled: !!(isTeacher && !viewingSpecificStudent) }
  );
  
  // 5. If admin viewing ALL students
  const adminQuery = useAdminLessons(
    teacherFilters, 
    { enabled: !!(isAdmin && !viewingSpecificStudent) }
  );
  const adminStatsQuery = useAdminStats(
    teacherFilters, 
    { enabled: !!(isAdmin && !viewingSpecificStudent) }
  );

  // ✅ FIXED: Select appropriate query based on viewing mode AND role
  const { data: lessons, isLoading, error } = viewingSpecificStudent
    ? isTeacher
      ? {
          data: teacherStudentQuery.data?.allLessons || [],
          isLoading: teacherStudentQuery.isLoading,
          error: teacherStudentQuery.error
        }
      : isAdmin
      ? {
          data: adminStudentQuery.data?.allLessons || [],
          isLoading: adminStudentQuery.isLoading,
          error: adminStudentQuery.error
        }
      : { data: [], isLoading: false, error: new Error('Invalid role') }
    : isStudent 
    ? { 
        data: studentQuery.data?.allLessons || [], 
        isLoading: studentQuery.isLoading, 
        error: studentQuery.error 
      }
    : isTeacher
    ? { 
        data: teacherQuery.data || [], 
        isLoading: teacherQuery.isLoading, 
        error: teacherQuery.error 
      }
    : isAdmin
    ? { 
        data: adminQuery.data || [], 
        isLoading: adminQuery.isLoading, 
        error: adminQuery.error 
      }
    : { 
        data: [], 
        isLoading: false, 
        error: new Error('No valid role found') 
      };

  const stats = viewingSpecificStudent
    ? isTeacher
      ? teacherStudentStatsQuery.data
      : isAdmin
      ? adminStudentStatsQuery.data
      : null
    : isTeacher 
    ? teacherStatsQuery.data 
    : isAdmin 
    ? adminStatsQuery.data 
    : null;

  // Sort lessons
  const processedLessons = useMemo(() => {
    if (!lessons) return [];

    let sorted = [...lessons];

    // Sort
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime();
        case 'subject':
          return a.subjectName.localeCompare(b.subjectName);
        case 'status':
          const statusOrder: Record<string, number> = { 
            MISSED: 0, 
            IN_PROGRESS: 1, 
            SCHEDULED: 2, 
            COMPLETED: 3 
          };
          return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [lessons, sortBy]);

  // ✅ PAGINATION CALCULATIONS
  const totalLessons = processedLessons.length;
  const totalPages = Math.ceil(totalLessons / lessonsPerPage);
  const startIndex = (currentPage - 1) * lessonsPerPage;
  const endIndex = Math.min(startIndex + lessonsPerPage, totalLessons);
  const currentPageLessons = processedLessons.slice(startIndex, endIndex);

  // ✅ Group lessons (NOW USING currentPageLessons)
  const groupedLessons = useMemo(() => {
    if (groupBy === 'none') return { '': currentPageLessons };

    if (groupBy === 'subject') {
      return currentPageLessons.reduce((acc, lesson) => {
        const key = lesson.subjectName;
        if (!acc[key]) acc[key] = [];
        acc[key].push(lesson);
        return acc;
      }, {} as Record<string, typeof currentPageLessons>);
    }

    if (groupBy === 'student' && (isTeacher || isAdmin) && !viewingSpecificStudent) {
      return currentPageLessons.reduce((acc, lesson) => {
        const key = lesson.studentName || 'Unknown Student';
        if (!acc[key]) acc[key] = [];
        acc[key].push(lesson);
        return acc;
      }, {} as Record<string, typeof currentPageLessons>);
    }

    // Group by week
    return currentPageLessons.reduce((acc, lesson) => {
      const date = new Date(lesson.scheduledDate);
      const weekStart = format(date, 'MMM dd');
      if (!acc[weekStart]) acc[weekStart] = [];
      acc[weekStart].push(lesson);
      return acc;
    }, {} as Record<string, typeof currentPageLessons>);
  }, [currentPageLessons, groupBy, isTeacher, isAdmin, viewingSpecificStudent]);

  // ✅ PAGINATION HELPER FUNCTIONS
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push('...');
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    return pages;
  };

  // Export to CSV
  const handleExport = () => {
    if (!lessons || lessons.length === 0) return;

    const headers = isStudent || viewingSpecificStudent
      ? ['Subject', 'Lesson', 'Date', 'Status', 'Priority', 'Assessment']
      : ['Student', 'Subject', 'Lesson', 'Date', 'Status', 'Priority', 'Assessment'];

    const csvContent = [
      headers.join(','),
      ...lessons.map(lesson =>
        (isStudent || viewingSpecificStudent
          ? [
              lesson.subjectName,
              lesson.lessonTopicTitle,
              lesson.scheduledDate,
              lesson.status,
              lesson.priority || 'N/A',
              lesson.hasActiveAssessment ? 'Yes' : 'No'
            ]
          : [
              lesson.studentName || 'Unknown',
              lesson.subjectName,
              lesson.lessonTopicTitle,
              lesson.scheduledDate,
              lesson.status,
              lesson.priority || 'N/A',
              lesson.hasActiveAssessment ? 'Yes' : 'No'
            ]
        ).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lessons-report-${format(today, 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  // Get student name for display
  const studentName = viewingSpecificStudent
    ? isTeacher
      ? teacherStudentQuery.data?.studentName
      : isAdmin
      ? adminStudentQuery.data?.studentName
      : 'Student'
    : '';

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading comprehensive report...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800">❌ Error loading report: {error instanceof Error ? error.message : 'Please try again'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            {viewingSpecificStudent && (
              <button
                onClick={() => navigate('/students')}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                title="Back to student list"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-3xl font-bold text-gray-900">
              📚 {viewingSpecificStudent
                ? `Lessons for ${studentName || 'Student'}`
                : isStudent 
                ? 'My Lessons' 
                : isTeacher 
                ? 'Class Lessons' 
                : 'All Lessons'
              }
            </h1>
          </div>
          <p className="text-gray-600">
            {viewingSpecificStudent
              ? isTeacher
                ? 'View lessons for subjects you teach this student'
                : 'View all lessons for this student with detailed status tracking'
              : isStudent 
              ? 'View all your lessons with detailed status tracking'
              : isTeacher
              ? 'Monitor lesson progress across your classes'
              : 'System-wide lesson tracking and analytics'
            }
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <span>📥</span>
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span>🖨️</span>
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Total Lessons</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalLessons}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Completion Rate</div>
            <div className="text-2xl font-bold text-green-600">
              {stats.completionRate.toFixed(1)}%
            </div>
          </div>
          {!viewingSpecificStudent && (isTeacher || isAdmin) && (
            <>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600 mb-1">Students</div>
                <div className="text-2xl font-bold text-blue-600">{(stats as any).totalStudents}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600 mb-1">At Risk</div>
                <div className="text-2xl font-bold text-red-600">{(stats as any).studentsAtRisk}</div>
              </div>
            </>
          )}
          {viewingSpecificStudent && (
            <>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600 mb-1">Completed</div>
                <div className="text-2xl font-bold text-green-600">{stats.completedCount}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600 mb-1">Missed</div>
                <div className="text-2xl font-bold text-red-600">{stats.missedCount}</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        {/* Date Range */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">From:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">To:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            />
          </div>

          {/* ✅ Lessons Per Page Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Per Page:</label>
            <select
              value={lessonsPerPage}
              onChange={(e) => {
                setLessonsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={statusFilter || 'ALL'}
            onChange={(e) => {
              setStatusFilter(e.target.value === 'ALL' ? null : e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="ALL">All</option>
            <option value="COMPLETED">Completed</option>
            <option value="MISSED">Missed</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="SCHEDULED">Scheduled</option>
          </select>
        </div>

        {/* Teacher/Admin specific filters - only show when viewing ALL students */}
        {(isTeacher || isAdmin) && !viewingSpecificStudent && (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Class ID:</label>
              <input
                type="number"
                placeholder="Filter by class"
                value={classId || ''}
                onChange={(e) => {
                  setClassId(e.target.value ? Number(e.target.value) : undefined);
                  setCurrentPage(1);
                }}
                className="px-3 py-1 border border-gray-300 rounded text-sm w-32"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Subject ID:</label>
              <input
                type="number"
                placeholder="Filter by subject"
                value={subjectId || ''}
                onChange={(e) => {
                  setSubjectId(e.target.value ? Number(e.target.value) : undefined);
                  setCurrentPage(1);
                }}
                className="px-3 py-1 border border-gray-300 rounded text-sm w-32"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Student ID:</label>
              <input
                type="number"
                placeholder="Filter by student"
                value={studentId || ''}
                onChange={(e) => {
                  setStudentId(e.target.value ? Number(e.target.value) : undefined);
                  setCurrentPage(1);
                }}
                className="px-3 py-1 border border-gray-300 rounded text-sm w-32"
              />
            </div>
          </div>
        )}
      </div>

      {/* ✅ Results Summary */}
      {totalLessons > 0 && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-700">
              <span className="font-semibold">{totalLessons}</span> lesson{totalLessons !== 1 ? 's' : ''} found
            </p>
            {totalPages > 1 && (
              <p className="text-sm text-gray-600">
                Showing {startIndex + 1}-{endIndex} of {totalLessons}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Sort and Group Controls */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">📊 Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="date">Date</option>
              <option value="subject">Subject</option>
              <option value="status">Status</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">📑 Group by:</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="none">None</option>
              <option value="subject">Subject</option>
              <option value="week">Week</option>
              {(isTeacher || isAdmin) && !viewingSpecificStudent && <option value="student">Student</option>}
            </select>
          </div>
        </div>

        {/* ✅ Updated page info */}
        <div className="text-sm text-gray-600">
          Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          {' • '}
          Showing <strong>{currentPageLessons.length}</strong> lesson{currentPageLessons.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Lessons List */}
      {Object.keys(groupedLessons).length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <p className="text-gray-600 text-lg mb-2">No lessons found</p>
          <p className="text-gray-500 text-sm">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedLessons).map(([group, groupLessons]) => (
            <div key={group} className="space-y-4">
              {groupBy !== 'none' && (
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  {groupBy === 'subject' ? '📖' : groupBy === 'student' ? '👤' : '📅'}
                  <span>{group}</span>
                  <span className="text-sm font-normal text-gray-500">
                    ({groupLessons.length} lesson{groupLessons.length !== 1 ? 's' : ''})
                  </span>
                </h2>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {groupLessons.map((lesson) => (
                  <ComprehensiveLessonCard key={lesson.progressId} lesson={lesson} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ✅ PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-md p-4 mt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-medium transition-colors ${
                currentPage === 1
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex items-center gap-1">
              {getPageNumbers().map((page, index) => (
                <React.Fragment key={index}>
                  {page === '...' ? (
                    <span className="px-3 py-2 text-gray-400">...</span>
                  ) : (
                    <button
                      onClick={() => goToPage(page as number)}
                      className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  )}
                </React.Fragment>
              ))}
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-medium transition-colors ${
                currentPage === totalPages
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              Page <span className="font-semibold text-gray-900">{currentPage}</span> of{' '}
              <span className="font-semibold text-gray-900">{totalPages}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};