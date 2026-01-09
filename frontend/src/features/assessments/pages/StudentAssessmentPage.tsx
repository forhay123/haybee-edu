// ============================================================
// FILE: StudentAssessmentPage.tsx (CORRECTED)
// Location: frontend/src/features/assessments/pages/StudentAssessmentPage.tsx
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api/axios';
import { useAssessmentQuestions, useSubmitAssessment } from '../hooks/useAssessments';
import { useCurrentStudentProfileId } from '../../studentProfiles/hooks/useStudentProfiles';
import { useAssessmentAccess } from '../hooks/useAssessmentAccess';
import { QuestionCard } from '../components/QuestionCard';
import { ArrowLeft, Send, Clock, AlertCircle, Lock, XCircle, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SubmitAssessmentRequest } from '../types/assessmentTypes';
import { AccessCheckAlert } from '../../../components/ui/accessCheckAlert';

interface Assessment {
  id: number;
  title: string;
  description?: string;
  subjectId: number;
  subjectName: string;
  lessonTopicId: number | null;
  lessonTopicTitle: string | null;
  totalMarks: number;
  passingMarks: number;
  durationMinutes: number;
  questionCount: number;
  hasSubmitted?: boolean;
}

export const StudentAssessmentPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  
  // ✅ FIXED: Get actual student profile ID from auth/context
  const { studentProfileId, isLoading: loadingProfile } = useCurrentStudentProfileId();

  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Fetch assessment
  const { data: assessment, isLoading: loadingAssessment } = useQuery<Assessment>({
    queryKey: ['assessment', assessmentId, studentProfileId],
    queryFn: async () => {
      const res = await api.get(`/assessments/${assessmentId}`, {
        params: { studentProfileId }
      });
      return res.data;
    },
    enabled: !!assessmentId && !!studentProfileId,
  });

  // Fetch questions
  const { data: questions = [], isLoading: loadingQuestions } = useAssessmentQuestions(
    Number(assessmentId) || 0,
    false
  );

  // Submit mutation
  const submitAssessment = useSubmitAssessment();

  // ✅ NEW: Check assessment access with all states
  const {
    canAccess: assessmentCanAccess,
    isLocked: assessmentLocked,
    isExpired: assessmentExpired,
    isNotYetOpen: assessmentNotYetOpen,
    isAlreadySubmitted,
    minutesRemaining,
    accessData
  } = useAssessmentAccess(
    Number(assessmentId) || 0,
    studentProfileId || 0,
    60000 // Update every minute
  );

  // Timer effect
  useEffect(() => {
    if (assessment?.durationMinutes && timeRemaining === null) {
      setTimeRemaining(assessment.durationMinutes * 60);
    }
  }, [assessment, timeRemaining]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers(new Map(answers.set(questionId, answer)));
  };

  const handleAutoSubmit = () => {
    toast.error('Time is up! Submitting your answers...');
    handleSubmit();
  };

  const handleSubmit = async () => {
    if (!studentProfileId) {
      toast.error('Student profile not found. Please log in again.');
      return;
    }

    // ✅ NEW: Check for expired state
    if (assessmentExpired) {
      toast.error('This assessment has expired. You can no longer submit.');
      return;
    }

    // ✅ NEW: Check access before submitting
    if (!assessmentCanAccess) {
      toast.error('Assessment window is closed. You can no longer submit.');
      return;
    }

    if (answers.size === 0) {
      toast.error('Please answer at least one question');
      return;
    }

    if (answers.size < questions.length) {
      const confirmSubmit = window.confirm(
        `You have only answered ${answers.size} out of ${questions.length} questions. Do you want to submit anyway?`
      );
      if (!confirmSubmit) return;
    }

    const request: SubmitAssessmentRequest = {
      assessmentId: Number(assessmentId),
      answers: Array.from(answers.entries()).map(([questionId, studentAnswer]) => ({
        questionId,
        studentAnswer
      }))
    };

    try {
      const result = await submitAssessment.mutateAsync({
        request,
        studentProfileId
      });
      
      toast.success(
        `✅ Assessment submitted! Score: ${result.score}/${result.totalMarks} (${result.percentage.toFixed(1)}%)`
      );
      
      // Navigate to results page
      setTimeout(() => {
        navigate(`/lesson-assessments/${result.id}/results`);
      }, 1500);
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.response?.data?.message || 'Failed to submit assessment');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ✅ Loading states
  if (loadingAssessment || loadingQuestions || loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  // ✅ Check if studentProfileId is available
  if (!studentProfileId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
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

  // ✅ Check if assessment exists
  if (!assessment) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 font-medium">Assessment not found</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-blue-600 hover:underline"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ✅ NEW: Block if already submitted
  if (assessment.hasSubmitted || isAlreadySubmitted) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <p className="text-lg text-gray-700 font-medium mb-2">
            You have already submitted this assessment
          </p>
          <p className="text-gray-600 mb-4">
            You cannot retake this assessment. View your results instead.
          </p>
          <button
            onClick={() => navigate('/assessments/student')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View All Assessments
          </button>
        </div>
      </div>
    );
  }

  // ✅ NEW: Block if EXPIRED or LOCKED
  if (assessment && (assessmentExpired || assessmentLocked)) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        {/* Different messages for expired vs locked */}
        {assessmentExpired ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <XCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  Assessment Window Closed
                </h3>
                <p className="text-red-700 mb-4">
                  This assessment is no longer available. The submission window has expired and you can no longer take this assessment.
                </p>
                <div className="p-3 bg-red-100 rounded-lg mb-4">
                  <p className="text-sm text-red-800">
                    <strong>Window ended:</strong> {accessData?.windowEnd 
                      ? new Date(accessData.windowEnd).toLocaleString() 
                      : 'N/A'}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/assessments/student')}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  View Other Assessments
                </button>
              </div>
            </div>
          </div>
        ) : (
          <AccessCheckAlert accessData={accessData} />
        )}
      </div>
    );
  }

  // ✅ Show assessment form only if accessible
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{assessment.title}</h1>
              <p className="text-gray-600">
                {assessment.subjectName}
                {assessment.lessonTopicTitle && ` • ${assessment.lessonTopicTitle}`}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {assessment.questionCount} Questions • {assessment.totalMarks} Marks • {assessment.durationMinutes} mins
              </p>
            </div>
          </div>

          {/* ✅ NEW: Show minutes remaining from access check */}
          {assessmentCanAccess && minutesRemaining !== null && minutesRemaining > 0 && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              minutesRemaining <= 5 
                ? 'bg-red-100 text-red-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              <Clock className="w-5 h-5" />
              <div>
                <p className="text-xs font-medium">Time Remaining</p>
                <p className="font-mono font-bold text-lg">{minutesRemaining} min</p>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Progress: {answers.size} / {questions.length} answered</span>
            <span>{Math.round((answers.size / questions.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(answers.size / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Questions */}
      {questions.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <p className="text-yellow-800 font-medium">
            No questions available for this assessment.
          </p>
        </div>
      ) : (
        <div className="space-y-6 mb-8">
          {questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              questionNumber={index + 1}
              selectedAnswer={answers.get(question.id)}
              onAnswerChange={handleAnswerChange}
              disabled={!assessmentCanAccess || assessmentExpired}
            />
          ))}
        </div>
      )}

      {/* Submit Button */}
      {questions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 sticky bottom-0">
          <button
            onClick={handleSubmit}
            disabled={submitAssessment.isPending || answers.size === 0 || !assessmentCanAccess || assessmentExpired}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg font-semibold transition"
          >
            {submitAssessment.isPending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Submitting...
              </>
            ) : assessmentExpired ? (
              <>
                <XCircle className="w-5 h-5" />
                Assessment Expired
              </>
            ) : !assessmentCanAccess ? (
              <>
                <Lock className="w-5 h-5" />
                Assessment Window Closed
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit Assessment
              </>
            )}
          </button>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>
                <strong>Auto-grading enabled:</strong> Your score will be calculated instantly.
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};