import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/axios';
import { toast } from 'react-hot-toast';
import { Brain, User, CheckSquare, Plus, Trash2 } from 'lucide-react';

interface LessonTopic {
  id: number;
  topicTitle: string;
  subjectId: number;
}

interface AIQuestion {
  id: number;
  questionText: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: string;
  maxScore?: number;
}

interface TeacherQuestion {
  id: number;
  questionText: string;
  questionType: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer: string;
  difficultyLevel?: string;
}

interface CreateAssessmentRequest {
  title: string;
  description?: string;
  type: string;
  subjectId: number;
  lessonTopicId: number;
  totalMarks: number;
  passingMarks: number;
  durationMinutes: number;
  autoGrade: boolean;
  published: boolean;
  numberOfAIQuestions?: number;
  teacherQuestionIds?: number[];
}

interface CreateLessonAssessmentFormProps {
  lessonTopicId: number;
  onSuccess?: () => void;
}

const CreateLessonAssessmentForm: React.FC<CreateLessonAssessmentFormProps> = ({
  lessonTopicId,
  onSuccess
}) => {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    passingMarks: 5,
    durationMinutes: 30,
    published: false,
  });

  const [numberOfAIQuestions, setNumberOfAIQuestions] = useState(5);
  const [selectedTeacherQuestions, setSelectedTeacherQuestions] = useState<number[]>([]);

  // Fetch lesson topic details
  const { data: lessonTopic } = useQuery<LessonTopic>({
    queryKey: ['lessonTopic', lessonTopicId],
    queryFn: async () => {
      const res = await api.get(`/lesson-topics/${lessonTopicId}`);
      return res.data;
    },
  });

  // Fetch available AI questions
  const { data: aiQuestions = [], isLoading: loadingAI } = useQuery<AIQuestion[]>({
    queryKey: ['ai-questions', lessonTopicId],
    queryFn: async () => {
      try {
        const res = await api.get(`/ai-questions/lesson-topic/${lessonTopicId}`);
        return res.data || [];
      } catch {
        return [];
      }
    },
  });

  // Fetch available teacher questions
  const { data: teacherQuestions = [], isLoading: loadingTeacher } = useQuery<TeacherQuestion[]>({
    queryKey: ['teacher-questions', lessonTopicId],
    queryFn: async () => {
      try {
        const res = await api.get(`/teacher-questions/lesson/${lessonTopicId}`);
        return res.data || [];
      } catch {
        return [];
      }
    },
  });

  // Set default title when lesson topic loads
  useEffect(() => {
    if (lessonTopic && !formData.title) {
      setFormData(prev => ({
        ...prev,
        title: `${lessonTopic.topicTitle} - Assessment`
      }));
    }
  }, [lessonTopic]);

  // Create assessment mutation
  const createMutation = useMutation({
    mutationFn: async (request: CreateAssessmentRequest) => {
      const res = await api.post('/assessments', request);
      return res.data;
    },
    onSuccess: () => {
      toast.success('✅ Assessment created successfully!');
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      queryClient.invalidateQueries({ queryKey: ['lessonTopic'] });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create assessment');
    },
  });

  const toggleTeacherQuestion = (questionId: number) => {
    setSelectedTeacherQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!lessonTopic) {
      toast.error('Lesson topic not found');
      return;
    }

    // Validation
    if (numberOfAIQuestions === 0 && selectedTeacherQuestions.length === 0) {
      toast.error('Please select at least one question (AI or Teacher)');
      return;
    }

    if (numberOfAIQuestions > aiQuestions.length) {
      toast.error(`Only ${aiQuestions.length} AI questions available`);
      return;
    }

    // Calculate estimated total marks
    const aiMarks = numberOfAIQuestions * 2; // Assuming 2 marks per AI question
    const teacherMarks = selectedTeacherQuestions.length * 2;
    const totalMarks = aiMarks + teacherMarks;

    const request: CreateAssessmentRequest = {
      title: formData.title,
      description: formData.description,
      type: 'LESSON_TOPIC_ASSESSMENT',
      subjectId: lessonTopic.subjectId,
      lessonTopicId: lessonTopic.id,
      totalMarks: totalMarks,
      passingMarks: formData.passingMarks,
      durationMinutes: formData.durationMinutes,
      autoGrade: true,
      published: formData.published,
      numberOfAIQuestions: numberOfAIQuestions,
      teacherQuestionIds: selectedTeacherQuestions,
    };

    createMutation.mutate(request);
  };

  if (!lessonTopic) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Create Assessment for: {lessonTopic.topicTitle}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assessment Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passing Marks
                </label>
                <input
                  type="number"
                  value={formData.passingMarks}
                  onChange={(e) => setFormData({ ...formData, passingMarks: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="5"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="published"
                checked={formData.published}
                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="published" className="text-sm font-medium text-gray-700">
                Publish immediately (students can access right away)
              </label>
            </div>
          </div>

          {/* AI Questions Section */}
          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                AI-Generated Questions
              </h3>
              <span className="text-sm text-gray-500">
                ({aiQuestions.length} available)
              </span>
            </div>

            {loadingAI ? (
              <div className="text-center py-4 text-gray-500">Loading AI questions...</div>
            ) : aiQuestions.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                ⚠️ No AI questions available for this lesson. Generate questions first or use only teacher questions.
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of AI questions to include
                  </label>
                  <input
                    type="number"
                    value={numberOfAIQuestions}
                    onChange={(e) => setNumberOfAIQuestions(Math.min(parseInt(e.target.value) || 0, aiQuestions.length))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    min="0"
                    max={aiQuestions.length}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Will use the first {numberOfAIQuestions} AI-generated questions
                  </p>
                </div>

                {numberOfAIQuestions > 0 && (
                  <div className="bg-purple-50 rounded-lg p-4 text-sm">
                    <p className="font-medium text-purple-900 mb-2">Preview (first 3):</p>
                    <ul className="space-y-2">
                      {aiQuestions.slice(0, Math.min(3, numberOfAIQuestions)).map((q, idx) => (
                        <li key={q.id} className="text-gray-700">
                          {idx + 1}. {q.questionText.substring(0, 80)}...
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Teacher Questions Section */}
          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Teacher Questions
              </h3>
              <span className="text-sm text-gray-500">
                ({teacherQuestions.length} available)
              </span>
            </div>

            {loadingTeacher ? (
              <div className="text-center py-4 text-gray-500">Loading teacher questions...</div>
            ) : teacherQuestions.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                ⚠️ No teacher questions available. Add questions to your question bank first.
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-3">
                  Select questions to include ({selectedTeacherQuestions.length} selected)
                </p>
                <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3">
                  {teacherQuestions.map((question) => (
                    <label
                      key={question.id}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition ${
                        selectedTeacherQuestions.includes(question.id)
                          ? 'bg-blue-50 border-2 border-blue-300'
                          : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTeacherQuestions.includes(question.id)}
                        onChange={() => toggleTeacherQuestion(question.id)}
                        className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {question.questionText}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs px-2 py-1 bg-gray-200 rounded">
                            {question.questionType}
                          </span>
                          {question.difficultyLevel && (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                              {question.difficultyLevel}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="border-t pt-6 bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Assessment Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">AI Questions:</p>
                <p className="font-semibold text-purple-600">{numberOfAIQuestions}</p>
              </div>
              <div>
                <p className="text-gray-600">Teacher Questions:</p>
                <p className="font-semibold text-blue-600">{selectedTeacherQuestions.length}</p>
              </div>
              <div>
                <p className="text-gray-600">Total Questions:</p>
                <p className="font-semibold text-green-600">
                  {numberOfAIQuestions + selectedTeacherQuestions.length}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Estimated Total Marks:</p>
                <p className="font-semibold text-green-600">
                  ~{(numberOfAIQuestions + selectedTeacherQuestions.length) * 2}
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <CheckSquare className="w-5 h-5" />
                  Create Assessment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateLessonAssessmentForm;