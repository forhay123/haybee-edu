import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/axios';
import { toast } from 'react-hot-toast';
import { Brain, User, CheckSquare, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

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
  aiQuestionIds?: number[];
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

  const [selectedAIQuestions, setSelectedAIQuestions] = useState<number[]>([]);
  const [selectedTeacherQuestions, setSelectedTeacherQuestions] = useState<number[]>([]);
  const [expandedAIQuestions, setExpandedAIQuestions] = useState<Set<number>>(new Set());
  const [showAllAIQuestions, setShowAllAIQuestions] = useState(false);

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

  const toggleAIQuestion = (questionId: number) => {
    setSelectedAIQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const toggleTeacherQuestion = (questionId: number) => {
    setSelectedTeacherQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const toggleAIQuestionExpand = (questionId: number) => {
    setExpandedAIQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const selectAllAIQuestions = () => {
    if (selectedAIQuestions.length === aiQuestions.length) {
      setSelectedAIQuestions([]);
    } else {
      setSelectedAIQuestions(aiQuestions.map(q => q.id));
    }
  };

  const selectAllTeacherQuestions = () => {
    if (selectedTeacherQuestions.length === teacherQuestions.length) {
      setSelectedTeacherQuestions([]);
    } else {
      setSelectedTeacherQuestions(teacherQuestions.map(q => q.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!lessonTopic) {
      toast.error('Lesson topic not found');
      return;
    }

    // Validation
    if (selectedAIQuestions.length === 0 && selectedTeacherQuestions.length === 0) {
      toast.error('Please select at least one question (AI or Teacher)');
      return;
    }

    // Calculate estimated total marks
    const aiMarks = selectedAIQuestions.length * 2; // Assuming 2 marks per AI question
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
      aiQuestionIds: selectedAIQuestions,
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain className="w-6 h-6 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  AI-Generated Questions
                </h3>
                <span className="text-sm text-gray-500">
                  ({aiQuestions.length} available)
                </span>
              </div>
              {aiQuestions.length > 0 && (
                <button
                  type="button"
                  onClick={selectAllAIQuestions}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  {selectedAIQuestions.length === aiQuestions.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {loadingAI ? (
              <div className="text-center py-4 text-gray-500">Loading AI questions...</div>
            ) : aiQuestions.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                ⚠️ No AI questions available for this lesson. Generate questions first or use only teacher questions.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-purple-50 rounded-lg p-3 text-sm text-purple-900 mb-3">
                  <p className="font-medium">
                    {selectedAIQuestions.length} of {aiQuestions.length} AI questions selected
                  </p>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3">
                  {aiQuestions.slice(0, showAllAIQuestions ? undefined : 5).map((question, idx) => (
                    <div
                      key={question.id}
                      className={`rounded-lg border transition ${
                        selectedAIQuestions.includes(question.id)
                          ? 'bg-purple-50 border-2 border-purple-300'
                          : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <label className="flex items-start gap-3 p-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedAIQuestions.includes(question.id)}
                          onChange={() => toggleAIQuestion(question.id)}
                          className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900">
                              {idx + 1}. {question.questionText}
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                toggleAIQuestionExpand(question.id);
                              }}
                              className="text-purple-600 hover:text-purple-700"
                            >
                              {expandedAIQuestions.has(question.id) ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          
                          {expandedAIQuestions.has(question.id) && (
                            <div className="mt-2 space-y-1 text-sm text-gray-700">
                              {question.optionA && <div className="pl-4">A. {question.optionA}</div>}
                              {question.optionB && <div className="pl-4">B. {question.optionB}</div>}
                              {question.optionC && <div className="pl-4">C. {question.optionC}</div>}
                              {question.optionD && <div className="pl-4">D. {question.optionD}</div>}
                              {question.correctOption && (
                                <div className="mt-2 pl-4 text-green-700 font-medium">
                                  ✓ Correct: {question.correctOption}
                                </div>
                              )}
                              {question.maxScore && (
                                <div className="mt-1 pl-4 text-purple-700">
                                  Points: {question.maxScore}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>

                {aiQuestions.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllAIQuestions(!showAllAIQuestions)}
                    className="w-full py-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    {showAllAIQuestions ? 'Show Less' : `Show All ${aiQuestions.length} Questions`}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Teacher Questions Section */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Teacher Questions
                </h3>
                <span className="text-sm text-gray-500">
                  ({teacherQuestions.length} available)
                </span>
              </div>
              {teacherQuestions.length > 0 && (
                <button
                  type="button"
                  onClick={selectAllTeacherQuestions}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {selectedTeacherQuestions.length === teacherQuestions.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {loadingTeacher ? (
              <div className="text-center py-4 text-gray-500">Loading teacher questions...</div>
            ) : teacherQuestions.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                ⚠️ No teacher questions available. Add questions to your question bank first.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-900 mb-3">
                  <p className="font-medium">
                    {selectedTeacherQuestions.length} of {teacherQuestions.length} teacher questions selected
                  </p>
                </div>

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
                <p className="font-semibold text-purple-600">{selectedAIQuestions.length}</p>
              </div>
              <div>
                <p className="text-gray-600">Teacher Questions:</p>
                <p className="font-semibold text-blue-600">{selectedTeacherQuestions.length}</p>
              </div>
              <div>
                <p className="text-gray-600">Total Questions:</p>
                <p className="font-semibold text-green-600">
                  {selectedAIQuestions.length + selectedTeacherQuestions.length}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Estimated Total Marks:</p>
                <p className="font-semibold text-green-600">
                  ~{(selectedAIQuestions.length + selectedTeacherQuestions.length) * 2}
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