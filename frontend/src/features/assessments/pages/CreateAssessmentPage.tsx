import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateAssessment } from '../hooks/useAssessments';
import { useQuestionsBySubject } from '../hooks/useTeacherQuestions';
import { useLessonTopics } from '../../lessons/hooks/useLessonTopics';
import { useAIQuestionsByLessonTopic } from '../../../features/lessons/hooks/useAIQuestionsByLessonTopic';
import { useGetSubject, useTeacherSubjects } from '../../subjects/hooks/useSubjects';
import { AssessmentType, QuestionType, CreateAssessmentRequest } from '../types/assessmentTypes';
import { ArrowLeft, Save, Wand2, BookOpen, Calendar, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const CreateAssessmentPage: React.FC = () => {
  const { subjectId: urlSubjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  
  const createAssessment = useCreateAssessment();
  
  const { data: teacherSubjects = [], isLoading: loadingSubjects } = useTeacherSubjects({ 
    enabled: true 
  });
  
  const [formData, setFormData] = useState<CreateAssessmentRequest>({
    title: '',
    description: '',
    type: AssessmentType.QUIZ,
    subjectId: urlSubjectId ? Number(urlSubjectId) : 0,
    lessonTopicId: undefined,
    termId: undefined,
    totalMarks: 0,
    passingMarks: 0,
    durationMinutes: 30,
    autoGrade: true,
    published: false,
    numberOfAIQuestions: 0,
    teacherQuestionIds: [],
    aiQuestionIds: [], // ✅ NEW: Selected AI question IDs
    mixAIAndTeacherQuestions: false
  });

  const [selectedTeacherQuestions, setSelectedTeacherQuestions] = useState<Set<number>>(new Set());
  const [selectedAIQuestions, setSelectedAIQuestions] = useState<Set<number>>(new Set()); // ✅ NEW
  const [showTeacherQuestionSelector, setShowTeacherQuestionSelector] = useState(false);
  const [showAIQuestionSelector, setShowAIQuestionSelector] = useState(false); // ✅ NEW

  // Get data based on selected subject
  const { data: teacherQuestions = [] } = useQuestionsBySubject(formData.subjectId);
  const { data: subject } = useGetSubject(formData.subjectId);
  
  // Get lesson topics for the selected subject
  const lessonTopicsQuery = useLessonTopics(formData.subjectId);
  const lessonTopics = lessonTopicsQuery.getAll.data || [];

  // ✅ NEW: Fetch AI questions when lesson topic is selected
  const { 
    data: aiQuestions = [], 
    isLoading: loadingAIQuestions 
  } = useAIQuestionsByLessonTopic(formData.lessonTopicId);

  const isLessonAssessment = formData.type === AssessmentType.LESSON_TOPIC_ASSESSMENT;
  
  const isBroadAssessment = [
    AssessmentType.EXAM,
    AssessmentType.TEST1,
    AssessmentType.TEST2
  ].includes(formData.type as AssessmentType);

  // Auto-update title when lesson topic or type changes
  useEffect(() => {
    if (formData.lessonTopicId && lessonTopics.length > 0) {
      const selectedLesson = lessonTopics.find(l => l.id === formData.lessonTopicId);
      if (selectedLesson) {
        const typeName = formData.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        setFormData(prev => ({
          ...prev,
          title: `${selectedLesson.topicTitle} - ${typeName}`
        }));
      }
    }
  }, [formData.lessonTopicId, formData.type, lessonTopics]);

  // Reset when subject changes
  useEffect(() => {
    if (formData.subjectId) {
      setFormData(prev => ({ ...prev, lessonTopicId: undefined }));
      setSelectedTeacherQuestions(new Set());
      setSelectedAIQuestions(new Set()); // ✅ Reset AI selection too
    }
  }, [formData.subjectId]);

  // ✅ Reset AI question selection when lesson topic changes
  useEffect(() => {
    setSelectedAIQuestions(new Set());
  }, [formData.lessonTopicId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.subjectId || formData.subjectId === 0) {
      toast.error('Please select a subject');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Please enter an assessment title');
      return;
    }

    if (formData.type === AssessmentType.LESSON_TOPIC_ASSESSMENT && !formData.lessonTopicId) {
      toast.error('Please select a lesson topic for lesson assessments');
      return;
    }

    // ✅ Updated validation: Check for at least one question
    if (selectedAIQuestions.size === 0 && selectedTeacherQuestions.size === 0) {
      toast.error('Please select at least one question (AI or from your question bank)');
      return;
    }

    const request: CreateAssessmentRequest = {
      ...formData,
      aiQuestionIds: Array.from(selectedAIQuestions), // ✅ NEW
      teacherQuestionIds: Array.from(selectedTeacherQuestions),
      numberOfAIQuestions: 0 // Not using auto-generation when selecting specific questions
    };

    try {
      await createAssessment.mutateAsync(request);
      toast.success('Assessment created successfully!');
      navigate(`/teacher/subjects/${formData.subjectId}/assessments`);
    } catch (error: any) {
      console.error('Assessment creation error:', error);
      toast.error(error.response?.data?.message || 'Failed to create assessment');
    }
  };

  const toggleTeacherQuestionSelection = (questionId: number) => {
    const newSelection = new Set(selectedTeacherQuestions);
    if (newSelection.has(questionId)) {
      newSelection.delete(questionId);
    } else {
      newSelection.add(questionId);
    }
    setSelectedTeacherQuestions(newSelection);
  };

  // ✅ NEW: Toggle AI question selection
  const toggleAIQuestionSelection = (questionId: number) => {
    const newSelection = new Set(selectedAIQuestions);
    if (newSelection.has(questionId)) {
      newSelection.delete(questionId);
    } else {
      newSelection.add(questionId);
    }
    setSelectedAIQuestions(newSelection);
  };

  // ✅ Helper function for difficulty colors
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toUpperCase()) {
      case 'EASY': return 'bg-green-100 text-green-700';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700';
      case 'HARD': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Assessment</h1>
          <p className="text-gray-600">
            {subject?.name ? `${subject.name} - ` : ''}Set up a new assessment for your students
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>

          {/* Subject Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.subjectId || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                subjectId: e.target.value ? Number(e.target.value) : 0 
              })}
              disabled={!!urlSubjectId || loadingSubjects}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                urlSubjectId ? 'bg-gray-100' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Select a subject</option>
              {teacherSubjects.map((subj) => (
                <option key={subj.id} value={subj.id}>
                  {subj.name}
                </option>
              ))}
            </select>
            {urlSubjectId && (
              <p className="mt-1 text-xs text-gray-500">
                Subject is pre-selected from navigation
              </p>
            )}
          </div>

          {/* Assessment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assessment Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as AssessmentType })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value={AssessmentType.LESSON_TOPIC_ASSESSMENT}>Lesson Assessment</option>
              <option value={AssessmentType.QUIZ}>Quiz</option>
              <option value={AssessmentType.CLASSWORK}>Classwork</option>
              <option value={AssessmentType.TEST1}>Test 1</option>
              <option value={AssessmentType.TEST2}>Test 2</option>
              <option value={AssessmentType.ASSIGNMENT}>Assignment</option>
              <option value={AssessmentType.EXAM}>Exam</option>
            </select>
            {isLessonAssessment && (
              <p className="mt-1 text-xs text-blue-600">
                💡 Lesson assessments are linked to specific lesson topics
              </p>
            )}
          </div>

          {/* Lesson Topic Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>
                  Lesson Topic {isLessonAssessment && <span className="text-red-500">*</span>}
                </span>
              </div>
            </label>
            <select
              value={formData.lessonTopicId || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                lessonTopicId: e.target.value ? Number(e.target.value) : undefined 
              })}
              disabled={!formData.subjectId}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isLessonAssessment ? 'border-blue-300 bg-blue-50' : 'border-gray-300'
              } ${!formData.subjectId ? 'bg-gray-100' : ''}`}
              required={isLessonAssessment}
            >
              <option value="">
                {!formData.subjectId
                  ? 'Select a subject first'
                  : isLessonAssessment 
                  ? 'Select a lesson topic' 
                  : 'Select a lesson topic (optional)'
                }
              </option>
              {lessonTopics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  Week {topic.weekNumber}: {topic.topicTitle}
                  {topic.questionCount ? ` (${topic.questionCount} AI questions)` : ''}
                </option>
              ))}
            </select>
            {formData.lessonTopicId && aiQuestions.length > 0 && (
              <p className="mt-1 text-xs text-purple-600">
                ✨ {aiQuestions.length} AI-generated questions available for selection
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
              placeholder="e.g., Chapter 5 Quiz"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Describe what this assessment covers..."
            />
          </div>

          {/* Duration and Passing Marks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="1"
                placeholder="30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passing Marks
              </label>
              <input
                type="number"
                value={formData.passingMarks}
                onChange={(e) => setFormData({ ...formData, passingMarks: Number(e.target.value) })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
                placeholder="Will be auto-calculated if left empty"
              />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Due Date (Optional)</span>
              </div>
            </label>
            <input
              type="datetime-local"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Options */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.autoGrade}
                onChange={(e) => setFormData({ ...formData, autoGrade: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Auto-grade multiple choice questions</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.published}
                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Publish immediately</span>
            </label>
          </div>
        </div>

        {/* Questions Section */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Questions</h2>

          {/* ✅ AI Questions Selector - NEW */}
          <div className={`border rounded-lg ${
            formData.lessonTopicId ? 'border-purple-200 bg-purple-50' : 'border-gray-300 bg-gray-50'
          }`}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-5 h-5 ${formData.lessonTopicId ? 'text-purple-600' : 'text-gray-400'}`} />
                  <h3 className="font-semibold text-gray-900">
                    AI-Generated Questions
                    {formData.lessonTopicId && aiQuestions.length > 0 && (
                      <span className="ml-2 text-sm text-purple-600">
                        ({aiQuestions.length} available)
                      </span>
                    )}
                  </h3>
                </div>
                {formData.lessonTopicId && aiQuestions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAIQuestionSelector(!showAIQuestionSelector)}
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 flex items-center gap-2"
                  >
                    {showAIQuestionSelector ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Hide Questions
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Select Questions
                      </>
                    )}
                  </button>
                )}
              </div>

              {!formData.lessonTopicId && (
                <p className="text-sm text-gray-600">
                  ⚠️ Select a lesson topic above to view AI-generated questions
                </p>
              )}

              {formData.lessonTopicId && loadingAIQuestions && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <p className="ml-3 text-sm text-gray-600">Loading AI questions...</p>
                </div>
              )}

              {formData.lessonTopicId && !loadingAIQuestions && aiQuestions.length === 0 && (
                <p className="text-sm text-amber-600">
                  📝 No AI questions available for this lesson yet. They may still be generating, or you can create questions manually.
                </p>
              )}

              {selectedAIQuestions.size > 0 && (
                <div className="mb-3 px-3 py-2 bg-purple-100 rounded-lg">
                  <p className="text-sm text-purple-700 font-medium">
                    ✓ {selectedAIQuestions.size} AI question(s) selected
                  </p>
                </div>
              )}

              {showAIQuestionSelector && aiQuestions.length > 0 && (
                <div className="max-h-96 overflow-y-auto space-y-2 mt-4">
                  {aiQuestions.map((question) => (
                    <label
                      key={question.id}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedAIQuestions.has(question.id)
                          ? 'border-purple-500 bg-purple-100 shadow-sm'
                          : 'border-gray-200 hover:border-purple-300 bg-white hover:bg-purple-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAIQuestions.has(question.id)}
                        onChange={() => toggleAIQuestionSelection(question.id)}
                        className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <p className="text-gray-900 font-medium mb-2">{question.questionText}</p>
                        
                        {/* Show MCQ options if available */}
                        {(question.optionA || question.optionB) && (
                          <div className="ml-4 mb-2 space-y-1 text-sm text-gray-600">
                            {question.optionA && <p>A) {question.optionA}</p>}
                            {question.optionB && <p>B) {question.optionB}</p>}
                            {question.optionC && <p>C) {question.optionC}</p>}
                            {question.optionD && <p>D) {question.optionD}</p>}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {question.difficulty && (
                            <span className={`text-xs px-2 py-1 rounded ${getDifficultyColor(question.difficulty)}`}>
                              {question.difficulty}
                            </span>
                          )}
                          {question.maxScore && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {question.maxScore} marks
                            </span>
                          )}
                          {(question.optionA || question.optionB) && (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                              MCQ
                            </span>
                          )}
                          {question.correctOption && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              Answer: {question.correctOption}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Teacher Questions */}
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">
                Your Question Bank ({teacherQuestions.length} available)
              </h3>
              <button
                type="button"
                onClick={() => setShowTeacherQuestionSelector(!showTeacherQuestionSelector)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                disabled={!formData.subjectId}
              >
                {showTeacherQuestionSelector ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Hide Questions
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Select Questions
                  </>
                )}
              </button>
            </div>

            {selectedTeacherQuestions.size > 0 && (
              <div className="mb-3 px-3 py-2 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700 font-medium">
                  ✓ {selectedTeacherQuestions.size} question(s) selected
                </p>
              </div>
            )}

            {showTeacherQuestionSelector && (
              <div className="max-h-96 overflow-y-auto space-y-2 mt-4">
                {teacherQuestions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-2">
                      No questions in your bank yet for this subject.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(`/teacher/subjects/${formData.subjectId}/question-bank`)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Create questions in Question Bank →
                    </button>
                  </div>
                ) : (
                  teacherQuestions.map((question) => (
                    <label
                      key={question.id}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedTeacherQuestions.has(question.id)
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTeacherQuestions.has(question.id)}
                        onChange={() => toggleTeacherQuestionSelection(question.id)}
                        className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <p className="text-gray-900 font-medium">{question.questionText}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {question.questionType.replace(/_/g, ' ')}
                          </span>
                          {question.difficultyLevel && (
                            <span className={`text-xs px-2 py-1 rounded ${getDifficultyColor(question.difficultyLevel)}`}>
                              {question.difficultyLevel}
                            </span>
                          )}
                          {question.lessonTopicTitle && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                              {question.lessonTopicTitle}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Question Summary */}
          {(selectedAIQuestions.size > 0 || selectedTeacherQuestions.size > 0) && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-medium text-gray-900 mb-2">📊 Question Summary</h4>
              <div className="space-y-1 text-sm text-gray-700">
                {selectedAIQuestions.size > 0 && (
                  <p className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>{selectedAIQuestions.size} AI-generated questions</span>
                  </p>
                )}
                {selectedTeacherQuestions.size > 0 && (
                  <p className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span>{selectedTeacherQuestions.size} questions from your question bank</span>
                  </p>
                )}
                <div className="pt-2 mt-2 border-t border-gray-300">
                  <p className="font-semibold text-gray-900">
                    Total: {selectedAIQuestions.size + selectedTeacherQuestions.size} questions
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createAssessment.isPending}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <Save className="w-5 h-5" />
            {createAssessment.isPending ? 'Creating...' : 'Create Assessment'}
          </button>
        </div>
      </form>
    </div>
  );
};