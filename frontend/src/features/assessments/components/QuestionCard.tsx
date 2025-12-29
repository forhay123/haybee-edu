import React from 'react';

interface QuestionCardProps {
  question: {
    id: number;
    questionText: string;
    questionType: string;
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
    marks: number;
    orderNumber: number;
    aiGenerated: boolean;
    correctAnswer?: string;
  };
  questionNumber: number;
  selectedAnswer?: string;
  onAnswerChange: (questionId: number, answer: string) => void;
  showCorrectAnswer?: boolean;
  isCorrect?: boolean;
  disabled?: boolean; // ✅ NEW: Support for disabling entire question
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionNumber,
  selectedAnswer,
  onAnswerChange,
  showCorrectAnswer = false,
  isCorrect,
  disabled = false // ✅ NEW: Default to false
}) => {
  // ✅ Smart type detection with auto-correction
  const rawQuestionType = (question.questionType || 'MULTIPLE_CHOICE').toUpperCase();
  const hasOptions = question.optionA || question.optionB || question.optionC || question.optionD;
  
  // Auto-correct: If marked as MCQ but no options exist, treat as ESSAY
  const questionType = (rawQuestionType === 'MULTIPLE_CHOICE' && !hasOptions) 
    ? 'ESSAY' 
    : rawQuestionType;
  
  // ✅ NEW: Combined disabled state (either from prop or showCorrectAnswer)
  const isDisabled = disabled || showCorrectAnswer;
  
  const renderMultipleChoice = () => {
    const options = [
      { label: 'A', value: question.optionA },
      { label: 'B', value: question.optionB },
      { label: 'C', value: question.optionC },
      { label: 'D', value: question.optionD }
    ].filter(opt => opt.value);

    // Safety check: if no options, fall back to essay
    if (options.length === 0) {
      return renderTextAnswer('ESSAY');
    }

    return (
      <div className="space-y-3">
        {options.map((option) => {
          const isSelected = selectedAnswer === option.label;
          const isCorrectOption = showCorrectAnswer && question.correctAnswer === option.label;
          const isWrongSelection = showCorrectAnswer && isSelected && !isCorrect;

          return (
            <label
              key={option.label}
              className={`flex items-start p-4 border-2 rounded-lg transition-all ${
                isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
              } ${
                isCorrectOption
                  ? 'border-green-500 bg-green-50'
                  : isWrongSelection
                  ? 'border-red-500 bg-red-50'
                  : isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : isDisabled
                  ? 'border-gray-200 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option.label}
                checked={isSelected}
                onChange={(e) => onAnswerChange(question.id, e.target.value)}
                disabled={isDisabled}
                className="mt-1 mr-3 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="flex-1">
                <span className="font-medium mr-2">{option.label}.</span>
                <span className={isDisabled ? 'text-gray-500' : 'text-gray-700'}>
                  {option.value}
                </span>
              </div>
              {isCorrectOption && (
                <span className="text-green-600 text-sm font-medium ml-2">✓ Correct</span>
              )}
              {isWrongSelection && (
                <span className="text-red-600 text-sm font-medium ml-2">✗ Wrong</span>
              )}
            </label>
          );
        })}
      </div>
    );
  };

  const renderTrueFalse = () => {
    const options = [
      { label: 'TRUE', value: 'True' },
      { label: 'FALSE', value: 'False' }
    ];

    return (
      <div className="space-y-3">
        {options.map((option) => {
          const isSelected = selectedAnswer?.toUpperCase() === option.label;
          const isCorrectOption = showCorrectAnswer && 
            question.correctAnswer?.toUpperCase() === option.label;
          const isWrongSelection = showCorrectAnswer && isSelected && !isCorrect;

          return (
            <label
              key={option.label}
              className={`flex items-center p-4 border-2 rounded-lg transition-all ${
                isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
              } ${
                isCorrectOption
                  ? 'border-green-500 bg-green-50'
                  : isWrongSelection
                  ? 'border-red-500 bg-red-50'
                  : isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : isDisabled
                  ? 'border-gray-200 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option.label}
                checked={isSelected}
                onChange={(e) => onAnswerChange(question.id, e.target.value)}
                disabled={isDisabled}
                className="mr-3 cursor-pointer disabled:cursor-not-allowed"
              />
              <span className={`font-medium text-lg ${isDisabled ? 'text-gray-500' : ''}`}>
                {option.value}
              </span>
              {isCorrectOption && (
                <span className="text-green-600 text-sm font-medium ml-auto">✓ Correct</span>
              )}
              {isWrongSelection && (
                <span className="text-red-600 text-sm font-medium ml-auto">✗ Wrong</span>
              )}
            </label>
          );
        })}
      </div>
    );
  };

  const renderTextAnswer = (type: 'SHORT_ANSWER' | 'ESSAY') => {
    const minHeight = type === 'ESSAY' ? '200px' : '120px';
    const placeholder = isDisabled
      ? 'Assessment window is closed'
      : type === 'ESSAY' 
      ? 'Write your detailed answer here... (This will be graded manually by your teacher)'
      : 'Type your answer here... (Short answer)';

    return (
      <div>
        <textarea
          value={selectedAnswer || ''}
          onChange={(e) => onAnswerChange(question.id, e.target.value)}
          disabled={isDisabled}
          placeholder={placeholder}
          className="w-full p-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y transition disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
          style={{ minHeight }}
          rows={type === 'ESSAY' ? 8 : 4}
        />
        <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
          <span className="flex items-center gap-2">
            {type === 'ESSAY' ? '📝 Essay Question' : '✍️ Short Answer'}
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              Manual Grading Required
            </span>
          </span>
          {selectedAnswer && (
            <span className="text-blue-600">
              {selectedAnswer.length} characters
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderQuestionInput = () => {
    switch (questionType) {
      case 'MULTIPLE_CHOICE':
        return renderMultipleChoice();
      
      case 'TRUE_FALSE':
        return renderTrueFalse();
      
      case 'SHORT_ANSWER':
        return renderTextAnswer('SHORT_ANSWER');
      
      case 'ESSAY':
        return renderTextAnswer('ESSAY');
      
      default:
        // Unknown type fallback
        return (
          <div className="space-y-3">
            <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 mb-2">
                ⚠️ Unknown question type detected. Auto-correcting to essay format.
              </p>
            </div>
            {renderTextAnswer('ESSAY')}
          </div>
        );
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 mb-4 border border-gray-200 ${
      disabled && !showCorrectAnswer ? 'opacity-60' : ''
    }`}>
      {/* ✅ NEW: Disabled banner */}
      {disabled && !showCorrectAnswer && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <span className="text-red-600 font-medium">🔒 Assessment window is closed</span>
        </div>
      )}

      {/* Question Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              Question {questionNumber}
            </span>
            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
              {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
            </span>
            {question.aiGenerated && (
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">
                🤖 AI Generated
              </span>
            )}
            <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-medium">
              {questionType.replace(/_/g, ' ')}
            </span>
          </div>
          <p className={`font-medium text-lg leading-relaxed ${
            disabled && !showCorrectAnswer ? 'text-gray-500' : 'text-gray-900'
          }`}>
            {question.questionText}
          </p>
        </div>
      </div>

      {/* Answer Input Area */}
      <div className="mt-4">
        {renderQuestionInput()}
      </div>

      {/* Result Display */}
      {showCorrectAnswer && (
        <div className={`mt-4 p-4 rounded-lg border-2 ${
          isCorrect 
            ? 'bg-green-50 border-green-300' 
            : 'bg-red-50 border-red-300'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {isCorrect ? (
              <>
                <span className="text-2xl">✅</span>
                <span className="text-green-800 font-semibold text-lg">Correct!</span>
              </>
            ) : (
              <>
                <span className="text-2xl">❌</span>
                <span className="text-red-800 font-semibold text-lg">Incorrect</span>
              </>
            )}
          </div>
          
          {!isCorrect && question.correctAnswer && questionType === 'MULTIPLE_CHOICE' && (
            <div className="mt-3 p-3 bg-white rounded border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-1">
                Correct Answer:
              </p>
              <p className="text-gray-900">
                {question.correctAnswer}. {question[`option${question.correctAnswer}` as keyof typeof question] || question.correctAnswer}
              </p>
            </div>
          )}
          
          {(questionType === 'ESSAY' || questionType === 'SHORT_ANSWER') && (
            <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-blue-800">
                ✏️ This answer will be manually graded by your teacher.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};