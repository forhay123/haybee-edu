import React, { useState } from 'react';
import { CheckCircle, XCircle, RefreshCw, Trophy } from 'lucide-react';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface VideoQuizProps {
  videoId: number;
  questions?: QuizQuestion[];
}

export const VideoQuiz: React.FC<VideoQuizProps> = ({ videoId, questions = [] }) => {
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // Mock questions if none provided
  const quizQuestions: QuizQuestion[] = questions.length > 0 ? questions : [
    {
      id: 1,
      question: 'What is the main topic covered in this video?',
      options: [
        'Introduction to Algebra',
        'Advanced Calculus',
        'Basic Arithmetic',
        'Geometry Fundamentals',
      ],
      correctAnswer: 0,
      explanation: 'The video focuses on introducing fundamental concepts of Algebra.',
    },
    {
      id: 2,
      question: 'Which formula was demonstrated in the example?',
      options: ['a² + b² = c²', 'E = mc²', 'F = ma', 'V = πr²h'],
      correctAnswer: 0,
      explanation: 'The Pythagorean theorem (a² + b² = c²) was used in the main example.',
    },
    {
      id: 3,
      question: 'What is the key takeaway from this lesson?',
      options: [
        'Memorize all formulas',
        'Understand the underlying concepts',
        'Skip the practice problems',
        'Focus only on examples',
      ],
      correctAnswer: 1,
      explanation: 'Understanding concepts is more important than memorization.',
    },
  ];

  const handleAnswerSelect = (questionId: number, optionIndex: number) => {
    if (!submitted) {
      setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
    }
  };

  const handleSubmit = () => {
    let correctCount = 0;
    quizQuestions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });
    setScore(correctCount);
    setSubmitted(true);
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(0);
  };

  const allAnswered = quizQuestions.every((q) => answers[q.id] !== undefined);
  const percentage = quizQuestions.length > 0 ? (score / quizQuestions.length) * 100 : 0;

  if (quizQuestions.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-600">No quiz available for this video yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quiz Header */}
      {!submitted ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-1">Video Comprehension Quiz</h3>
          <p className="text-sm text-blue-700">
            Answer all questions to test your understanding of the video content
          </p>
        </div>
      ) : (
        <div
          className={`border rounded-lg p-6 ${
            percentage >= 80
              ? 'bg-green-50 border-green-200'
              : percentage >= 60
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  percentage >= 80
                    ? 'bg-green-500'
                    : percentage >= 60
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
              >
                <Trophy className="text-white" size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {score} / {quizQuestions.length}
                </h3>
                <p className="text-sm text-gray-600">
                  {percentage >= 80
                    ? 'Excellent work!'
                    : percentage >= 60
                    ? 'Good effort!'
                    : 'Keep practicing!'}
                </p>
              </div>
            </div>
            <button
              onClick={handleRetry}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <RefreshCw size={16} />
              <span>Retry Quiz</span>
            </button>
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-6">
        {quizQuestions.map((question, index) => {
          const userAnswer = answers[question.id];
          const isCorrect = userAnswer === question.correctAnswer;
          const showResult = submitted;

          return (
            <div
              key={question.id}
              className={`bg-white border rounded-lg p-6 transition-all ${
                showResult
                  ? isCorrect
                    ? 'border-green-500 bg-green-50'
                    : 'border-red-500 bg-red-50'
                  : 'border-gray-200'
              }`}
            >
              {/* Question Header */}
              <div className="flex items-start space-x-3 mb-4">
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                    showResult
                      ? isCorrect
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {index + 1}
                </div>
                <h4 className="flex-1 font-medium text-gray-900">{question.question}</h4>
                {showResult && (
                  <div className="flex-shrink-0">
                    {isCorrect ? (
                      <CheckCircle className="text-green-600" size={24} />
                    ) : (
                      <XCircle className="text-red-600" size={24} />
                    )}
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3">
                {question.options.map((option, optionIndex) => {
                  const isSelected = userAnswer === optionIndex;
                  const isCorrectOption = optionIndex === question.correctAnswer;
                  const showAsCorrect = showResult && isCorrectOption;
                  const showAsWrong = showResult && isSelected && !isCorrect;

                  return (
                    <button
                      key={optionIndex}
                      onClick={() => handleAnswerSelect(question.id, optionIndex)}
                      disabled={submitted}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        showAsCorrect
                          ? 'border-green-500 bg-green-100'
                          : showAsWrong
                          ? 'border-red-500 bg-red-100'
                          : isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      } ${submitted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            showAsCorrect
                              ? 'border-green-500 bg-green-500'
                              : showAsWrong
                              ? 'border-red-500 bg-red-500'
                              : isSelected
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {isSelected && !showResult && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                          {showAsCorrect && <CheckCircle className="text-white" size={14} />}
                          {showAsWrong && <XCircle className="text-white" size={14} />}
                        </div>
                        <span
                          className={`flex-1 ${
                            showAsCorrect
                              ? 'text-green-900 font-medium'
                              : showAsWrong
                              ? 'text-red-900'
                              : isSelected
                              ? 'text-blue-900 font-medium'
                              : 'text-gray-700'
                          }`}
                        >
                          {option}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Explanation (shown after submission) */}
              {showResult && question.explanation && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">Explanation:</span> {question.explanation}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit Button */}
      {!submitted && (
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Quiz
          </button>
        </div>
      )}
    </div>
  );
};