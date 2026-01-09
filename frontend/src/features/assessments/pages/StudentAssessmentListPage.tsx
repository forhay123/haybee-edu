// src/features/assessments/pages/StudentAssessmentListPage.tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, BookOpen, CheckCircle, XCircle, AlertTriangle, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, addDays } from 'date-fns';
import axiosInstance from '../../../api/axios';
import { useCurrentStudentProfileId } from '../hooks/useLessonAssessments';
import { AssessmentAccessCard } from '../components/AssessmentAccessCard';

// ============================================================
// TYPES
// ============================================================

interface ProgressLesson {
  id: number;
  studentProfileId: number;
  lessonId: number;
  lessonTitle: string;
  subjectId: number;
  subjectName: string;
  scheduledDate: string;
  periodNumber: number;
  completed: boolean;
  completedAt?: string;
  assessmentId?: number;
  assessmentTitle?: string;
  assessmentAccessible?: boolean;
  assessmentWindowStart?: string;
  assessmentWindowEnd?: string;
  gracePeriodEnd?: string;
  incompleteReason?: string;
  incomplete: boolean;
}

interface Assessment {
  id: number;
  title: string;
  subjectId: number;
  subjectName: string;
  lessonTopicId?: number;
  lessonTopicTitle?: string;
  totalMarks: number;
  passingMarks: number;
  durationMinutes: number;
  questionCount: number;
  createdAt: string;
  hasSubmitted?: boolean;
  submissionId?: number;
  studentScore?: number;
  studentPassed?: boolean;
  // Added from progress
  scheduledDate?: string;
  assessmentWindowStart?: string;
  assessmentWindowEnd?: string;
  isExpired?: boolean;
}

// ============================================================
// API FUNCTIONS
// ============================================================

const fetchDailyProgress = async (date: string) => {
  const response = await axiosInstance.get(`/progress/daily/me?date=${date}`);
  return response.data;
};

const useDailyProgressRange = (startDate: Date, endDate: Date) => {
  // Generate array of dates
  const dates = [];
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(format(currentDate, 'yyyy-MM-dd'));
    currentDate = addDays(currentDate, 1);
  }

  // Fetch all dates
  const queries = dates.map(date => ({
    date,
    query: useQuery({
      queryKey: ['daily-progress', date],
      queryFn: () => fetchDailyProgress(date),
      staleTime: 60000,
    })
  }));

  // Combine results
  const isLoading = queries.some(q => q.query.isLoading);
  const error = queries.find(q => q.query.error)?.query.error;
  
  const allLessons: ProgressLesson[] = queries
    .filter(q => q.query.data)
    .flatMap(q => q.query.data.lessons || []);

  return { data: allLessons, isLoading, error };
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const StudentAssessmentListPage: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'expired'>('all');

  // ✅ Get student profile ID
  const { studentProfileId, isLoading: loadingProfile } = useCurrentStudentProfileId();
  
  // ✅ NEW: Fetch progress for last 14 days and next 7 days
  const today = new Date();
  const startDate = subDays(today, 14);  // 14 days ago
  const endDate = addDays(today, 7);     // 7 days ahead
  
  const { data: progressLessons = [], isLoading } = useDailyProgressRange(startDate, endDate);

  // ✅ Convert progress lessons to assessment format
  const assessments: Assessment[] = useMemo(() => {
    const now = new Date();
    
    return progressLessons
      .filter(lesson => lesson.assessmentId)  // Only lessons with assessments
      .map(lesson => {
        const windowEnd = lesson.assessmentWindowEnd 
          ? new Date(lesson.assessmentWindowEnd) 
          : null;
        
        // Determine if expired (window ended and not completed)
        const isExpired = windowEnd && now > windowEnd && !lesson.completed;

        return {
          id: lesson.assessmentId!,
          title: lesson.assessmentTitle || `Assessment: ${lesson.lessonTitle}`,
          subjectId: lesson.subjectId,
          subjectName: lesson.subjectName,
          lessonTopicId: lesson.lessonId,
          lessonTopicTitle: lesson.lessonTitle,
          totalMarks: 0,  // Not available in progress API
          passingMarks: 0,  // Not available in progress API
          durationMinutes: 0,  // Not available in progress API
          questionCount: 0,  // Not available in progress API
          createdAt: lesson.scheduledDate,
          hasSubmitted: lesson.completed,
          submissionId: undefined,
          studentScore: undefined,
          studentPassed: undefined,
          // From progress
          scheduledDate: lesson.scheduledDate,
          assessmentWindowStart: lesson.assessmentWindowStart,
          assessmentWindowEnd: lesson.assessmentWindowEnd,
          isExpired: isExpired || false,
        };
      });
  }, [progressLessons]);

  // ✅ Remove duplicates (same assessment scheduled multiple times)
  const uniqueAssessments = useMemo(() => {
    const seen = new Map<number, Assessment>();
    
    assessments.forEach(assessment => {
      const existing = seen.get(assessment.id);
      
      // Keep the most recent or completed version
      if (!existing) {
        seen.set(assessment.id, assessment);
      } else {
        // Prefer completed over not completed
        if (assessment.hasSubmitted && !existing.hasSubmitted) {
          seen.set(assessment.id, assessment);
        }
        // Prefer most recent scheduled date
        else if (!assessment.hasSubmitted && !existing.hasSubmitted) {
          const existingDate = new Date(existing.scheduledDate || 0);
          const currentDate = new Date(assessment.scheduledDate || 0);
          if (currentDate > existingDate) {
            seen.set(assessment.id, assessment);
          }
        }
      }
    });
    
    return Array.from(seen.values());
  }, [assessments]);

  // ✅ Classify assessments
  const classifiedAssessments = useMemo(() => {
    const now = new Date();
    const active: Assessment[] = [];
    const completed: Assessment[] = [];
    const expired: Assessment[] = [];

    uniqueAssessments.forEach(assessment => {
      if (assessment.hasSubmitted) {
        completed.push(assessment);
      } else if (assessment.isExpired) {
        expired.push(assessment);
      } else {
        active.push(assessment);
      }
    });

    // Sort each category by scheduled date (most recent first)
    const sortByDate = (a: Assessment, b: Assessment) => {
      const dateA = new Date(a.scheduledDate || 0);
      const dateB = new Date(b.scheduledDate || 0);
      return dateB.getTime() - dateA.getTime();
    };

    active.sort(sortByDate);
    completed.sort(sortByDate);
    expired.sort(sortByDate);

    return { active, completed, expired };
  }, [uniqueAssessments]);

  // ✅ Apply filter
  const filteredAssessments = useMemo(() => {
    const { active, completed, expired } = classifiedAssessments;

    switch (filter) {
      case 'pending':
        return active;
      case 'completed':
        return completed;
      case 'expired':
        return expired;
      case 'all':
      default:
        return [...active, ...completed, ...expired];
    }
  }, [classifiedAssessments, filter]);

  // ✅ Calculate stats
  const stats = useMemo(() => {
    const { active, completed, expired } = classifiedAssessments;
    return {
      total: uniqueAssessments.length,
      pending: active.length,
      completed: completed.length,
      expired: expired.length,
    };
  }, [classifiedAssessments, uniqueAssessments.length]);

  // ✅ Loading state
  if (loadingProfile || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessments...</p>
        </div>
      </div>
    );
  }

  // ✅ Handle missing profile
  if (!studentProfileId) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-medium">
            Unable to load student profile. Please log in again.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Assessments</h1>
        <p className="text-gray-600">View and complete your scheduled assessments</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Assessments</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <BookOpen className="w-12 h-12 text-blue-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pending</p>
              <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
            </div>
            <Clock className="w-12 h-12 text-orange-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Completed</p>
              <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Expired</p>
              <p className="text-3xl font-bold text-red-600">{stats.expired}</p>
            </div>
            <XCircle className="w-12 h-12 text-red-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Warning banner if there are expired assessments */}
      {stats.expired > 0 && filter !== 'expired' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-1">
                {stats.expired} Missed Assessment{stats.expired > 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-red-700 mb-3">
                You have {stats.expired} assessment{stats.expired > 1 ? 's' : ''} that {stats.expired > 1 ? 'have' : 'has'} expired without submission. 
                The submission window has closed for {stats.expired > 1 ? 'these assessments' : 'this assessment'}.
              </p>
              <button
                onClick={() => setFilter('expired')}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
              >
                View Expired Assessments
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date range info */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">
              Showing Scheduled Assessments
            </h3>
            <p className="text-sm text-blue-700">
              From {format(startDate, 'MMM dd, yyyy')} to {format(endDate, 'MMM dd, yyyy')} 
              {' '}(last 14 days + next 7 days)
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
            filter === 'all'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All Assessments ({stats.total})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
            filter === 'pending'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Pending ({stats.pending})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
            filter === 'completed'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Completed ({stats.completed})
        </button>
        <button
          onClick={() => setFilter('expired')}
          className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
            filter === 'expired'
              ? 'text-red-600 border-b-2 border-red-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Expired ({stats.expired})
        </button>
      </div>

      {/* Active filter banner */}
      {filter === 'expired' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">
                Viewing Expired Assessments
              </h3>
              <p className="text-sm text-red-700">
                These assessments are no longer available for submission. The assessment window has closed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Assessments Grid */}
      {filteredAssessments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No assessments found</p>
          <p className="text-gray-500 text-sm mt-2">
            {filter === 'pending' && 'You have no pending assessments'}
            {filter === 'completed' && 'You have not completed any assessments yet'}
            {filter === 'expired' && 'You have no expired assessments'}
            {filter === 'all' && 'No assessments scheduled at the moment'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssessments.map((assessment) => (
            <div key={`${assessment.id}-${assessment.scheduledDate}`} className="relative">
              {/* Expired overlay badge */}
              {assessment.isExpired && (
                <div className="absolute top-2 right-2 z-10">
                  <div className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    EXPIRED
                  </div>
                </div>
              )}
              
              <AssessmentAccessCard
                assessment={assessment}
                studentProfileId={studentProfileId}
                onClick={() => navigate(`/assessments/student/${assessment.id}`)}
                className={assessment.isExpired ? 'opacity-75 border-2 border-red-200' : ''}
              />
            </div>
          ))}
        </div>
      )}

      {/* Footer info */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          {filter === 'all' && `Showing all ${stats.total} scheduled assessments`}
          {filter === 'pending' && `Showing ${stats.pending} pending assessment${stats.pending !== 1 ? 's' : ''}`}
          {filter === 'completed' && `Showing ${stats.completed} completed assessment${stats.completed !== 1 ? 's' : ''}`}
          {filter === 'expired' && `Showing ${stats.expired} expired assessment${stats.expired !== 1 ? 's' : ''}`}
        </p>
        {stats.expired > 0 && filter !== 'expired' && (
          <p className="mt-2 text-red-600">
            ⚠️ {stats.expired} assessment{stats.expired !== 1 ? 's have' : ' has'} expired.{' '}
            <button
              onClick={() => setFilter('expired')}
              className="font-medium hover:underline"
            >
              View expired assessments
            </button>
          </p>
        )}
      </div>
    </div>
  );
};