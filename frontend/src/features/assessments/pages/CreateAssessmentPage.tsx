import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateAssessment } from '../hooks/useAssessments';
import { useQuestionsBySubject } from '../hooks/useTeacherQuestions';
import { useLessonTopics } from '../../lessons/hooks/useLessonTopics';
import { useGetSubject, useTeacherSubjects } from '../../subjects/hooks/useSubjects';
import { AssessmentType, QuestionType, CreateAssessmentRequest } from '../types/assessmentTypes';
import { ArrowLeft, Save, Wand2, BookOpen, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const CreateAssessmentPage: React.FC = () => {
  // ✅ Get subjectId from URL params OR from form selection
  const { subjectId: urlSubjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  
  const createAssessment = useCreateAssessment();
  
  // ✅ Get all teacher subjects for selection
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
    numberOfAIQuestions: 0, // ✅ Default to 0 instead of undefined
    teacherQuestionIds: [],
    mixAIAndTeacherQuestions: false
  });

  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  const [showQuestionSelector, setShowQuestionSelector] = useState(false);

  // ✅ Get data based on selected subject
  const { data: teacherQuestions = [] } = useQuestionsBySubject(formData.subjectId);
  const { data: subject } = useGetSubject(formData.subjectId);
  
  // Get lesson topics for the selected subject
  const lessonTopicsQuery = useLessonTopics(formData.subjectId);
  const lessonTopics = lessonTopicsQuery.getAll.data || [];

  // Only LESSON_TOPIC_ASSESSMENT requires a lesson topic
  const isLessonAssessment = formData.type === AssessmentType.LESSON_TOPIC_ASSESSMENT;
  
  // Broader assessments (Exams, Tests) don't require lesson topics
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

  // ✅ Reset lesson topic when subject changes
  useEffect(() => {
    if (formData.subjectId) {
      setFormData(prev => ({ ...prev, lessonTopicId: undefined }));
      setSelectedQuestions(new Set());
    }
  }, [formData.subjectId]);

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

    // ✅ Use || operator and default to 0
    const aiQuestions = formData.numberOfAIQuestions || 0;
    
    if (aiQuestions === 0 && selectedQuestions.size === 0) {
      toast.error('Please add at least one question (AI or from your question bank)');
      return;
    }

    // AI questions require a lesson topic
    if (aiQuestions > 0 && !formData.lessonTopicId) {
      toast.error('AI questions require a lesson topic to be selected');
      return;
    }

    const request: CreateAssessmentRequest = {
      ...formData,
      numberOfAIQuestions: aiQuestions,
      teacherQuestionIds: Array.from(selectedQuestions)
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

  const toggleQuestionSelection = (questionId: number) => {
    const newSelection = new Set(selectedQuestions);
    if (newSelection.has(questionId)) {
      newSelection.delete(questionId);
    } else {
      newSelection.add(questionId);
    }
    setSelectedQuestions(newSelection);
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

          {/* ✅ Subject Selection - NEW */}
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
                💡 Lesson assessments are linked to specific lesson topics and test one topic
              </p>
            )}
            {isBroadAssessment && (
              <p className="mt-1 text-xs text-purple-600">
                💡 {formData.type.replace(/_/g, ' ')}s typically cover multiple topics from the term
              </p>
            )}
          </div>

          {/* Lesson Topic Selection - REQUIRED for Lesson Assessments */}
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
                  : isBroadAssessment
                  ? 'All topics (or select specific topic)'
                  : 'No specific lesson (optional)'
                }
              </option>
              {lessonTopics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  Week {topic.weekNumber}: {topic.topicTitle}
                </option>
              ))}
            </select>
            {isLessonAssessment && !formData.lessonTopicId && (
              <p className="mt-1 text-xs text-red-600">
                ⚠️ Lesson topic is required for lesson assessments
              </p>
            )}
            {/* ✅ Fixed: Use || 0 to handle undefined */}
            {(formData.numberOfAIQuestions || 0) > 0 && !formData.lessonTopicId && (
              <p className="mt-1 text-xs text-orange-600">
                ⚠️ AI questions require a lesson topic to be selected
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

          {/* AI Questions */}
          <div className={`border rounded-lg p-4 ${
            formData.lessonTopicId ? 'border-blue-200 bg-blue-50' : 'border-gray-300 bg-gray-50'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <Wand2 className={`w-5 h-5 ${formData.lessonTopicId ? 'text-blue-600' : 'text-gray-400'}`} />
              <h3 className="font-semibold text-gray-900">AI-Generated Questions</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              {formData.lessonTopicId 
                ? 'Generate questions automatically from the selected lesson content'
                : isBroadAssessment
                ? '⚠️ For broad assessments (Exams/Tests), you can use your question bank or create questions manually'
                : '⚠️ Select a lesson topic above to enable AI question generation'
              }
            </p>
            <input
              type="number"
              value={formData.numberOfAIQuestions || 0}
              onChange={(e) => setFormData({ ...formData, numberOfAIQuestions: Number(e.target.value) })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              min="0"
              max="20"
              placeholder="Number of AI questions (0-20)"
              disabled={!formData.lessonTopicId}
            />
          </div>

          {/* Teacher Questions */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">
                Your Question Bank ({teacherQuestions.length} available)
              </h3>
              <button
                type="button"
                onClick={() => setShowQuestionSelector(!showQuestionSelector)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                disabled={!formData.subjectId}
              >
                {showQuestionSelector ? 'Hide' : 'Select Questions'}
              </button>
            </div>

            {selectedQuestions.size > 0 && (
              <p className="text-sm text-green-600 mb-3">
                ✓ {selectedQuestions.size} question(s) selected
              </p>
            )}

            {showQuestionSelector && (
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
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedQuestions.has(question.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedQuestions.has(question.id)}
                        onChange={() => toggleQuestionSelection(question.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="text-gray-900 font-medium">{question.questionText}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {question.questionType.replace(/_/g, ' ')}
                          </span>
                          {question.difficultyLevel && (
                            <span className={`text-xs px-2 py-1 rounded ${
                              question.difficultyLevel === 'EASY'
                                ? 'bg-green-100 text-green-700'
                                : question.difficultyLevel === 'MEDIUM'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
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
          {/* ✅ Fixed: Use || 0 to handle undefined */}
          {((formData.numberOfAIQuestions || 0) > 0 || selectedQuestions.size > 0) && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">Question Summary</h4>
              <div className="space-y-1 text-sm text-gray-600">
                {(formData.numberOfAIQuestions || 0) > 0 && (
                  <p>• {formData.numberOfAIQuestions} AI-generated questions</p>
                )}
                {selectedQuestions.size > 0 && (
                  <p>• {selectedQuestions.size} questions from your question bank</p>
                )}
                <p className="font-medium text-gray-900 mt-2">
                  Total: {(formData.numberOfAIQuestions || 0) + selectedQuestions.size} questions
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createAssessment.isPending}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            {createAssessment.isPending ? 'Creating...' : 'Create Assessment'}
          </button>
        </div>
      </form>
    </div>
  );
};