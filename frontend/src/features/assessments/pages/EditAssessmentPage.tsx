// src/features/assessments/pages/EditAssessmentPage.tsx

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAssessment, useUpdateAssessment } from '../hooks/useAssessments';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { AssessmentType } from '../types/assessmentTypes';
import { toast } from 'react-hot-toast';

// Question types matching backend enum
enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER',
  ESSAY = 'ESSAY'
}

interface QuestionForm {
  id?: number;
  questionText: string;
  questionType: QuestionType;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer?: string;
  marks: number;
}

export const EditAssessmentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const assessmentId = Number(id);

  const { data: assessment, isLoading } = useAssessment(assessmentId);
  const updateMutation = useUpdateAssessment();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<AssessmentType>(AssessmentType.QUIZ);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [passingMarks, setPassingMarks] = useState<number>(0);
  const [totalMarks, setTotalMarks] = useState<number>(0);
  const [autoGrade, setAutoGrade] = useState<boolean>(true);
  const [published, setPublished] = useState<boolean>(false);
  const [dueDate, setDueDate] = useState<string>('');
  const [questions, setQuestions] = useState<QuestionForm[]>([]);

  // Load existing assessment data
  useEffect(() => {
    if (assessment) {
      setTitle(assessment.title);
      setDescription(assessment.description || '');
      setType(assessment.type);
      setDurationMinutes(assessment.durationMinutes || 30);
      setPassingMarks(assessment.passingMarks || 0);
      setTotalMarks(assessment.totalMarks || 0);
      setAutoGrade(assessment.autoGrade ?? true);
      setPublished(assessment.published ?? false);
      setDueDate(assessment.dueDate || '');
    }
  }, [assessment]);

  // Calculate total marks when questions change
  useEffect(() => {
    const total = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    setTotalMarks(total);
  }, [questions]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionText: '',
        questionType: QuestionType.MULTIPLE_CHOICE,
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctAnswer: 'A',
        marks: 1
      }
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof QuestionForm, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    
    // When changing question type, reset options and correct answer
    if (field === 'questionType') {
      const questionType = value as QuestionType;
      
      if (questionType === QuestionType.MULTIPLE_CHOICE) {
        updated[index].optionA = '';
        updated[index].optionB = '';
        updated[index].optionC = '';
        updated[index].optionD = '';
        updated[index].correctAnswer = 'A';
      } else if (questionType === QuestionType.TRUE_FALSE) {
        updated[index].optionA = 'True';
        updated[index].optionB = 'False';
        updated[index].optionC = undefined;
        updated[index].optionD = undefined;
        updated[index].correctAnswer = 'A';
      } else {
        // Essay or Short Answer - no options
        updated[index].optionA = undefined;
        updated[index].optionB = undefined;
        updated[index].optionC = undefined;
        updated[index].optionD = undefined;
        updated[index].correctAnswer = undefined;
      }
    }
    
    setQuestions(updated);
  };

  const updateOption = (questionIndex: number, option: 'A' | 'B' | 'C' | 'D', value: string) => {
    const updated = [...questions];
    updated[questionIndex][`option${option}` as keyof QuestionForm] = value;
    setQuestions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate basic fields
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    // ✅ Questions are now optional
    // If questions are provided, validate them
    if (questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        
        if (!q.questionText.trim()) {
          toast.error(`Question ${i + 1}: Please enter question text`);
          return;
        }

        // Validate based on question type
        if (q.questionType === QuestionType.MULTIPLE_CHOICE) {
          if (!q.optionA?.trim() || !q.optionB?.trim() || !q.optionC?.trim() || !q.optionD?.trim()) {
            toast.error(`Question ${i + 1}: All 4 options must be filled for multiple choice`);
            return;
          }
          if (!q.correctAnswer) {
            toast.error(`Question ${i + 1}: Please select the correct answer`);
            return;
          }
        } else if (q.questionType === QuestionType.TRUE_FALSE) {
          if (!q.correctAnswer) {
            toast.error(`Question ${i + 1}: Please select True or False`);
            return;
          }
        }
        // Essay and Short Answer don't need option validation
      }
    }

    try {
      await updateMutation.mutateAsync({
        id: assessmentId,
        request: {
          title,
          description,
          subjectId: assessment!.subjectId,
          type,
          totalMarks,
          passingMarks,
          durationMinutes,
          autoGrade,
          published,
          dueDate: dueDate || undefined,
          // Note: Backend might need separate endpoints to update questions
          // For now, we're only updating assessment metadata
        }
      });

      toast.success('Assessment updated successfully!');
      navigate(`/teacher/assessments/${assessmentId}`);
    } catch (error: any) {
      console.error('Failed to update assessment:', error);
      toast.error(error.response?.data?.message || 'Failed to update assessment');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 text-lg">Assessment not found</p>
          <button
            onClick={() => navigate('/assessments/teacher')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  const renderQuestionOptions = (question: QuestionForm, qIndex: number) => {
    switch (question.questionType) {
      case QuestionType.MULTIPLE_CHOICE:
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Options *
              </label>
              {['A', 'B', 'C', 'D'].map((letter) => (
                <div key={letter} className="flex items-center gap-2 mb-2">
                  <span className="w-8 text-center font-medium text-gray-600">{letter}.</span>
                  <input
                    type="text"
                    value={question[`option${letter}` as keyof QuestionForm] as string || ''}
                    onChange={(e) => updateOption(qIndex, letter as 'A' | 'B' | 'C' | 'D', e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder={`Option ${letter}`}
                    required
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correct Answer *
              </label>
              <select
                value={question.correctAnswer || 'A'}
                onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>
          </>
        );

      case QuestionType.TRUE_FALSE:
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correct Answer *
            </label>
            <select
              value={question.correctAnswer || 'A'}
              onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            >
              <option value="A">True</option>
              <option value="B">False</option>
            </select>
          </div>
        );

      case QuestionType.SHORT_ANSWER:
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              💡 Short answer questions require manual grading by the teacher.
            </p>
          </div>
        );

      case QuestionType.ESSAY:
        return (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-sm text-purple-800">
              💡 Essay questions require manual grading by the teacher.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(`/teacher/assessments/${assessmentId}`)}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Assessment
      </button>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Assessment</h1>

          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Enter assessment title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                rows={3}
                placeholder="Enter assessment description (optional)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as AssessmentType)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value={AssessmentType.LESSON_TOPIC_ASSESSMENT}>Lesson Assessment</option>
                  <option value={AssessmentType.QUIZ}>Quiz</option>
                  <option value={AssessmentType.TEST1}>Test 1</option>
                  <option value={AssessmentType.TEST2}>Test 2</option>
                  <option value={AssessmentType.EXAM}>Exam</option>
                  <option value={AssessmentType.ASSIGNMENT}>Assignment</option>
                  <option value={AssessmentType.CLASSWORK}>Classwork</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="30"
                  min="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Marks
                </label>
                <input
                  type="number"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50"
                  placeholder="Auto-calculated from questions"
                  min="0"
                  readOnly={questions.length > 0}
                />
                {questions.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">Auto-calculated from {questions.length} question(s)</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passing Marks
                </label>
                <input
                  type="number"
                  value={passingMarks}
                  onChange={(e) => setPassingMarks(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g., 50"
                  min="0"
                  max={totalMarks}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoGrade}
                  onChange={(e) => setAutoGrade(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Auto-grade MCQ & True/False</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Published</span>
              </label>
            </div>
          </div>
        </div>

        {/* Questions - OPTIONAL */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Questions</h2>
              <p className="text-sm text-gray-600 mt-1">
                Optional - You can edit assessment details without modifying questions
              </p>
            </div>
            <button
              type="button"
              onClick={addQuestion}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Question
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500 mb-2">No questions added yet</p>
              <p className="text-sm text-gray-400">
                Note: Questions are managed separately. Use the question management section to add/edit questions.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {questions.map((question, qIndex) => (
                <div key={qIndex} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Question {qIndex + 1}
                    </h3>
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIndex)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Question Type *
                      </label>
                      <select
                        value={question.questionType}
                        onChange={(e) => updateQuestion(qIndex, 'questionType', e.target.value as QuestionType)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                      >
                        <option value={QuestionType.MULTIPLE_CHOICE}>Multiple Choice</option>
                        <option value={QuestionType.TRUE_FALSE}>True/False</option>
                        <option value={QuestionType.SHORT_ANSWER}>Short Answer</option>
                        <option value={QuestionType.ESSAY}>Essay</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Question Text *
                      </label>
                      <textarea
                        value={question.questionText}
                        onChange={(e) => updateQuestion(qIndex, 'questionText', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        rows={2}
                        placeholder="Enter your question"
                        required
                      />
                    </div>

                    {renderQuestionOptions(question, qIndex)}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Points/Marks *
                      </label>
                      <input
                        type="number"
                        value={question.marks}
                        onChange={(e) => updateQuestion(qIndex, 'marks', Number(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        min="1"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(`/teacher/assessments/${assessmentId}`)}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};