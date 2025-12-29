import { AssessmentSubmission } from '../types/assessmentTypes';
import { CheckCircle, XCircle, Award } from 'lucide-react';
import { format } from 'date-fns';

interface SubmissionResultsProps {
  submission: AssessmentSubmission;
}

export const SubmissionResults: React.FC<SubmissionResultsProps> = ({ submission }) => {
  const passed = submission.passed ?? false;
  const percentage = submission.percentage?.toFixed(1) ?? '0.0';

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4">
          {passed ? (
            <CheckCircle className="w-16 h-16 text-green-500" />
          ) : (
            <XCircle className="w-16 h-16 text-red-500" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {submission.assessmentTitle}
        </h2>
        <p className="text-gray-600">
          Submitted on {format(new Date(submission.submittedAt), 'MMM dd, yyyy hh:mm a')}
        </p>
      </div>

      {/* Score Card */}
      <div className={`rounded-lg p-6 mb-6 ${passed ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-medium text-gray-700">Your Score</span>
          <Award className={`w-6 h-6 ${passed ? 'text-green-600' : 'text-red-600'}`} />
        </div>
        <div className="text-center">
          <div className={`text-5xl font-bold mb-2 ${passed ? 'text-green-600' : 'text-red-600'}`}>
            {submission.score?.toFixed(1) ?? '0'} / {submission.totalMarks}
          </div>
          <div className={`text-2xl font-semibold ${passed ? 'text-green-700' : 'text-red-700'}`}>
            {percentage}%
          </div>
        </div>
        <div className="mt-4 text-center">
          <span className={`inline-block px-4 py-2 rounded-full font-semibold ${
            passed ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900'
          }`}>
            {passed ? '✓ Passed' : '✗ Failed'}
          </span>
        </div>
      </div>

      {/* Answers Review */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Answer Review</h3>
        {submission.answers.map((answer, index) => (
          <div
            key={answer.id}
            className={`border-2 rounded-lg p-4 ${
              answer.isCorrect
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="font-medium text-gray-900">Question {index + 1}</span>
              <span className={`font-semibold ${answer.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                {answer.marksObtained?.toFixed(1) ?? 0} / {answer.maxMarks ?? 1}
              </span>
            </div>
            <p className="text-gray-700 mb-3">{answer.questionText}</p>
            
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-600">Your Answer: </span>
                <span className="text-gray-900">{answer.studentAnswer}</span>
              </div>
              {!answer.isCorrect && answer.correctAnswer && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Correct Answer: </span>
                  <span className="text-green-700 font-medium">{answer.correctAnswer}</span>
                </div>
              )}
              {answer.teacherFeedback && (
                <div className="mt-2 p-3 bg-blue-50 rounded">
                  <span className="text-sm font-medium text-blue-900">Teacher Feedback: </span>
                  <span className="text-blue-800">{answer.teacherFeedback}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};