// src/features/assessments/pages/StudentSubmissionResultsPage.tsx

import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api/axios';
import { ArrowLeft, CheckCircle, XCircle, Award, BookOpen, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../../features/auth/useAuth';

interface SubmissionAnswer {
  id: number;
  questionId: number;
  questionText: string;
  questionType: string;
  studentAnswer: string;
  correctAnswer?: string;
  isCorrect: boolean;
  marksObtained: number | null;
  maxMarks: number;
  teacherFeedback?: string;
}

interface AssessmentSubmission {
  id: number;
  assessmentId: number;
  assessmentTitle: string;
  studentId: number;
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  graded: boolean;
  submittedAt: string;
  gradedAt?: string;
  answers: SubmissionAnswer[];
}

const StudentSubmissionResultsPage: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // ✅ Use the CORRECT endpoint - same as LessonAssessmentResultsPage
  const { data: submission, isLoading, error } = useQuery<AssessmentSubmission>({
    queryKey: ['assessmentSubmission', submissionId],
    queryFn: async () => {
      // ✅ This is the working endpoint from your LessonAssessmentResultsPage
      const response = await api.get(`/lesson-assessments/results/${submissionId}`);
      return response.data;
    },
    enabled: !!submissionId,
    retry: 1
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-900 mb-2">Results Not Found</h2>
          <p className="text-red-700 mb-4">
            {error instanceof Error ? error.message : 'Unable to load assessment results'}
          </p>
          <button
            onClick={() => navigate('/assessments/student')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to My Assessments
          </button>
        </div>
      </div>
    );
  }

  const passed = submission.passed;
  const percentage = submission.percentage.toFixed(1);
  
  // ✅ Check if there are any pending essay questions
  const hasPendingGrading = submission.answers.some(
    a => (a.questionType === 'ESSAY' || a.questionType === 'SHORT_ANSWER') && 
         a.marksObtained === null
  );

  // ✅ Determine if user is a teacher
  const isTeacher = user?.roles?.includes('TEACHER');
  
  // ✅ Smart back navigation - check state first, then role
  const handleBackClick = () => {
    // If came from a specific page (passed via state), go back there
    if (location.state?.from) {
      navigate(location.state.from);
      return;
    } 
    
    // If teacher and we have assessmentId, go to assessment submissions page
    if (isTeacher && submission?.assessmentId) {
      navigate(`/teacher/assessments/${submission.assessmentId}/submissions`);
      return;
    }
    
    // Default for students - go to their results page
    navigate('/assessments/results');
  };

  // ✅ Get back button text based on context
  const getBackButtonText = () => {
    if (location.state?.from) {
      return 'Back to Submissions';
    }
    if (isTeacher) {
      return 'Back to Submissions';
    }
    return 'Back to All Results';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <button
          onClick={handleBackClick}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          {getBackButtonText()}
        </button>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4">
            {passed ? (
              <CheckCircle className="w-20 h-20 text-green-500" />
            ) : (
              <XCircle className="w-20 h-20 text-red-500" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {submission.assessmentTitle}
          </h1>
          <p className="text-gray-600">
            Submitted on {format(new Date(submission.submittedAt), 'MMMM dd, yyyy • hh:mm a')}
          </p>
        </div>
      </div>

      {/* ✅ Pending Grading Notice */}
      {hasPendingGrading && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-yellow-600" />
            <div>
              <p className="font-semibold text-yellow-900">
                Partial Results - Grading in Progress
              </p>
              <p className="text-sm text-yellow-800">
                Some essay questions are pending teacher review. Your final score may change.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Score Card */}
      <div className={`rounded-lg shadow-lg p-8 mb-6 ${
        passed ? 'bg-gradient-to-br from-green-50 to-green-100' : 'bg-gradient-to-br from-red-50 to-red-100'
      }`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {hasPendingGrading ? 'Current Results' : 'Your Results'}
          </h2>
          <Award className={`w-8 h-8 ${passed ? 'text-green-600' : 'text-red-600'}`} />
        </div>

        <div className="text-center mb-6">
          <div className={`text-6xl font-bold mb-3 ${
            passed ? 'text-green-600' : 'text-red-600'
          }`}>
            {submission.score.toFixed(1)} / {submission.totalMarks}
          </div>
          <div className={`text-3xl font-semibold mb-4 ${
            passed ? 'text-green-700' : 'text-red-700'
          }`}>
            {percentage}%
          </div>
          <span className={`inline-block px-6 py-3 rounded-full text-lg font-bold ${
            passed 
              ? 'bg-green-600 text-white' 
              : 'bg-red-600 text-white'
          }`}>
            {passed ? '✓ Passed' : '✗ Failed'}
          </span>
        </div>

        {/* Performance Summary */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">Total Questions</p>
            <p className="text-2xl font-bold text-gray-900">{submission.answers.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">Correct Answers</p>
            <p className="text-2xl font-bold text-green-600">
              {submission.answers.filter(a => a.isCorrect).length}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">
              {hasPendingGrading ? 'Pending Review' : 'Incorrect Answers'}
            </p>
            <p className="text-2xl font-bold text-red-600">
              {hasPendingGrading 
                ? submission.answers.filter(a => a.marksObtained === null).length
                : submission.answers.filter(a => !a.isCorrect).length
              }
            </p>
          </div>
        </div>
      </div>

      {/* Answer Review */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          Answer Review
        </h2>

        <div className="space-y-6">
          {submission.answers.map((answer, index) => {
            const isPending = answer.marksObtained === null;
            const displayMarks = isPending ? 0 : answer.marksObtained;

            return (
              <div
                key={answer.id}
                className={`border-2 rounded-lg p-6 transition ${
                  isPending
                    ? 'border-yellow-300 bg-yellow-50'
                    : answer.isCorrect
                    ? 'border-green-300 bg-green-50'
                    : 'border-red-300 bg-red-50'
                }`}
              >
                {/* Question Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-white text-gray-900 font-bold px-3 py-1 rounded-full border-2 border-gray-300">
                      Q{index + 1}
                    </span>
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                      isPending
                        ? 'bg-yellow-200 text-yellow-900'
                        : answer.isCorrect 
                        ? 'bg-green-200 text-green-900' 
                        : 'bg-red-200 text-red-900'
                    }`}>
                      {isPending ? '⏳ Pending Review' : answer.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                      {answer.questionType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xl font-bold ${
                      isPending
                        ? 'text-yellow-600'
                        : answer.isCorrect 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {isPending ? '?' : displayMarks.toFixed(1)}
                    </span>
                    <span className="text-gray-600"> / {answer.maxMarks}</span>
                  </div>
                </div>

                {/* Question Text */}
                <p className="text-gray-900 font-medium text-lg mb-4 leading-relaxed">
                  {answer.questionText}
                </p>

                {/* Answer Section */}
                <div className="space-y-3">
                  {/* Student's Answer */}
                  <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
                    <span className="text-sm font-semibold text-blue-900 block mb-1">
                      Your Answer:
                    </span>
                    <span className="text-gray-900">{answer.studentAnswer || '(No answer provided)'}</span>
                  </div>

                  {/* Correct Answer (if wrong and MCQ) */}
                  {!isPending && !answer.isCorrect && answer.correctAnswer && (
                    <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                      <span className="text-sm font-semibold text-green-900 block mb-1">
                        Correct Answer:
                      </span>
                      <span className="text-green-700 font-medium">{answer.correctAnswer}</span>
                    </div>
                  )}

                  {/* Teacher Feedback */}
                  {answer.teacherFeedback && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <span className="text-sm font-semibold text-blue-900 block mb-2">
                        📝 Teacher Feedback:
                      </span>
                      <p className="text-blue-800">{answer.teacherFeedback}</p>
                    </div>
                  )}

                  {/* Manual Grading Notice */}
                  {isPending && (answer.questionType === 'ESSAY' || answer.questionType === 'SHORT_ANSWER') && (
                    <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                      <p className="text-sm text-yellow-800">
                        ⏳ This answer is pending teacher review. You will be notified once it's graded.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-4">
        <button
          onClick={handleBackClick}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
        >
          {getBackButtonText()}
        </button>
        <button
          onClick={() => window.print()}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition"
        >
          Print Results
        </button>
      </div>
    </div>
  );
};

export default StudentSubmissionResultsPage;