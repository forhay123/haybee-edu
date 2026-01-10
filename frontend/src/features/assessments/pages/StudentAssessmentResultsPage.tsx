// src/features/assessments/pages/StudentAssessmentResultsPage.tsx

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyProfile } from '../../studentProfiles/hooks/useStudentProfiles';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../api/axios';
import { 
  CheckCircle, XCircle, Clock, BookOpen, TrendingUp, Award, 
  ChevronRight, AlertTriangle, ChevronLeft, Filter 
} from 'lucide-react';
import { format } from 'date-fns';
import type { AssessmentSubmission } from '../types/assessmentTypes';

// ✅ API function to get ALL student submissions
const getStudentSubmissions = async (studentProfileId: number): Promise<AssessmentSubmission[]> => {
  const response = await axiosInstance.get<AssessmentSubmission[]>(
    `/assessments/student/${studentProfileId}/submissions`
  );
  return response.data;
};

const StudentAssessmentResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: profile } = useMyProfile();
  
  // Filter and pagination states
  const [selectedSubject, setSelectedSubject] = useState<number | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed' | 'pending'>('all');

  // ✅ Query ALL student submissions
  const { data: allSubmissions = [], isLoading } = useQuery({
    queryKey: ['student-submissions', profile?.id],
    queryFn: async () => {
      if (!profile?.id) {
        throw new Error('Student profile ID is required');
      }
      return getStudentSubmissions(profile.id);
    },
    enabled: !!profile?.id
  });

  // Filter by subject and status
  const filteredSubmissions = useMemo(() => {
    let filtered = allSubmissions;

    // Subject filter
    if (selectedSubject) {
      filtered = filtered.filter(s => {
        return true; // TODO: Add proper subject filtering when subjectId is available
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => {
        const hasPending = s.answers.some(a => a.marksObtained === null);
        
        if (statusFilter === 'pending') return hasPending;
        if (statusFilter === 'passed') return !hasPending && s.passed;
        if (statusFilter === 'failed') return !hasPending && !s.passed;
        return true;
      });
    }

    return filtered;
  }, [allSubmissions, selectedSubject, statusFilter]);

  // ✅ Pagination calculations
  const totalResults = filteredSubmissions.length;
  const totalPages = Math.ceil(totalResults / resultsPerPage);
  const startIndex = (currentPage - 1) * resultsPerPage;
  const endIndex = Math.min(startIndex + resultsPerPage, totalResults);
  const currentPageSubmissions = filteredSubmissions.slice(startIndex, endIndex);

  // ✅ Pagination helpers
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

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredSubmissions.length;
    const fullyGraded = filteredSubmissions.filter(s => 
      !s.answers.some(a => a.marksObtained === null)
    );
    const passed = fullyGraded.filter(s => s.passed).length;
    const pending = filteredSubmissions.filter(s => 
      s.answers.some(a => a.marksObtained === null)
    ).length;
    
    const scores = fullyGraded
      .filter(s => s.percentage != null)
      .map(s => s.percentage!);
    
    const average = scores.length > 0
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 0;
    
    const highest = scores.length > 0 ? Math.max(...scores) : 0;
    const lowest = scores.length > 0 ? Math.min(...scores) : 0;
    
    return {
      totalAssessments: total,
      passedAssessments: passed,
      pendingAssessments: pending,
      failedAssessments: fullyGraded.length - passed,
      averageScore: average,
      highestScore: highest,
      lowestScore: lowest
    };
  }, [filteredSubmissions]);

  // Extract unique subjects from submissions
  const subjects = useMemo(() => {
    const subjectMap = new Map();
    allSubmissions.forEach((submission) => {
      const title = submission.assessmentTitle;
      const subjectName = title.split(' - ')[0] || 'General';
      const key = subjectName.toLowerCase();
      
      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
          id: subjectMap.size + 1,
          name: subjectName,
        });
      }
    });
    return Array.from(subjectMap.values());
  }, [allSubmissions]);

  // Reset to page 1 when filters change
  const handleFilterChange = (callback: () => void) => {
    callback();
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Assessment Results</h1>
        <p className="text-gray-600">
          View your performance across all assessments
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-blue-50 rounded-lg shadow-md p-6 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <span className="text-3xl font-bold text-blue-900">{stats.totalAssessments}</span>
          </div>
          <p className="text-sm text-blue-800 font-medium">Total Assessments</p>
        </div>

        <div className="bg-green-50 rounded-lg shadow-md p-6 border-2 border-green-200">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <span className="text-3xl font-bold text-green-900">{stats.passedAssessments}</span>
          </div>
          <p className="text-sm text-green-800 font-medium">Passed</p>
        </div>

        <div className="bg-yellow-50 rounded-lg shadow-md p-6 border-2 border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-yellow-600" />
            <span className="text-3xl font-bold text-yellow-900">{stats.pendingAssessments}</span>
          </div>
          <p className="text-sm text-yellow-800 font-medium">Pending Grading</p>
        </div>

        <div className="bg-purple-50 rounded-lg shadow-md p-6 border-2 border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-8 h-8 text-purple-600" />
            <span className="text-3xl font-bold text-purple-900">
              {stats.highestScore.toFixed(1)}%
            </span>
          </div>
          <p className="text-sm text-purple-800 font-medium">Highest Score</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(() => 
                setStatusFilter(e.target.value as typeof statusFilter)
              )}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status ({totalResults})</option>
              <option value="passed">Passed ({stats.passedAssessments})</option>
              <option value="failed">Failed ({stats.failedAssessments})</option>
              <option value="pending">Pending Grading ({stats.pendingAssessments})</option>
            </select>
          </div>

          {/* Subject Filter */}
          {subjects.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <select
                value={selectedSubject || ''}
                onChange={(e) => handleFilterChange(() => 
                  setSelectedSubject(e.target.value ? Number(e.target.value) : undefined)
                )}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <option value={5}>5 results</option>
              <option value={10}>10 results</option>
              <option value={20}>20 results</option>
              <option value={50}>50 results</option>
            </select>
          </div>
        </div>

        {/* Active filters indicator */}
        {(statusFilter !== 'all' || selectedSubject) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">Active filters:</span>
              {statusFilter !== 'all' && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                </span>
              )}
              {selectedSubject && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                  {subjects.find(s => s.id === selectedSubject)?.name}
                </span>
              )}
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setSelectedSubject(undefined);
                  setCurrentPage(1);
                }}
                className="text-blue-600 hover:text-blue-700 font-medium ml-2"
              >
                Clear all
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      {totalResults > 0 && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <p className="text-gray-700">
              <span className="font-semibold">{totalResults}</span> result{totalResults !== 1 ? 's' : ''} found
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
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">
              {filteredSubmissions.length === 0 && allSubmissions.length === 0
                ? 'No Assessments Yet'
                : 'No Results Match Your Filters'}
            </h2>
            <p className="text-gray-600">
              {filteredSubmissions.length === 0 && allSubmissions.length === 0
                ? "You haven't completed any assessments yet. Start learning to take assessments!"
                : 'Try adjusting your filters to see more results.'}
            </p>
          </div>
        ) : (
          currentPageSubmissions.map((submission, pageIndex) => {
            const globalIndex = startIndex + pageIndex;
            const hasPendingGrading = submission.answers.some(
              a => a.marksObtained === null || a.marksObtained === undefined
            );
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
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                        {globalIndex + 1}
                      </span>
                      <h3 className="text-xl font-bold text-gray-900">
                        {submission.assessmentTitle}
                      </h3>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          Submitted {format(new Date(submission.submittedAt), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      {submission.gradedAt && isFullyGraded && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>
                            Graded {format(new Date(submission.gradedAt), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      )}
                    </div>

                    {hasPendingGrading ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-lg">
                          <Clock className="w-5 h-5 text-yellow-700" />
                          <div>
                            <span className="text-sm font-semibold text-yellow-900 block">
                              Grading in Progress
                            </span>
                            <span className="text-xs text-yellow-800">
                              {submission.answers.filter(a => a.marksObtained === null).length} question(s) 
                              awaiting teacher review
                            </span>
                          </div>
                        </div>
                        
                        {submission.score != null && submission.score > 0 && (
                          <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-blue-700" />
                            <div>
                              <span className="text-sm font-semibold text-blue-900 block">
                                Current Score (Partial)
                              </span>
                              <span className="text-lg font-bold text-blue-900">
                                {submission.score.toFixed(1)} / {submission.totalMarks}
                              </span>
                              <span className="text-xs text-blue-700 ml-2">
                                (Final score may change after full grading)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-6">
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
                        <div>
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
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => navigate(`/submissions/${submission.id}/results`)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition flex items-center gap-2 whitespace-nowrap"
                  >
                    View Details
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Answer Summary */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Total Questions</p>
                      <p className="text-xl font-bold text-gray-900">
                        {submission.answers.length}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Correct</p>
                      <p className="text-xl font-bold text-green-600">
                        {submission.answers.filter(a => a.isCorrect).length}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">
                        {hasPendingGrading ? 'Under Review' : 'Incorrect'}
                      </p>
                      <p className="text-xl font-bold text-yellow-600">
                        {submission.answers.filter(a => a.marksObtained === null).length}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Graded</p>
                      <p className="text-xl font-bold text-blue-600">
                        {submission.answers.filter(a => a.marksObtained !== null).length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
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

export default StudentAssessmentResultsPage;