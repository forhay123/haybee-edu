// src/features/assessments/pages/TeacherGradingPage.tsx

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSubmissionForGrading, useGradeSubmission } from '../hooks/useGrading';
import { ArrowLeft, Save, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface GradeInput {
  answerId: number;
  marksObtained: number;
  teacherFeedback: string;
}

const TeacherGradingPage: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const [grades, setGrades] = useState<Map<number, GradeInput>>(new Map());
  const [saving, setSaving] = useState(false);

  const { data: submission, isLoading } = useSubmissionForGrading(Number(submissionId));
  const gradeSubmissionMutation = useGradeSubmission();

  // ✅ CRITICAL FIX: Show ALL non-MCQ questions (not just ESSAY/SHORT_ANSWER)
  const pendingAnswers =
    submission?.answers.filter(
      (a) =>
        a.questionType !== 'MULTIPLE_CHOICE' && // Exclude auto-graded MCQs
        a.marksObtained === null // Only show ungraded answers
    ) || [];

  const handleMarksChange = (answerId: number, marks: string) => {
    const numMarks = parseFloat(marks) || 0;
    const currentGrade = grades.get(answerId) || { answerId, marksObtained: 0, teacherFeedback: '' };
    setGrades(new Map(grades.set(answerId, { ...currentGrade, marksObtained: numMarks })));
  };

  const handleFeedbackChange = (answerId: number, feedback: string) => {
    const currentGrade = grades.get(answerId) || { answerId, marksObtained: 0, teacherFeedback: '' };
    setGrades(new Map(grades.set(answerId, { ...currentGrade, teacherFeedback: feedback })));
  };

  const handleSubmitGrades = async () => {
    if (grades.size === 0) {
      alert('Please grade at least one answer');
      return;
    }

    setSaving(true);
    try {
      await gradeSubmissionMutation.mutateAsync({
        submissionId: Number(submissionId),
        grades: Array.from(grades.values()),
      });
      alert('Grades saved successfully! Student has been notified.');
      navigate(-1);
    } catch (error) {
      console.error('Failed to save grades:', error);
      alert('Failed to save grades. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading submission...</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-900 mb-2">Submission Not Found</h2>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Submissions
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Grade Submission</h1>
            <p className="text-gray-600">
              Student: <span className="font-semibold">{submission.studentName}</span>
            </p>
            <p className="text-gray-600">
              Assessment: <span className="font-semibold">{submission.assessmentTitle}</span>
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-yellow-600 mb-2">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">{pendingAnswers.length} Pending</span>
            </div>
            <p className="text-sm text-gray-500">
              Current Score: {submission.score?.toFixed(1) || 0} / {submission.totalMarks}
            </p>
          </div>
        </div>
      </div>

      {/* ✅ All Graded Message */}
      {pendingAnswers.length === 0 && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-8 text-center mb-6">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-900 mb-2">All Graded!</h2>
          <p className="text-green-700">This submission has been fully graded.</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Back to Submissions
          </button>
        </div>
      )}

      {/* Grading Form */}
      {pendingAnswers.length > 0 && (
        <div className="space-y-6">
          {pendingAnswers.map((answer, index) => {
            const currentGrade = grades.get(answer.id!);

            return (
              <div
                key={answer.id}
                className="bg-white rounded-lg shadow-md p-6 border-2 border-yellow-200"
              >
                {/* Question Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-blue-100 text-blue-900 font-bold px-3 py-1 rounded-full">
                      Q{index + 1}
                    </span>
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                      {answer.questionType?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-600">Max Marks: </span>
                    <span className="text-lg font-bold text-gray-900">{answer.maxMarks}</span>
                  </div>
                </div>

                {/* Question */}
                <div className="mb-4">
                  <p className="text-lg font-semibold text-gray-900 mb-3">{answer.questionText}</p>
                </div>

                {/* ✅ Show correct answer for TRUE_FALSE questions */}
                {answer.questionType === 'TRUE_FALSE' && answer.correctAnswer && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <p className="text-sm font-semibold text-green-800 mb-1">Correct Answer:</p>
                    <p className="text-lg font-bold text-green-900">{answer.correctAnswer}</p>
                  </div>
                )}

                {/* Student's Answer */}
                <div className="bg-blue-50 rounded-lg p-4 mb-4 border-l-4 border-blue-500">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Student's Answer:</p>
                  <p className="text-gray-800 whitespace-pre-wrap text-lg font-medium">
                    {answer.studentAnswer}
                  </p>
                </div>

                {/* ✅ Visual indicator for TRUE_FALSE correctness */}
                {answer.questionType === 'TRUE_FALSE' && answer.correctAnswer && (
                  <div className={`border-2 rounded-lg p-3 mb-4 ${
                    answer.studentAnswer?.trim().toUpperCase() === answer.correctAnswer.trim().toUpperCase()
                      ? 'bg-green-50 border-green-300'
                      : 'bg-red-50 border-red-300'
                  }`}>
                    <p className={`font-semibold ${
                      answer.studentAnswer?.trim().toUpperCase() === answer.correctAnswer.trim().toUpperCase()
                        ? 'text-green-800'
                        : 'text-red-800'
                    }`}>
                      {answer.studentAnswer?.trim().toUpperCase() === answer.correctAnswer.trim().toUpperCase()
                        ? '✓ Correct Answer'
                        : '✗ Incorrect Answer'}
                    </p>
                  </div>
                )}

                {/* Grading Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Marks Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Marks Obtained *
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={answer.maxMarks}
                      step="0.5"
                      value={currentGrade?.marksObtained || ''}
                      onChange={(e) => handleMarksChange(answer.id!, e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder={`0 - ${answer.maxMarks}`}
                    />
                  </div>

                  {/* Quick Mark Buttons */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Quick Actions
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMarksChange(answer.id!, '0')}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                      >
                        0 Marks
                      </button>
                      <button
                        onClick={() => handleMarksChange(answer.id!, String(answer.maxMarks! / 2))}
                        className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 text-sm font-medium"
                      >
                        Half
                      </button>
                      <button
                        onClick={() => handleMarksChange(answer.id!, String(answer.maxMarks))}
                        className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium"
                      >
                        Full
                      </button>
                    </div>
                  </div>
                </div>

                {/* Feedback Input */}
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Teacher Feedback (Optional)
                  </label>
                  <textarea
                    value={currentGrade?.teacherFeedback || ''}
                    onChange={(e) => handleFeedbackChange(answer.id!, e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Provide constructive feedback for the student..."
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Button */}
      {pendingAnswers.length > 0 && (
        <div className="mt-8 flex gap-4">
          <button
            onClick={handleSubmitGrades}
            disabled={saving || grades.size === 0}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Submit Grades ({grades.size} answers)
              </>
            )}
          </button>
          <button
            onClick={() => navigate(-1)}
            disabled={saving}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 font-medium transition"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default TeacherGradingPage;