import { useState, useEffect } from 'react';
import { useTeacherSubjects } from '../../subjects/hooks/useSubjects';
import { useLessonTopics } from '../../lessons/hooks/useLessonTopics';
import { CreateTeacherQuestionRequest, QuestionType } from '../types/assessmentTypes';
import { AlertCircle } from 'lucide-react';

interface QuestionFormProps {
  onSubmit: (data: CreateTeacherQuestionRequest) => Promise<void>;
  onCancel: () => void;
  subjectId?: number;
  initialData?: CreateTeacherQuestionRequest;
}

export const QuestionForm: React.FC<QuestionFormProps> = ({
  onSubmit,
  onCancel,
  subjectId: propSubjectId,
  initialData
}) => {
  // ✅ FIX: Initialize with propSubjectId if provided
  const [formData, setFormData] = useState<CreateTeacherQuestionRequest>({
    subjectId: propSubjectId || initialData?.subjectId || 0,
    lessonTopicId: initialData?.lessonTopicId,
    questionText: initialData?.questionText || '',
    questionType: initialData?.questionType || QuestionType.MULTIPLE_CHOICE,
    optionA: initialData?.optionA,
    optionB: initialData?.optionB,
    optionC: initialData?.optionC,
    optionD: initialData?.optionD,
    correctAnswer: initialData?.correctAnswer || '',
    difficultyLevel: initialData?.difficultyLevel || 'MEDIUM'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: subjects = [], isLoading: loadingSubjects } = useTeacherSubjects();
  
  // ✅ Use the correct hook for getting lesson topics by subject
  const lessonTopicsQuery = useLessonTopics(formData.subjectId);
  const lessonTopics = lessonTopicsQuery.getAll.data || [];
  const loadingTopics = lessonTopicsQuery.getAll.isLoading;

  // ✅ FIX: Update subjectId if propSubjectId changes
  useEffect(() => {
    if (propSubjectId && propSubjectId !== formData.subjectId) {
      setFormData(prev => ({ ...prev, subjectId: propSubjectId }));
    }
  }, [propSubjectId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'subjectId' || name === 'lessonTopicId' 
        ? (value ? Number(value) : undefined)
        : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // ✅ Reset lesson topic when subject changes
    if (name === 'subjectId') {
      setFormData(prev => ({ ...prev, lessonTopicId: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // ✅ CRITICAL: Validate subjectId
    if (!formData.subjectId || formData.subjectId === 0) {
      newErrors.subjectId = 'Subject is required';
    }

    if (!formData.questionText.trim()) {
      newErrors.questionText = 'Question text is required';
    }

    if (!formData.questionType) {
      newErrors.questionType = 'Question type is required';
    }

    // Validate options for multiple choice
    if (formData.questionType === QuestionType.MULTIPLE_CHOICE) {
      if (!formData.optionA?.trim()) newErrors.optionA = 'Option A is required';
      if (!formData.optionB?.trim()) newErrors.optionB = 'Option B is required';
      if (!formData.correctAnswer) {
        newErrors.correctAnswer = 'Correct answer is required';
      } else if (!['A', 'B', 'C', 'D'].includes(formData.correctAnswer)) {
        newErrors.correctAnswer = 'Correct answer must be A, B, C, or D';
      }
    } else {
      // For non-MCQ questions
      if (!formData.correctAnswer?.trim()) {
        newErrors.correctAnswer = 'Correct answer is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ submit: 'Failed to save question. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMCQ = formData.questionType === QuestionType.MULTIPLE_CHOICE;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
      {/* ✅ Error Alert */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-700 text-sm">{errors.submit}</p>
          </div>
        </div>
      )}

      {/* Subject Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Subject <span className="text-red-500">*</span>
        </label>
        <select
          name="subjectId"
          value={formData.subjectId || ''}
          onChange={handleChange}
          disabled={!!propSubjectId || loadingSubjects}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
            errors.subjectId ? 'border-red-500' : 'border-gray-300'
          } ${propSubjectId ? 'bg-gray-100' : ''}`}
        >
          <option value="">Select a subject</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
        {errors.subjectId && (
          <p className="mt-1 text-sm text-red-600">{errors.subjectId}</p>
        )}
      </div>

      {/* Lesson Topic (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lesson Topic (Optional)
        </label>
        <select
          name="lessonTopicId"
          value={formData.lessonTopicId || ''}
          onChange={handleChange}
          disabled={!formData.subjectId || loadingTopics}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">No specific lesson</option>
          {lessonTopics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              Week {topic.weekNumber}: {topic.topicTitle}
            </option>
          ))}
        </select>
      </div>

      {/* Question Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Question Type <span className="text-red-500">*</span>
        </label>
        <select
          name="questionType"
          value={formData.questionType}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
            errors.questionType ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value={QuestionType.MULTIPLE_CHOICE}>Multiple Choice</option>
          <option value={QuestionType.TRUE_FALSE}>True/False</option>
          <option value={QuestionType.SHORT_ANSWER}>Short Answer</option>
          <option value={QuestionType.ESSAY}>Essay</option>
        </select>
        {errors.questionType && (
          <p className="mt-1 text-sm text-red-600">{errors.questionType}</p>
        )}
      </div>

      {/* Difficulty Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Difficulty Level
        </label>
        <select
          name="difficultyLevel"
          value={formData.difficultyLevel}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
      </div>

      {/* Question Text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Question <span className="text-red-500">*</span>
        </label>
        <textarea
          name="questionText"
          value={formData.questionText}
          onChange={handleChange}
          rows={4}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
            errors.questionText ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter your question here..."
        />
        {errors.questionText && (
          <p className="mt-1 text-sm text-red-600">{errors.questionText}</p>
        )}
      </div>

      {/* Options for Multiple Choice */}
      {isMCQ && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Answer Options</h3>
          
          {['A', 'B', 'C', 'D'].map((letter) => (
            <div key={letter}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Option {letter} {['A', 'B'].includes(letter) && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                name={`option${letter}`}
                value={formData[`option${letter}` as keyof CreateTeacherQuestionRequest] as string || ''}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors[`option${letter}`] ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={`Enter option ${letter}`}
              />
              {errors[`option${letter}`] && (
                <p className="mt-1 text-sm text-red-600">{errors[`option${letter}`]}</p>
              )}
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correct Answer <span className="text-red-500">*</span>
            </label>
            <select
              name="correctAnswer"
              value={formData.correctAnswer}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.correctAnswer ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select correct answer</option>
              <option value="A">A</option>
              <option value="B">B</option>
              {formData.optionC && <option value="C">C</option>}
              {formData.optionD && <option value="D">D</option>}
            </select>
            {errors.correctAnswer && (
              <p className="mt-1 text-sm text-red-600">{errors.correctAnswer}</p>
            )}
          </div>
        </div>
      )}

      {/* Correct Answer for non-MCQ */}
      {!isMCQ && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Correct Answer / Model Answer <span className="text-red-500">*</span>
          </label>
          <textarea
            name="correctAnswer"
            value={formData.correctAnswer}
            onChange={handleChange}
            rows={4}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.correctAnswer ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter the model answer or key points..."
          />
          {errors.correctAnswer && (
            <p className="mt-1 text-sm text-red-600">{errors.correctAnswer}</p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {isSubmitting ? 'Saving...' : initialData ? 'Update Question' : 'Create Question'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};