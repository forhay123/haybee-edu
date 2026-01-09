import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api/axios';
import { QuestionCard } from '../components/QuestionCard';
import { ArrowLeft, Send, BookOpen, Brain, CheckCircle, Lock, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  useAssessmentQuestions,
  useCheckSubmissionByAssessment,
  useSubmitLessonAssessment,
  useCurrentStudentProfileId,
} from '../hooks/useLessonAssessments';
import { useAssessmentAccess } from '../hooks/useAssessmentAccess';
import { AccessCheckAlert } from '../../../components/ui/accessCheckAlert';
import { assessmentAccessService } from '../../../services/assessmentAccessService';
import { scheduleValidationApi } from '../api/scheduleValidationApi';

const StudentAssessmentTakePage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [showMaterial, setShowMaterial] = useState(true);
  
  // Get current student profile ID
  const { studentProfileId, isLoading: loadingProfile } = useCurrentStudentProfileId();

  // Fetch assessment directly
  const { data: assessment, isLoading: loadingAssessment } = useQuery({
    queryKey: ['assessment', assessmentId],
    queryFn: async () => {
      const res = await api.get(`/assessments/${assessmentId}`);
      return res.data;
    },
    enabled: !!assessmentId,
  });

  // Fetch lesson topic if available
  const { data: topic, isLoading: loadingTopic } = useQuery({
    queryKey: ['lessonTopic', assessment?.lessonTopicId],
    queryFn: async () => {
      const res = await api.get(`/lesson-topics/${assessment.lessonTopicId}`);
      return res.data;
    },
    enabled: !!assessment?.lessonTopicId,
  });

  // Check if already submitted
  const { data: existingSubmission } = useQuery({
    queryKey: ['submission-check', assessmentId, studentProfileId],
    queryFn: async () => {
      const res = await api.get(`/assessments/${assessmentId}/submissions/student/${studentProfileId}`);
      return res.data;
    },
    enabled: !!assessmentId && !!studentProfileId,
    retry: false,
  });

  // Get assessment questions
  const { 
    data: questions = [], 
    isLoading: loadingQuestions 
  } = useAssessmentQuestions(Number(assessmentId) || 0, false);

  // Submit mutation
  const submitMutation = useSubmitLessonAssessment();

  // Check assessment access
  const {
    canAccess: assessmentCanAccess,
    isLocked: assessmentLocked,
    minutesRemaining,
    accessData
  } = useAssessmentAccess(
    Number(assessmentId) || 0,
    studentProfileId || 0,
    60000
  );

  // Start polling service
  useEffect(() => {
    if (!studentProfileId || !assessmentId) return;

    assessmentAccessService.startPolling(
      {
        assessmentId: Number(assessmentId),
        studentProfileId,
        interval: 60000
      },
      async () => {
        return await scheduleValidationApi.checkAssessmentAccess(
          Number(assessmentId), 
          studentProfileId
        );
      }
    );

    return () => {
      assessmentAccessService.stopPolling(Number(assessmentId), studentProfileId);
    };
  }, [assessmentId, studentProfileId]);

  // Redirect if already submitted
  useEffect(() => {
    if (existingSubmission) {
      toast('You have already completed this assessment', {
        icon: 'ℹ️',
      });
      navigate(`/submissions/${existingSubmission.id}/results`);
    }
  }, [existingSubmission, navigate]);

  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers(new Map(answers.set(questionId, answer)));
  };

  const handleSubmit = async () => {
    if (!assessment) {
      toast.error('Assessment not found');
      return;
    }

    if (!studentProfileId) {
      toast.error('Student profile not found. Please log in again.');
      return;
    }

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
        `You have only answered ${answers.size} out of ${questions.length} questions. Unanswered questions will be marked as incorrect. Continue?`
      );
      if (!confirmSubmit) return;
    }

    try {
      const submissionRequest = {
        assessmentId: Number(assessmentId),
        answers: Array.from(answers.entries()).map(([questionId, studentAnswer]) => ({
          questionId,
          studentAnswer
        }))
      };

      const result = await submitMutation.mutateAsync({
        request: submissionRequest,
        studentProfileId
      });

      toast.success(
        `✅ Assessment submitted! Score: ${result.score}/${result.totalMarks} (${result.percentage.toFixed(1)}%)`
      );

      setTimeout(() => {
        navigate(`/submissions/${result.id}/results`);
      }, 1500);

    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.response?.data?.message || 'Failed to submit assessment');
    }
  };

  // Loading states
  if (loadingAssessment || loadingQuestions || loadingProfile || loadingTopic) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (!studentProfileId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
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

  if (!assessment) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 font-medium">Assessment not found</p>
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

  if (assessmentLocked) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <AccessCheckAlert accessData={accessData} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{assessment.title}</h1>
            {topic && <p className="text-gray-600">{topic.topicTitle}</p>}
          </div>
        </div>

        {/* Time remaining banner */}
        {assessmentCanAccess && minutesRemaining !== null && minutesRemaining > 0 && (
          <div className={`p-3 rounded-lg mb-4 flex items-center gap-3 ${
            minutesRemaining <= 5 
              ? 'bg-red-50 border border-red-200' 
              : 'bg-blue-50 border border-blue-200'
          }`}>
            <Clock className={`w-5 h-5 ${minutesRemaining <= 5 ? 'text-red-600' : 'text-blue-600'}`} />
            <div>
              <p className={`font-medium ${minutesRemaining <= 5 ? 'text-red-800' : 'text-blue-800'}`}>
                Time Remaining: {minutesRemaining} minutes
              </p>
              <p className={`text-sm ${minutesRemaining <= 5 ? 'text-red-600' : 'text-blue-600'}`}>
                {minutesRemaining <= 5 
                  ? 'Hurry! Submit before the window closes.' 
                  : 'Complete and submit within the time window.'}
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-600">Total Questions</p>
            <p className="text-2xl font-bold text-blue-600">{questions.length}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-600">AI Questions</p>
            <p className="text-2xl font-bold text-purple-600">
              {questions.filter(q => q.aiGenerated).length}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-600">Total Marks</p>
            <p className="text-2xl font-bold text-green-600">{assessment.totalMarks}</p>
          </div>
        </div>

        {/* Toggle Material View - only if topic exists */}
        {topic && (
          <button
            onClick={() => setShowMaterial(!showMaterial)}
            className="mt-4 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <BookOpen className="w-5 h-5" />
            {showMaterial ? 'Hide' : 'Show'} Lesson Material
          </button>
        )}
      </div>

      {/* Lesson Material - only if topic exists */}
      {showMaterial && topic && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">📚 Study Material</h3>
          
          {topic.description && (
            <p className="text-gray-700 mb-4 leading-relaxed">{topic.description}</p>
          )}

          <div className="space-y-3">
            {topic.fileUrl && (
               <a
                href={topic.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                📄 View Lesson Material
              </a>
            )}

            {topic.videoUrl && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Video Lesson:</p>
                <video controls className="rounded-lg shadow-md w-full max-h-96">
                  <source src={topic.videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Questions Section */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Brain className="w-6 h-6 text-blue-600" />
                Assessment Questions
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Answer all questions to complete this assessment
              </p>
            </div>
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium">
              No questions available for this assessment.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                questionNumber={index + 1}
                selectedAnswer={answers.get(question.id)}
                onAnswerChange={handleAnswerChange}
                disabled={!assessmentCanAccess}
              />
            ))}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {questions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span className="font-medium">
              Progress: {answers.size} / {questions.length} answered
            </span>
            <span className="font-semibold text-blue-600">
              {Math.round((answers.size / questions.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${(answers.size / questions.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Submit Button */}
      {questions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <button
            onClick={handleSubmit}
            disabled={submitMutation.isPending || answers.size === 0 || !assessmentCanAccess}
            className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg font-semibold transition shadow-lg hover:shadow-xl"
          >
            {submitMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Submitting...
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

export default StudentAssessmentTakePage;