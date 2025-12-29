// ============================================
// FILE 3: AdminPendingGradingPage.tsx (FIXED)
// ============================================
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminPendingGrading } from '../hooks/useAdminAssessments';
import {
  Clock,
  ArrowLeft,
  BookOpen,
  User,
  ChevronRight,
  Filter,
  Search
} from 'lucide-react';
import { format } from 'date-fns';

const AdminPendingGradingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<number | undefined>(undefined);

  const { data: pendingSubmissions = [], isLoading } = useAdminPendingGrading();

  // Extract unique subjects
  const subjects = React.useMemo(() => {
    const subjectMap = new Map();
    pendingSubmissions.forEach((submission) => {
      if (submission.subjectId && submission.subjectName) {
        subjectMap.set(submission.subjectId, submission.subjectName);
      }
    });
    return Array.from(subjectMap.entries()).map(([id, name]) => ({ id, name }));
  }, [pendingSubmissions]);

  // Filter submissions
  const filteredSubmissions = pendingSubmissions.filter(submission => {
    const matchesSearch = 
      submission.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.assessmentTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.teacherName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSubject = !subjectFilter || submission.subjectId === subjectFilter;
    
    return matchesSearch && matchesSubject;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pending submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/admin/assessments')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Pending Grading
        </h1>
        <p className="text-gray-600">
          All submissions awaiting teacher review across all subjects
        </p>
      </div>

      {/* Stats Banner */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Clock className="w-12 h-12 text-yellow-600" />
            <div>
              <h2 className="text-2xl font-bold text-yellow-900">
                {filteredSubmissions.length} Submissions
              </h2>
              <p className="text-yellow-800">
                Require teacher grading
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student, assessment, or teacher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Subject Filter */}
          {subjects.length > 0 && (
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={subjectFilter || ''}
                onChange={(e) => setSubjectFilter(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
        {filteredSubmissions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchTerm || subjectFilter ? 'No Matching Submissions' : 'All Caught Up!'}
            </h3>
            <p className="text-gray-600">
              {searchTerm || subjectFilter 
                ? 'Try adjusting your filters' 
                : 'There are no pending submissions requiring grading'}
            </p>
          </div>
        ) : (
          filteredSubmissions.map((submission) => (
            <div
              key={submission.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition p-6 border-l-4 border-yellow-400 cursor-pointer"
              onClick={() => navigate(`/teacher/assessments/submissions/${submission.id}/grade`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Assessment Title */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {submission.assessmentTitle}
                  </h3>

                  {/* Subject */}
                  {submission.subjectName && (
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900 bg-blue-50 px-3 py-1 rounded-full">
                        {submission.subjectName}
                      </span>
                    </div>
                  )}

                  {/* Student & Teacher Info */}
                  <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>
                        Student: <span className="font-semibold text-gray-900">{submission.studentName}</span>
                      </span>
                    </div>
                    {submission.teacherName && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>
                          Teacher: <span className="font-semibold text-gray-900">{submission.teacherName}</span>
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>
                        Submitted {format(new Date(submission.submittedAt), 'MMM dd, yyyy hh:mm a')}
                      </span>
                    </div>
                  </div>

                  {/* Pending Questions Count */}
                  <div className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-lg inline-flex">
                    <Clock className="w-5 h-5 text-yellow-700" />
                    <span className="text-sm font-semibold text-yellow-900">
                      {submission.pendingQuestions || 0} question(s) awaiting grading
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition flex items-center gap-2 whitespace-nowrap ml-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/teacher/assessments/submissions/${submission.id}/grade`);
                  }}
                >
                  Grade Now
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminPendingGradingPage;