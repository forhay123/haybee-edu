// src/features/assessments/pages/StudentAssessmentResultsPage.tsx

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyProfile } from '../../studentProfiles/hooks/useStudentProfiles';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../api/axios';
import { CheckCircle, XCircle, Clock, BookOpen, TrendingUp, Award, ChevronRight, AlertTriangle } from 'lucide-react';
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
  const [selectedSubject, setSelectedSubject] = useState<number | undefined>(undefined);

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

  // Filter by subject if selected
  const submissions = useMemo(() => {
    if (!selectedSubject) return allSubmissions;
    return allSubmissions.filter(s => {
      return true; // TODO: Add proper subject filtering when subjectId is available
    });
  }, [allSubmissions, selectedSubject]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = submissions.length;
    const passed = submissions.filter(s => s.passed).length;
    const failed = total - passed;
    
    const scores = submissions
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
      failedAssessments: failed,
      averageScore: average,
      highestScore: highest,
      lowestScore: lowest
    };
  }, [submissions]);

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
            <TrendingUp className="w-8 h-8 text-yellow-600" />
            <span className="text-3xl font-bold text-yellow-900">
              {stats.averageScore.toFixed(1)}%
            </span>
          </div>
          <p className="text-sm text-yellow-800 font-medium">Average Score</p>
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

      {/* Subject Filter */}
      {subjects.length > 1 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Filter by Subject
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSubject(undefined)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedSubject === undefined
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Subjects
            </button>
            {subjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => setSelectedSubject(subject.id)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedSubject === subject.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {subject.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Submissions List */}
      <div className="space-y-4">
        {submissions.length === 0 ? (
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-8 text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">No Assessments Yet</h2>
            <p className="text-gray-600">
              You haven't completed any assessments yet. Start learning to take assessments!
            </p>
          </div>
        ) : (
          submissions.map((submission) => {
            // ✅ Check for partial grading
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
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {submission.assessmentTitle}
                    </h3>

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

                    {/* ✅ Show partial grading notice */}
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
                        
                        {/* Show current partial score */}
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

                  {/* ✅ FIXED: Navigate to correct URL without submission.id */}
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
    </div>
  );
};

export default StudentAssessmentResultsPage;