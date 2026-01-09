import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAssessment, useAssessmentQuestions, useSubmitAssessment } from '../hooks/useAssessments';
import { QuestionCard } from '../components/QuestionCard';
import { ArrowLeft, Send, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SubmitAssessmentRequest } from '../types/assessmentTypes';

export const StudentAssessmentPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const studentProfileId = 1; // Get from auth context

  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const { data: assessment, isLoading: loadingAssessment } = useAssessment(
    Number(assessmentId),
    studentProfileId
  );

  const { data: questions = [], isLoading: loadingQuestions } = useAssessmentQuestions(
    Number(assessmentId),
    false
  );

  const submitAssessment = useSubmitAssessment();

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
      
      toast.success('Assessment submitted successfully!');
      
      // ✅ FIX: Use the existing route pattern with submission ID
      // This matches: /lesson-assessments/results/:submissionId
      navigate(`/lesson-assessments/results/${result.id}`);
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit assessment');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loadingAssessment || loadingQuestions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!assessment || assessment.hasSubmitted) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <p className="text-lg text-gray-700">
            {assessment?.hasSubmitted
              ? 'You have already submitted this assessment'
              : 'Assessment not found'}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

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
                {assessment.questionCount} Questions • {assessment.totalMarks} Marks
              </p>
            </div>
          </div>

          {timeRemaining !== null && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              timeRemaining < 300 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
            }`}>
              <Clock className="w-5 h-5" />
              <span className="font-mono font-bold text-lg">{formatTime(timeRemaining)}</span>
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
      <div className="space-y-6 mb-8">
        {questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            questionNumber={index + 1}
            selectedAnswer={answers.get(question.id)}
            onAnswerChange={handleAnswerChange}
          />
        ))}
      </div>

      {/* Submit Button */}
      <div className="bg-white rounded-lg shadow-md p-6 sticky bottom-0">
        <button
          onClick={handleSubmit}
          disabled={submitAssessment.isPending}
          className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2 text-lg font-semibold"
        >
          <Send className="w-5 h-5" />
          {submitAssessment.isPending ? 'Submitting...' : 'Submit Assessment'}
        </button>
      </div>
    </div>
  );
};