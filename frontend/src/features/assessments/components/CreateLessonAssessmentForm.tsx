import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/axios';
import { toast } from 'react-hot-toast';
import { Brain, User, CheckSquare, Plus, Trash2, ChevronDown, ChevronUp, Search } from 'lucide-react';

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
  const [showAIQuestionSelector, setShowAIQuestionSelector] = useState(false);
  const [aiSearchTerm, setAISearchTerm] = useState('');

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

  // Filter AI questions based on search
  const filteredAIQuestions = aiQuestions.filter(q =>
    q.questionText.toLowerCase().includes(aiSearchTerm.toLowerCase())
  );

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
    if (selectedAIQuestions.length === filteredAIQuestions.length) {
      setSelectedAIQuestions([]);
    } else {
      setSelectedAIQuestions(filteredAIQuestions.map(q => q.id));
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
    const aiMarks = selectedAIQuestions.length * 2;
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
    return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
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

          {/* Questions Section Header */}
          <div className="border-t pt-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Questions</h3>
          </div>

          {/* AI Questions Section */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Brain className="w-6 h-6 text-purple-600" />
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">
                    AI-Generated Questions
                  </h4>
                  <p className="text-sm text-gray-600">
                    Generate questions automatically from the selected lesson content
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-purple-700">
                  {aiQuestions.length} available
                </span>
              </div>
            </div>

            {loadingAI ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading AI questions...</p>
              </div>
            ) : aiQuestions.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ No AI questions available for this lesson. Generate questions first.
                </p>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowAIQuestionSelector(!showAIQuestionSelector)}
                  className="w-full mt-3 px-4 py-3 bg-white border-2 border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 font-medium transition flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5" />
                    {selectedAIQuestions.length > 0 
                      ? `${selectedAIQuestions.length} AI Question${selectedAIQuestions.length !== 1 ? 's' : ''} Selected`
                      : 'Select Questions'
                    }
                  </span>
                  {showAIQuestionSelector ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>

                {showAIQuestionSelector && (
                  <div className="mt-4 bg-white rounded-lg border-2 border-purple-200 p-4">
                    {/* Search and Actions */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search questions..."
                          value={aiSearchTerm}
                          onChange={(e) => setAISearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={selectAllAIQuestions}
                        className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition"
                      >
                        {selectedAIQuestions.length === filteredAIQuestions.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    {/* Question List */}
                    <div className="max-h-[500px] overflow-y-auto space-y-2">
                      {filteredAIQuestions.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No questions match your search</p>
                      ) : (
                        filteredAIQuestions.map((question, idx) => (
                          <div
                            key={question.id}
                            className={`rounded-lg border-2 transition ${
                              selectedAIQuestions.includes(question.id)
                                ? 'bg-purple-50 border-purple-400 shadow-sm'
                                : 'bg-white border-gray-200 hover:border-purple-300'
                            }`}
                          >
                            <div className="p-4">
                              <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedAIQuestions.includes(question.id)}
                                  onChange={() => toggleAIQuestion(question.id)}
                                  className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium text-gray-900 leading-relaxed">
                                      <span className="text-purple-600 font-semibold">Q{idx + 1}.</span> {question.questionText}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        toggleAIQuestionExpand(question.id);
                                      }}
                                      className="flex-shrink-0 p-1 text-purple-600 hover:bg-purple-100 rounded transition"
                                    >
                                      {expandedAIQuestions.has(question.id) ? (
                                        <ChevronUp className="w-5 h-5" />
                                      ) : (
                                        <ChevronDown className="w-5 h-5" />
                                      )}
                                    </button>
                                  </div>
                                  
                                  {expandedAIQuestions.has(question.id) && (
                                    <div className="mt-3 pt-3 border-t border-purple-200">
                                      <div className="space-y-2 text-sm">
                                        {question.optionA && (
                                          <div className={`p-2 rounded ${question.correctOption === 'A' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                                            <span className="font-semibold text-gray-700">A.</span> {question.optionA}
                                            {question.correctOption === 'A' && <span className="ml-2 text-green-600 font-semibold">✓</span>}
                                          </div>
                                        )}
                                        {question.optionB && (
                                          <div className={`p-2 rounded ${question.correctOption === 'B' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                                            <span className="font-semibold text-gray-700">B.</span> {question.optionB}
                                            {question.correctOption === 'B' && <span className="ml-2 text-green-600 font-semibold">✓</span>}
                                          </div>
                                        )}
                                        {question.optionC && (
                                          <div className={`p-2 rounded ${question.correctOption === 'C' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                                            <span className="font-semibold text-gray-700">C.</span> {question.optionC}
                                            {question.correctOption === 'C' && <span className="ml-2 text-green-600 font-semibold">✓</span>}
                                          </div>
                                        )}
                                        {question.optionD && (
                                          <div className={`p-2 rounded ${question.correctOption === 'D' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                                            <span className="font-semibold text-gray-700">D.</span> {question.optionD}
                                            {question.correctOption === 'D' && <span className="ml-2 text-green-600 font-semibold">✓</span>}
                                          </div>
                                        )}
                                        {question.maxScore && (
                                          <div className="mt-2 pt-2 border-t border-purple-100">
                                            <span className="text-purple-700 font-medium">Points: {question.maxScore}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </label>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-purple-200">
                      <p className="text-sm text-purple-900 font-medium">
                        {selectedAIQuestions.length} of {aiQuestions.length} questions selected
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Teacher Questions Section */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <User className="w-6 h-6 text-blue-600" />
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">
                    Your Question Bank
                  </h4>
                  <p className="text-sm text-gray-600">
                    {teacherQuestions.length > 0 
                      ? `${teacherQuestions.length} question${teacherQuestions.length !== 1 ? 's' : ''} available`
                      : 'No questions in your bank yet'
                    }
                  </p>
                </div>
              </div>
              {teacherQuestions.length > 0 && (
                <button
                  type="button"
                  onClick={selectAllTeacherQuestions}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  {selectedTeacherQuestions.length === teacherQuestions.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {loadingTeacher ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading your questions...</p>
              </div>
            ) : teacherQuestions.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ No questions in your bank. Add questions first.
                </p>
              </div>
            ) : (
              <div className="mt-3 bg-white rounded-lg border-2 border-blue-200 p-4">
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {teacherQuestions.map((question) => (
                    <label
                      key={question.id}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition border-2 ${
                        selectedTeacherQuestions.includes(question.id)
                          ? 'bg-blue-50 border-blue-400 shadow-sm'
                          : 'bg-white border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTeacherQuestions.includes(question.id)}
                        onChange={() => toggleTeacherQuestion(question.id)}
                        className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {question.questionText}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded font-medium">
                            {question.questionType}
                          </span>
                          {question.difficultyLevel && (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                              {question.difficultyLevel}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-sm text-blue-900 font-medium">
                    {selectedTeacherQuestions.length} of {teacherQuestions.length} questions selected
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 p-6">
            <h4 className="font-bold text-gray-900 mb-4 text-lg">📊 Assessment Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <p className="text-xs text-gray-600 mb-1">AI Questions</p>
                <p className="text-2xl font-bold text-purple-600">{selectedAIQuestions.length}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <p className="text-xs text-gray-600 mb-1">Teacher Questions</p>
                <p className="text-2xl font-bold text-blue-600">{selectedTeacherQuestions.length}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <p className="text-xs text-gray-600 mb-1">Total Questions</p>
                <p className="text-2xl font-bold text-green-600">
                  {selectedAIQuestions.length + selectedTeacherQuestions.length}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-orange-200">
                <p className="text-xs text-gray-600 mb-1">Est. Total Marks</p>
                <p className="text-2xl font-bold text-orange-600">
                  {(selectedAIQuestions.length + selectedTeacherQuestions.length) * 2}
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={createMutation.isPending || (selectedAIQuestions.length === 0 && selectedTeacherQuestions.length === 0)}
              className="flex-1 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-bold text-lg transition flex items-center justify-center gap-3 shadow-lg"
            >
              {createMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  Creating Assessment...
                </>
              ) : (
                <>
                  <CheckSquare className="w-6 h-6" />
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