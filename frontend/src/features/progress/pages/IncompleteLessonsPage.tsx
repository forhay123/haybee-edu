// frontend/src/features/progress/pages/IncompleteLessonsPage.tsx

import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Filter } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import { useIncompleteLessonsStats, useGroupedIncompleteLessons } from '../hooks/useIncompleteLessons';
import IncompleteLessonCard from '../components/IncompleteLessonCard';
import IncompleteLessonsFilter from '../components/IncompleteLessonsFilter';
import { IncompleteLessonReason } from '../types/types';
import type { IncompleteLessonInfo as BackendIncompleteLessonInfo } from '../hooks/useIncompleteLessons';
import type { IncompleteLessonInfo as FrontendIncompleteLessonInfo } from '../types/types';

type FilterType = 'all' | 'missedGracePeriod' | 'lateSubmissions' | 'noSubmission';

// Helper function to map backend type to frontend type
const mapBackendToFrontend = (backendLesson: BackendIncompleteLessonInfo): FrontendIncompleteLessonInfo => {
  const reasonMap: Record<string, IncompleteLessonReason> = {
    'MISSED_GRACE_PERIOD': IncompleteLessonReason.NOT_ATTEMPTED,
    'LATE_SUBMISSION': IncompleteLessonReason.INCOMPLETE_ASSESSMENT,
    'NO_SUBMISSION': IncompleteLessonReason.NOT_PASSED
  };

  return {
    lesson_id: backendLesson.lessonTopicId || backendLesson.id || 0,
    lesson_title: backendLesson.lessonTopicTitle,
    subject_name: backendLesson.subjectName,
    scheduled_date: backendLesson.scheduledDate,
    reason: reasonMap[backendLesson.incompleteReason] || IncompleteLessonReason.NOT_ATTEMPTED,
    assessment_id: undefined,
    last_score: undefined,
    passing_score: undefined,
    questions_answered: undefined,
    total_questions: undefined,
    time_limit_minutes: undefined,
  };
};

export const IncompleteLessonsPage: React.FC = () => {
  const navigate = useNavigate();
  const { studentId: urlStudentId } = useParams<{ studentId: string }>();
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedSubject, setSelectedSubject] = useState<string | 'all'>('all');
  const [selectedReason, setSelectedReason] = useState<IncompleteLessonReason | 'all'>('all');

  // ✅ FIXED: Check if user is admin/teacher
  const isAdminOrTeacher = user?.roles?.some(role => 
    ['ADMIN', 'TEACHER', 'SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_TEACHER', 'ROLE_SUPER_ADMIN'].includes(role)
  );

  // ✅ CRITICAL FIX: Teachers/admins MUST provide a studentId in URL
  // Students can view their own without studentId
  const studentIdForQuery = urlStudentId ? parseInt(urlStudentId, 10) : undefined;

  console.log('🔍 User roles:', user?.roles);
  console.log('🔍 URL studentId:', urlStudentId);
  console.log('🔍 Is admin/teacher?', isAdminOrTeacher);
  console.log('🔍 Student ID for query:', studentIdForQuery);

  // ✅ GUARD: If teacher/admin tries to view without studentId, show error
  const shouldShowNoStudentError = isAdminOrTeacher && !urlStudentId;

  // ✅ FIXED: Fetch data - only fetch if we have proper access
  const { grouped, isLoading, error } = useGroupedIncompleteLessons(
    shouldShowNoStudentError ? -1 : studentIdForQuery
  );
  const stats = useIncompleteLessonsStats(
    shouldShowNoStudentError ? -1 : studentIdForQuery
  );

  // Get all incomplete lessons from grouped data
  const allIncompleteLessons = useMemo(() => {
    if (!grouped) return [];
    return [
      ...grouped.missedGracePeriod,
      ...grouped.lateSubmissions,
      ...grouped.noSubmission
    ];
  }, [grouped]);

  // Filter & mapping
  const filteredLessons = useMemo(() => {
    if (!grouped) return [];

    let backendLessons: BackendIncompleteLessonInfo[] = [];

    // Filter by type
    if (filter === 'all') {
      backendLessons = allIncompleteLessons;
    } else {
      backendLessons = grouped[filter] || [];
    }

    // Filter by subject
    if (selectedSubject !== 'all') {
      backendLessons = backendLessons.filter((lesson: BackendIncompleteLessonInfo) => 
        lesson.subjectName === selectedSubject
      );
    }

    // Filter by reason
    if (selectedReason !== 'all') {
      const reasonMap: Record<string, IncompleteLessonReason> = {
        'MISSED_GRACE_PERIOD': IncompleteLessonReason.NOT_ATTEMPTED,
        'LATE_SUBMISSION': IncompleteLessonReason.INCOMPLETE_ASSESSMENT,
        'NO_SUBMISSION': IncompleteLessonReason.NOT_PASSED
      };

      backendLessons = backendLessons.filter((lesson: BackendIncompleteLessonInfo) => {
        const mappedReason = reasonMap[lesson.incompleteReason];
        return mappedReason === selectedReason;
      });
    }

    return backendLessons.map(mapBackendToFrontend);
  }, [grouped, filter, selectedSubject, selectedReason, allIncompleteLessons]);

  const subjects = useMemo(() => {
    return Array.from(new Set(
      allIncompleteLessons.map((lesson: BackendIncompleteLessonInfo) => lesson.subjectName)
    ));
  }, [allIncompleteLessons]);

  const filterCounts = useMemo(() => {
    return {
      all: stats?.total || 0,
      not_attempted: stats?.missedGracePeriodCount || 0,
      incomplete_assessment: stats?.lateSubmissionCount || 0,
      not_passed: stats?.noSubmissionCount || 0,
    };
  }, [stats]);

  // ✅ NEW: Show error if teacher/admin accessing without studentId
  if (shouldShowNoStudentError) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <p className="text-yellow-800 font-medium text-lg mb-2">
            Student Selection Required
          </p>
          <p className="text-yellow-700 text-sm mb-4">
            As a teacher/admin, you need to select a specific student to view their incomplete lessons.
            Please navigate to a student's profile or dashboard first.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Go Back
            </button>
            <button
              onClick={() => navigate('/students')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Student List
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading incomplete lessons...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-800 font-medium">Failed to load incomplete lessons</p>
          <p className="text-red-700 text-sm mt-2">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Incomplete Lessons</h1>
            <p className="text-gray-600">
              {urlStudentId 
                ? 'Track and review incomplete lessons for this student'
                : 'Track and review lessons you haven\'t completed'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
          <p className="text-gray-600 text-sm font-medium">Missed Grace Period</p>
          <p className="text-3xl font-bold text-red-600">{stats?.missedGracePeriodCount || 0}</p>
          <p className="text-xs text-gray-500 mt-1">{stats?.percentMissedGrace || 0}% of total</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <p className="text-gray-600 text-sm font-medium">Late Submissions</p>
          <p className="text-3xl font-bold text-yellow-600">{stats?.lateSubmissionCount || 0}</p>
          <p className="text-xs text-gray-500 mt-1">{stats?.percentLate || 0}% of total</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-gray-500">
          <p className="text-gray-600 text-sm font-medium">No Submission</p>
          <p className="text-3xl font-bold text-gray-600">{stats?.noSubmissionCount || 0}</p>
          <p className="text-xs text-gray-500 mt-1">{stats?.percentNoSubmission || 0}% of total</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <p className="text-gray-600 text-sm font-medium">Total Incomplete</p>
          <p className="text-3xl font-bold text-blue-600">{stats?.total || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Out of all lessons</p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter by Type
            </h3>

            <div className="space-y-2">
              {[
                { value: 'all' as FilterType, label: 'All Incomplete Lessons', count: stats?.total || 0 },
                { value: 'missedGracePeriod' as FilterType, label: '🔴 Missed Grace Period', count: stats?.missedGracePeriodCount || 0 },
                { value: 'lateSubmissions' as FilterType, label: '🟡 Late Submissions', count: stats?.lateSubmissionCount || 0 },
                { value: 'noSubmission' as FilterType, label: '⚫ No Submission', count: stats?.noSubmissionCount || 0 }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition flex items-center justify-between ${
                    filter === opt.value
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className="text-xs font-semibold">{opt.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <IncompleteLessonsFilter
            selectedReason={selectedReason}
            selectedSubject={selectedSubject}
            subjects={subjects}
            onReasonChange={setSelectedReason}
            onSubjectChange={setSelectedSubject}
            counts={filterCounts}
          />
        </div>
      </div>

      {/* Lessons */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Showing {filteredLessons.length} lesson{filteredLessons.length !== 1 ? 's' : ''}
          </h2>

          {(filter !== 'all' || selectedSubject !== 'all' || selectedReason !== 'all') && (
            <button
              onClick={() => {
                setFilter('all');
                setSelectedSubject('all');
                setSelectedReason('all');
              }}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Clear all filters
            </button>
          )}
        </div>

        {filteredLessons.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-700 text-lg font-medium">No incomplete lessons found</p>
            <p className="text-gray-600 text-sm mt-2">
              {filter === 'all' && selectedSubject === 'all' && selectedReason === 'all'
                ? 'Great! All lessons have been completed'
                : 'Try adjusting your filters to see more results'}
            </p>
            <button
              onClick={() => navigate('/progress/daily')}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Go to Daily Planner
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLessons.map((lesson: FrontendIncompleteLessonInfo) => (
              <IncompleteLessonCard
                key={lesson.lesson_id}
                lesson={lesson}
                onActionComplete={() => window.location.reload()}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default IncompleteLessonsPage;