// src/features/assessments/pages/TeacherAssessmentSubmissionsPage.tsx

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAssessment, useAssessmentSubmissions } from '../hooks/useAssessments';
import { 
  ArrowLeft, CheckCircle, XCircle, Clock, User, Calendar,
  Award, TrendingUp, Filter, ChevronLeft, ChevronRight,
  FileText, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

const TeacherAssessmentSubmissionsPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  
  // States for filtering and pagination
  const [statusFilter, setStatusFilter] = useState<'all' | 'graded' | 'pending'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  const numericAssessmentId = Number(assessmentId);
  
  const { data: assessment, isLoading: assessmentLoading } = useAssessment(numericAssessmentId);
  const { data: submissions = [], isLoading: submissionsLoading } = useAssessmentSubmissions(numericAssessmentId);

  const isLoading = assessmentLoading || submissionsLoading;

  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    let filtered = submissions;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(s => 
        s.studentName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => {
        const hasPending = s.answers.some(a => a.marksObtained === null);
        if (statusFilter === 'pending') return hasPending || !s.graded;
        if (statusFilter === 'graded') return !hasPending && s.graded;
        return true;
      });
    }

    return filtered;
  }, [submissions, searchQuery, statusFilter]);

  // Pagination
  const totalResults = filteredSubmissions.length;
  const totalPages = Math.ceil(totalResults / resultsPerPage);
  const startIndex = (currentPage - 1) * resultsPerPage;
  const endIndex = Math.min(startIndex + resultsPerPage, totalResults);
  const currentPageSubmissions = filteredSubmissions.slice(startIndex, endIndex);

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
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      if (totalPages > 1) pages.push(totalPages);
    }
    return pages;
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const total = submissions.length;
    const graded = submissions.filter(s => 
      s.graded && !s.answers.some(a => a.marksObtained === null)
    ).length;
    const pending = total - graded;
    const passed = submissions.filter(s => s.passed && s.graded).length;
    const failed = graded - passed;
    
    const scores = submissions
      .filter(s => s.graded && s.percentage != null)
      .map(s => s.percentage!);
    
    const average = scores.length > 0
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 0;

    return {
      totalSubmissions: total,
      gradedSubmissions: graded,
      pendingSubmissions: pending,
      passedSubmissions: passed,
      failedSubmissions: failed,
      averageScore: average
    };
  }, [submissions]);

  const handleGradeSubmission = (submissionId: number) => {
    navigate(`/teacher/grade-submission/${submissionId}`);
  };

  const handleViewDetails = (submissionId: number) => {
    navigate(`/submissions/${submissionId}/results`, {
      state: { from: `/teacher/assessments/${assessmentId}/submissions` }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading submissions...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 text-lg">Assessment not found</p>
          <button
            onClick={() => navigate('/assessments/teacher')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <button
        onClick={() => navigate(`/teacher/assessments/${assessmentId}`)}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Assessment
      </button>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {assessment.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>{assessment.type.replace(/_/g, ' ')}</span>
              </div>
              {assessment.subjectName && (
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  <span>{assessment.subjectName}</span>
                </div>
              )}
              {assessment.lessonTopicTitle && (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>{assessment.lessonTopicTitle}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <FileText className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-900">{stats.totalSubmissions}</p>
            <p className="text-xs text-blue-700">Total</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-900">{stats.gradedSubmissions}</p>
            <p className="text-xs text-green-700">Graded</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <Clock className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-900">{stats.pendingSubmissions}</p>
            <p className="text-xs text-yellow-700">Pending</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <Award className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-900">{stats.passedSubmissions}</p>
            <p className="text-xs text-purple-700">Passed</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <XCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-900">{stats.failedSubmissions}</p>
            <p className="text-xs text-red-700">Failed</p>
          </div>
          <div className="bg-indigo-50 rounded-lg p-4 text-center">
            <TrendingUp className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-indigo-900">{stats.averageScore.toFixed(1)}%</p>
            <p className="text-xs text-indigo-700">Average</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Student
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as typeof statusFilter);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All ({totalResults})</option>
              <option value="graded">Graded ({stats.gradedSubmissions})</option>
              <option value="pending">Pending ({stats.pendingSubmissions})</option>
            </select>
          </div>

          {/* Results Per Page */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Results Per Page
            </label>
            <select
              value={resultsPerPage}
              onChange={(e) => {
                setResultsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>10 results</option>
              <option value={20}>20 results</option>
              <option value={50}>50 results</option>
              <option value={100}>100 results</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      {totalResults > 0 && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <p className="text-gray-700">
              <span className="font-semibold">{totalResults}</span> submission{totalResults !== 1 ? 's' : ''} found
            </p>
            {totalPages > 1 && (
              <p className="text-sm text-gray-600">
                Showing {startIndex + 1}-{endIndex} of {totalResults}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Submissions List */}
      <div className="space-y-4">
        {currentPageSubmissions.length === 0 ? (
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-8 text-center">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">
              {submissions.length === 0 ? 'No Submissions Yet' : 'No Results Match Your Filters'}
            </h2>
            <p className="text-gray-600">
              {submissions.length === 0
                ? 'No students have submitted this assessment yet.'
                : 'Try adjusting your filters to see more results.'}
            </p>
          </div>
        ) : (
          currentPageSubmissions.map((submission, index) => {
            const globalIndex = startIndex + index;
            const hasPendingGrading = submission.answers.some(a => a.marksObtained === null);
            const isFullyGraded = submission.graded && !hasPendingGrading;
            const passed = submission.passed;

            return (
              <div
                key={submission.id}
                className={`bg-white rounded-lg shadow-md hover:shadow-lg transition p-6 border-l-4 ${
                  hasPendingGrading
                    ? 'border-yellow-400'
                    : passed
                    ? 'border-green-400'
                    : 'border-red-400'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Student Info */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                        {globalIndex + 1}
                      </span>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          <User className="w-5 h-5 text-gray-600" />
                          {submission.studentName}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Submitted {format(new Date(submission.submittedAt), 'MMM dd, yyyy • hh:mm a')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Score Display */}
                    {hasPendingGrading ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-5 h-5 text-yellow-600" />
                          <span className="font-semibold text-yellow-900">
                            Pending Manual Grading
                          </span>
                        </div>
                        <p className="text-sm text-yellow-800">
                          {submission.answers.filter(a => a.marksObtained === null).length} question(s) 
                          require manual grading
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-6 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Score:</span>
                          <span className={`text-2xl font-bold ${
                            passed ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {submission.score?.toFixed(1) || 0} / {submission.totalMarks}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Percentage:</span>
                          <span className={`text-2xl font-bold ${
                            passed ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {submission.percentage?.toFixed(1) || 0}%
                          </span>
                        </div>
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
                          passed
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {passed ? (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Passed
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4" />
                              Failed
                            </>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Answer Summary */}
                    <div className="grid grid-cols-4 gap-3 pt-3 border-t border-gray-200">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Questions</p>
                        <p className="text-lg font-bold text-gray-900">{submission.answers.length}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Correct</p>
                        <p className="text-lg font-bold text-green-600">
                          {submission.answers.filter(a => a.isCorrect).length}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Pending</p>
                        <p className="text-lg font-bold text-yellow-600">
                          {submission.answers.filter(a => a.marksObtained === null).length}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Graded</p>
                        <p className="text-lg font-bold text-blue-600">
                          {submission.answers.filter(a => a.marksObtained !== null).length}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 ml-4">
                    {hasPendingGrading && (
                      <button
                        onClick={() => handleGradeSubmission(submission.id)}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium transition flex items-center gap-2 whitespace-nowrap"
                      >
                        <Clock className="w-4 h-4" />
                        Grade Now
                      </button>
                    )}
                    <button
                      onClick={() => handleViewDetails(submission.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition flex items-center gap-2 whitespace-nowrap"
                    >
                      <FileText className="w-4 h-4" />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
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

export default TeacherAssessmentSubmissionsPage;