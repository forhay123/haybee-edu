import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TeacherQuestionBank } from '../components/TeacherQuestionBank';
import { QuestionForm } from '../components/QuestionForm';
import { useCreateQuestion, useUpdateQuestion } from '../hooks/useTeacherQuestions';
import { CreateTeacherQuestionRequest, TeacherQuestion } from '../types/assessmentTypes';
import { X, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const QuestionBankPage: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<TeacherQuestion | null>(null);

  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();

  // ✅ Parse subjectId from URL
  const parsedSubjectId = subjectId ? Number(subjectId) : undefined;

  const handleCreateQuestion = async (data: CreateTeacherQuestionRequest) => {
    try {
      await createQuestion.mutateAsync(data);
      toast.success('Question created successfully!');
      setShowForm(false);
    } catch (error: any) {
      // ✅ Show backend error message
      const errorMessage = error.response?.data?.message || 'Failed to create question';
      toast.error(errorMessage);
      console.error('Create question error:', error);
    }
  };

  const handleUpdateQuestion = async (data: CreateTeacherQuestionRequest) => {
    if (!editingQuestion) return;

    try {
      await updateQuestion.mutateAsync({ id: editingQuestion.id, request: data });
      toast.success('Question updated successfully!');
      setEditingQuestion(null);
      setShowForm(false);
    } catch (error: any) {
      // ✅ Show backend error message
      const errorMessage = error.response?.data?.message || 'Failed to update question';
      toast.error(errorMessage);
      console.error('Update question error:', error);
    }
  };

  const handleEditQuestion = (question: TeacherQuestion) => {
    setEditingQuestion(question);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingQuestion(null);
  };

  const handleBack = () => {
    if (parsedSubjectId) {
      // If we came from a specific subject, go back to subjects
      navigate('/teacher/subjects');
    } else {
      navigate('/teacher/dashboard');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to {parsedSubjectId ? 'Subjects' : 'Dashboard'}</span>
      </button>

      {showForm ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {editingQuestion ? 'Edit Question' : 'Create New Question'}
            </h2>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <QuestionForm
            onSubmit={editingQuestion ? handleUpdateQuestion : handleCreateQuestion}
            onCancel={handleCancel}
            subjectId={parsedSubjectId} // ✅ Pass parsed subjectId
            initialData={editingQuestion ? {
              subjectId: editingQuestion.subjectId,
              lessonTopicId: editingQuestion.lessonTopicId,
              questionText: editingQuestion.questionText,
              questionType: editingQuestion.questionType,
              optionA: editingQuestion.optionA,
              optionB: editingQuestion.optionB,
              optionC: editingQuestion.optionC,
              optionD: editingQuestion.optionD,
              correctAnswer: editingQuestion.correctAnswer,
              difficultyLevel: editingQuestion.difficultyLevel
            } : undefined}
          />
        </div>
      ) : (
        <TeacherQuestionBank
          onEditQuestion={handleEditQuestion}
          onCreateNew={() => setShowForm(true)}
        />
      )}
    </div>
  );
};