// src/features/assessments/pages/StudentAssessmentListPage.tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, BookOpen, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useStudentAssessments } from '../hooks/useAssessments';
import { useCurrentStudentProfileId } from '../hooks/useLessonAssessments';
import { AssessmentAccessCard } from '../components/AssessmentAccessCard';

export const StudentAssessmentListPage: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'expired'>('all');

  // ✅ Get student profile ID from hook
  const { studentProfileId, isLoading: loadingProfile } = useCurrentStudentProfileId();
  
  // ✅ Fetch student assessments
  const { data: assessments = [], isLoading } = useStudentAssessments(studentProfileId || 0);

  // ✅ NEW: Calculate 7-day cutoff for determining expired assessments
  const recentCutoffDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  }, []);

  // ✅ NEW: Classify assessments as active, completed, or expired
  const classifiedAssessments = useMemo(() => {
    const active: typeof assessments = [];
    const completed: typeof assessments = [];
    const expired: typeof assessments = [];

    assessments.forEach((assessment) => {
      const createdDate = new Date(assessment.createdAt);
      
      // Completed assessments
      if (assessment.hasSubmitted) {
        completed.push(assessment);
      }
      // Active assessments (created in last 7 days and not submitted)
      else if (createdDate >= recentCutoffDate) {
        active.push(assessment);
      }
      // Expired assessments (older than 7 days and not submitted)
      else {
        expired.push(assessment);
      }
    });

    return { active, completed, expired };
  }, [assessments, recentCutoffDate]);

  // ✅ Apply user filter
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
      total: assessments.length,
      pending: active.length,
      completed: completed.length,
      expired: expired.length,
    };
  }, [classifiedAssessments, assessments.length]);

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
        <p className="text-gray-600">View and complete your assigned assessments</p>
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

        {/* ✅ NEW: Expired Stats Card */}
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

      {/* ✅ NEW: Warning banner if there are expired assessments */}
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
                These assessments are no longer available.
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
        {/* ✅ NEW: Expired Tab */}
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

      {/* ✅ NEW: Active filter banner */}
      {filter === 'expired' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">
                Viewing Expired Assessments
              </h3>
              <p className="text-sm text-red-700">
                These assessments are no longer available for submission. They were scheduled more than 7 days ago and you did not submit them within the allowed time window.
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
            {filter === 'all' && 'No assessments available at the moment'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssessments.map((assessment) => {
            // ✅ NEW: Determine if this assessment is expired
            const createdDate = new Date(assessment.createdAt);
            const isExpired = !assessment.hasSubmitted && createdDate < recentCutoffDate;

            return (
              <div key={assessment.id} className="relative">
                {/* ✅ NEW: Expired overlay badge */}
                {isExpired && (
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
                  className={isExpired ? 'opacity-75 border-2 border-red-200' : ''}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Footer info */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          {filter === 'all' && `Showing all ${stats.total} assessments`}
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