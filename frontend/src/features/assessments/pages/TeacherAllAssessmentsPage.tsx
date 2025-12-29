import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeacherAssessments, useTeacherSubmissionCounts } from '../hooks/useAssessments';
import { AssessmentList } from '../components/AssessmentList';
import { Plus, BookOpen, Filter, Bell, AlertCircle } from 'lucide-react';
import { AssessmentType } from '../types/assessmentTypes';

export const TeacherAllAssessmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<AssessmentType | 'ALL'>('ALL');
  
  const { data: assessments = [], isLoading } = useTeacherAssessments();
  const { data: submissionCounts = {} } = useTeacherSubmissionCounts(); // ✅ NEW

  const filteredAssessments = selectedType === 'ALL' 
    ? assessments 
    : assessments.filter(a => a.type === selectedType);

  // ✅ NEW: Calculate total pending submissions
  const totalPendingSubmissions = Object.values(submissionCounts).reduce((sum, count) => sum + count, 0);

  const handleCreateAssessment = () => {
    navigate('/assessments/create');
  };

  const handleAssessmentClick = (assessment: any) => {
    navigate(`/teacher/assessments/${assessment.id}`);
  };

  const assessmentTypes = [
    { value: 'ALL', label: 'All Types' },
    { value: AssessmentType.LESSON_TOPIC_ASSESSMENT, label: 'Lesson Assessments' },
    { value: AssessmentType.QUIZ, label: 'Quizzes' },
    { value: AssessmentType.CLASSWORK, label: 'Classwork' },
    { value: AssessmentType.TEST1, label: 'Test 1' },
    { value: AssessmentType.TEST2, label: 'Test 2' },
    { value: AssessmentType.ASSIGNMENT, label: 'Assignments' },
    { value: AssessmentType.EXAM, label: 'Exams' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Assessments</h1>
          <p className="text-gray-600">Manage all your assessments</p>
        </div>
        <button
          onClick={handleCreateAssessment}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
        >
          <Plus className="w-5 h-5" />
          Create Assessment
        </button>
      </div>

      {/* ✅ NEW: Pending Submissions Alert */}
      {totalPendingSubmissions > 0 && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-3" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">
                You have {totalPendingSubmissions} ungraded {totalPendingSubmissions === 1 ? 'submission' : 'submissions'} awaiting your review
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Click on assessments with notification badges to view and grade submissions
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
              <p className="text-gray-600 text-sm">Published</p>
              <p className="text-3xl font-bold text-green-600">
                {assessments.filter(a => a.published).length}
              </p>
            </div>
            <BookOpen className="w-12 h-12 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Drafts</p>
              <p className="text-3xl font-bold text-gray-600">
                {assessments.filter(a => !a.published).length}
              </p>
            </div>
            <BookOpen className="w-12 h-12 text-gray-600 opacity-20" />
          </div>
        </div>

        {/* ✅ NEW: Pending Submissions Card */}
        <div className="bg-white rounded-lg shadow-md p-6 relative">
          {totalPendingSubmissions > 0 && (
            <div className="absolute -top-2 -right-2">
              <div className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold animate-pulse">
                {totalPendingSubmissions}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pending Grading</p>
              <p className="text-3xl font-bold text-orange-600">
                {totalPendingSubmissions}
              </p>
            </div>
            <Bell className="w-12 h-12 text-orange-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <label className="text-sm font-medium text-gray-700">Filter by Type:</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as AssessmentType | 'ALL')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {assessmentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-600">
            Showing {filteredAssessments.length} of {assessments.length} assessments
          </span>
        </div>
      </div>

      {/* Assessments List */}
      <AssessmentList
        assessments={filteredAssessments}
        onAssessmentClick={handleAssessmentClick}
        isLoading={isLoading}
        showStatus={false}
        isTeacherView={true}
        submissionCounts={submissionCounts} // ✅ NEW: Pass submission counts
      />
    </div>
  );
};