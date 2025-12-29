// src/features/assessments/pages/StudentAssessmentListPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, BookOpen, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { useStudentAssessments } from '../hooks/useAssessments';
import { useCurrentStudentProfileId } from '../hooks/useLessonAssessments';
import { AssessmentAccessCard } from '../components/AssessmentAccessCard';

export const StudentAssessmentListPage: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // ✅ UPDATED: Get student profile ID from hook
  const { studentProfileId, isLoading: loadingProfile } = useCurrentStudentProfileId();
  
  // ✅ Fetch student assessments
  const { data: assessments = [], isLoading } = useStudentAssessments(studentProfileId || 0);

  const filteredAssessments = assessments.filter((assessment) => {
    if (filter === 'pending') return !assessment.hasSubmitted;
    if (filter === 'completed') return assessment.hasSubmitted;
    return true;
  });

  // ✅ ADD: Loading state for profile
  if (loadingProfile || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // ✅ ADD: Handle missing profile
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Assessments</p>
              <p className="text-3xl font-bold text-gray-900">{assessments.length}</p>
            </div>
            <BookOpen className="w-12 h-12 text-blue-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pending</p>
              <p className="text-3xl font-bold text-orange-600">
                {assessments.filter(a => !a.hasSubmitted).length}
              </p>
            </div>
            <XCircle className="w-12 h-12 text-orange-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Completed</p>
              <p className="text-3xl font-bold text-green-600">
                {assessments.filter(a => a.hasSubmitted).length}
              </p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`px-6 py-3 font-medium transition-colors ${
            filter === 'all'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All Assessments ({assessments.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-6 py-3 font-medium transition-colors ${
            filter === 'pending'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Pending ({assessments.filter(a => !a.hasSubmitted).length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-6 py-3 font-medium transition-colors ${
            filter === 'completed'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Completed ({assessments.filter(a => a.hasSubmitted).length})
        </button>
      </div>

      {/* Assessments Grid */}
      {filteredAssessments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No assessments found</p>
          <p className="text-gray-500 text-sm mt-2">
            {filter === 'pending' && 'You have no pending assessments'}
            {filter === 'completed' && 'You have not completed any assessments yet'}
            {filter === 'all' && 'No assessments available at the moment'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* ✅ UPDATED: Use AssessmentAccessCard component */}
          {filteredAssessments.map((assessment) => (
            <AssessmentAccessCard
              key={assessment.id}
              assessment={assessment}
              studentProfileId={studentProfileId}
              onClick={() => navigate(`/assessments/student/${assessment.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};